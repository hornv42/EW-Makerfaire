const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.urlencoded());
app.use('/static', express.static('static'));

const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                                err => {
                                  if (err) {
                                    console.error("Error opening/creating database: " + err.message);
                                  }
                                  else {
                                    // Ensure the tables exist
                                    db.run(`CREATE TABLE IF NOT EXISTS "users"
                                              (
                                                "userID" INTEGER PRIMARY KEY AUTOINCREMENT,
                                                 "nickName" TEXT
                                              )`, err => {
                                                if (err) {
                                                  console.error("Error creating users table: " + err.message);
                                                }
                                              });
                                    db.run(`CREATE TABLE IF NOT EXISTS "stations"
                                              (
                                                "stationID" INTEGER PRIMARY KEY AUTOINCREMENT,
                                                "name" TEXT,
                                                "question" TEXT,
                                                 "answer" TEXT,
                                                 "x_val" REAL,
                                                 "y_val" REAL
                                              )`, err => {
                                                if (err) {
                                                  console.error("Error creating stations table: " + err.message);
                                                }
                                              });
                                    db.run(`CREATE TABLE IF NOT EXISTS "results"
                                             (
                                               "sessionID" INTEGER,
                                               "userID" INTEGER,
                                               "stationID" INTEGER,
                                               "userAnswer" INTEGER,
                                               "timestamp" INTEGER,
                                               "numAttempts" INTEGER,
                                               PRIMARY KEY("userID","stationID","sessionID")
                                             )`, err => {
                                               if (err) {
                                                 console.error("Error creating results table: " + err.message);
                                               }
                                             });
                                  }
                                });
const port = 3000;
const maxNumAttempts = 3;

let sessionID = undefined;

function validUserID(id) {
  return typeof (id) === "string" && /^\d{4}$/.test(id);
}

// Get sessionID
app.get('/session', (req, res) => {
  res.status(200).send({ sessionID: sessionID });
});

