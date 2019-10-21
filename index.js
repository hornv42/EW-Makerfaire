const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());
app.use('/static', express.static('static'));

const db = new sqlite3.Database('./database.db');
const port = 3000;
const maxNumAttempts = 3;

var sessionID = undefined;

// Get sessionID
app.get('/session', (req, res) => {
  if (sessionID == undefined) {
    res.status(500).send("No session active.");
  }
  else {
    res.status(200).send({ sessionID: sessionID });
  }
});

// Post sets sessionID
app.post('/session', (req, res) => {
  var newSession = req.body.sessionID;

  if (!Number.isInteger(newSession)) {
    res.status(400).send("Invalid session ID: '" + String(sessionID) + "'");
  }
  else {
    sessionID = newSession;
    res.status(200).end();
  }
});

// Get list of user IDs
app.get('/users', (req, res) => {
  db.all('SELECT userID FROM users', [], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.status(200).send(rows.map(r => r.userID));
    }
  });
});

// Get information for user with specific ID
app.get('/users/:userID', (req, res) => {
  var userID = req.params.userID;

  db.get('SELECT * FROM users where userID = ?', [userID], (err, row) => {
    if (err) {
      res.status(500).send(err);
    }
    else if (row === undefined) {
      res.status(404).end();
    }
    else {
      res.status(200).send(row);
    }
  });
});

// Create or update user information for userID
app.get('/createUser', (req, res) => {
  var userID = req.query.userID;
  var nickName = req.query.nickName;

  if (userID == undefined
      || nickName == undefined) {
    res.status(400).send("Missing parameters");
  }
  else {
    db.run('INSERT OR REPLACE INTO users (userID, nickName) VALUES(?, ?)', [userID, nickName], (err) => {
      if (err) {
        res.status(500).send(err);
      }
      else {
        res.status(200).end();
      }
    });
  }
});

// Get the results of a specific user
app.get('/results/:userID', (req, res) => {
  var userID = req.params.userID;

  db.all('SELECT * FROM results WHERE userID = ?', [userID], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.status(200).send(rows);
    }
  });
});

// Get the results of a specific user at a specific station
app.get('/results/:userID/:stationID', (req, res) => {
  var userID = req.params.userID;
  var stationID = req.params.stationID;

  db.all('SELECT * FROM results WHERE userID = ? AND stationID = ?', [userID, stationID], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.status(200).send(rows);
    }
  });
});

app.post('/answer', (req, res) => {
  var timestamp = Date.now();

  var body = req.body;

  var userID = body.userID;
  var stationID = body.stationID;
  var attemptAnswer = body.answer;

  if (sessionID == undefined) {
    res.status(500);
    res.send("No session active");
  }
  else if (!Number.isInteger(userID)
    || !Number.isInteger(stationID)
    || !Number.isInteger(attemptAnswer)) {
    res.status(400).send("Bad parameters");
  }
  else {
    db.run(`INSERT INTO results
            (sessionID, userID, stationID, userAnswer, timestamp, numAttempts)
            VALUES($sessionID, $userID, $stationID, $userAnswer, $timestamp, 1)
            ON CONFLICT(sessionID, userID, stationID)
            DO UPDATE SET
            userAnswer = $userAnswer,
            timestamp = $timestamp,
            numAttempts = numAttempts + 1
            WHERE numAttempts < $maxNumAttempts
            AND NOT EXISTS (SELECT * FROM stations  WHERE stationID = results.stationID AND answer = userAnswer)`,
      {
        $sessionID: sessionID,
        $userID: userID,
        $stationID: stationID,
        $userAnswer: attemptAnswer,
        $timestamp: timestamp,
        $maxNumAttempts: maxNumAttempts
      },
      (err) => {
        if (err) {
          res.status(500).send(err);
        }
        else {
          // Check if the latest answer is correct
          db.get(`SELECT stations.answer = results.userAnswer as correct
                       FROM stations
                       JOIN results ON stations.stationID = results.stationID
                       WHERE results.sessionID = ?
                       AND results.userID = ?
                       AND results.stationID = ?`,
            [sessionID, userID, stationID],
            (err, row) => {
              if (err) {
                res.status(500).send(err);
              }
              else if (row === undefined) {
                res.status(500).end();
              }
              else {
                res.status(200).send(row.correct == 1);
              }
            });
        }
      });
  }
});

