package com.chessbet.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.matchmaking")
public class MatchmakingProperties {
    /**
     * How long a lone player waits for a human before falling back to the bot.
     */
    private long timeoutMs = 30_000;

    public long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