// Post sets sessionID
app.post('/session', (req, res) => {
  let newSession = req.body.sessionID;

  if (newSession == undefined) {
    res.status(400).send("Invalid session ID: '" + String(newSession) + "'");
  }
  else {
    sessionID = parseInt(newSession);
    res.status(200).send("Session ID set to " + newSession);
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
  let userID = req.params.userID;

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
app.post('/createUser', (req, res) => {
  let userID = req.body.userID;
  let nickName = req.body.nickName;

  if (userID == undefined
    || nickName == undefined) {
    res.status(400).send("Missing parameters");
  }
  else if (!validUserID(userID)) {
    res.status(400).send("User ID should be 4 digits");
  }
  else {
    db.run('INSERT OR IGNORE INTO users (userID, nickName) VALUES(?, ?)', [userID, nickName], function (err) {
      if (err) {
        res.status(500).send(err);
      }
      else if (this.changes == 0) {
        res.status(400).send("User '" + userID + "' already exists");
      }
      else {
        res.status(200).send("User created");
      }
    });
  }
});

app.post('/updateUser', (req, res) => {
  let userID = req.body.userID;
  let nickName = req.body.nickName;

  if (userID == undefined
    || nickName == undefined) {
    res.status(400).send("Missing parameters");
  }
  else {
    db.run(`UPDATE users SET nickName = ? WHERE userID = ?`, [nickName, userID], function (err) {
      if (err) {
        res.status(500).send(err);
      }
      else if (this.changes == 0) {
        res.status(400).send("No such user '" + userID + "'");
      }
      else {
        res.status(200).send("User updated");
      }
    });
  }
});

// Get the results of a specific user
app.get('/results/:userID', (req, res) => {
  let userID = req.params.userID;

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
  let userID = req.params.userID;
  let stationID = req.params.stationID;

  db.all('SELECT * FROM results WHERE userID = ? AND stationID = ?', [userID, stationID], (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.status(200).send(rows);
    }
  });
});

app.post('/deleteResult', (req, res) => {
  let userID = req.body.userID;
  let stationID = req.body.stationID;
  if (sessionID == undefined) {
    res.status(500).send("No Active Session");
  }
  else {
    db.run(`DELETE FROM results
            WHERE sessionID = ?
            AND userID = ?
            AND stationID = ?`, [sessionID, userID, stationID], function (err) {
      if (err) {
        res.status(500).send(err);
      }
      else if (this.changes == 0) {
        res.status(400).send("No such user/station combination '" + userID + "/" + stationID + "'");
      }
      else {
        res.status(200).send("Result cleared");
      }
    });
  }
});

//For the leaderboard: Gets the session's user scores, tracking the number questions they've answered correctly and incorrectly.
app.get('/leaderboard/:sessionID', (req, res) => {
  let sessionID = req.params.sessionID;

  let query = `SELECT users.userID, users.nickName, results.userAnswer as correct
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
      let leadResults = [];
      let userID = null;
      let nickName = null;
      let numCorrect = null;
      let numWrong = null;

      var collectResult = () => {
        leadResults.push({
          "userID": userID,
          "nickName": nickName,
          "numCorrect": numCorrect,
          "numIncorrect": numWrong
        });
      };

      rows.forEach((row) => {
        if (userID != row.userID) {
          if (userID != null) {
            collectResult();
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

      // Collect the 'last' result
      collectResult();

      leadResults.sort((a, b) => b.numCorrect - a.numCorrect);
      res.status(200).send(leadResults);
    }
  });
});

// userDetail: Get a user's detailed status, including the answers they've given at each of the stations,
// as well as information about the station.
app.get('/userDetail/:sessionID/:userID', (req, res) => {
  let sessionID = req.params.sessionID;
  let userID = req.params.userID;

  let query = `SELECT stationID, nickName, x_val, y_val, userAnswer as correct, timestamp
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
      let convertRow = row => {
        let answer;

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

      let stations = rows.map(convertRow);
      let userInfo = {
        "userID": userID,
        "nickName": rows[0].nickName,
        "stations": stations
      };

      res.send(userInfo);
    }
  });
});

app.get('/stations', (req, res) => {
  db.all(`SELECT stationID FROM stations`, (err, rows) => {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.status(200).send(rows.map(r => r.stationID));
    }
  });
});

app.get('/stations/:stationID', (req, res) => {
  let stationID = req.params.stationID;
  db.get(`SELECT * FROM stations WHERE stationID = ?`, [stationID], (err, row) => {
    if (err) {
      res.status(500).send(err);
    }
    else if (row == undefined) {
      res.status(400).send("Station '" + stationID + "' does not exist");
    }
    else {
      res.status(200).send(row);
    }
  });
});

// Create or update station information
app.post('/createStation', (req, res) => {
  let stationID = req.body.stationID;
  let name = req.body.name;
  let question = req.body.question;
  let answer = req.body.answer;
  let x_val = req.body.x_val;
  let y_val = req.body.y_val;

  if (stationID == undefined
    || name == undefined
    || question == undefined
    || answer == undefined
    || x_val == undefined
    || y_val == undefined) {
    res.status(400).send("Missing parameters");
  }
  else {
    db.run(`INSERT OR IGNORE INTO stations (stationID, name, question, answer, x_val, y_val)
            VALUES(?, ?, ?, ?, ?, ?)`,
      [stationID, name, question, answer, x_val, y_val], function (err) {
        if (err) {
          res.status(500).send(err);
        }
        else if (this.changes == 0) {
          res.status(400).send("Station '" + stationID + "' already exists");
        }
        else {
          res.status(200).send("Station created");
        }
      });
  }
});

