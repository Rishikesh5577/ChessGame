package com.chessbet.controller;

import com.chessbet.dto.*;
import com.chessbet.mapper.GameMapper;
import com.chessbet.model.GameStatus;
import com.chessbet.service.GameService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
public class GameRestController {
    private final GameService gameService;
    private final SimpMessagingTemplate messagingTemplate;

    public GameRestController(GameService gameService, SimpMessagingTemplate messagingTemplate) {
        this.gameService = gameService;
        this.messagingTemplate = messagingTemplate;
    }

    @GetMapping("/api/games")
    public ResponseEntity<List<GameDto>> getGame(@RequestParam(name = "gameStatus", required = false) GameStatus gameStatus) {
        var games = gameService.getGames(gameStatus);
        var gamesDto = new ArrayList<GameDto>();

        for (var game : games) {
            gamesDto.add(GameMapper.toDto(game));
        }

        return ResponseEntity.ok(gamesDto);
    }

    @GetMapping("/api/games/{id}")
    public ResponseEntity<GameDto> getGameById(@PathVariable("id") UUID id) {
        var game = gameService.getGameById(id);
        var gameDto = GameMapper.toDto(game);
        return ResponseEntity.ok(gameDto);
    }

    @PostMapping("/api/games")
    public ResponseEntity<GameDto> createGame(@RequestBody CreateGameCommand command) {
        var game = gameService.createNewGame(command.hostPlayerId(), command.hostPlayerColor());
        var gameDto = GameMapper.toDto(game);
        messagingTemplate.convertAndSend("/topic/game.created", gameDto);
        return ResponseEntity.ok(gameDto);
    }

    @PostMapping("/api/games/anonymous")
    public ResponseEntity<GameDto> createAnonymousGame(@RequestBody CreateAnonymousGameCommand command) {
        var game = gameService.createNewAnonymousGame(command.hostPlayerId(), command.hostPlayerColor());
        var gameDto = GameMapper.toDto(game);
        messagingTemplate.convertAndSend("/topic/game.created", gameDto);
        return ResponseEntity.ok(gameDto);
    }

    @PostMapping("/api/games/{id}/cancel")
    public ResponseEntity<GameDto> cancelGame(@PathVariable("id") UUID id) {
        var game = gameService.cancelGame(id);
        var gameDto = GameMapper.toDto(game);
        messagingTemplate.convertAndSend("/topic/game.cancelled", gameDto);
        return ResponseEntity.ok(gameDto);
    }
}
