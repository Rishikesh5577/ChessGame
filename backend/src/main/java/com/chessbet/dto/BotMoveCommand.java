package com.chessbet.dto;

/**
 * The move the human just played, sent so the server can keep the authoritative position in sync
 * before asking the engine to reply. All fields are null when the engine plays the opening move.
 */
public record BotMoveCommand(
        String from,
        String to,
        String promotion)
{
    public boolean hasMove() {
        return from != null && !from.isBlank() && to != null && !to.isBlank();
    }
}
