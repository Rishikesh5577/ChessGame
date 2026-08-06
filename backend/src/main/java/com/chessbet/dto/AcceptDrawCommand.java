package com.chessbet.dto;

import java.util.UUID;

public record AcceptDrawCommand(
        UUID gameId,
        UUID playerId)
{
}
