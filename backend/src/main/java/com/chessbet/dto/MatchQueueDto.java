package com.chessbet.dto;

import java.util.UUID;

/**
 * Matchmaking queue status. Clients filter on {@code playerId} so they only react to their own events.
 */
public record MatchQueueDto(
        UUID playerId,
        /** WAITING | CANCELLED | FAILED */
        String status,
        long timeoutMs,
        long expiresAtEpochMs,
        String message)
{
    public static MatchQueueDto waiting(UUID playerId, long timeoutMs, long expiresAtEpochMs) {
        return new MatchQueueDto(playerId, "WAITING", timeoutMs, expiresAtEpochMs, "Searching for an opponent…");
    }

    public static MatchQueueDto cancelled(UUID playerId) {
        return new MatchQueueDto(playerId, "CANCELLED", 0, 0, "Search cancelled");
    }

    public static MatchQueueDto failed(UUID playerId, String message) {
        return new MatchQueueDto(playerId, "FAILED", 0, 0, message);
    }
}
