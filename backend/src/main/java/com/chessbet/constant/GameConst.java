package com.chessbet.constant;

import java.util.UUID;

public final class GameConst {
    public static final int DEFAULT_ELO = 1200;

    /**
     * Fixed identity used for the engine opponent so that a bot game can reuse the
     * same anonymous-player plumbing as a human game.
     */
    public static final UUID BOT_PLAYER_ID = UUID.fromString("00000000-0000-0000-0000-0000000b0770");

    public static final String BOT_NAME = "Stockfish";

    private GameConst() {
    }
}
