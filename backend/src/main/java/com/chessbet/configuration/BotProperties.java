package com.chessbet.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.bot")
public class BotProperties {
    /**
     * Set to false to disable engine games entirely.
     */
    private boolean enabled = true;

    /**
     * Path to the Stockfish executable. Leave blank to auto-detect common locations.
     */
    private String enginePath = "";

    /**
     * Maximum number of engine processes kept alive. Each one can run a single search at a time,
     * so this caps how many bot games can think concurrently.
     */
    private int poolSize = 2;

    /**
     * Search threads per engine process.
     */
    private int threads = 1;

    /**
     * Transposition table size per engine process, in megabytes. Kept small so two processes fit
     * comfortably in a 512 MB container; raise it on a bigger host.
     */
    private int hashMb = 64;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getEnginePath() {
        return enginePath;
    }

    public void setEnginePath(String enginePath) {
        this.enginePath = enginePath;
    }

    public int getPoolSize() {
        return poolSize;
    }

    public void setPoolSize(int poolSize) {
        this.poolSize = poolSize;
    }

    public int getThreads() {
        return threads;
    }

    public void setThreads(int threads) {
        this.threads = threads;
    }

    public int getHashMb() {
        return hashMb;
    }

    public void setHashMb(int hashMb) {
        this.hashMb = hashMb;
    }
}
