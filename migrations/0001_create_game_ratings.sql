CREATE TABLE game_ratings (
  game_id TEXT PRIMARY KEY NOT NULL,
  total_rating REAL NOT NULL DEFAULT 0 CHECK (total_rating >= 0),
  vote_count INTEGER NOT NULL DEFAULT 0 CHECK (vote_count >= 0)
) STRICT;

INSERT INTO game_ratings (game_id) VALUES
  ('run-sheep'),
  ('sheep-doom'),
  ('sheep-pac'),
  ('pvz'),
  ('gta-sa'),
  ('fnaf1'),
  ('fnaf2'),
  ('fnaf3'),
  ('fnaf4');
