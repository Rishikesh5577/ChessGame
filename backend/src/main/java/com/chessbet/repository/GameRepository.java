package com.chessbet.repository;

import com.chessbet.model.Game;
import com.chessbet.model.GameStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * GameRepository interface.
 * Provides methods to interact with the games table in the database.
 */
public interface GameRepository extends JpaRepository<Game, UUID> {
    List<Game> findByStatus(GameStatus gameStatus);
}
