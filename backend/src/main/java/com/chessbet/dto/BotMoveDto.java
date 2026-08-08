package com.chessbet.dto;

import com.chessbet.model.PlayerColor;

import java.util.UUID;

public record BotMoveDto(
        UUID gameId,
        PlayerColor color,
        String from,
        String to,
        String promotion,
        /* True when the engine had no legal reply, meaning the game ended on the human's move. */
        boolean gameOver)
{
    public static BotMoveDto gameOver(UUID gameId) {
        return new BotMoveDto(gameId, null, null, null, null, true);
    }
}
