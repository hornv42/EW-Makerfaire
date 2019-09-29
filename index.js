const express = require('express');
const sqlite3 = require('sqlite3');

const app = express();
const db = new sqlite3.Database('./database.db');
const port = 3000


app.get('/users', (req, res) => {
  db.all('SELECT userID FROM users', [], (err, rows) => {
    res.send(rows.map(r => r.userID));
  });
});

app.get('/users/:userId', (req, res) => {
  /// databse query for user ID 'userID'
  db.get('SELECT * FROM users where id = ?', [req.params.userId], (err, row) => {
    if (err) {
      res.status(404);
      res.end();
    }
    else {
      res.send(row);
    }
  });
});

