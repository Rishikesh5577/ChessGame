package com.chessbet.dto;

import java.util.UUID;

public record OfferDrawCommand(
        UUID gameId,
        UUID playerId)
{
}
