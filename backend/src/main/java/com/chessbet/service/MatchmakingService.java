package com.chessbet.service;

import com.chessbet.configuration.MatchmakingProperties;
import com.chessbet.dto.CreateBotGameCommand;
import com.chessbet.dto.MatchQueueDto;
import com.chessbet.mapper.GameMapper;
import com.chessbet.model.BotDifficulty;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Pairs waiting players for PvP, or falls back to Stockfish after the configured timeout.
 */
@Service
public class MatchmakingService {
    private static final Logger log = LoggerFactory.getLogger(MatchmakingService.class);
    private static final String QUEUE_TOPIC = "/topic/match.queue";
    private static final String MATCH_JOIN_TOPIC = "/topic/match.join";

    private final MatchService matchService;
    private final BotService botService;
    private final MatchmakingProperties properties;
    private final SimpMessagingTemplate messagingTemplate;

    private final Map<UUID, WaitingEntry> waiting = new ConcurrentHashMap<>();
    private final Object lock = new Object();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        var thread = new Thread(r, "matchmaking-timeout");
        thread.setDaemon(true);
        return thread;
    });

    public MatchmakingService(
            MatchService matchService,
            BotService botService,
            MatchmakingProperties properties,
            SimpMessagingTemplate messagingTemplate)
    {
        this.matchService = matchService;
        this.botService = botService;
        this.properties = properties;
        this.messagingTemplate = messagingTemplate;
    }

    public long getTimeoutMs() {
        return properties.getTimeoutMs();
    }

    /**
     * Puts {@code playerId} in the queue. If another player is already waiting, both are matched
     * immediately; otherwise a bot fallback is scheduled after the timeout.
     */
    public void findMatch(UUID playerId) {
        if (playerId == null) {
            throw new IllegalArgumentException("playerId is required");
        }

        synchronized (lock) {
            if (waiting.containsKey(playerId)) {
                var existing = waiting.get(playerId);
                publishQueue(MatchQueueDto.waiting(playerId, properties.getTimeoutMs(), existing.expiresAtEpochMs()));
                return;
            }

            var opponentId = pollAnyOther(playerId);
            if (opponentId != null) {
                startPvp(opponentId, playerId);
                return;
            }

            var timeoutMs = properties.getTimeoutMs();
            var expiresAt = System.currentTimeMillis() + timeoutMs;
            var future = scheduler.schedule(() -> onTimeout(playerId), timeoutMs, TimeUnit.MILLISECONDS);
            waiting.put(playerId, new WaitingEntry(expiresAt, future));
            publishQueue(MatchQueueDto.waiting(playerId, timeoutMs, expiresAt));
            log.info("Player {} entered matchmaking queue (timeout {} ms)", playerId, timeoutMs);
        }
    }

    public void cancelFind(UUID playerId) {
        if (playerId == null) {
            return;
        }

        synchronized (lock) {
            var removed = removeWaiting(playerId);
            if (removed != null) {
                publishQueue(MatchQueueDto.cancelled(playerId));
                log.info("Player {} left matchmaking queue", playerId);
            }
        }
    }

    private void onTimeout(UUID playerId) {
        synchronized (lock) {
            var entry = waiting.get(playerId);
            if (entry == null) {
                return;
            }
            waiting.remove(playerId);
        }

        if (!botService.isAvailable()) {
            var reason = botService.getUnavailableReason() != null
                    ? botService.getUnavailableReason()
                    : "No opponent found and the chess engine is unavailable";
            publishQueue(MatchQueueDto.failed(playerId, reason));
            log.warn("Matchmaking timeout for {} but bot unavailable: {}", playerId, reason);
            return;
        }

        try {
            var game = botService.createGame(new CreateBotGameCommand(
                    playerId,
                    null,
                    BotDifficulty.IMPOSSIBLE));
            messagingTemplate.convertAndSend(MATCH_JOIN_TOPIC, GameMapper.toDto(game));
            log.info("Player {} matched with bot after timeout (game {})", playerId, game.getId());
        } catch (RuntimeException e) {
            log.error("Failed to start bot fallback for {}", playerId, e);
            publishQueue(MatchQueueDto.failed(playerId, "Could not start a game against the computer"));
        }
    }

    private void startPvp(UUID playerA, UUID playerB) {
        try {
            var game = matchService.startAnonymousMatch(playerA, playerB);
            messagingTemplate.convertAndSend(MATCH_JOIN_TOPIC, GameMapper.toDto(game));
            log.info("Matched {} vs {} in game {}", playerA, playerB, game.getId());
        } catch (RuntimeException e) {
            log.error("Failed to start PvP match between {} and {}", playerA, playerB, e);
            publishQueue(MatchQueueDto.failed(playerA, "Could not start the match"));
            publishQueue(MatchQueueDto.failed(playerB, "Could not start the match"));
        }
    }

    private UUID pollAnyOther(UUID exclude) {
        for (var id : waiting.keySet()) {
            if (!id.equals(exclude)) {
                removeWaiting(id);
                return id;
            }
        }
        return null;
    }

    private WaitingEntry removeWaiting(UUID playerId) {
        var entry = waiting.remove(playerId);
        if (entry != null && entry.timeoutTask() != null) {
            entry.timeoutTask().cancel(false);
        }
        return entry;
    }

    private void publishQueue(MatchQueueDto dto) {
        messagingTemplate.convertAndSend(QUEUE_TOPIC, dto);
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }

    private record WaitingEntry(long expiresAtEpochMs, ScheduledFuture<?> timeoutTask) {
    }
}
