package com.chessbet.dto;

import com.chessbet.model.BotDifficulty;
import com.chessbet.model.PlayerColor;

import java.util.UUID;

public record CreateBotGameCommand(
        UUID hostPlayerId,
        /* Colour the human wants. Null means pick at random. */
        PlayerColor hostPlayerColor,
        /* Null defaults to full engine strength. */
        BotDifficulty difficulty)
{
}
