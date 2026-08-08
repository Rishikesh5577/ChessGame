package com.chessbet.engine.uci;

import com.chessbet.configuration.BotProperties;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;

/**
 * Keeps a small set of Stockfish processes alive and hands them out one search at a time.
 * <p>
 * Starting a process costs far more than a search does, so processes are reused. If the binary is
 * missing the pool stays unavailable and only bot games are affected — human matches keep working.
 */
@Component
public class StockfishEnginePool {
    private static final Logger log = LoggerFactory.getLogger(StockfishEnginePool.class);

    private static final List<String> CANDIDATE_PATHS = List.of(
            "stockfish",
            "/usr/games/stockfish",
            "/usr/bin/stockfish",
            "/usr/local/bin/stockfish",
            "stockfish.exe",
            "engine/stockfish.exe");

    private static final long BORROW_TIMEOUT_SECONDS = 30;

    private final BotProperties properties;
    private final BlockingQueue<StockfishEngine> idle = new LinkedBlockingQueue<>();
    private final ReentrantLock creationLock = new ReentrantLock();

    private int liveEngines;
    private String resolvedPath;
    private String unavailableReason;

    public StockfishEnginePool(BotProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void resolveEngine() {
        if (!properties.isEnabled()) {
            unavailableReason = "Bot games are disabled (app.bot.enabled=false)";
            log.info("Chess engine disabled by configuration");
            return;
        }

        var candidates = properties.getEnginePath().isBlank()
                ? CANDIDATE_PATHS
                : List.of(properties.getEnginePath());

        for (var candidate : candidates) {
            try (var engine = new StockfishEngine(candidate, properties.getThreads(), properties.getHashMb())) {
                resolvedPath = candidate;
                log.info("Chess engine ready at '{}' (pool size {}, {} thread(s), {} MB hash)",
                        candidate, properties.getPoolSize(), properties.getThreads(), properties.getHashMb());
                return;
            } catch (RuntimeException e) {
                log.debug("Chess engine not usable at '{}': {}", candidate, e.getMessage());
            }
        }

        unavailableReason = "Stockfish executable not found. Install it or set APP_BOT_ENGINE_PATH.";
        log.warn("{} Bot games will be rejected; human matches are unaffected.", unavailableReason);
    }

    public boolean isAvailable() {
        return resolvedPath != null;
    }

    public String getUnavailableReason() {
        return unavailableReason;
    }

    /**
     * Runs {@code work} against a pooled engine. A engine that misbehaves is destroyed rather than
     * returned to the pool, so the next caller gets a clean process.
     */
    public <T> T execute(Function<StockfishEngine, T> work) {
        if (!isAvailable()) {
            throw new UciEngineException(unavailableReason);
        }

        var engine = borrow();
        try {
            var result = work.apply(engine);
            idle.offer(engine);
            return result;
        } catch (RuntimeException e) {
            discard(engine);
            throw e;
        }
    }

    private StockfishEngine borrow() {
        var engine = idle.poll();

        if (engine == null) {
            engine = createIfBelowLimit();
        }

        if (engine == null) {
            engine = awaitIdleEngine();
        }

        if (!engine.isAlive()) {
            discard(engine);
            engine = create();
        }

        return engine;
    }

    private StockfishEngine awaitIdleEngine() {
        try {
            var engine = idle.poll(BORROW_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (engine == null) {
                throw new UciEngineException("All chess engines are busy, please try again");
            }
            return engine;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new UciEngineException("Interrupted while waiting for a chess engine", e);
        }
    }

    private StockfishEngine createIfBelowLimit() {
        creationLock.lock();
        try {
            if (liveEngines >= properties.getPoolSize()) {
                return null;
            }
            return create();
        } finally {
            creationLock.unlock();
        }
    }

    private StockfishEngine create() {
        var engine = new StockfishEngine(resolvedPath, properties.getThreads(), properties.getHashMb());

        creationLock.lock();
        try {
            liveEngines++;
        } finally {
            creationLock.unlock();
        }

        return engine;
    }

    private void discard(StockfishEngine engine) {
        engine.close();

        creationLock.lock();
        try {
            liveEngines = Math.max(0, liveEngines - 1);
        } finally {
            creationLock.unlock();
        }
    }

    @PreDestroy
    void shutdown() {
        StockfishEngine engine;
        while ((engine = idle.poll()) != null) {
            engine.close();
        }
    }
}
