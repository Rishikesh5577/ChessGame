package com.chessbet.controller;

import com.chessbet.dto.CancelGameCommand;
import com.chessbet.dto.CreateAnonymousGameCommand;
import com.chessbet.dto.CreateGameCommand;
import com.chessbet.dto.GameDto;
import com.chessbet.mapper.GameMapper;
import com.chessbet.service.GameService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class GameController {
    private final GameService gameService;

    public GameController(GameService gameService) {
        this.gameService = gameService;
    }

    @MessageMapping("/game/create")
    @SendTo("/topic/game.created")
    public GameDto createGame(@Payload CreateGameCommand command) {
        var game = gameService.createNewGame(command.hostPlayerId(), command.hostPlayerColor());
        return GameMapper.toDto(game);
    }

    @MessageMapping("/game/createAnonymous")
    @SendTo("/topic/game.created")
    public GameDto createAnonymousGame(@Payload CreateAnonymousGameCommand command) {
        var game = gameService.createNewAnonymousGame(command.hostPlayerId(), command.hostPlayerColor());
        return GameMapper.toDto(game);
    }

    @MessageMapping("/game/cancel")
    @SendTo("/topic/game.cancelled")
    public GameDto cancelGame(@Payload CancelGameCommand command) {
        var game = gameService.cancelGame(command.gameId());
        return GameMapper.toDto(game);
    }
}
