const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const db = new sqlite3.Database('./database.db');
const port = 3000


app.get('/users', (req, res) => {
  db.all('SELECT userID FROM users', [], (err, rows) => {
    res.send(rows.map(r => r.userID));
  });
});

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

app.get('/results/:userID/:stationID', (req, res) => {
  var userID = req.params.userID;
  var stationID = req.params.stationID;

  db.all('SELECT * FROM results WHERE userID = ? AND stationID = ?', [userID, stationID], (err, rows) => {
    res.send(rows);
  });
});

app.listen(port);
