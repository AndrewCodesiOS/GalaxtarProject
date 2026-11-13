document.addEventListener("DOMContentLoaded", () => {
  const audio = new AudioController();
  const stats = new StatsStore();
  const logManager = new FlightLogController(stats);

  audio.musicEnabled = stats.data.musicOn;
  audio.sfxEnabled = stats.data.sfxOn;

  const bgCanvas = document.getElementById("bg-canvas");
  if (bgCanvas) new StarfieldBackground(bgCanvas);

  const gameCanvas = document.getElementById("game-canvas");
  const gameEngine = new ExploreGameEngine(
    gameCanvas,
    stats,
    audio,
    logManager,
    result => showGameOver(result)
  );

  // View Navigation helper
  function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) target.classList.add("active");
  }

  // Menu Launch Button
  const btnLaunch = document.getElementById("btn-launch");
  if (btnLaunch) {
    btnLaunch.addEventListener("click", () => {
      showView("view-explore");
      gameEngine.startSession();
    });
  }

  // Menu Stats Button
  const btnStats = document.getElementById("btn-stats");
  if (btnStats) {
    btnStats.addEventListener("click", () => {
      updateStatsDisplay();
      showView("view-stats");
    });
  }

  // Menu Upgrades Button
  const btnUpgrades = document.getElementById("btn-upgrades");
  if (btnUpgrades) {
    btnUpgrades.addEventListener("click", () => {
      updateUpgradesDisplay();
      showView("view-upgrades");
    });
  }

  // Menu Logs Button
  const btnLogs = document.getElementById("btn-logs");
  if (btnLogs) {
    btnLogs.addEventListener("click", () => {
      updateLogsDisplay();
      showView("view-logs");
    });
  }

  // Menu Settings Button
  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      updateSettingsDisplay();
      showView("view-settings");
    });
  }

  // Back buttons
  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetView = btn.getAttribute("data-back") || "view-menu";
      showView(targetView);
    });
  });

  // Pause Button in game
  const btnPause = document.getElementById("btn-pause");
  if (btnPause) {
    btnPause.addEventListener("click", () => {
      gameEngine.pause();
      showView("view-pause");
    });
  }

  const btnResumeFlight = document.getElementById("btn-resume-flight");
  if (btnResumeFlight) {
    btnResumeFlight.addEventListener("click", () => {
      showView("view-explore");
      gameEngine.resume();
    });
  }

  const btnEndFlight = document.getElementById("btn-end-flight");
  if (btnEndFlight) {
    btnEndFlight.addEventListener("click", () => {
      gameEngine.triggerGameOver(true);
      showView("view-menu");
    });
  }

  // Game Over Continue
  const btnContinue = document.getElementById("btn-continue");
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      document.getElementById("gameover-overlay").classList.add("hidden");
      showView("view-menu");
    });
  }

  function showGameOver(res) {
    const overlay = document.getElementById("gameover-overlay");
    const grid = document.getElementById("gameover-grid");
    if (grid) {
      grid.innerHTML = `
        <div>Distance: ${res.distance}</div>
        <div>Ships Destroyed: ${res.ships}</div>
        <div>Asteroids: ${res.asteroids}</div>
        <div>Points Earned: ${res.points}</div>
      `;
    }
    if (overlay) overlay.classList.remove("hidden");
  }

  function updateStatsDisplay() {
    const d = stats.data;
    document.getElementById("stat-last-dist").innerText = d.lastSessionDistance || 0;
    document.getElementById("stat-last-ships").innerText = d.lastSessionShipsDestroyed || 0;
    document.getElementById("stat-last-ast").innerText = d.lastSessionAsteroidsDestroyed || 0;
    document.getElementById("stat-last-pts").innerText = d.lastSessionPoints || 0;

    document.getElementById("stat-all-longest").innerText = d.longestFlight || 0;
    document.getElementById("stat-all-ships").innerText = d.shipsDestroyed || 0;
    document.getElementById("stat-all-dist").innerText = d.totalDistanceTraveled || 0;

    document.getElementById("stat-obj-stars").innerText = d.starsPassed || 0;
    document.getElementById("stat-obj-planets").innerText = d.planetsPassed || 0;
    document.getElementById("stat-obj-ast").innerText = d.asteroidsDestroyed || 0;
    document.getElementById("stat-obj-shooting").innerText = d.shootingStarsPassed || 0;
  }

  function updateUpgradesDisplay() {
    document.getElementById("upgrades-points").innerText = stats.data.totalPoints + " pts";
    const container = document.getElementById("upgrade-list-container");
    if (container) {
      container.innerHTML = `<p style="padding: 20px; text-align: center; color: #aaa;">Fuel Capacity, Shields, Weapons, and Thruster upgrades available here.</p>`;
    }
  }

  function updateLogsDisplay() {
    const container = document.getElementById("logs-container");
    if (container) {
      const logs = logManager.getLogs();
      if (logs.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center; color: #777;">No flight logs recorded yet. Complete your first flight!</p>`;
      } else {
        container.innerHTML = logs.map(l => `<div style="background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 10px; border-radius: 6px;"><p style="font-size: 0.9rem; white-space: pre-wrap;">${l.text}</p></div>`).join("");
      }
      logManager.markAllRead();
    }
  }

  function updateSettingsDisplay() {
    // Settings toggles setup
  }

  const profileBtn = document.getElementById("btn-player-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => showView("view-profile"));
  }
});
