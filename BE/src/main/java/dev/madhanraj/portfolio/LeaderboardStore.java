package dev.madhanraj.portfolio;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;

final class LeaderboardStore {
    record Player(UUID id, String nickname) {}
    record Entry(String nickname, int score) {}

    private final JdbcClient database;

    LeaderboardStore(JdbcClient database) {
        this.database = database;
    }

    Player savePlayer(byte[] keyHash, String nickname) {
        return database.sql("""
                INSERT INTO game_player (id, key_hash, nickname) VALUES (:id, :hash, :nickname)
                ON CONFLICT (key_hash) DO UPDATE SET nickname = EXCLUDED.nickname
                RETURNING id, nickname
                """).param("id", UUID.randomUUID()).param("hash", keyHash).param("nickname", nickname)
                .query((result, row) -> new Player(result.getObject("id", UUID.class), result.getString("nickname")))
                .single();
    }

    Optional<Player> findPlayer(byte[] keyHash) {
        return database.sql("SELECT id, nickname FROM game_player WHERE key_hash = :hash")
                .param("hash", keyHash)
                .query((result, row) -> new Player(result.getObject("id", UUID.class), result.getString("nickname")))
                .optional();
    }

    Map<String, Integer> scores(UUID playerId) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        database.sql("SELECT game, score FROM game_best_score WHERE player_id = :player")
                .param("player", playerId)
                .query((result, row) -> Map.entry(result.getString("game"), result.getInt("score")))
                .list().forEach(entry -> scores.put(entry.getKey(), entry.getValue()));
        return scores;
    }

    int saveScore(UUID playerId, String game, int value, boolean lowerIsBetter) {
        String comparison = lowerIsBetter ? "<" : ">";
        return database.sql("""
                INSERT INTO game_best_score (player_id, game, score) VALUES (:player, :game, :score)
                ON CONFLICT (player_id, game) DO UPDATE SET score = EXCLUDED.score,
                    achieved_at = CURRENT_TIMESTAMP
                WHERE EXCLUDED.score %s game_best_score.score
                RETURNING score
                """.formatted(comparison)).param("player", playerId).param("game", game).param("score", value)
                .query(Integer.class).optional().orElseGet(() ->
                        database.sql("SELECT score FROM game_best_score WHERE player_id = :player AND game = :game")
                                .param("player", playerId).param("game", game).query(Integer.class).single());
    }

    List<Entry> leaderboard(String game, boolean lowerIsBetter) {
        String direction = lowerIsBetter ? "ASC" : "DESC";
        return database.sql("""
                SELECT player.nickname, best.score FROM game_best_score best
                JOIN game_player player ON player.id = best.player_id
                WHERE best.game = :game
                ORDER BY best.score %s, best.achieved_at ASC, best.player_id ASC
                LIMIT 10
                """.formatted(direction)).param("game", game)
                .query((result, row) -> new Entry(result.getString("nickname"), result.getInt("score"))).list();
    }
}
