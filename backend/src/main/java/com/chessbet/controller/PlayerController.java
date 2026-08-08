package com.chessbet.controller;

import com.chessbet.dto.ConnectPlayerCommand;
import com.chessbet.service.MatchmakingService;
import com.chessbet.service.OnlinePlayersService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
public class PlayerController {
    private final OnlinePlayersService onlinePlayersService;
    private final MatchmakingService matchmakingService;

    public PlayerController(OnlinePlayersService onlinePlayersService, MatchmakingService matchmakingService) {
        this.onlinePlayersService = onlinePlayersService;
        this.matchmakingService = matchmakingService;
    }

    @MessageMapping("/player/connect")
    public void connectPlayer(ConnectPlayerCommand command, @Header("simpSessionId") String sessionId) {
        onlinePlayersService.addPlayer(command.playerId(), sessionId);
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        var sessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        if (sessionId == null) {
            return;
        }
        var playerId = onlinePlayersService.removePlayerBySessionId(sessionId);
        if (playerId != null) {
            matchmakingService.cancelFind(playerId);
        }
    }
}
