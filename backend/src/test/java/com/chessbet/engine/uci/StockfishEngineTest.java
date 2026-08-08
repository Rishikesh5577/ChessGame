package com.chessbet.engine.uci;

import com.chessbet.model.BotDifficulty;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Exercises the real engine when a binary is present. Skipped when it is not, so the build still
 * passes on machines that have not downloaded Stockfish.
 */
class StockfishEngineTest {
    private static final List<String> CANDIDATES = List.of(
            "engine/stockfish.exe",
            "/usr/games/stockfish",
            "/usr/bin/stockfish");

    private static String enginePath() {
        return CANDIDATES.stream()
                .filter(path -> Files.isRegularFile(Path.of(path)))
                .findFirst()
                .orElse(null);
    }

    private StockfishEngine newEngine() {
        var path = enginePath();
        assumeTrue(path != null, "Stockfish binary not available on this machine");
        return new StockfishEngine(path, 1, 16);
    }

    @Test
    void listsEveryLegalOpeningMove() {
        try (var engine = newEngine()) {
            var legal = engine.listLegalMoves(List.of());

            assertEquals(20, legal.size());
            assertTrue(legal.contains("e2e4"));
            assertTrue(legal.contains("g1f3"));
        }
    }

    @Test
    void rejectsMovesThatAreNotLegal() {
        try (var engine = newEngine()) {
            assertTrue(engine.listLegalMoves(List.of()).stream().noneMatch("e2e5"::equals));
        }
    }

    @Test
    void findsALegalOpeningMove() {
        try (var engine = newEngine()) {
            engine.applyDifficulty(BotDifficulty.IMPOSSIBLE);
            var best = engine.findBestMove(List.of(), 300);

            assertTrue(engine.listLegalMoves(List.of()).contains(best),
                    "Engine returned a move that is not legal: " + best);
        }
    }

    @Test
    void returnsNoMoveWhenTheSideToMoveIsCheckmated() {
        try (var engine = newEngine()) {
            // Fool's mate: 1. f3 e5 2. g4 Qh4#
            var mated = List.of("f2f3", "e7e5", "g2g4", "d8h4");

            assertTrue(engine.listLegalMoves(mated).isEmpty());
            assertNull(engine.findBestMove(mated, 300));
        }
    }

    @Test
    void weakerPresetsStillProduceLegalMoves() {
        try (var engine = newEngine()) {
            engine.applyDifficulty(BotDifficulty.EASY);
            var moves = List.of("e2e4", "e7e5");
            var best = engine.findBestMove(moves, 200);

            assertTrue(engine.listLegalMoves(moves).contains(best));
        }
    }
}