app.post('/updateStation', (req, res) => {
  let stationID = req.body.stationID;
  let name = req.body.name;
  let question = req.body.question;
  let answer = req.body.answer;
  let x_val = req.body.x_val;
  let y_val = req.body.y_val;

  if (stationID == undefined
    || (name == undefined
      && question == undefined
      && answer == undefined
      && x_val == undefined
      && y_val == undefined)) {
    res.status(400).send("Missing parameters");
  }
  else {
    db.run(`UPDATE stations
            SET
              name = coalesce(?, name),
              question = coalesce(?, question),
              answer = coalesce(?, answer),
              x_val = coalesce(?, x_val),
              y_val = coalesce(?, y_val)
           WHERE stationID = ?`,
      [name || null, question || null, answer || null, x_val || null, y_val || null, stationID], function (err) {
        if (err) {
          res.status(500).send(err);
        }
        else if (this.changes == 0) {
          res.status(404).send("Station '" + stationID + "' does not exist");
        }
        else {
          res.status(200).send("Station updated");
        }
      });
  }
});

const ErrorNodeID = 1;               //Bad Node ID
const ErrorQueryID = 2;              //Bad Query ID
const ErrorUserID = 3;               //Non-registered User
const ErrorQueryValue = 4;           //Invalid Value
const ErrorUserRepeat = 5;           //User has already entered a value
const ErrorUndefinedData = 6;        //If any of the data is UNDEFINED - send this error
const ErrorUserLockout = 7;
const StrScavengerOK = "Scavenger: OK";
const StrErrorNodeID = "Scavenger: ERROR" + ErrorNodeID;
const StrErrorQueryID = "Scavenger: ERROR" + ErrorQueryID;
const StrErrorUserID = "Scavenger: ERROR" + ErrorUserID;
const StrErrorQueryValue = "Scavenger: ERROR" + ErrorQueryValue;
const StrErrorUserRepeat = "Scavenger: ERROR" + ErrorUserRepeat;
const StrErrorUndefinedData = "Scavenger: ERROR" + ErrorUndefinedData;
const StrErrorUserLockout = "Scavenger: ERROR" + ErrorUserLockout;

app.get('/server-check', (req, res) => {
  let nodeID = req.query.nodeID;
  let time = req.query.time;
  console.log("ServerCheck ID: " + nodeID);
  //Just Acknowledge command received  - The NODE is just checking server is on-line
  //  before making other requests.
  //  ALWAYS just send a OK response
  //  Not working if NODE is valid yet
  res.status(200).send(StrScavengerOK);
});

//http://127.0.0.1:3000/heartbeat?node=20&time=1000        //WORKS - YEA
app.get('/heartbeat', (req, res) => {
  let time = req.query.time;
  let nodeID = req.query.nodeID; //either a value or undefined

  console.log("Heartbeat - nodeID: " + nodeID + " -- time: " + time);

  //1) Node is Letting Server know it is alive
  //      Server needs to keep track of all nodes and send ALERT if a Node does not ping periodically
  //2) Server needs to validate that a NODE-ID has been loaded (i.e. ran CONFIG)
  //      If not configed - then error code is sent in response
  //3) Check for Undefined Vars and send Error if critical data missing (400 Code)

  //TEST CODE - CHECK FOR ID OVER 90 to create error condition
  if (!nodeID) {
    console.log("HeartBeat: Test Code - nodeID = 0 (undefined)");
    res.status(400).send("Scavenger: ERROR" + ErrorUndefinedData);
    return;
  }

  if (nodeID >= 90) {
    //Not certain if we should send 400 code (current NODE F/W would not accept work)
    console.log("HeartBeat: Test Code - nodeID>=90");
    res.status(200).send("Scavenger: ERROR" + ErrorNodeID);
    return;
  }

  res.status(200).send(StrScavengerOK);
});

