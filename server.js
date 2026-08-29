const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database(path.join(__dirname, "quiz.db"));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course TEXT NOT NULL,
      score INTEGER NOT NULL,
      correct_answers INTEGER DEFAULT 0,
      total INTEGER NOT NULL,
      percentage REAL NOT NULL,
      tab_switches INTEGER DEFAULT 0,
      violation INTEGER DEFAULT 0,
      violation_reason TEXT DEFAULT '',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const questions = [
  {id:1, q:"Which data structure follows the LIFO principle?", options:["Queue","Stack","Linked List","Tree"], answer:1},
  {id:2, q:"Which language is primarily used for styling web pages?", options:["HTML","CSS","SQL","Python"], answer:1},
  {id:3, q:"Which SQL command is used to retrieve data from a database?", options:["GET","SELECT","FETCHROW","READ"], answer:1},
  {id:4, q:"What is the time complexity of binary search on a sorted array?", options:["O(n)","O(n²)","O(log n)","O(1)"], answer:2},
  {id:5, q:"Which protocol is commonly used to securely transfer web pages?", options:["HTTP","FTP","HTTPS","SMTP"], answer:2},
  {id:6, q:"Which OOP concept allows one interface to have multiple implementations?", options:["Encapsulation","Inheritance","Polymorphism","Abstraction"], answer:2},
  {id:7, q:"What does DBMS stand for?", options:["Database Management System","Data Backup Management Service","Database Machine System","Digital Base Management Software"], answer:0},
  {id:8, q:"Which normal form removes partial dependency?", options:["1NF","2NF","3NF","BCNF"], answer:1},
  {id:9, q:"Which JavaScript keyword declares a block-scoped variable that can be reassigned?", options:["var","let","const","static"], answer:1},
  {id:10, q:"Which operating system component manages processes and memory?", options:["Compiler","Kernel","Browser","Shell script"], answer:1},
  {id:11, q:"In computer networks, what does IP stand for?", options:["Internet Protocol","Internal Process","Internet Program","Interface Protocol"], answer:0},
  {id:12, q:"Which traversal visits Root, Left, Right in a binary tree?", options:["Inorder","Postorder","Preorder","Level order"], answer:2},
  {id:13, q:"Which Python data type stores key-value pairs?", options:["List","Tuple","Set","Dictionary"], answer:3},
  {id:14, q:"What is the main purpose of a primary key?", options:["Allow duplicate rows","Uniquely identify a record","Sort every column","Encrypt the table"], answer:1},
  {id:15, q:"Which HTML element is used to create a hyperlink?", options:["<link>","<a>","<href>","<url>"], answer:1},
  {id:16, q:"Which memory is volatile?", options:["ROM","SSD","RAM","Hard disk"], answer:2},
  {id:17, q:"What does API stand for?", options:["Application Programming Interface","Advanced Program Internet","Application Process Integration","Automated Programming Input"], answer:0},
  {id:18, q:"Which algorithm is commonly used to find the shortest path in a weighted graph with non-negative edges?", options:["Dijkstra's algorithm","DFS","Bubble sort","Kruskal only"], answer:0},
  {id:19, q:"Which CSS property controls the space inside an element's border?", options:["margin","padding","spacing","gap-only"], answer:1},
  {id:20, q:"Which testing checks individual units or functions of software?", options:["System testing","Unit testing","Acceptance testing","Load testing"], answer:1}
];

app.get("/api/questions", (req, res) => {
  res.json(questions.map(({answer, ...q}) => q));
});

app.post("/api/results", (req, res) => {
  const { name, course, answers = {}, tabSwitches = 0, violation = false, violationReason = "" } = req.body;
  if (!name || !course || typeof answers !== "object") {
    return res.status(400).json({error:"Invalid result data."});
  }

  // Calculate the score on the server so the leaderboard always shows the
  // real number of correct answers. The browser never receives the answer key.
  const correctAnswers = questions.reduce((total, q) =>
    total + (Number(answers[q.id]) === q.answer ? 1 : 0), 0);
  const total = questions.length;
  const score = correctAnswers;
  const percentage = Number(((correctAnswers / total) * 100).toFixed(2));

  db.run(
    `INSERT INTO results (name, course, score, correct_answers, total, percentage, tab_switches, violation, violation_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name.trim(), course, score, correctAnswers, total, percentage, tabSwitches, violation ? 1 : 0, violationReason],
    function(err) {
      if (err) return res.status(500).json({error:err.message});
      res.json({id:this.lastID, name:name.trim(), course, score, correctAnswers, total, percentage, tabSwitches, violation:!!violation, violationReason});
    }
  );
});

app.get("/api/leaderboard", (req, res) => {
  db.all(`
    SELECT name, course, score, COALESCE(NULLIF(correct_answers, 0), score) AS correctAnswers, total, percentage, tab_switches AS tabSwitches, violation, violation_reason AS violationReason, submitted_at AS submittedAt
    FROM results
    ORDER BY score DESC, percentage DESC, submitted_at ASC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

app.get("/api/violations", (req, res) => {
  db.all(`SELECT name, course, score, COALESCE(NULLIF(correct_answers, 0), score) AS correctAnswers, total, tab_switches AS tabSwitches, violation_reason AS violationReason, submitted_at AS submittedAt FROM results WHERE violation = 1 ORDER BY submitted_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({error:err.message});
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Quiz server running at http://localhost:${PORT}`);
});