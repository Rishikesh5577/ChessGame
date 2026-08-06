package com.chessbet.dto;

import com.chessbet.model.PlayerColor;
import java.util.UUID;

public record CreateAnonymousGameCommand(
        UUID hostPlayerId,
        PlayerColor hostPlayerColor)
{
}
