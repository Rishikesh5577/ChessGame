package com.chessbet.engine.uci;

public class UciEngineException extends RuntimeException {
    public UciEngineException(String message) {
        super(message);
    }

    public UciEngineException(String message, Throwable cause) {
        super(message, cause);
    }
}
