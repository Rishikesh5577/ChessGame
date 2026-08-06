package com.chessbet.repository;

import com.chessbet.model.Player;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.UUID;

/**
 * PlayerRepository interface.
 * Provides methods to interact with the players collection in MongoDB.
 */
public interface PlayerRepository extends MongoRepository<Player, UUID> {
}
