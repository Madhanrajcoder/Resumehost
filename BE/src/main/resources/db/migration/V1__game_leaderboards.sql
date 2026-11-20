CREATE TABLE game_player (
    id UUID PRIMARY KEY,
    key_hash BYTEA NOT NULL UNIQUE CHECK (octet_length(key_hash) = 32),
    nickname VARCHAR(24) NOT NULL CHECK (char_length(nickname) BETWEEN 2 AND 24),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_best_score (
    player_id UUID NOT NULL REFERENCES game_player(id) ON DELETE CASCADE,
    game VARCHAR(16) NOT NULL CHECK (game IN ('memory', 'reaction', 'math')),
    score INTEGER NOT NULL CHECK (
        (game = 'memory' AND score BETWEEN 6 AND 10000) OR
        (game = 'reaction' AND score BETWEEN 1 AND 60000) OR
        (game = 'math' AND score BETWEEN 1 AND 10000)
    ),
    achieved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, game)
);

CREATE INDEX game_best_score_lookup
    ON game_best_score (game, score, achieved_at, player_id);
