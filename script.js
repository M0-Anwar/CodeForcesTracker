// const handle = "Mo-Anwar";
// document.getElementById("username").innerText = handle;

const params = new URLSearchParams(window.location.search);
const handle = params.get("user") || "tourist";


let submissions = [];
let dataByDate = {};
let selectedDate = null;
let current = new Date();

function formatDate(ts) {
  const d = new Date(ts * 1000);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getColorClass(count) {
  if (count >= 5) return "c5";
  if (count === 4) return "c4";
  if (count === 3) return "c3";
  if (count === 2) return "c2";
  if (count === 1) return "c1";
  return "";
}

async function fetchData() {
  const res = await fetch(
    `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`
  );
  const json = await res.json();
  submissions = json.result;
  processData();
  render();
}

function processData() {
  const solvedLater = new Set();

  submissions.forEach(sub => {
    if (sub.verdict === "OK") {
      solvedLater.add(sub.problem.contestId + "-" + sub.problem.index);
    }
  });

  submissions.forEach(sub => {
    const date = formatDate(sub.creationTimeSeconds);
    if (!dataByDate[date]) {
      dataByDate[date] = { solved: new Map(), upsolved: new Map() };
    }

    const key = sub.problem.contestId + "-" + sub.problem.index;
    const url = `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`;

    if (sub.verdict === "OK") {
      dataByDate[date].solved.set(key, {
        name: sub.problem.name,
        rating: sub.problem.rating || "—",
        tags: sub.problem.tags,
        url
      });
    } else {
      if (!solvedLater.has(key)) {
        dataByDate[date].upsolved.set(key, {
          name: sub.problem.name,
          rating: sub.problem.rating || "—",
          tags: sub.problem.tags,
          url
        });
      }
    }
  });
}

function getCurrentStreak() {
  let streak = 0;
  let d = new Date();
  d.setHours(0,0,0,0);

  while (true) {
    const key = formatDate(d.getTime() / 1000);

    if (dataByDate[key] && dataByDate[key].solved.size > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getMaxStreak() {
  const dates = Object.keys(dataByDate)
    .filter(d => dataByDate[d].solved.size > 0)
    .sort();

  let max = 0;
  let curr = 0;
  let prev = null;

  for (let d of dates) {
    const date = new Date(d + "T00:00:00"); // force LOCAL time

    if (!prev) {
      curr = 1;
    } else {
      const diff = Math.round((date - prev) / 86400000);

      if (diff === 1) {
        curr++;
      } else {
        curr = 1;
      }
    }

    max = Math.max(max, curr);
    prev = date;
  }

  return max;
}

function render() {
  const cal = document.getElementById("calendar");
  const monthTitle = document.getElementById("monthTitle");

  // cal.innerHTML = `
  //   <div class="day-name">Sun</div>
  //   <div class="day-name">Mon</div>
  //   <div class="day-name">Tue</div>
  //   <div class="day-name">Wed</div>
  //   <div class="day-name">Thu</div>
  //   <div class="day-name">Fri</div>
  //   <div class="day-name">Sat</div>
  // `;
  cal.innerHTML = `
  <div class="day-name">Sat</div>
  <div class="day-name">Sun</div>
  <div class="day-name">Mon</div>
  <div class="day-name">Tue</div>
  <div class="day-name">Wed</div>
  <div class="day-name">Thu</div>
  <div class="day-name">Fri</div>
  `;

  const year = current.getFullYear();
  const month = current.getMonth();
  monthTitle.innerText = current.toLocaleString("default", { month: "long", year: "numeric" });

  // const firstDay = new Date(year, month, 1).getDay();
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay + 1) % 7;
  const daysInMonth = new Date(year, month+1, 0).getDate();

  for (let i=0;i<firstDay;i++) cal.innerHTML += "<div></div>";

  const today = new Date();
  today.setHours(0,0,0,0);
  for (let d=1; d<=daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const count = dataByDate[dateStr]?.solved.size || 0;

    const div = document.createElement("div");
    // div.className = "day " + getColorClass(count);
    const thisDate = new Date(year, month, d);
    thisDate.setHours(0,0,0,0);

    if (thisDate > today) {
      div.className = "day future";
    } else {
      div.className = "day " + getColorClass(count);
    }
    div.innerHTML = `<b>${d}</b><br>${count || ""}`;

    // div.onclick = () => {
    //   selectedDate = dateStr;
    //   document.querySelectorAll(".day").forEach(x => x.classList.remove("selected"));
    //   div.classList.add("selected");
    //   renderDetails();
    // };

    if (thisDate <= today) {
      div.onclick = () => {
        selectedDate = dateStr;
        document.querySelectorAll(".day").forEach(x => x.classList.remove("selected"));
        div.classList.add("selected");
        renderDetails();
      };
    }

    cal.appendChild(div);
  }

  renderStats();
}

function renderStats() {
  document.getElementById("stats").innerHTML = `
    🔥 Current streak: <b>${getCurrentStreak()}</b><br>
    🏆 Max streak ever: <b>${getMaxStreak()}</b>
  `;
}

function renderDetails() {
  const solvedDiv = document.getElementById("solved");
  const upDiv = document.getElementById("upsolved");
  const topicsDiv = document.getElementById("topics");

  solvedDiv.innerHTML = "";
  upDiv.innerHTML = "";
  topicsDiv.innerHTML = "";

  if (!dataByDate[selectedDate]) return;

  let topicsSet = new Set();

  if (dataByDate[selectedDate].solved.size > 0) {
    let table = "<table>";
    dataByDate[selectedDate].solved.forEach(p => {
      topicsSet = new Set([...topicsSet, ...p.tags]);
      table += `<tr><td><a href="${p.url}" target="_blank">${p.name}</a></td><td>${p.rating}</td></tr>`;
    });
    table += "</table>";
    solvedDiv.innerHTML = table;
  }

  if (dataByDate[selectedDate].upsolved.size > 0) {
    let table = "<table>";
    dataByDate[selectedDate].upsolved.forEach(p => {
      table += `<tr><td><a href="${p.url}" target="_blank">${p.name}</a></td><td>${p.rating}</td></tr>`;
    });
    table += "</table>";
    upDiv.innerHTML = table;
  }

  topicsDiv.innerText = [...topicsSet].join(", ");
}

function changeMonth(step) {
  current.setMonth(current.getMonth() + step);
  render();
}

function setTheme(dark) {
  if (dark) {
    document.body.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.body.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

function toggleDark() {
  const isDark = document.body.classList.contains("dark");
  setTheme(!isDark);
}

// Load saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  setTheme(true);
}

fetchData();