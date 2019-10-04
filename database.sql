BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "results" (
  "resultID"	INTEGER PRIMARY KEY AUTOINCREMENT,
  "userID"	INTEGER,
  "stationID"	INTEGER,
  "userAnswer"	INTEGER,
  "timestamp"	INTEGER
);
CREATE TABLE IF NOT EXISTS "users" (
  "userID"	INTEGER PRIMARY KEY AUTOINCREMENT,
  "nickName"	TEXT
);
CREATE TABLE IF NOT EXISTS "stations" (
  "stationID"	INTEGER PRIMARY KEY AUTOINCREMENT,
  "name"	TEXT,
  "question"	TEXT,
  "answer"	INTEGER,
  "x_val"	REAL,
  "y_val"	REAL
);
COMMIT;
