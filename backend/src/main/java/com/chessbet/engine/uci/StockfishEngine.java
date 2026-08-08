package com.chessbet.engine.uci;

import com.chessbet.model.BotDifficulty;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * Thin wrapper around a single Stockfish process speaking the UCI protocol over stdin/stdout.
 * <p>
 * The engine owns all chess rules: positions are described as a start position plus the list of
 * moves played, so the server never has to generate or validate moves itself.
 * <p>
 * Instances are <em>not</em> thread safe. A process can only run one search at a time, so access is
 * serialised by {@link StockfishEnginePool}.
 */
public class StockfishEngine implements AutoCloseable {
    private static final Pattern PERFT_MOVE = Pattern.compile("^([a-h][1-8][a-h][1-8][qrbnQRBN]?):\\s*\\d+$");
    private static final long HANDSHAKE_TIMEOUT_MS = 10_000;

    private final Process process;
    private final BufferedWriter writer;
    private final BufferedReader reader;

    private BotDifficulty configuredDifficulty;

    StockfishEngine(String enginePath, int threads, int hashMb) {
        try {
            var builder = new ProcessBuilder(enginePath);
            builder.redirectErrorStream(false);
            builder.redirectError(ProcessBuilder.Redirect.DISCARD);
            process = builder.start();
        } catch (IOException e) {
            throw new UciEngineException("Could not start chess engine at '%s'".formatted(enginePath), e);
        }

        writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));
        reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8));

        send("uci");
        awaitLine("uciok", HANDSHAKE_TIMEOUT_MS);
        setOption("Threads", String.valueOf(threads));
        setOption("Hash", String.valueOf(hashMb));
        awaitReady(HANDSHAKE_TIMEOUT_MS);
    }

    public boolean isAlive() {
        return process.isAlive();
    }

    /**
     * Applies a strength preset. Full strength ignores the UCI_Elo handicap entirely.
     */
    public void applyDifficulty(BotDifficulty difficulty) {
        if (difficulty == configuredDifficulty) {
            return;
        }

        if (difficulty.isLimited()) {
            setOption("UCI_LimitStrength", "true");
            setOption("UCI_Elo", String.valueOf(difficulty.getUciElo()));
        } else {
            setOption("UCI_LimitStrength", "false");
        }

        setOption("Skill Level", String.valueOf(difficulty.getSkillLevel()));
        awaitReady(HANDSHAKE_TIMEOUT_MS);
        configuredDifficulty = difficulty;
    }

    /**
     * Searches the position reached by playing {@code moves} from the initial position.
     *
     * @return the best move in UCI notation (for example {@code e2e4} or {@code e7e8q}),
     *         or {@code null} when the game is already over.
     */
    public String findBestMove(List<String> moves, int moveTimeMs) {
        setPosition(moves);
        send("go movetime " + moveTimeMs);

        var line = awaitLine("bestmove", moveTimeMs + HANDSHAKE_TIMEOUT_MS);
        var parts = line.split("\\s+");

        if (parts.length < 2 || "(none)".equals(parts[1]) || "0000".equals(parts[1])) {
            return null;
        }

        return parts[1];
    }

    /**
     * Lists every legal move in the position reached by playing {@code moves}.
     * Used to reject illegal client moves before they reach the engine's game state.
     */
    public List<String> listLegalMoves(List<String> moves) {
        setPosition(moves);
        send("go perft 1");

        var legal = new ArrayList<String>();
        var deadline = deadlineFrom(HANDSHAKE_TIMEOUT_MS);

        while (true) {
            var line = readLine(deadline).trim();

            if (line.startsWith("Nodes searched")) {
                return legal;
            }

            var matcher = PERFT_MOVE.matcher(line);
            if (matcher.matches()) {
                legal.add(matcher.group(1).toLowerCase());
            }
        }
    }

    private void setPosition(List<String> moves) {
        if (moves.isEmpty()) {
            send("position startpos");
        } else {
            send("position startpos moves " + String.join(" ", moves));
        }
    }

    private void setOption(String name, String value) {
        send("setoption name %s value %s".formatted(name, value));
    }

    private void awaitReady(long timeoutMs) {
        send("isready");
        awaitLine("readyok", timeoutMs);
    }

    private String awaitLine(String prefix, long timeoutMs) {
        var deadline = deadlineFrom(timeoutMs);

        while (true) {
            var line = readLine(deadline);
            if (line.startsWith(prefix)) {
                return line;
            }
        }
    }

    private void send(String command) {
        try {
            writer.write(command);
            writer.write('\n');
            writer.flush();
        } catch (IOException e) {
            throw new UciEngineException("Failed to send '%s' to the engine".formatted(command), e);
        }
    }

    private String readLine(long deadlineNanos) {
        try {
            while (true) {
                if (reader.ready()) {
                    var line = reader.readLine();
                    if (line == null) {
                        throw new UciEngineException("Engine closed its output stream");
                    }
                    return line;
                }

                if (!process.isAlive()) {
                    throw new UciEngineException("Engine process died");
                }

                if (System.nanoTime() > deadlineNanos) {
                    throw new UciEngineException("Timed out waiting for an engine response");
                }

                TimeUnit.MILLISECONDS.sleep(2);
            }
        } catch (IOException e) {
            throw new UciEngineException("Failed to read from the engine", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new UciEngineException("Interrupted while waiting for the engine", e);
        }
    }

    private static long deadlineFrom(long timeoutMs) {
        return System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
    }

    @Override
    public void close() {
        try {
            if (process.isAlive()) {
                send("quit");
                process.waitFor(2, TimeUnit.SECONDS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (RuntimeException ignored) {
            // The process is going away regardless; fall through to destroy it.
        } finally {
            process.destroy();
        }
    }
}