//For the leaderboard: Gets the session's user scores, tracking the number questions they've answered correctly and incorrectly.
app.get('/leaderboard/:sessionID', (req, res) => {
  var sessionID = req.params.sessionID;

  var query = `SELECT users.userID, users.nickName, stations.answer = results.userAnswer as correct
                  FROM users
                  JOIN results ON users.userID=results.userID
                    JOIN stations ON results.stationID=stations.stationID
                    WHERE results.sessionID = ?
                    ORDER BY users.userID;`;

  db.all(query, [sessionID], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else if (rows.length == 0) {
      res.status(200).send([]);
    }
    else {
      var leadResults = [];
      var userID = null;
      var nickName = null;
      var numCorrect = null;
      var numWrong = null;
      rows.forEach((row) => {
        if (userID != row.userID) {
          if (userID != null) {
            var userInfo = {
              "userID": userID,
              "nickName": nickName,
              "numCorrect": numCorrect,
              "numIncorrect": numWrong
            };

            leadResults.push(userInfo);
          }
          userID = row.userID;
          nickName = row.nickName;
          numCorrect = 0;
          numWrong = 0;
        }
        if (row.correct == 1) {
          numCorrect++;
        }
        else {
          numWrong++;
        }
      });

      var userInfo = {
        "userID": userID,
        "nickName": nickName,
        "numCorrect": numCorrect,
        "numIncorrect": numWrong
      };

      leadResults.push(userInfo);
      res.status(200).send(leadResults);
    }
  });
});

// userDetail: Get a user's detailed status, including the answers they've given at each of the stations,
// as well as information about the station.
app.get('/userDetail/:sessionID/:userID', (req, res) => {
  var sessionID = req.params.sessionID;
  var userID = req.params.userID;

  var query = `SELECT stationID, nickName, x_val, y_val, answer = userAnswer as correct, timestamp
                FROM stations
                LEFT JOIN (SELECT stationID as rStationID, userAnswer, timestamp FROM results WHERE sessionID = ? AND userID = ?) ON rStationID = stations.stationID
                JOIN (select nickName FROM users WHERE userID = ?)
                ORDER BY timestamp;`;

  db.all(query, [sessionID, userID, userID], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else if (rows.length == 0) {
      res.status(404).send("No results for user '" + String(userID) + "'");
    }
    else {
      var convertRow = row => {
        var answer;

        if (row.timestamp == null) {
          answer = null;
        }
        else {
          answer = {
            "correct": row.correct == 1,
            "timestamp": row.timestamp
          };
        }

        return {
          "stationID": row.stationID,
          "x_val": row.x_val,
          "y_val": row.y_val,
          "answer": answer
        };
      };

      var stations = rows.map(convertRow);
      var userInfo = {
        "userID": userID,
        "nickName": rows[0].nickName,
        "stations": stations
      };

      res.send(userInfo);
    }
  });
});

// Create or update station information
app.get('/createStation', (req, res) => {
  var stationID = req.query.stationID;
  var name = req.query.name;
  var question = req.query.question;
  var answer = req.query.answer;
  var x_val = req.query.x_val;
  var y_val = req.query.y_val;

  if (stationID == undefined
      || name == undefined
      || question == undefined
      || answer == undefined
      || x_val == undefined
      || y_val == undefined) {
    res.status(400).send("Missing parameters");
  }
  else {
    db.run(`INSERT OR REPLACE INTO stations (stationID, name, question, answer, x_val, y_val)
            VALUES(?, ?, ?, ?, ?, ?)`,
           [stationID, name, question, answer, x_val, y_val], function (err, row) {
             console.log(this);
             if (err) {
               res.status(500).send(err);
             }
             else {
               res.status(200).send("Station created");
             }
           });
  }
});
app.listen(port);
