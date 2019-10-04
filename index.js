const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const db = new sqlite3.Database('./database.db');
const port = 3000;
const maxNumAttempts = 3;

var sessionID = undefined;

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

app.listen(port);
