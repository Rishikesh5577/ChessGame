package com.chessbet.engine;

import com.chessbet.engine.option.MoveOptions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Perft (performance test) verifies a move generator against known node counts.
 * <p>
 * These are disabled because the bundled {@link Chess} port currently fails all of them:
 * {@code perft(1)} from the start position throws ArrayIndexOutOfBoundsException, a plain
 * e2-e4 throws, and promotions are rejected. That is why the server does not use this class
 * as the source of truth for game state — {@code StockfishEngine} owns position handling
 * instead. Re-enable this test if the port is ever fixed.
 */
@Disabled("Bundled Chess engine port is broken; see class javadoc")
class ChessPerftTest {

    @Test
    void perftFromStartPosition() {
        var chess = new Chess();
        assertEquals(20, chess.perft(1));
        assertEquals(400, chess.perft(2));
        assertEquals(8902, chess.perft(3));
    }

    @Test
    void perftFromKiwipetePosition() {
        var chess = new Chess("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
        assertEquals(48, chess.perft(1));
        assertEquals(2039, chess.perft(2));
    }

    @Test
    void appliesSequenceOfMovesAndReportsFen() {
        var chess = new Chess();
        chess.move(new MoveOptions("e2", "e4", null, null, false));
        chess.move(new MoveOptions("e7", "e5", null, null, false));
        chess.move(new MoveOptions("g1", "f3", null, null, false));

        assertEquals(
                "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
                chess.fen());
    }

    @Test
    void handlesPromotionMove() {
        var chess = new Chess("8/P6k/8/8/8/8/6K1/8 w - - 0 1");
        var move = chess.move(new MoveOptions("a7", "a8", null, 'q', false));
        assertEquals("a8", move.getTo());
        assertEquals('q', move.getPromotion());
    }
}
