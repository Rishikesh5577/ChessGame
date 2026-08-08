package com.chessbet.controller;

import com.chessbet.dto.CancelFindMatchCommand;
import com.chessbet.dto.FindMatchCommand;
import com.chessbet.service.MatchmakingService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class MatchmakingController {
    private final MatchmakingService matchmakingService;

    public MatchmakingController(MatchmakingService matchmakingService) {
        this.matchmakingService = matchmakingService;
    }

    @MessageMapping("/match/find")
    public void findMatch(@Payload FindMatchCommand command) {
        matchmakingService.findMatch(command.playerId());
    }

    @MessageMapping("/match/cancelFind")
    public void cancelFind(@Payload CancelFindMatchCommand command) {
        matchmakingService.cancelFind(command.playerId());
    }
}
