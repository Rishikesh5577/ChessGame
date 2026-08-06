package com.chessbet.core;

public record PagedQuery(String orderBy, int page, int pageSize) {
}
