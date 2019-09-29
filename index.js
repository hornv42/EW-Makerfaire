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
  db.get('SELECT * FROM users where userID = ?', [req.params.userId], (err, row) => {
    if (err) {
      res.status(404);
      res.end();
    }
    else {
      res.send(row);
    }
  });
});


app.listen(port);
