package com.chessbet.service;

import com.chessbet.model.Game;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * In-memory state for a game that is currently being played.
 * <p>
 * The move list is kept in UCI notation ({@code e2e4}, {@code e7e8q}) because that is exactly what
 * the engine needs to rebuild the position: {@code position startpos moves ...}.
 */
public class ActiveGame {
    private final Game game;
    private final List<String> uciMoves = new ArrayList<>();
    private final ReentrantLock lock = new ReentrantLock();

    public ActiveGame(Game game) {
        this.game = game;
    }

    public Game getGame() {
        return game;
    }

    /**
     * A snapshot, so callers cannot mutate the move list without holding the lock.
     */
    public List<String> getMoves() {
        lock.lock();
        try {
            return List.copyOf(uciMoves);
        } finally {
            lock.unlock();
        }
    }

    public void addMove(String uciMove) {
        lock.lock();
        try {
            uciMoves.add(uciMove);
        } finally {
            lock.unlock();
        }
    }

    public ReentrantLock getLock() {
        return lock;
    }

    public static String toUci(String from, String to, String promotion) {
        var move = from.toLowerCase() + to.toLowerCase();
        return promotion == null || promotion.isBlank()
                ? move
                : move + promotion.toLowerCase().charAt(0);
    }
}
