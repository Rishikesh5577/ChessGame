package com.chessbet.dto;

import java.util.UUID;

public record CancelGameCommand(UUID gameId) {
}