app.get('/config', (req, res) => {
  let time = req.query.time;
  let nodeID = req.query.nodeID;
  let queryID = req.query.queryID;
  let mac = req.query.MAC;

  console.log("config - nodeID: " + nodeID + "- queryID: " + queryID + " - mac: " + mac);

  //This is the NODE registering itself with the Server
  //Server has the following checks it needs to perform
  // 1) Is the NODEID valid (i.e. within range) - this should be handled by the node itself - but good to check
  // 2) Confirm the node does not already exist.  This requires the MAC address to be checked too since
  //      the node may have re-booted - so the server must allow for the same node re-registering
  // 3) Check the queryID is valid (i.e. within range - again Node did this) - but is this the
  //      query for this NODE (not certain how we do this - unless we just let the Node define it)
  //      May check that the same "Query-List ID is not being used"
  // 4) Record with Time Stamp (either internal or NODEs)
  // 5) Check for Undefined Vars and send Error if critical data missing (400 Code)
  // 6) NOTE:  To avoid a ZERO (0) queryID from being considered UNDEFINED - do a direct check

  //TEST CODE
  if (!nodeID || !queryID || !mac) {
    console.log("Config - UNDEFINED Vars");
    res.status(400).send("Scavenger: ERROR" + ErrorUndefinedData);
    return;
  }

  if (nodeID >= 50) {    //Not certain if we should send 400 code (current NODE F/W would not accept work)
    console.log("Config - Test Code - nodeID>=50");
    res.status(200).send("Scavenger: ERROR" + ErrorNodeID);
    return;
  }
  if (queryID >= 20 && queryID < 40) {    //Not certain if we should send 400 code (current NODE F/W would not accept work)
    console.log("Config - Test Code - 20 <= queryID < 40");
    res.status(200).send("Scavenger: ERROR" + ErrorQueryID);
    return;
  }

  res.status(200).send(StrScavengerOK);
});

app.get('/validate', (req, res) => {
  let timestamp = Date.now();
  let stationID = req.query.nodeID;
  // User ID is sent as decimal representation of the hex input, so parse it first
  let userID = parseInt(req.query.userID);
  let attemptAnswer = req.query.queryValue;

  if (stationID == undefined
    || Number.isNaN(userID)
    || attemptAnswer == undefined
    || sessionID == undefined) {
    res.status(200).send(StrErrorUndefinedData);
    return;
  }
  else {
    // Then convert it back to hex so we get the actual inputed value
    userID = userID.toString(16);

    db.run(`INSERT INTO results
            (sessionID, userID, stationID, userAnswer, timestamp, numAttempts)
            SELECT $sessionID, $userID, $stationID, 1, $timestamp, 1
            FROM stations
            WHERE stationID = $stationID
            AND EXISTS (SELECT 1 FROM users WHERE userID = $userID)
            ON CONFLICT(sessionID, userID, stationID)
              DO UPDATE SET
                userAnswer = 1,
                timestamp = $timestamp,
                numAttempts = numAttempts + 1
              WHERE numAttempts < $maxNumAttempts
              AND userAnswer IS NOT 1`,
      {
        $sessionID: sessionID,
        $userID: userID,
        $stationID: stationID,
        $timestamp: timestamp,
        $maxNumAttempts: maxNumAttempts
      },
      function (err) {
        let changedRows = this.changes;
        if (err) {
          res.status(500).send(err);
        }
        else {
          // Check if the latest answer is correct
          db.get(`SELECT userAnswer AS correct
                       FROM results
                       WHERE sessionID = ?
                       AND userID = ?
                       AND stationID = ?`,
            [sessionID, userID, stationID],
            (err, row) => {
              if (err) {
                res.status(500).send(err);
              }
              else if (row === undefined) {
                // Can't tell if user ID or station ID incorrect
                res.status(200).send(StrErrorUserID);
              }
              else if (row.correct == 0 && changedRows == 0) {
                //Incorrect and we didn't insert anything
                res.status(200).send(StrErrorUserLockout);
              }
              else if (row.correct == 1 && changedRows == 0) {
                //Correct but we didn't insert anything
                res.status(200).send(StrErrorUserRepeat);
              }
              else if (row.correct == 1) {
                //Correct
                res.status(200).send(StrScavengerOK);
              }
              else {
                //Incorrect
                res.status(200).send(StrErrorQueryValue);
              }
            });
        }
      });
  }
});

app.listen(port);
