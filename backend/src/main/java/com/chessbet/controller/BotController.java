package com.chessbet.controller;

import com.chessbet.dto.BotMoveCommand;
import com.chessbet.dto.CreateBotGameCommand;
import com.chessbet.engine.uci.UciEngineException;
import com.chessbet.mapper.GameMapper;
import com.chessbet.service.BotService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

/**
 * Games against the chess engine run over plain HTTP rather than the match WebSocket: there is no
 * second person to notify, and a request/response round trip keeps the position in lock step with
 * the engine.
 */
@RestController
public class BotController {
    private static final Logger log = LoggerFactory.getLogger(BotController.class);

    private final BotService botService;

    public BotController(BotService botService) {
        this.botService = botService;
    }

    @GetMapping("/api/bot/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
                "available", botService.isAvailable(),
                "reason", botService.getUnavailableReason() == null ? "" : botService.getUnavailableReason()));
    }

    @PostMapping("/api/games/vs-bot")
    public ResponseEntity<?> createBotGame(@RequestBody CreateBotGameCommand command) {
        if (command.hostPlayerId() == null) {
            return text(HttpStatus.BAD_REQUEST, "hostPlayerId is required");
        }

        if (!botService.isAvailable()) {
            return text(HttpStatus.SERVICE_UNAVAILABLE, botService.getUnavailableReason());
        }

        var game = botService.createGame(command);
        return ResponseEntity.ok(GameMapper.toDto(game));
    }

    @PostMapping("/api/games/{id}/bot-move")
    public ResponseEntity<?> playBotMove(@PathVariable("id") UUID id, @RequestBody(required = false) BotMoveCommand command) {
        try {
            return ResponseEntity.ok(botService.playTurn(id, command));
        } catch (NoSuchElementException e) {
            return text(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (IllegalArgumentException e) {
            return text(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IllegalStateException e) {
            return text(HttpStatus.CONFLICT, e.getMessage());
        } catch (UciEngineException e) {
            log.error("Chess engine failed while playing a bot move for game {}", id, e);
            return text(HttpStatus.SERVICE_UNAVAILABLE, "Chess engine is unavailable: " + e.getMessage());
        }
    }

    private static ResponseEntity<String> text(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .contentType(MediaType.TEXT_PLAIN)
                .body(message == null ? status.getReasonPhrase() : message);
    }
}
