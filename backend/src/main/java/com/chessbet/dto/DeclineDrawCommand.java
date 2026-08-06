package com.chessbet.dto;

import java.util.UUID;

public record DeclineDrawCommand(
        UUID gameId,
        UUID playerId)
{
}
