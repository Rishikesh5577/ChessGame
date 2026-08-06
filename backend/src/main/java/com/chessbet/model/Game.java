package com.chessbet.model;

import com.chessbet.constant.GameConst;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.UUID;

/**
 * Game document. Represents a game between two players.
 * It contains the players' ids, the current turn player's id, the game's status, and the game's PGN.
 */
@Document(collection = "games")
public class Game extends AuditableEntity {
    /**
     * The player who hosts the game.
     */
    @DBRef
    private Player hostPlayer;

    /**
     * The anonymous player's id who hosts the game.
     */
    private UUID anonymousHostPlayerId;

    /**
     * The color of the host player in the game.
     * If the host player is not set, the color is null.
     * It means that color will be assigned randomly when second player joins the game.
     */
    private PlayerColor hostPlayerColor;

    /**
     * The player who plays as white.
     */
    @DBRef
    private Player whitePlayer;

    /**
     * The anonymous player's id who plays as white.
     */
    private UUID whiteAnonymousPlayerId;

    /**
     * The player who plays as black.
     */
    @DBRef
    private Player blackPlayer;

    /**
     * The anonymous player's id who plays as black.
     */
    private UUID blackAnonymousPlayerId;

    /**
     * The color of the player who won the game.
     * If the game is not finished yet, the winner player is null.
     */
    private PlayerColor winnerPlayer;

    /**
     * The player color who has the current turn in the game.
     * If game is not started yet, the current turn is null.
     */
    private PlayerColor currentTurn;

    private boolean isTimerEnabled = false;

    private boolean isRanked = false;

    private GameStatus status = GameStatus.OPEN;

    private String pgn = "";

    public Player getWhitePlayer() {
        return whitePlayer;
    }

    public void setWhitePlayer(Player whitePlayerId) {
        this.whitePlayer = whitePlayerId;
    }

    public Player getBlackPlayer() {
        return blackPlayer;
    }

    public void setBlackPlayer(Player setBlackPlayer) {
        this.blackPlayer = setBlackPlayer;
    }

    public PlayerColor getCurrentTurn() {
        return currentTurn;
    }

    public void setCurrentTurn(PlayerColor currentTurn) {
        this.currentTurn = currentTurn;
    }

    public GameStatus getStatus() {
        return status;
    }

    public void setStatus(GameStatus status) {
        this.status = status;
    }

    public PlayerColor getWinnerPlayer() {
        return winnerPlayer;
    }

    public void setWinnerPlayer(PlayerColor winnerPlayerColor) {
        this.winnerPlayer = winnerPlayerColor;
    }

    public String getPgn() {
        return pgn;
    }

    public void setPgn(String pgn) {
        this.pgn = pgn;
    }

    public UUID getWhiteAnonymousPlayerId() {
        return whiteAnonymousPlayerId;
    }

    public void setWhiteAnonymousPlayerId(UUID whiteAnonymousPlayerId) {
        this.whiteAnonymousPlayerId = whiteAnonymousPlayerId;
    }

    public UUID getBlackAnonymousPlayerId() {
        return blackAnonymousPlayerId;
    }

    public void setBlackAnonymousPlayerId(UUID blackAnonymousPlayerId) {
        this.blackAnonymousPlayerId = blackAnonymousPlayerId;
    }

    public UUID getWhitePlayerId() {
        return whitePlayer != null ? whitePlayer.getId() : whiteAnonymousPlayerId;
    }

    public UUID getBlackPlayerId() {
        return blackPlayer != null ? blackPlayer.getId() : blackAnonymousPlayerId;
    }

    public String getWhitePlayerUsername() {
        return whitePlayer != null ? whitePlayer.getUsername() : "Anonymous";
    }

    public String getBlackPlayerUsername() {
        return blackPlayer != null ? blackPlayer.getUsername() : "Anonymous";
    }

    public boolean isTimerEnabled() {
        return isTimerEnabled;
    }

    public void setTimerEnabled(boolean isTimerEnabled) {
        this.isTimerEnabled = isTimerEnabled;
    }

    public boolean isRanked() {
        return isRanked;
    }

    public void setRanked(boolean isRanked) {
        this.isRanked = isRanked;
    }

    public boolean isFull() {
        boolean hasWhite = whitePlayer != null || whiteAnonymousPlayerId != null;
        boolean hasBlack = blackPlayer != null || blackAnonymousPlayerId != null;
        return hasWhite && hasBlack;
    }

    public PlayerColor getHostPlayerColor() {
        return hostPlayerColor;
    }

    public void setHostPlayerColor(PlayerColor hostPlayerColor) {
        this.hostPlayerColor = hostPlayerColor;
    }

    public Player getHostPlayer() {
        return hostPlayer;
    }

    public void setHostPlayer(Player hostPlayer) {
        this.hostPlayer = hostPlayer;
    }

    public UUID getAnonymousHostPlayerId() {
        return anonymousHostPlayerId;
    }

    public void setAnonymousHostPlayerId(UUID anonymousHostPlayerId) {
        this.anonymousHostPlayerId = anonymousHostPlayerId;
    }

    public UUID getHostPlayerId() {
        return hostPlayer != null ? hostPlayer.getId() : anonymousHostPlayerId;
    }

    public String getHostPlayerUsername() {
        return hostPlayer != null ? hostPlayer.getUsername() : "Anonymous";
    }

    public int getHostPlayerElo() {
        return hostPlayer != null ? hostPlayer.getElo() : GameConst.DEFAULT_ELO;
    }

    public int getWhitePlayerElo() {
        return whitePlayer != null ? whitePlayer.getElo() : GameConst.DEFAULT_ELO;
    }

    public int getBlackPlayerElo() {
        return blackPlayer != null ? blackPlayer.getElo() : GameConst.DEFAULT_ELO;
    }
}
