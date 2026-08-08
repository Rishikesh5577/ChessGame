package com.chessbet.model;

/**
 * Engine strength presets.
 * <p>
 * {@code uciElo} of {@code null} means the engine plays at full strength: no handicap,
 * which is far above any human rating.
 */
public enum BotDifficulty {
    EASY(1320, 3, 150, 1400),
    MEDIUM(1800, 8, 350, 1800),
    HARD(2400, 15, 600, 2400),
    IMPOSSIBLE(null, 20, 1200, 3200);

    private final Integer uciElo;
    private final int skillLevel;
    private final int moveTimeMs;
    private final int displayElo;

    BotDifficulty(Integer uciElo, int skillLevel, int moveTimeMs, int displayElo) {
        this.uciElo = uciElo;
        this.skillLevel = skillLevel;
        this.moveTimeMs = moveTimeMs;
        this.displayElo = displayElo;
    }

    public Integer getUciElo() {
        return uciElo;
    }

    public int getSkillLevel() {
        return skillLevel;
    }

    public int getMoveTimeMs() {
        return moveTimeMs;
    }

    public int getDisplayElo() {
        return displayElo;
    }

    public boolean isLimited() {
        return uciElo != null;
    }
}
