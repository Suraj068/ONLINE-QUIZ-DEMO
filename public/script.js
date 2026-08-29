const state = {
  questions: [],
  current: 0,
  answers: {},
  score: 0,
  timeLeft: 15 * 60,
  timer: null,
  tabSwitches: 0,
  quizStarted: false,
  submitting: false,
  violation: false,
  violationReason: ""
};

const $ = id => document.getElementById(id);

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active-section"));
    tab.classList.add("active");
    $(tab.dataset.section).classList.add("active-section");
    if (tab.dataset.section === "leaderboard") loadLeaderboard();
  });
});

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

async function loadQuestions() {
  const res = await fetch("/api/questions");
  state.questions = await res.json();
}

$("startBtn").addEventListener("click", async () => {
  const name = $("studentName").value.trim();
  if (!name) return showToast("Please enter your name.");
  $("startBtn").disabled = true;
  try {
    await loadQuestions();
    state.current = 0; state.answers = {}; state.score = 0;
    state.timeLeft = 15 * 60; state.tabSwitches = 0;
    state.quizStarted = true; state.submitting = false;
    state.violation = false; state.violationReason = "";
    $("setupCard").classList.add("hidden");
    $("resultCard").classList.add("hidden");
    $("quizCard").classList.remove("hidden");
    renderQuestion();
    startTimer();
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch (e) {
      showToast("Fullscreen was not enabled. Tab monitoring is still active.");
    }
    showToast("Quiz started. Good luck!");
  } catch (e) {
    showToast("Could not load the quiz.");
  } finally {
    $("startBtn").disabled = false;
  }
});

function renderQuestion() {
  const q = state.questions[state.current];
  $("questionNumber").textContent = `Question ${state.current + 1} / ${state.questions.length}`;
  $("questionText").textContent = q.q;
  $("progressText").textContent = `${Object.keys(state.answers).length} answered`;
  const options = $("options");
  options.innerHTML = "";
  q.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
    if (state.answers[q.id] === index) btn.classList.add("selected");
    btn.onclick = () => {
      state.answers[q.id] = index;
      renderQuestion();
    };
    options.appendChild(btn);
  });
  $("nextBtn").textContent = state.current === state.questions.length - 1 ? "Submit Quiz ✓" : "Next →";
}

$("nextBtn").addEventListener("click", () => {
  const q = state.questions[state.current];
  if (state.answers[q.id] === undefined) return showToast("Select an answer before continuing.");
  if (state.current < state.questions.length - 1) {
    state.current++;
    renderQuestion();
  } else {
    submitQuiz();
  }
});

function startTimer() {
  clearInterval(state.timer);
  updateTimer();
  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimer();
    if (state.timeLeft <= 0) {
      clearInterval(state.timer);
      showToast("Time is up. Submitting your quiz...");
      submitQuiz();
    }
  }, 1000);
}

function updateTimer() {
  const min = String(Math.floor(state.timeLeft / 60)).padStart(2, "0");
  const sec = String(state.timeLeft % 60).padStart(2, "0");
  $("timer").textContent = `${min}:${sec}`;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.quizStarted && !state.submitting) {
    state.tabSwitches++;
    state.violation = true;
    state.violationReason = "Browser tab/window changed during quiz";
    $("tabWarning").classList.remove("hidden");
    showToast("Tab switch detected. Your attempt is being submitted as a violation.");
    setTimeout(() => submitQuiz(true), 350);
  }
});

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && state.quizStarted && !state.submitting) {
    state.violation = true;
    state.violationReason = "Fullscreen exited during quiz";
    state.tabSwitches++;
    showToast("Fullscreen exited. Your attempt is being submitted as a violation.");
    setTimeout(() => submitQuiz(true), 250);
  }
});

$("returnBtn").addEventListener("click", () => {
  $("tabWarning").classList.add("hidden");
});

async function submitQuiz(forceViolation = false) {
  if (state.submitting) return;
  state.submitting = true;
  clearInterval(state.timer);
  if (forceViolation) {
    state.violation = true;
    if (!state.violationReason) state.violationReason = "Tab/window change detected";
  }

  // The server calculates the score from the submitted answers. This fixes
  // the old bug where /api/questions intentionally removed the answer key.
  const result = {
    name: $("studentName").value.trim(),
    course: $("course").value,
    answers: state.answers,
    tabSwitches: state.tabSwitches,
    violation: state.violation,
    violationReason: state.violationReason
  };

  try {
    const res = await fetch("/api/results", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(result)
    });
    if (!res.ok) throw new Error("Failed");
    $("quizCard").classList.add("hidden");
    $("resultCard").classList.remove("hidden");
    const saved = await res.json();
    state.score = saved.correctAnswers;
    $("scoreValue").textContent = `${saved.correctAnswers} / ${saved.total}`;
    const percentage = Math.round(saved.percentage);
    $("scoreMessage").textContent = state.violation
      ? `VIOLATION — ${state.violationReason}. ${state.tabSwitches} tab switch${state.tabSwitches === 1 ? "" : "es"} recorded.`
      : `${percentage}% • ${state.tabSwitches} tab switch${state.tabSwitches === 1 ? "" : "es"} recorded.`;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    showToast("Your result has been saved to the database.");
  } catch (e) {
    showToast("Could not save your result. Check the server.");
  }
}

