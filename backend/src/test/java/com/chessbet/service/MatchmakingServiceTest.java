package com.chessbet.service;

import com.chessbet.configuration.MatchmakingProperties;
import com.chessbet.dto.MatchQueueDto;
import com.chessbet.model.BotDifficulty;
import com.chessbet.model.Game;
import com.chessbet.model.GameStatus;
import com.chessbet.model.PlayerColor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MatchmakingServiceTest {
    private MatchService matchService;
    private BotService botService;
    private SimpMessagingTemplate messagingTemplate;
    private MatchmakingService matchmakingService;

    @BeforeEach
    void setUp() {
        matchService = mock(MatchService.class);
        botService = mock(BotService.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        var properties = new MatchmakingProperties();
        properties.setTimeoutMs(200);
        matchmakingService = new MatchmakingService(matchService, botService, properties, messagingTemplate);
    }

    @AfterEach
    void tearDown() {
        matchmakingService.shutdown();
    }

    @Test
    void pairsTwoWaitingPlayersImmediately() {
        var a = UUID.randomUUID();
        var b = UUID.randomUUID();
        var game = samplePvpGame(a, b);
        when(matchService.startAnonymousMatch(any(), any())).thenReturn(game);

        matchmakingService.findMatch(a);
        matchmakingService.findMatch(b);

        verify(matchService).startAnonymousMatch(any(UUID.class), any(UUID.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/match.join"), any(Object.class));
        verify(botService, never()).createGame(any());
    }

    @Test
    void fallsBackToBotAfterTimeout() throws Exception {
        var player = UUID.randomUUID();
        var botGame = sampleBotGame(player);
        when(botService.isAvailable()).thenReturn(true);
        when(botService.createGame(any())).thenReturn(botGame);

        matchmakingService.findMatch(player);

        var queueCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq("/topic/match.queue"), queueCaptor.capture());
        var waiting = (MatchQueueDto) queueCaptor.getValue();
        assertEquals("WAITING", waiting.status());
        assertEquals(player, waiting.playerId());

        verify(messagingTemplate, timeout(2000)).convertAndSend(eq("/topic/match.join"), any(Object.class));
        verify(botService, timeout(2000)).createGame(any());
    }

    @Test
    void cancelPreventsBotFallback() throws Exception {
        var player = UUID.randomUUID();
        when(botService.isAvailable()).thenReturn(true);

        matchmakingService.findMatch(player);
        matchmakingService.cancelFind(player);

        TimeUnit.MILLISECONDS.sleep(400);
        verify(botService, never()).createGame(any());
    }

    @Test
    void reportsFailureWhenBotUnavailableOnTimeout() {
        var player = UUID.randomUUID();
        when(botService.isAvailable()).thenReturn(false);
        when(botService.getUnavailableReason()).thenReturn("engine missing");

        matchmakingService.findMatch(player);

        verify(messagingTemplate, timeout(2000)).convertAndSend(eq("/topic/match.queue"), any(Object.class));
        var captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, timeout(2000).atLeast(2))
                .convertAndSend(eq("/topic/match.queue"), captor.capture());

        var failed = captor.getAllValues().stream()
                .map(MatchQueueDto.class::cast)
                .filter(d -> "FAILED".equals(d.status()))
                .findFirst();
        assertTrue(failed.isPresent());
        assertTrue(failed.get().message().contains("engine"));
        verify(botService, never()).createGame(any());
    }

    private static Game samplePvpGame(UUID a, UUID b) {
        var game = new Game();
        game.setWhiteAnonymousPlayerId(a);
        game.setBlackAnonymousPlayerId(b);
        game.setStatus(GameStatus.ONGOING);
        game.setCurrentTurn(PlayerColor.WHITE);
        return game;
    }

    private static Game sampleBotGame(UUID human) {
        var game = new Game();
        game.setWhiteAnonymousPlayerId(human);
        game.setVsBot(true);
        game.setBotColor(PlayerColor.BLACK);
        game.setBotDifficulty(BotDifficulty.IMPOSSIBLE);
        game.setStatus(GameStatus.ONGOING);
        game.setCurrentTurn(PlayerColor.WHITE);
        return game;
    }
}
