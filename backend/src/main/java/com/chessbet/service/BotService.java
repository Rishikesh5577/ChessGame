package com.chessbet.service;

import com.chessbet.dto.BotMoveCommand;
import com.chessbet.dto.BotMoveDto;
import com.chessbet.dto.CreateBotGameCommand;
import com.chessbet.engine.uci.StockfishEnginePool;
import com.chessbet.model.BotDifficulty;
import com.chessbet.model.Game;
import com.chessbet.model.PlayerColor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Runs games played against the chess engine.
 * <p>
 * The engine is the authority on chess rules here: the server keeps the move list, asks the engine
 * which moves are legal before accepting one from the client, and asks it for the reply.
 */
@Service
public class BotService {
    private final GameService gameService;
    private final MatchService matchService;
    private final StockfishEnginePool enginePool;

    public BotService(GameService gameService, MatchService matchService, StockfishEnginePool enginePool) {
        this.gameService = gameService;
        this.matchService = matchService;
        this.enginePool = enginePool;
    }

    public boolean isAvailable() {
        return enginePool.isAvailable();
    }

    public String getUnavailableReason() {
        return enginePool.getUnavailableReason();
    }

    public Game createGame(CreateBotGameCommand command) {
        var game = gameService.createBotGame(
                command.hostPlayerId(),
                command.hostPlayerColor(),
                command.difficulty());

        matchService.registerActiveGame(game);
        return game;
    }

    /**
     * Records the human's move (when there is one) and returns the engine's reply.
     *
     * @throws IllegalArgumentException if the submitted move is not legal in the current position
     * @throws IllegalStateException if it is not the expected side's turn
     */
    public BotMoveDto playTurn(UUID gameId, BotMoveCommand command) {
        var activeGame = matchService.requireActiveGame(gameId);
        var game = activeGame.getGame();

        if (!game.isVsBot()) {
            throw new IllegalStateException("Game '%s' is not a bot game".formatted(gameId));
        }

        var lock = activeGame.getLock();
        lock.lock();
        try {
            return playTurnLocked(activeGame, game, command);
        } finally {
            lock.unlock();
        }
    }

    private BotMoveDto playTurnLocked(ActiveGame activeGame, Game game, BotMoveCommand command) {
        var botColor = game.getBotColor();
        var humanColor = MatchService.opposite(botColor);
        var difficulty = game.getBotDifficulty() != null ? game.getBotDifficulty() : BotDifficulty.IMPOSSIBLE;
        var humanMove = command != null && command.hasMove()
                ? ActiveGame.toUci(command.from(), command.to(), command.promotion())
                : null;

        var expectedMover = humanMove != null ? humanColor : botColor;
        if (sideToMove(activeGame.getMoves().size()) != expectedMover) {
            throw new IllegalStateException("It is not %s's turn".formatted(expectedMover));
        }

        var turn = enginePool.execute(engine -> {
            engine.applyDifficulty(difficulty);
            var moves = new ArrayList<>(activeGame.getMoves());

            if (humanMove != null) {
                if (!engine.listLegalMoves(moves).contains(humanMove)) {
                    return EngineTurn.illegal();
                }
                moves.add(humanMove);
            }

            return EngineTurn.reply(engine.findBestMove(moves, difficulty.getMoveTimeMs()));
        });

        if (turn.rejected()) {
            throw new IllegalArgumentException("Illegal move: " + humanMove);
        }

        if (humanMove != null) {
            activeGame.addMove(humanMove);
        }

        if (turn.botMove() == null) {
            game.setCurrentTurn(botColor);
            return BotMoveDto.gameOver(game.getId());
        }

        activeGame.addMove(turn.botMove());
        game.setCurrentTurn(humanColor);

        return toDto(game.getId(), botColor, turn.botMove());
    }

    private static PlayerColor sideToMove(int movesPlayed) {
        return movesPlayed % 2 == 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
    }

    private static BotMoveDto toDto(UUID gameId, PlayerColor botColor, String uciMove) {
        var promotion = uciMove.length() > 4 ? uciMove.substring(4, 5) : null;

        return new BotMoveDto(
                gameId,
                botColor,
                uciMove.substring(0, 2),
                uciMove.substring(2, 4),
                promotion,
                false);
    }

    /**
     * Result of one engine round trip. Kept as a value so an illegal client move does not have to be
     * signalled with an exception from inside the pool, which would needlessly kill a healthy process.
     */
    private record EngineTurn(boolean rejected, String botMove) {
        static EngineTurn illegal() {
            return new EngineTurn(true, null);
        }

        static EngineTurn reply(String botMove) {
            return new EngineTurn(false, botMove);
        }
    }

    /** Exposed for tests and diagnostics. */
    public List<String> getMoves(UUID gameId) {
        return matchService.requireActiveGame(gameId).getMoves();
    }
}
