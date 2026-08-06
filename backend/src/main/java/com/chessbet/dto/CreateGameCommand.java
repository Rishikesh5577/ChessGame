package com.chessbet.dto;

import com.chessbet.model.PlayerColor;
import java.util.UUID;

public record CreateGameCommand(
        UUID hostPlayerId,
        PlayerColor hostPlayerColor)
{
}
