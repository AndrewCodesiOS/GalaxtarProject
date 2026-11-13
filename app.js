document.addEventListener("DOMContentLoaded", () => {
  const stats = new StatsStore();
  const audio = new AudioController();
  const logManager = new FlightLogController(stats);
  const bgStars = new StarfieldBackground(document.getElementById("bg-canvas"));

  let currentView = "view-menu";
  let previousGuideCaller = "view-settings";
  let currentUpgradeCategory = "fuel";
  let expandedLogId = null;
  let secretBuffer = [];
  let guidePageIndex = 0;

  const gameEngine = new ExploreGameEngine(
    document.getElementById("game-canvas"),
    stats,
    audio,
    logManager,
    summary => showGameOverOverlay(summary)
  );

  function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    currentView = viewId;

    if (viewId === "view-menu") {
      bgStars.running = true;
      refreshMenuUI();
    } else if (viewId === "view-explore") {
      bgStars.running = false;
    } else {
      bgStars.running = true;
    }

    if (viewId === "view-stats") refreshStatsUI();
    if (viewId === "view-profile") refreshProfileUI();
    if (viewId === "view-upgrades") refreshUpgradesUI();
    if (viewId === "view-logs") refreshLogsUI();
    if (viewId === "view-settings") refreshSettingsUI();
    if (viewId === "view-pause") refreshPauseUI();
    if (viewId === "view-guide") renderGuidePage();
  }

  function refreshMenuUI() {
    const d = stats.data;
    const maxF = stats.maxFuel();
    const pct = Math.min(100, Math.round((d.currentFuel / maxF) * 100));
    const ring = document.getElementById("fuel-ring");
    ring.setAttribute("stroke-dasharray", `${pct}, 100`);

    let fuelColor = "#2ecc71";
    if (pct <= 25) fuelColor = "#e74c3c";
    else if (pct <= 50) fuelColor = "#f1c40f";
    ring.style.stroke = fuelColor;

    document.getElementById("fuel-text").textContent = `${d.currentFuel}/${maxF}`;
    const missing = maxF - d.currentFuel;
    const price = missing * 2;
    const refuelBtn = document.getElementById("btn-refuel");
    if (missing > 0) {
      refuelBtn.classList.remove("hidden");
      refuelBtn.textContent = `Refuel (${price} pts)`;
      refuelBtn.disabled = d.totalPoints < price;
    } else {
      refuelBtn.classList.add("hidden");
    }

    const welcome = document.getElementById("welcome-banner");
    if (d.playerName && d.playerName !== "Pilot" && d.playerName !== "Enter Name") {
      welcome.textContent = `Welcome, ${stats.getCurrentRank().name} ${d.playerName}`;
      welcome.classList.remove("hidden");
    } else {
      welcome.classList.add("hidden");
    }

    document.getElementById("btn-launch").textContent = `FLIGHT ${d.totalRuns + 1}`;

    const badge = document.getElementById("unread-badge");
    if (logManager.hasUnreadLogs()) badge.classList.remove("hidden");
    else badge.classList.add("hidden");
  }

  document.getElementById("btn-fuel-icon").addEventListener("click", () => {
    audio.playSystemClick();
    document.getElementById("fuel-expansion").classList.toggle("hidden");
  });

  document.getElementById("btn-refuel").addEventListener("click", () => {
    const missing = stats.maxFuel() - stats.data.currentFuel;
    const price = missing * 2;
    if (stats.data.totalPoints >= price) {
      audio.playSystemClick();
      stats.data.totalPoints -= price;
      stats.refuel();
      document.getElementById("fuel-expansion").classList.add("hidden");
      refreshMenuUI();
    }
  });

  document.getElementById("btn-launch").addEventListener("click", () => {
    audio.playSystemClick();
    if (audio.isPlaying) audio.playMusic();

    if (stats.data.isPeacefulMode || stats.canLaunch()) {
      if (!stats.data.isPeacefulMode) stats.consumeFuel(1);
      document.getElementById("gameover-overlay").classList.add("hidden");
      const boostBtn = document.getElementById("btn-boost");
      if (stats.data.thrusterLevel >= 2) boostBtn.classList.remove("hidden");
      else boostBtn.classList.add("hidden");
      boostBtn.classList.remove("boost-active");

      showView("view-explore");
      gameEngine.startSession();
    } else {
      document.getElementById("fuel-expansion").classList.remove("hidden");
    }
  });

  document.getElementById("btn-stats").addEventListener("click", () => { audio.playSystemClick(); showView("view-stats"); });
  document.getElementById("btn-upgrades").addEventListener("click", () => { audio.playSystemClick(); showView("view-upgrades"); });
  document.getElementById("btn-logs").addEventListener("click", () => { audio.playSystemClick(); showView("view-logs"); });
  document.getElementById("btn-settings").addEventListener("click", () => { audio.playSystemClick(); showView("view-settings"); });

  document.querySelectorAll(".back-btn[data-back]").forEach(btn => {
    btn.addEventListener("click", () => {
      audio.playSystemClick();
      showView(btn.getAttribute("data-back"));
    });
  });

  document.getElementById("btn-shoot").addEventListener("click", () => {
    if (gameEngine.isPaused) {
      gameEngine.resume();
    } else if (!gameEngine.isGameOver && !stats.data.isPeacefulMode) {
      gameEngine.shoot();
    }
  });

  document.getElementById("btn-boost").addEventListener("click", () => {
    if (gameEngine.isPaused) gameEngine.resume();
    gameEngine.toggleBoost();
    document.getElementById("btn-boost").classList.toggle("boost-active", gameEngine.isBoostActive);
  });

  document.getElementById("btn-pause").addEventListener("click", () => {
    audio.playSystemClick();
    gameEngine.pause();
    showView("view-pause");
  });

  function showGameOverOverlay(s) {
    const grid = document.getElementById("gameover-grid");
    grid.className = s.isPeaceful ? "gameover-grid peaceful" : "gameover-grid";

    const cells = s.isPeaceful
      ? [
          { num: formatCompactNumber(s.distance), lbl: "DISTANCE" },
          { num: formatCompactNumber(s.stars), lbl: "STARS" },
          { num: formatCompactNumber(s.planets), lbl: "PLANETS" },
          { num: formatCompactNumber(s.shootingStars), lbl: "SHOOTING<br>STARS" },
          { num: formatCompactNumber(s.asteroids), lbl: "ASTEROIDS" },
          { num: formatDurationMMSS(s.time), lbl: "TIME" }
        ]
      : [
          { num: formatCompactNumber(s.distance), lbl: "DISTANCE" },
          { num: formatCompactNumber(s.ships), lbl: "SHIPS" },
          { num: formatCompactNumber(s.points), lbl: "POINTS" },
          { num: formatCompactNumber(s.stars), lbl: "STARS" },
          { num: formatCompactNumber(s.planets), lbl: "PLANETS" },
          { num: formatCompactNumber(s.shootingStars), lbl: "SHOOTING<br>STARS" },
          { num: formatCompactNumber(s.asteroids), lbl: "ASTEROIDS" },
          { num: formatCompactNumber(s.fuelConsumed), lbl: "FUEL<br>CONSUMED" },
          { num: formatDurationMMSS(s.time), lbl: "TIME" }
        ];

    grid.innerHTML = cells
      .map(c => `<div class="go-cell"><span class="go-num">${c.num}</span><span class="go-lbl">${c.lbl}</span></div>`)
      .join("");

    document.getElementById("gameover-overlay").classList.remove("hidden");
  }

  document.getElementById("btn-continue").addEventListener("click", () => {
    audio.playSystemClick();
    gameEngine.stop();
    document.getElementById("gameover-overlay").classList.add("hidden");
    showView("view-menu");
  });

  function refreshPauseUI() {
    document.getElementById("pause-music-on").className = audio.isPlaying ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("pause-music-off").className = !audio.isPlaying ? "toggle-btn active-off" : "toggle-btn";
    document.getElementById("pause-sfx-on").className = audio.isSFXEnabled ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("pause-sfx-off").className = !audio.isSFXEnabled ? "toggle-btn active-off" : "toggle-btn";
  }

  document.getElementById("pause-music-on").addEventListener("click", () => { audio.playSystemClick(); audio.playMusic(); refreshPauseUI(); });
  document.getElementById("pause-music-off").addEventListener("click", () => { audio.playSystemClick(); audio.pauseMusic(); refreshPauseUI(); });
  document.getElementById("pause-sfx-on").addEventListener("click", () => { audio.isSFXEnabled = true; audio.savePrefs(); audio.playSystemClick(); refreshPauseUI(); });
  document.getElementById("pause-sfx-off").addEventListener("click", () => { audio.isSFXEnabled = false; audio.savePrefs(); refreshPauseUI(); });

  document.getElementById("btn-pause-guide").addEventListener("click", () => {
    audio.playSystemClick();
    previousGuideCaller = "view-pause";
    showView("view-guide");
  });

  document.getElementById("btn-resume-flight").addEventListener("click", () => {
    audio.playSystemClick();
    showView("view-explore");
    gameEngine.resume();
  });

  document.getElementById("btn-end-flight").addEventListener("click", () => {
    audio.playSystemClick();
    showView("view-explore");
    gameEngine.triggerGameOver(true);
  });

  function refreshStatsUI() {
    const d = stats.data;
    document.getElementById("stat-last-dist").textContent = formatCompactNumber(d.lastSessionDistance);
    document.getElementById("stat-last-ships").textContent = formatCompactNumber(d.lastSessionShipsDestroyed);
    document.getElementById("stat-last-ast").textContent = formatCompactNumber(d.lastSessionAsteroidsDestroyed);
    document.getElementById("stat-last-pts").textContent = formatCompactNumber(d.lastSessionPoints);

    document.getElementById("stat-all-longest").textContent = formatCompactNumber(d.longestFlight);
    document.getElementById("stat-all-ships").textContent = formatCompactNumber(d.shipsDestroyed);
    document.getElementById("stat-all-dist").textContent = formatCompactNumber(d.totalDistanceTraveled);

    document.getElementById("stat-obj-stars").textContent = formatCompactNumber(d.starsPassed);
    document.getElementById("stat-obj-planets").textContent = formatCompactNumber(d.planetsPassed);
    document.getElementById("stat-obj-ast").textContent = formatCompactNumber(d.asteroidsDestroyed);
    document.getElementById("stat-obj-shooting").textContent = formatCompactNumber(d.shootingStarsPassed);
  }

  document.getElementById("btn-player-profile").addEventListener("click", () => {
    audio.playSystemClick();
    showView("view-profile");
  });

  function refreshProfileUI() {
    const d = stats.data;
    const rank = stats.getCurrentRank();
    const prog = stats.getRankProgress();

    const rankEl = document.getElementById("profile-rank-title");
    rankEl.textContent = rank.name;
    rankEl.style.color = rank.color;

    const barWrap = document.getElementById("profile-rank-bar-wrap");
    if (rank.maxPoints === Infinity) {
      barWrap.classList.add("hidden");
    } else {
      barWrap.classList.remove("hidden");
      const bar = document.getElementById("profile-rank-bar");
      bar.style.width = `${Math.min(100, (prog.current / prog.next) * 100)}%`;
      bar.style.background = rank.color;
    }

    const c = document.getElementById("profile-ship-canvas");
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    gameEngine.ctx = ctx;
    gameEngine.drawPolygon(d.selectedShipShape, 60, 56, 56, 64, d.selectedShipColor, false);
    gameEngine.ctx = document.getElementById("game-canvas").getContext("2d");

    document.getElementById("pilot-name-display").textContent = d.playerName;
    document.getElementById("p-first-date").textContent = d.firstFlightDate
      ? new Date(d.firstFlightDate).toLocaleDateString()
      : "No flights yet";
    document.getElementById("p-total-time").textContent = formatDurationHMS(d.totalTimePlayed);
    document.getElementById("p-total-runs").textContent = d.totalRuns;
    document.getElementById("p-total-dist").textContent = formatCompactNumber(d.totalDistanceTraveled);
    const avg = d.totalRuns > 0 ? Math.floor(d.totalDistanceTraveled / d.totalRuns) : 0;
    document.getElementById("p-avg-dist").textContent = formatCompactNumber(avg);
    document.getElementById("p-life-pts").textContent = formatCompactNumber(d.lifetimePointsEarned);

    document.getElementById("sys-fuel-lbl").textContent = `Level ${d.fuelLevel}/5`;
    document.getElementById("sys-fuel-fill").style.width = `${(d.fuelLevel / 5) * 100}%`;
    document.getElementById("sys-shield-lbl").textContent = `Level ${d.shieldLevel}/5`;
    document.getElementById("sys-shield-fill").style.width = `${(d.shieldLevel / 5) * 100}%`;
    document.getElementById("sys-weapon-lbl").textContent = `Level ${d.weaponLevel}/5`;
    document.getElementById("sys-weapon-fill").style.width = `${(d.weaponLevel / 5) * 100}%`;
    document.getElementById("sys-thruster-lbl").textContent = `Level ${d.thrusterLevel}/5`;
    document.getElementById("sys-thruster-fill").style.width = `${(d.thrusterLevel / 5) * 100}%`;
  }

  const flipCard = document.getElementById("flip-card");
  flipCard.addEventListener("click", e => {
    if (e.target.closest("#btn-edit-name") || e.target.closest("#pilot-name-input")) return;
    flipCard.classList.toggle("flipped");
  });

  const nameDisplay = document.getElementById("pilot-name-display");
  const nameInput = document.getElementById("pilot-name-input");
  document.getElementById("btn-edit-name").addEventListener("click", e => {
    e.stopPropagation();
    nameInput.value = stats.data.playerName;
    nameDisplay.classList.add("hidden");
    nameInput.classList.remove("hidden");
    nameInput.focus();
  });

  const commitName = () => {
    const val = nameInput.value.trim();
    if (val) {
      stats.data.playerName = val;
      stats.save();
    }
    nameDisplay.textContent = stats.data.playerName;
    nameInput.classList.add("hidden");
    nameDisplay.classList.remove("hidden");
  };
  nameInput.addEventListener("blur", commitName);
  nameInput.addEventListener("keydown", e => { if (e.key === "Enter") commitName(); });

  document.querySelectorAll(".cat-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      audio.playSystemClick();
      document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentUpgradeCategory = tab.getAttribute("data-cat");
      refreshUpgradesUI();
    });
  });

  function checkSecretUnlock(token) {
    if (stats.data.totalPoints !== 0) return;
    const expected = GALAXTAR_DATA.secretCombination[secretBuffer.length];
    if (token === expected) {
      secretBuffer.push(token);
      if (secretBuffer.length === GALAXTAR_DATA.secretCombination.length) {
        stats.data.unlockedColors = GALAXTAR_DATA.colors.map(c => c.name);
        stats.data.unlockedShapes = GALAXTAR_DATA.shapes.map(s => s.name);
        stats.save();
        secretBuffer = [];
      }
    } else {
      secretBuffer = [];
    }
  }

  function refreshUpgradesUI() {
    const d = stats.data;
    document.getElementById("upgrades-points").textContent = `${d.totalPoints} pts`;
    document.getElementById("upgrade-cat-title").textContent = currentUpgradeCategory.toUpperCase();
    const container = document.getElementById("upgrade-list-container");

    if (currentUpgradeCategory === "customization") {
      const colorHTML = GALAXTAR_DATA.colors.map(c => {
        const unlocked = d.unlockedColors.includes(c.name);
        const selected = d.selectedShipColor === c.hex;
        return `
          <button class="upg-btn" data-custom-color="${c.name}" style="background:${selected && unlocked ? c.hex + "4D" : "rgba(142,142,147,0.25)"}; border-color:${selected && unlocked ? c.hex : "#8e8e93"}">
            <span class="upg-name">${c.name}</span>
            ${unlocked ? `<span class="upg-unlocked">🔓</span>` : `<span class="upg-cost">${c.cost}pts</span>`}
          </button>`;
      }).join("");

      const shapeHTML = GALAXTAR_DATA.shapes.map(s => {
        const unlocked = d.unlockedShapes.includes(s.name);
        const selected = d.selectedShipShape === s.id;
        return `
          <button class="upg-btn" data-custom-shape="${s.name}" style="background:${selected && unlocked ? s.color + "4D" : "rgba(142,142,147,0.25)"}; border-color:${selected && unlocked ? s.color : "#8e8e93"}">
            <span class="upg-name">${s.name}</span>
            ${unlocked ? `<span class="upg-unlocked">🔓</span>` : `<span class="upg-cost">${s.cost}pts</span>`}
          </button>`;
      }).join("");

      container.innerHTML = `<div class="custom-columns"><div class="upgrade-stack">${colorHTML}</div><div class="upgrade-stack">${shapeHTML}</div></div>`;

      container.querySelectorAll("[data-custom-color]").forEach(btn => {
        btn.addEventListener("click", () => {
          const item = GALAXTAR_DATA.colors.find(x => x.name === btn.getAttribute("data-custom-color"));
          checkSecretUnlock(item.key);
          if (d.unlockedColors.includes(item.name)) {
            audio.playSystemClick();
            d.selectedShipColor = item.hex;
            stats.save();
          } else if (d.totalPoints >= item.cost) {
            audio.playSystemClick();
            d.totalPoints -= item.cost;
            d.unlockedColors.push(item.name);
            d.selectedShipColor = item.hex;
            stats.save();
          }
          refreshUpgradesUI();
        });
      });

      container.querySelectorAll("[data-custom-shape]").forEach(btn => {
        btn.addEventListener("click", () => {
          const item = GALAXTAR_DATA.shapes.find(x => x.name === btn.getAttribute("data-custom-shape"));
          checkSecretUnlock(item.id);
          if (d.unlockedShapes.includes(item.name)) {
            audio.playSystemClick();
            d.selectedShipShape = item.id;
            stats.save();
          } else if (d.totalPoints >= item.cost) {
            audio.playSystemClick();
            d.totalPoints -= item.cost;
            d.unlockedShapes.push(item.name);
            d.selectedShipShape = item.id;
            stats.save();
          }
          refreshUpgradesUI();
        });
      });
      return;
    }

    const map = {
      fuel: { list: GALAXTAR_DATA.fuelLevels, cur: d.fuelLevel, unl: d.unlockedFuelLevels },
      shields: { list: GALAXTAR_DATA.shieldLevels, cur: d.shieldLevel, unl: d.unlockedShieldLevels },
      weapons: { list: GALAXTAR_DATA.weaponLevels, cur: d.weaponLevel, unl: d.unlockedWeaponLevels },
      thrusters: { list: GALAXTAR_DATA.thrusterLevels, cur: d.thrusterLevel, unl: d.unlockedThrusterLevels }
    }[currentUpgradeCategory];

    const maxUnlocked = Math.max(...map.unl);

    container.innerHTML = `<div class="upgrade-stack">` + map.list.map(item => {
      const isUnlocked = map.unl.includes(item.level);
      const isNext = item.level === maxUnlocked + 1;
      const canBuy = isNext && d.totalPoints >= item.cost;
      const isSelected = map.cur === item.level;

      let desc = "";
      let bonus = "";
      if (currentUpgradeCategory === "fuel") {
        desc = isUnlocked && isSelected ? `${d.currentFuel}/${item.max}` : `Capacity: ${item.max}`;
        if (item.solar) bonus = "+ Regen";
      } else if (currentUpgradeCategory === "shields") {
        desc = `HP: ${item.maxHP}`;
        if (item.regen) bonus = "+ Regen";
      } else if (currentUpgradeCategory === "weapons") {
        desc = item.desc;
        bonus = item.bonus || "";
      } else if (currentUpgradeCategory === "thrusters") {
        desc = `Speed: ${item.speedMultiplier}x`;
        if (item.trail) bonus = "+ Thruster Trail";
      }

      return `
        <button class="upg-btn" data-level="${item.level}" ${!(isUnlocked || canBuy) ? "disabled" : ""}
          style="background:${item.color}40; border-color:${isSelected ? item.color : "#8e8e93"}; box-shadow:${isSelected ? `0 0 12px ${item.color}99` : "none"}">
          <div>
            <span class="upg-name">${item.name}</span>
            <span class="upg-desc">${desc}</span>
            ${bonus ? `<span class="upg-bonus">${bonus}</span>` : ""}
          </div>
          <div>
            ${isUnlocked ? `<span class="upg-unlocked">🔓</span>` : `<span class="upg-cost">${item.cost}pts</span>`}
          </div>
        </button>`;
    }).join("") + `</div>`;

    container.querySelectorAll(".upg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const lvl = Number(btn.getAttribute("data-level"));
        const item = map.list.find(x => x.level === lvl);
        const isUnlocked = map.unl.includes(lvl);
        audio.playSystemClick();

        if (!isUnlocked && d.totalPoints >= item.cost) {
          d.totalPoints -= item.cost;
          map.unl.push(lvl);
          if (currentUpgradeCategory === "fuel") d.currentFuel = item.max;
        }
        if (currentUpgradeCategory === "fuel") d.fuelLevel = lvl;
        if (currentUpgradeCategory === "shields") d.shieldLevel = lvl;
        if (currentUpgradeCategory === "weapons") d.weaponLevel = lvl;
        if (currentUpgradeCategory === "thrusters") d.thrusterLevel = lvl;

        stats.save();
        refreshUpgradesUI();
      });
    });
  }

  function refreshLogsUI() {
    const container = document.getElementById("logs-container");
    const reversed = [...logManager.logs].reverse();
    if (reversed.length === 0) {
      container.innerHTML = `<p style="text-align:center;color:#8e8e93;margin-top:40px;">No flight logs recorded yet. Launch a flight to begin.</p>`;
      return;
    }

    container.innerHTML = reversed.map(log => {
      const expanded = expandedLogId === log.id;
      const isStory = log.triggers.includes("storyLog");
      const dateStr = new Date(log.timestamp).toLocaleDateString();
      return `
        <div class="log-card ${!log.isRead ? "unread" : ""} ${expanded ? "expanded" : ""} ${isStory ? "story" : ""}" data-log-id="${log.id}">
          <div class="log-text">${log.content}</div>
          <div class="log-footer">
            <span>Flight #${log.flightNumber} • ${dateStr}</span>
            ${expanded && log.isRead ? `<button class="delete-log-btn" data-del-id="${log.id}">Delete</button>` : ""}
          </div>
        </div>`;
    }).join("");

    container.querySelectorAll(".log-card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest(".delete-log-btn")) return;
        audio.playSystemClick();
        const id = card.getAttribute("data-log-id");
        if (expandedLogId === id) {
          expandedLogId = null;
        } else {
          expandedLogId = id;
          logManager.markAsRead(id);
        }
        refreshLogsUI();
      });
    });

    container.querySelectorAll(".delete-log-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        audio.playSystemClick();
        logManager.deleteLog(btn.getAttribute("data-del-id"));
        expandedLogId = null;
        refreshLogsUI();
      });
    });
  }

  function refreshSettingsUI() {
    const d = stats.data;
    document.getElementById("set-peaceful-on").className = d.isPeacefulMode ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("set-peaceful-off").className = !d.isPeacefulMode ? "toggle-btn active-off" : "toggle-btn";
    document.getElementById("set-hardcore-on").className = d.isHardcoreMode ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("set-hardcore-off").className = !d.isHardcoreMode ? "toggle-btn active-off" : "toggle-btn";
    document.getElementById("set-music-on").className = audio.isPlaying ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("set-music-off").className = !audio.isPlaying ? "toggle-btn active-off" : "toggle-btn";
    document.getElementById("set-sfx-on").className = audio.isSFXEnabled ? "toggle-btn active-on" : "toggle-btn";
    document.getElementById("set-sfx-off").className = !audio.isSFXEnabled ? "toggle-btn active-off" : "toggle-btn";
  }

  document.getElementById("set-peaceful-on").addEventListener("click", () => { audio.playSystemClick(); stats.data.isPeacefulMode = true; stats.data.isHardcoreMode = false; stats.save(); refreshSettingsUI(); });
  document.getElementById("set-peaceful-off").addEventListener("click", () => { audio.playSystemClick(); stats.data.isPeacefulMode = false; stats.save(); refreshSettingsUI(); });
  document.getElementById("set-hardcore-on").addEventListener("click", () => { audio.playSystemClick(); stats.data.isHardcoreMode = true; stats.data.isPeacefulMode = false; stats.save(); refreshSettingsUI(); });
  document.getElementById("set-hardcore-off").addEventListener("click", () => { audio.playSystemClick(); stats.data.isHardcoreMode = false; stats.save(); refreshSettingsUI(); });

  document.getElementById("set-music-on").addEventListener("click", () => { audio.playSystemClick(); audio.playMusic(); refreshSettingsUI(); });
  document.getElementById("set-music-off").addEventListener("click", () => { audio.playSystemClick(); audio.pauseMusic(); refreshSettingsUI(); });
  document.getElementById("set-sfx-on").addEventListener("click", () => { audio.isSFXEnabled = true; audio.savePrefs(); audio.playSystemClick(); refreshSettingsUI(); });
  document.getElementById("set-sfx-off").addEventListener("click", () => { audio.isSFXEnabled = false; audio.savePrefs(); refreshSettingsUI(); });

  document.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-info");
      document.getElementById("info-modal-title").textContent = type === "peaceful" ? "Peaceful Mode" : "Hardcore Mode";
      document.getElementById("info-modal-desc").textContent =
        type === "peaceful"
          ? "In Peaceful Mode, the galaxy is at peace—enemies appear, but they won't shoot or chase you. They simply drift downward on their path, turning the flight into a navigational challenge only. No points are earned and no permanent stats are saved. Fuel is not consumed. Just a peaceful endless journey to Galaxtar."
          : "In Hardcore Mode, the galaxy turns even more hostile. Enemy swarms are relentless, fuel burns faster, and every second is a fight for survival. With more threats and fewer resources, only the most daring pilots will make it far on the journey to Galaxtar. Not for the inexperienced pilot.";
      document.getElementById("info-modal").classList.remove("hidden");
    });
  });

  document.getElementById("btn-info-dismiss").addEventListener("click", () => {
    document.getElementById("info-modal").classList.add("hidden");
  });

  document.getElementById("btn-reset-prompt").addEventListener("click", () => {
    audio.playSystemClick();
    document.getElementById("btn-reset-prompt").classList.add("hidden");
    document.getElementById("reset-confirm-box").classList.remove("hidden");
  });

  document.getElementById("btn-reset-cancel").addEventListener("click", () => {
    audio.playSystemClick();
    document.getElementById("reset-confirm-box").classList.add("hidden");
    document.getElementById("btn-reset-prompt").classList.remove("hidden");
  });

  document.getElementById("btn-reset-confirm").addEventListener("click", () => {
    audio.playSystemClick();
    stats.resetAll();
    logManager.clearAll();
    document.getElementById("reset-confirm-box").classList.add("hidden");
    document.getElementById("btn-reset-prompt").classList.remove("hidden");
    refreshSettingsUI();
  });

  document.getElementById("btn-settings-guide").addEventListener("click", () => {
    audio.playSystemClick();
    previousGuideCaller = "view-settings";
    guidePageIndex = 0;
    showView("view-guide");
  });

  const guidePages = [
    `<h3>1. Reach Galaxtar</h3><p class="guide-muted">(Accessed from onboard systems: Revision 9.16)</p><p>You awaken aboard a vessel already in motion. Destination: Galaxtar. Purpose: unclear.</p><p>The navigation systems repeat the directive: Reach Galaxtar. No record of your origin. No memory of launch. Only the cold hum of an AI that always seems to be mid-sentence.</p><p>Each attempt ends in failure. And yet, you return. Reprinted. Reassembled. Rebooted.</p>`,
    `<h3>2. Ship Controls</h3><p><strong>Basic Controls:</strong></p><ul><li>Drag with mouse/touch or use Arrow/WASD keys to maneuver and evade hostiles.</li><li>Tap the fire button or press Spacebar to shoot.</li></ul><p><strong>Hyperspeed Drive (Thruster Level 2+):</strong></p><ul><li>Tap the top-left thruster button or press Shift to toggle speed boost.</li></ul><p><strong>Quantum Beam (Weapon Level 4+):</strong></p><ul><li>Triple-tap the firing button to charge and auto-fire a heavy beam.</li></ul>`,
    `<h3>3. Fuel System</h3><p>Fuel is consumed at launch and as distance accumulates during flight.</p><ul><li>Refuel using the Fuel Icon at the top right of the Main Menu.</li><li>Destroy asteroids mid-flight to recover small amounts of fuel.</li><li>At Fuel Level 5, passive solar charging regenerates fuel during sustained flight.</li></ul><p class="guide-danger">Warning: If you run out of fuel and lack points to refuel, launch will be disabled unless you reset progress.</p>`,
    `<h3>4. Ship Upgrades</h3><ul><li><strong>Fuel:</strong> Increases maximum capacity and unlocks solar charging at Level 5.</li><li><strong>Shields:</strong> Reinforces hull integrity and unlocks passive regeneration at Level 5.</li><li><strong>Weapons:</strong> Unlocks multi-shot arrays, Charge Beams, and Heat-Seeking missiles.</li><li><strong>Thrusters:</strong> Multiplies flight speed and unlocks Warpdrive trails at Level 5.</li></ul>`,
    `<h3>5. Hostile Forces</h3><ul><li><strong>Crimson Vectors:</strong> Fast attack drones that swarm in high numbers.</li><li><strong>Void Vectors:</strong> Mid-sized purple craft firing dual-angle spreads.</li><li><strong>Verdant Vectors:</strong> Large green armored vessels with triple-spread volleys.</li><li><strong>Solar Imperators:</strong> Elusive yellow octagons firing 4-way bursts.</li><li><strong>Oblivion Frames:</strong> Heavy blue constructs firing 8-way radial barrages.</li></ul><p>Some ships resemble your own. Same marks. Same paint. Same hesitation.</p>`,
    `<h3>6. Pilot Statistics</h3><p>Each flight is logged. The ship compiles performance data between cycles and stores it in your Stats module—tracking distance traveled, enemies eliminated, asteroids mined, and cosmic objects passed.</p>`,
    `<h3>7. Pilot Profile</h3><p>Tap your holographic Pilot Card in the Profile screen to flip between your lifetime flight record and your active Ship Systems levels.</p>`,
    `<h3>8. Temporal Suspension Protocol</h3><p class="guide-muted">Experimental feature — use at own risk.</p><p>Engage the top-right Pause control mid-flight to suspend local timeflow, freezing all hostile entities until you resume.</p>`,
    () => {
      if (stats.data.guideVariation === 0) stats.selectRandomGuideVariation();
      if (stats.data.guideVariation === 1) {
        return `<p>If you're reading this, the systems are still functional. That's something.</p><p>You may feel like you've been here before. You may be right.</p><p>The ship will restart. The stars will realign. The hostiles will return. And you'll try again.</p><p>The nav system will whisper it once more: Reach Galaxtar.</p><p>If you do… tell me what you find.</p><p class="guide-muted">— End of Guide — (Transmission origin: unknown)</p>`;
      }
      if (stats.data.guideVariation === 2) {
        return `<p>FINAL MODULE INITIATED.</p><p>[USER DESIGNATION: PILOT] status: stable<br>[OBJECTIVE: REACH GΛLAXTAR] — Repeating directive</p><p>Prior instance detected: 101629 previous attempts<br>Memory retention: inconsistent</p><p>If Galaxtar is reached, report anomaly code: ΔR-01</p><p class="guide-muted">END OF TRAINING PROTOCOL — AI CORE</p>`;
      }
      return `<p class="guide-muted">[text recovered]</p><p>I tried to steer the ship differently. It didn't matter.</p><p>I saw my own wreckage on the way out. Fresh. Smoking.</p><p>Galaxtar isn't a place. It's a promise. And we keep falling for it.</p><p class="guide-muted">[end log]</p>`;
    }
  ];

  function renderGuidePage() {
    const content = guidePages[guidePageIndex];
    document.getElementById("guide-page-container").innerHTML = typeof content === "function" ? content() : content;

    if (guidePageIndex === guidePages.length - 1 && !stats.data.hasCompletedPilotsGuide) {
      stats.data.hasCompletedPilotsGuide = true;
      stats.save();
    }

    const dots = document.getElementById("guide-dots");
    dots.innerHTML = guidePages
      .map((_, i) => `<span class="guide-dot ${i === guidePageIndex ? "active" : ""}"></span>`)
      .join("");
  }

  document.getElementById("btn-guide-prev").addEventListener("click", () => {
    if (guidePageIndex > 0) {
      audio.playSystemClick();
      guidePageIndex--;
      renderGuidePage();
    }
  });

  document.getElementById("btn-guide-next").addEventListener("click", () => {
    if (guidePageIndex < guidePages.length - 1) {
      audio.playSystemClick();
      guidePageIndex++;
      renderGuidePage();
    }
  });

  document.getElementById("btn-guide-back").addEventListener("click", () => {
    audio.playSystemClick();
    showView(previousGuideCaller);
  });

  refreshMenuUI();
});
