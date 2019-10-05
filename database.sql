BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "stations" (
	"stationID"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"name"	TEXT,
	"question"	TEXT,
	"answer"	TEXT,
	"x_val"	REAL,
	"y_val"	REAL
);
CREATE TABLE IF NOT EXISTS "results" (
	"sessionID"	INTEGER,
	"userID"	INTEGER,
	"stationID"	INTEGER,
	"userAnswer"	TEXT,
	"timestamp"	INTEGER,
	"numAttempts"	INTEGER,
	PRIMARY KEY("sessionID","userID","stationID"),
	FOREIGN KEY("userID") REFERENCES "users"("userID")
);
CREATE TABLE IF NOT EXISTS "users" (
	"userID"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"nickName"	TEXT
);
COMMIT;
