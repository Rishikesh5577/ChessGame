package com.chessbet.dto;

import com.chessbet.model.BotDifficulty;
import com.chessbet.model.PlayerColor;

import java.time.Instant;
import java.util.UUID;

public record GameDto(
        UUID id,
        UUID hostPlayerId,
        String hostPlayerUsername,
        PlayerColor hostPlayerColor,
        int hostPlayerElo,
        UUID whitePlayerId,
        String whitePlayerUsername,
        int whitePlayerElo,
        UUID blackPlayerId,
        String blackPlayerUsername,
        int blackPlayerElo,
        PlayerColor winnerPlayer,
        String status,
        PlayerColor currentTurn,
        boolean isRanked,
        boolean isTimerEnabled,
        boolean vsBot,
        PlayerColor botColor,
        BotDifficulty botDifficulty,
        String pgn,
        Instant createdDate)
{
}
