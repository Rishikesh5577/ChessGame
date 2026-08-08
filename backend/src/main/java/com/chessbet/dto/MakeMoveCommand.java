package com.chessbet.dto;

import com.chessbet.model.PlayerColor;

import java.util.UUID;

public record MakeMoveCommand(
        UUID gameId,
        PlayerColor color,
        String from,
        String to,
        /* Promotion piece as a single lowercase letter (q, r, b, n), or null. */
        String promotion,
        boolean isCheckmate,
        boolean isStalemate)
{
}
