package dev.madhanraj.portfolio;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/games")
class LeaderboardController {
    private static final Pattern PLAYER_KEY = Pattern.compile("[A-Za-z0-9_-]{43}");
    private static final Pattern NICKNAME = Pattern.compile("[\\p{L}\\p{M}\\p{N} _-]{2,24}");
    private static final Map<String, Game> GAMES = Map.of(
            "memory", new Game(6, 10000, true),
            "reaction", new Game(1, 60000, true),
            "math", new Game(1, 10000, false));

    private final ObjectProvider<LeaderboardStore> stores;

    LeaderboardController(ObjectProvider<LeaderboardStore> stores) {
        this.stores = stores;
    }

    record Game(int minimum, int maximum, boolean lowerIsBetter) {}
    record NicknameRequest(String nickname) {}
    record ScoreRequest(JsonNode score) {}
    record ScoreResponse(int best) {}
    record Profile(String nickname, Map<String, Integer> scores) {}

    @GetMapping("/leaderboard/{id}")
    ResponseEntity<List<LeaderboardStore.Entry>> leaderboard(@PathVariable String id) {
        Game game = game(id);
        return noStore(store().leaderboard(id, game.lowerIsBetter()));
    }

    @PutMapping("/player")
    ResponseEntity<Profile> createPlayer(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false)
                                               String authorization, @RequestBody NicknameRequest request) {
        String nickname = request.nickname() == null ? "" : request.nickname().strip();
        if (!NICKNAME.matcher(nickname).matches() || nickname.codePoints().noneMatch(Character::isLetterOrDigit)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        LeaderboardStore store = store();
        return noStore(profile(store, store.savePlayer(hashKey(authorization), nickname)));
    }

    @GetMapping("/player")
    ResponseEntity<Profile> player(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false)
                                         String authorization) {
        LeaderboardStore store = store();
        return noStore(profile(store, player(store, authorization)));
    }

    @PutMapping("/scores/{id}")
    ResponseEntity<ScoreResponse> saveScore(@PathVariable String id,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody ScoreRequest request) {
        Game game = game(id);
        JsonNode value = request.score();
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt()
                || value.intValue() < game.minimum() || value.intValue() > game.maximum()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        LeaderboardStore store = store();
        int best = store.saveScore(player(store, authorization).id(), id, value.intValue(), game.lowerIsBetter());
        return noStore(new ScoreResponse(best));
    }

    @ExceptionHandler(DataAccessResourceFailureException.class)
    ResponseEntity<Void> databaseUnavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
    }

    private LeaderboardStore store() {
        LeaderboardStore store = stores.getIfAvailable();
        if (store == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        return store;
    }

    private static Game game(String id) {
        Game game = GAMES.get(id);
        if (game == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return game;
    }

    private static LeaderboardStore.Player player(LeaderboardStore store, String authorization) {
        return store.findPlayer(hashKey(authorization))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private static Profile profile(LeaderboardStore store, LeaderboardStore.Player player) {
        return new Profile(player.nickname(), store.scores(player.id()));
    }

    private static byte[] hashKey(String authorization) {
        String key = authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7) : "";
        if (!PLAYER_KEY.matcher(key).matches()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        try {
            return MessageDigest.getInstance("SHA-256").digest(key.getBytes(StandardCharsets.US_ASCII));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static <T> ResponseEntity<T> noStore(T value) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);
    }
}
