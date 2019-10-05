const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const db = new sqlite3.Database('./database.db');
const port = 3000;
const maxNumAttempts = 3;

var sessionID = undefined;

// Get sessionID
app.get('/session', (req, res) => {
  if (sessionID == undefined) {
    res.status(500);
    res.send("No session active.");
  }
  else {
    res.status(200);
    res.send({ sessionID: sessionID });
  }
});

// Post sets sessionID
app.post('/session', (req, res) => {
  var newSession = req.body.sessionID;

  if (!Number.isInteger(newSession)) {
    res.status(400);
    res.send("Invalid session ID: '" + String(sessionID) + "'");
  }
  else {
    sessionID = newSession;
    res.status(200);
    res.end();
  }
});

// Get list of user IDs
app.get('/users', (req, res) => {
  db.all('SELECT userID FROM users', [], (err, rows) => {
    res.send(rows.map(r => r.userID));
  });
});

// Get information for user with specific ID
app.get('/users/:userID', (req, res) => {
  var userID = req.params.userID;

  db.get('SELECT * FROM users where userID = ?', [userID], (err, row) => {
    if (err) {
      res.status(404);
      res.end();
    }
    else {
      res.send(row);
    }
  });
});

// Create or update user information for userID
app.post('/users/:userID', (req, res) => {
  var userID = req.params.userID;
  var nickName = req.body.nickName;

  if (nickName == undefined) {
    res.status(400);
    res.send("Missing parameters");
  }
  else {
    db.run('INSERT OR REPLACE INTO users (userID, nickName) VALUES(?, ?)', [userID, nickName], (err) => {
      if (err) {
        res.status(500);
        res.send(err.toString());
      }
      else {
        res.status(200);
        res.end();
      }
    });
  }
});

// Get the results of a specific user
app.get('/results/:userID', (req, res) => {
  var userID = req.params.userID;

  db.all('SELECT * FROM results WHERE userID = ?', [userID], (err, rows) => {
    if (err) {
      res.status(404);
      res.end();
    }
    else {
      res.send(rows);
    }
  });
});

// Get the results of a specific user at a specific station
app.get('/results/:userID/:stationID', (req, res) => {
  var userID = req.params.userID;
  var stationID = req.params.stationID;

  db.all('SELECT * FROM results WHERE userID = ? AND stationID = ?', [userID, stationID], (err, rows) => {
    res.send(rows);
  });
});

app.post('/answer', (req, res) => {
  var timestamp = Date.now();

  var body = req.body;

  var userID = body.userID;
  var stationID = body.stationID;
  var attemptAnswer = body.answer;

  if (!Number.isInteger(userID)
      || !Number.isInteger(stationID)
      || !Number.isInteger(attemptAnswer)) {
    res.status(400);
    res.send("Bad parameters");
  }
  else {
    db.get('SELECT answer FROM stations WHERE stationID = ?', [stationID], (err, row) => {
      if (err) {
        res.status(500);
        res.send(err);
      }
      else if (row == undefined) {
        res.status(404);
        res.send("No such station '" + stationID.toString() + "'");
      }
      else {
        var realAnswer = row.answer;

        db.get('SELECT COUNT(*) as count FROM results WHERE userID = ? AND stationID = ?', [userID, stationID], (err, count) => {
          if (err) {
            res.status(500);
            res.send("Error querying user");
          }
          else if (count.count >= maxNumAttempts) {
            res.status(400);
            res.send("Too many attempts");
          }
          else {
            db.run('INSERT INTO results (userID, stationID, userAnswer, timestamp) VALUES(?, ?, ?, ?)',
                   [userID, stationID, attemptAnswer, timestamp],
                   (err) =>
                   {
                     if (err) {
                       res.status(500);
                       console.log(err);
                       res.send(err);
                     }
                     else {
                       res.status(200);
                       res.send(attemptAnswer == realAnswer);
                     }
                   });
          }
        });
      }
    });
  }
});

//For the Leaderboard: Gets the session's user scores, tracking the number questions they've answered correctly and incorrectly.
app.get('/leaderboard/:sessionID', (req, res) => {
  var sessionID = req.params.sessionID;
  console.log(sessionID);
  var query = `SELECT users.userID, users.nickName, results.userAnswer, stations.answer AS correctAnswer
                  FROM users
                  JOIN results ON users.userID=results.userID
                    JOIN stations ON results.stationID=stations.stationID
                    WHERE results.sessionID = ?
                    ORDER BY users.userID;`;

  console.log(db);
  db.all(query, [sessionID], (err, rows) => {
    if (err) {
      res.status(500);
      res.send(err);
    }
    else if (rows.length == 0) {
      res.send([]);
    }
    else {
      console.log(rows);
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
            }
            leadResults.push(userInfo);
          }
          userID = row.userID;
          nickName = row.nickName;
          numCorrect = 0;
          numWrong = 0;
        }
        if (row.userAnswer == row.correctAnwser) {
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
      }
      leadResults.push(userInfo);
      res.send(leadResults);
    }
  });
});

// Get a user's detailed status, including the answers they've given at each of the stations, as well as information about the station
app.get('/userDetail/:sessionID/:userID', (req, res) => {
  var sessionID = req.params.sessionID;
  var userID = req.params.userID;
  var query = `SELECT results.sessionID, users.userID, users.nickName, results.userAnswer, stations.stationID, 
                     stations.x_val, stations.y_val, results.timestamp, stations.answer
                FROM users
                JOIN results ON users.userID=results.userID
                  JOIN stations ON results.stationID=stations.stationID 
                  WHERE results.sessionID = ? AND users.userID = ?
                  ORDER BY timestamp;`;
                           
  db.get(query, [sessionID, userID], (err, row) => {
    if (err) {
      res.status(500);
      res.send(err);
    }
    else {
      res.send(row);
    }
  });
});

app.listen(port);