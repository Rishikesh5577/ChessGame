package com.chessbet.repository;

import com.chessbet.model.Game;
import com.chessbet.model.GameStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.UUID;

/**
 * GameRepository interface.
 * Provides methods to interact with the games collection in MongoDB.
 */
public interface GameRepository extends MongoRepository<Game, UUID> {
    List<Game> findByStatus(GameStatus gameStatus);
}