$("viewLeaderboardBtn").addEventListener("click", () => {
  document.querySelector('[data-section="leaderboard"]').click();
});

$("restartBtn").addEventListener("click", () => {
  state.quizStarted = false;
  $("resultCard").classList.add("hidden");
  $("setupCard").classList.remove("hidden");
});

$("refreshBtn").addEventListener("click", loadLeaderboard);

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const rows = await res.json();
    const table = $("leaderTable");
    table.innerHTML = "";
    const violationTable = $("violationTable");
    violationTable.innerHTML = "";
    const winnersTable = $("winnersTable");
    winnersTable.innerHTML = "";

    if (!rows.length) {
      table.innerHTML = `<tr><td colspan="8">No results yet. Complete the first quiz!</td></tr>`;
      winnersTable.innerHTML = `<tr><td colspan="8">No winners yet.</td></tr>`;
      $("leaders").innerHTML = "";
      return;
    }

    rows.filter(r => r.violation).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.course)}</td><td>${r.score}/${r.total}</td><td>${r.tabSwitches}</td><td>🚫 Disqualified</td><td>${new Date(r.submittedAt + "Z").toLocaleString()}</td>`;
      violationTable.appendChild(tr);
    });
    if (!violationTable.children.length) violationTable.innerHTML = `<tr><td colspan="6">No tab-shift violations recorded.</td></tr>`;

    rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${i + 1}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.course)}</td>
        <td><strong>${r.correctAnswers ?? r.score}/${r.total}</strong></td>
        <td>${r.score}/${r.total}</td>
        <td>${r.percentage}%</td>
        <td>${r.tabSwitches}</td>
        <td>${new Date(r.submittedAt + "Z").toLocaleString()}</td>`;
      table.appendChild(tr);
    });

    const winners = rows.filter(r => !r.violation).sort((a,b) =>
      b.score - a.score || b.percentage - a.percentage || String(a.submittedAt).localeCompare(String(b.submittedAt))
    );
    winners.slice(0, 3).forEach((r, i) => {
      const tr = document.createElement("tr");
      const medals = ["🥇 1st", "🥈 2nd", "🥉 3rd"];
      tr.innerHTML = `
        <td><strong>${medals[i]}</strong></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.course)}</td>
        <td><strong>${r.correctAnswers ?? r.score}/${r.total}</strong></td>
        <td>${r.percentage}%</td>
        <td>🏆 Winner</td>
        <td>${new Date(r.submittedAt + "Z").toLocaleString()}</td>`;
      winnersTable.appendChild(tr);
    });
    if (!winners.length) winnersTable.innerHTML = `<tr><td colspan="8">No eligible winners yet. Complete the quiz without a tab violation.</td></tr>`;

    const high = winners[0];
    const low = winners[winners.length - 1];
    if (!high) {
      $("leaders").innerHTML = `<div class="leader-box low" style="grid-column:1/-1"><div class="leader-label">🏆 FINAL RESULTS</div><div class="leader-name">No eligible winners yet</div><p>Students who change tabs are excluded from the winners sheet.</p></div>`;
      return;
    }
    $("leaders").innerHTML = `
      <div class="leader-box high">
        <div class="leader-label">🏆 HIGHEST SCORE / WINNER</div>
        <div class="leader-name">${escapeHtml(high.name)}</div>
        <div class="leader-score">${high.correctAnswers ?? high.score}/${high.total} correct • ${high.percentage}%</div>
        <p>${escapeHtml(high.course)}</p>
      </div>
      <div class="leader-box low">
        <div class="leader-label">📉 LOWEST ELIGIBLE SCORE</div>
        <div class="leader-name">${escapeHtml(low.name)}</div>
        <div class="leader-score">${low.correctAnswers ?? low.score}/${low.total} correct • ${low.percentage}%</div>
        <p>${escapeHtml(low.course)}</p>
      </div>`;
  } catch (e) {
    showToast("Could not load leaderboard.");
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

loadLeaderboard();