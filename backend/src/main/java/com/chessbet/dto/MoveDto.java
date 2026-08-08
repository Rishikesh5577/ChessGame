package com.chessbet.dto;

import com.chessbet.model.PlayerColor;

import java.util.UUID;

public record MoveDto(
        UUID gameId,
        UUID whitePlayerId,
        UUID blackPlayerId,
        PlayerColor color,
        String from,
        String to,
        /* Promotion piece as a single lowercase letter (q, r, b, n), or null. */
        String promotion,
        boolean isCheckmate,
        boolean isStalemate)
{
}
