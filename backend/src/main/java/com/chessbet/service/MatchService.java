package com.chessbet.service;

import com.chessbet.dto.MakeMoveCommand;
import com.chessbet.dto.MoveDto;
import com.chessbet.engine.Pgn;
import com.chessbet.model.Game;
import com.chessbet.model.GameStatus;
import com.chessbet.model.Player;
import com.chessbet.model.PlayerColor;
import com.chessbet.repository.GameRepository;
import com.chessbet.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Random;
import java.util.Timer;
import java.util.TimerTask;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MatchService {
    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;

    /**
     * Games currently being played, keyed by game id. Holds the move list that the chess engine
     * needs to rebuild a position.
     */
    private final Map<UUID, ActiveGame> activeGames = new ConcurrentHashMap<>();

    public MatchService(GameRepository gameRepository, PlayerRepository playerRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
    }

    public Game getActiveGame(UUID gameId) {
        return requireActiveGame(gameId).getGame();
    }

    public ActiveGame requireActiveGame(UUID gameId) {
        var activeGame = activeGames.get(gameId);

        if (activeGame == null) {
            throw new NoSuchElementException("Game with ID '%s' is not in progress".formatted(gameId));
        }

        return activeGame;
    }

    public ActiveGame registerActiveGame(Game game) {
        var activeGame = new ActiveGame(game);
        activeGames.put(game.getId(), activeGame);
        return activeGame;
    }

    /**
     * Starts an anonymous PvP match immediately (no OPEN lobby row). Colours are assigned at random.
     */
    public Game startAnonymousMatch(UUID playerA, UUID playerB) {
        if (playerA.equals(playerB)) {
            throw new IllegalArgumentException("Cannot match a player against themselves");
        }

        var playerAIsWhite = new Random().nextBoolean();

        var game = new Game();
        game.setAnonymousHostPlayerId(playerA);
        game.setHostPlayerColor(playerAIsWhite ? PlayerColor.WHITE : PlayerColor.BLACK);

        if (playerAIsWhite) {
            game.setWhiteAnonymousPlayerId(playerA);
            game.setBlackAnonymousPlayerId(playerB);
        } else {
            game.setBlackAnonymousPlayerId(playerA);
            game.setWhiteAnonymousPlayerId(playerB);
        }

        game.setStatus(GameStatus.ONGOING);
        game.setCurrentTurn(PlayerColor.WHITE);

        var pgn = new Pgn();
        pgn.setWhitePlayer("Anonymous");
        pgn.setBlackPlayer("Anonymous");
        pgn.setWhiteTurn();
        game.setPgn(pgn.toString());

        var saved = gameRepository.save(game);
        registerActiveGame(saved);
        return saved;
    }

    /**
     * Join a game with a player.
     * @param gameId The ID of the game to join
     * @param playerId The ID of the player joining the game
     * @return The updated game
     */
    public Game joinGame(UUID gameId, UUID playerId) {
        var game = gameRepository.findById(gameId).orElseThrow();
        var player = playerRepository.findById(playerId).orElseThrow();
        return joinGameCommon(game, playerId, player);
    }

    /**
     * Join an anonymous game with a player.
     * @param gameId The ID of the game to join
     * @param playerId The ID of the player joining the game
     * @return The updated game
     */
    public Game joinAnonymousGame(UUID gameId, UUID playerId) {
        var game = gameRepository.findById(gameId).orElseThrow();
        return joinGameCommon(game, playerId, null);
    }

    /**
     * Join a game with a player.
     * @param game The game to join
     * @param playerId The joining player's ID
     * @param player The joining player entity. Set to null if the player is anonymous
     * @return The updated game
     */
    private Game joinGameCommon(Game game, UUID playerId, Player player) {
        if (game.isFull()) {
            throw new IllegalStateException("Game is already full");
        }

        var secondPlayerColor = determineSecondPlayerColor(game);
        var secondPlayerName = player == null ? "Anonymous" : player.getUsername();

        if (secondPlayerColor == PlayerColor.WHITE) {
            if (secondPlayerName.equals("Anonymous")) {
                game.setWhiteAnonymousPlayerId(playerId);
                game.setBlackAnonymousPlayerId(game.getHostPlayerId());
            }
            else {
                game.setWhitePlayer(player);
                game.setBlackPlayer(game.getHostPlayer());
            }
        }
        else {
            if (secondPlayerName.equals("Anonymous")) {
                game.setBlackAnonymousPlayerId(playerId);
                game.setWhiteAnonymousPlayerId(game.getHostPlayerId());
            }
            else {
                game.setBlackPlayer(player);
                game.setWhitePlayer(game.getHostPlayer());
            }
        }

        game.setStatus(GameStatus.ONGOING);

        // Set the player's color in the PGN
        var pgn = Pgn.fromString(game.getPgn());

        if (secondPlayerColor == PlayerColor.WHITE) {
            pgn.setWhitePlayer(secondPlayerName);
        }
        else {
            pgn.setBlackPlayer(secondPlayerName);
        }

        pgn.setWhiteTurn();
        game.setCurrentTurn(PlayerColor.WHITE);
        game.setPgn(pgn.toString());

        var saved = gameRepository.save(game);
        registerActiveGame(saved);
        return saved;
    }

    /**
     * Determine the color of the second player in the game.
     * If the host player color is not set, the color is randomly assigned.
     * @param game The game to determine the color for
     * @return The color of the second player
     */
    private PlayerColor determineSecondPlayerColor(Game game) {
        if (game.getHostPlayerColor() == null) {
            var isWhite = new Random().nextBoolean();
            game.setHostPlayerColor(isWhite ? PlayerColor.BLACK : PlayerColor.WHITE);
            return isWhite ? PlayerColor.WHITE : PlayerColor.BLACK;
        }
        else {
            return game.getHostPlayerColor() == PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
        }
    }

    public Game leaveGame(UUID gameId, UUID playerId) {
        var activeGame = activeGames.get(gameId);
        final Game game = activeGame != null
                ? activeGame.getGame()
                : gameRepository.findById(gameId).orElseThrow();

        game.setStatus(GameStatus.CANCELLED);

        // Schedule a timer to complete the abandoned game after 1 minute
        var timer = new Timer();
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                completeAbandonedGame(game, playerId);
                timer.cancel();
            }
        }, 60000); // 60000 ms = 1 minute

        return gameRepository.save(game);
    }

    /**
     * Complete an abandoned game by declaring
     * the other player as the winner and updating the game status to completed.
     * @param game The game to complete
     * @param abandonedPlayerId The ID of the player who abandoned the game
     */
    private void completeAbandonedGame(Game game, UUID abandonedPlayerId) {
        var winnerPlayerId = abandonedPlayerId.equals(game.getWhitePlayerId())
                ? game.getBlackPlayerId()
                : game.getWhitePlayerId();

        var pgn = Pgn.fromString(game.getPgn());

        if (winnerPlayerId == null) {
            throw new NoSuchElementException("Winner could not be determined for game '%s'".formatted(game.getId()));
        }

        if (winnerPlayerId.equals(game.getWhitePlayerId())) {
            game.setWinnerPlayer(PlayerColor.WHITE);
            pgn.setWhiteWinResult();
        }
        else if (winnerPlayerId.equals(game.getBlackPlayerId())) {
            game.setWinnerPlayer(PlayerColor.BLACK);
            pgn.setBlackWinResult();
        }
        else {
            throw new NoSuchElementException("Winner with '%s' does not exist in the game".formatted(winnerPlayerId));
        }

        game.setStatus(GameStatus.COMPLETED);
        activeGames.remove(game.getId());
        gameRepository.save(game);
    }

    public MoveDto makeMove(MakeMoveCommand command)  {
        var activeGame = requireActiveGame(command.gameId());
        var game = activeGame.getGame();

        activeGame.addMove(ActiveGame.toUci(command.from(), command.to(), command.promotion()));
        game.setCurrentTurn(opposite(command.color()));

        return new MoveDto(
                command.gameId(),
                game.getWhitePlayerId(),
                game.getBlackPlayerId(),
                command.color(),
                command.from(),
                command.to(),
                command.promotion(),
                command.isCheckmate(),
                command.isStalemate());
    }

    public static PlayerColor opposite(PlayerColor color) {
        return color == PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
    }

    /**
     * Resign from a game
     * @param gameId The ID of the game to resign from
     * @param playerId The ID of the player who is resigning
     * @throws NoSuchElementException if the game does not exist or if the player does not exist in the game
     * @return The updated game
     */
    public Game resignGame(UUID gameId, UUID playerId) {
        var game = gameRepository.findById(gameId).orElseThrow();
        var pgn = Pgn.fromString(game.getPgn());

        if (playerId.equals(game.getWhitePlayerId())) { // White player resigned
            game.setWinnerPlayer(PlayerColor.BLACK); // Black player wins
            pgn.setBlackWinResult();
        }
        else if (playerId.equals(game.getBlackPlayerId())) { // Black player resigned
            game.setWinnerPlayer(PlayerColor.WHITE); // White player wins
            pgn.setWhiteWinResult();
        }
        else {
            throw new NoSuchElementException("Player with '%s' does not exist in the game".formatted(playerId));
        }

        game.setStatus(GameStatus.RESIGNED);
        game.setPgn(pgn.toString());
        activeGames.remove(gameId);
        return gameRepository.save(game);
    }

    /**
     * Draw a game
     * @param gameId The ID of the game to draw
     * @throws NoSuchElementException if the game does not exist
     * @return The updated game
     */
    public Game drawGame(UUID gameId) {
        var game = gameRepository.findById(gameId).orElseThrow();
        var pgn = Pgn.fromString(game.getPgn());
        pgn.setDrawResult();

        game.setStatus(GameStatus.DRAW);
        game.setPgn(pgn.toString());
        activeGames.remove(gameId);
        return gameRepository.save(game);
    }

    /**
     * Abort a game
     * @param gameId The ID of the game to abort
     * @throws NoSuchElementException if the game does not exist
     * @return The updated game
     */
    public Game abortGame(UUID gameId) {
        var game = gameRepository.findById(gameId).orElseThrow();
        game.setStatus(GameStatus.ABORTED);
        activeGames.remove(gameId);
        return gameRepository.save(game);
    }
}
