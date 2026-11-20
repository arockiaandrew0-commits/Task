CREATE TABLE IF NOT EXISTS tasks (
    sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id text UNIQUE NOT NULL,
    title text NOT NULL,
    completed boolean NOT NULL DEFAULT false
);
