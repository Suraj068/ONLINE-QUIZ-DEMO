# CS Quiz Arena — BCA & BSc Computer Science

A full-stack online quiz project using:

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: SQLite
- Quiz: 20 BCA/BSc CS questions
- 15-minute timer
- Browser tab-change detection using `visibilitychange`
- Tab-switch count stored with each result
- Highest and lowest scores displayed
- Complete leaderboard table

## Folder structure

```text
CS_Online_Quiz/
├── package.json
├── server.js
├── README.md
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

`quiz.db` is created automatically the first time the server starts.

## Run the project

1. Install Node.js (LTS).
2. Open a terminal inside this project folder.
3. Run:

```bash
npm install
npm start
```

4. Open:

```text
http://localhost:3000
```

## How the tab notification works

During an active quiz, if the student switches to another browser tab/window, the browser's `visibilitychange` event fires. The system:

1. Shows a warning when the student returns.
2. Increments the tab-switch counter.
3. Stores the counter in the database when the quiz is submitted.

Note: normal websites cannot reliably prevent a student from changing browser tabs. This implementation detects and records the change rather than trying to lock the browser.

## Database

SQLite stores:

- Student name
- Course
- Score
- Total marks
- Percentage
- Number of tab switches
- Submission time

The leaderboard is sorted by highest score first, with the lowest score shown at the bottom.


## Important: "Could not load the quiz" fix

If you see **Could not load the quiz**, the page was most likely opened as a local
`file://` HTML file instead of through the Node.js backend.

Do this:

### Windows — easiest method

Double-click:

```text
start.bat
```

It will install dependencies, start the server, and open:

```text
http://localhost:3000
```

### Manual method

Open Command Prompt in this project folder:

```bash
npm install
npm start
```

Then visit:

```text
http://localhost:3000
```

**Do not double-click `public/index.html`.** The quiz questions are loaded from
`/api/questions`, which is provided by the backend server.

## Tab Lock / Anti-Cheating mode

The quiz now requests browser Fullscreen mode when the test starts. If the student changes tabs/windows or exits Fullscreen during the quiz, the attempt is automatically submitted as a **violation/disqualified attempt** and the event is recorded in SQLite.

A **Tab-Shift Violations** table is available under Leaderboard and lists the students who shifted tabs, their course, score, number of switches, status and submission time.

Important browser limitation: a normal HTML/JavaScript website cannot physically prevent the browser or operating system from changing tabs. Browser security does not allow a website to disable Ctrl+Tab, Alt+Tab, the browser's tab bar, or OS window switching. The implementation therefore uses Fullscreen + detection + automatic disqualification, which is the practical approach for a standard web app.
