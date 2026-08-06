package com.chessbet.dto;

import java.util.UUID;

public record ResignGameCommand(
        UUID gameId,
        UUID playerId)
{
}
