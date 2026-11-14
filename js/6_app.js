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

  // Check if pilot name is set; if not, show mandatory intro modal
  const introModal = document.getElementById("intro-modal");
  const introNameInput = document.getElementById("intro-name-input");
  const btnIntroStart = document.getElementById("btn-intro-start");

  if (!stats.data.pilotName || stats.data.pilotName.trim() === "") {
    if (introModal) introModal.classList.remove("hidden");
  }

  if (btnIntroStart && introNameInput) {
    btnIntroStart.addEventListener("click", () => {
      const nameVal = introNameInput.value.trim();
      if (!nameVal) {
        alert("Please enter a valid pilot name to continue.");
        return;
      }
      stats.data.pilotName = nameVal;
      stats.save();
      if (introModal) introModal.classList.add("hidden");
    });
  }

  function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add("active");
      if (viewId === "view-profile") updateProfileDisplay();
      if (viewId === "view-upgrades") updateUpgradesDisplay();
      if (viewId === "view-settings") updateSettingsDisplay();
    }
  }

  // Fuel Widget & Expansion
  const fuelIcon = document.getElementById("btn-fuel-icon");
  const fuelExpansion = document.getElementById("fuel-expansion");
  const fuelText = document.getElementById("fuel-text");
  const btnRefuel = document.getElementById("btn-refuel");

  function updateFuelWidget() {
    const current = Math.floor(stats.data.currentFuel);
    const max = stats.maxFuel();
    if (fuelText) fuelText.innerText = `${current}/${max}`;
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    const fuelRing = document.getElementById("fuel-ring");
    if (fuelRing) fuelRing.style.strokeDasharray = `${percent}, 100`;

    const missing = max - current;
    const refuelCost = Math.floor(missing * 0.5);
    if (btnRefuel) {
      if (missing > 0) {
        btnRefuel.classList.remove("hidden");
        btnRefuel.innerText = `Refuel (${refuelCost} pts)`;
        btnRefuel.disabled = stats.data.totalPoints < refuelCost;
        if (btnRefuel.disabled) btnRefuel.classList.add("disabled");
        else btnRefuel.classList.remove("disabled");
      } else {
        btnRefuel.classList.add("hidden");
      }
    }
  }

  if (fuelIcon) {
    fuelIcon.addEventListener("click", e => {
      e.stopPropagation();
      updateFuelWidget();
      if (fuelExpansion) fuelExpansion.classList.toggle("hidden");
    });
  }

  window.addEventListener("click", () => {
    if (fuelExpansion) fuelExpansion.classList.add("hidden");
  });

  if (btnRefuel) {
    btnRefuel.addEventListener("click", () => {
      const current = stats.data.currentFuel;
      const max = stats.maxFuel();
      const missing = max - current;
      const cost = Math.floor(missing * 0.5);
      if (missing > 0 && stats.data.totalPoints >= cost) {
        stats.data.totalPoints -= cost;
        stats.data.currentFuel = max;
        stats.save();
        updateFuelWidget();
      }
    });
  }

  updateFuelWidget();

  // Menu Buttons
  const btnLaunch = document.getElementById("btn-launch");
  if (btnLaunch) {
    btnLaunch.addEventListener("click", () => {
      // Double check name is set before launch
      if (!stats.data.pilotName || stats.data.pilotName.trim() === "") {
        if (introModal) introModal.classList.remove("hidden");
        return;
      }
      showView("view-explore");
      gameEngine.startSession();
    });
  }

  const btnStats = document.getElementById("btn-stats");
  if (btnStats) {
    btnStats.addEventListener("click", () => {
      updateStatsDisplay();
      showView("view-stats");
    });
  }

  const btnUpgrades = document.getElementById("btn-upgrades");
  if (btnUpgrades) {
    btnUpgrades.addEventListener("click", () => {
      updateUpgradesDisplay();
      showView("view-upgrades");
    });
  }

  const btnLogs = document.getElementById("btn-logs");
  if (btnLogs) {
    btnLogs.addEventListener("click", () => {
      updateLogsDisplay();
      showView("view-logs");
    });
  }

  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      updateSettingsDisplay();
      showView("view-settings");
    });
  }

  document.querySelectorAll(".back-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-back") || "view-menu";
      showView(target);
    });
  });

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

  const btnContinue = document.getElementById("btn-continue");
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      document.getElementById("gameover-overlay").classList.add("hidden");
      showView("view-menu");
    });
  }

  const btnGameoverLeaderboard = document.getElementById("btn-gameover-leaderboard");
  if (btnGameoverLeaderboard) {
    btnGameoverLeaderboard.addEventListener("click", () => {
      document.getElementById("gameover-overlay").classList.add("hidden");
      loadLeaderboard();
      showView("view-leaderboard");
    });
  }

  function showGameOver(res) {
    const overlay = document.getElementById("gameover-overlay");
    const grid = document.getElementById("gameover-grid");
    
    // Directly pull whatever locked name the user set
    const finalName = stats.data.pilotName.trim() || "Unknown Pilot";

    if (grid) {
      grid.innerHTML = `
        <div>Distance: ${res.distance}</div>
        <div>Ships Destroyed: ${res.ships}</div>
        <div>Asteroids: ${res.asteroids}</div>
        <div>Points Earned: ${res.points}</div>
      `;
    }
    if (overlay) overlay.classList.remove("hidden");

    // Submit score directly using the user's custom name
    if (!res.isPeaceful && res.distance > 0) {
      submitScore(finalName, res.distance);
    }
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

  // Profile View & Flip
  const profileBtn = document.getElementById("btn-player-profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => showView("view-profile"));
  }

  const flipCard = document.getElementById("flip-card");
  if (flipCard) {
    flipCard.addEventListener("click", e => {
      if (e.target.closest("input") || e.target.closest("button")) return;
      flipCard.classList.toggle("flipped");
    });
  }

  const nameInput = document.getElementById("pilot-name-input");
  const saveNameBtn = document.getElementById("btn-save-name");

  if (nameInput) {
    nameInput.value = stats.data.pilotName;
  }

  if (saveNameBtn && nameInput) {
    saveNameBtn.addEventListener("click", () => {
      const newName = nameInput.value.trim();
      if (newName) {
        stats.data.pilotName = newName;
        stats.save();
        alert(`Pilot name updated to: ${newName}`);
      } else {
        alert("Please enter a valid pilot name.");
      }
    });
  }

  function updateProfileDisplay() {
    const d = stats.data;
    if (nameInput) nameInput.value = d.pilotName;
    document.getElementById("p-first-date").innerText = d.firstFlightDate ? new Date(d.firstFlightDate).toLocaleDateString() : "No flights yet";
    const hrs = Math.floor(d.totalTimePlayed / 3600);
    const mins = Math.floor((d.totalTimePlayed % 3600) / 60);
    const secs = d.totalTimePlayed % 60;
    document.getElementById("p-total-time").innerText = `${hrs}h ${mins}m ${secs}s`;
    document.getElementById("p-total-runs").innerText = d.totalRuns;
    document.getElementById("p-total-dist").innerText = d.totalDistanceTraveled;
    document.getElementById("p-avg-dist").innerText = d.totalRuns > 0 ? Math.floor(d.totalDistanceTraveled / d.totalRuns) : 0;
    document.getElementById("p-life-pts").innerText = d.lifetimePointsEarned;

    document.getElementById("sys-fuel-lbl").innerText = `Level ${d.fuelLevel}/5`;
    document.getElementById("sys-fuel-fill").style.width = `${(d.fuelLevel / 5) * 100}%`;
    document.getElementById("sys-shield-lbl").innerText = `Level ${d.shieldLevel}/5`;
    document.getElementById("sys-shield-fill").style.width = `${(d.shieldLevel / 5) * 100}%`;
    document.getElementById("sys-weapon-lbl").innerText = `Level ${d.weaponLevel}/5`;
    document.getElementById("sys-weapon-fill").style.width = `${(d.weaponLevel / 5) * 100}%`;
    document.getElementById("sys-thruster-lbl").innerText = `Level ${d.thrusterLevel}/5`;
    document.getElementById("sys-thruster-fill").style.width = `${(d.thrusterLevel / 5) * 100}%`;

    // Rank evaluation
    let currentRank = GALAXTAR_DATA.ranks[0];
    for (const r of GALAXTAR_DATA.ranks) {
      if (d.lifetimePointsEarned >= r.minPoints) currentRank = r;
    }
    document.getElementById("profile-rank-title").innerText = currentRank.name;
    const bar = document.getElementById("profile-rank-bar");
    if (bar) {
      const nextRank = GALAXTAR_DATA.ranks.find(r => r.minPoints > d.lifetimePointsEarned);
      if (!nextRank) {
        bar.style.width = "100%";
      } else {
        const span = nextRank.minPoints - currentRank.minPoints;
        const prog = d.lifetimePointsEarned - currentRank.minPoints;
        bar.style.width = `${Math.min(100, Math.max(0, (prog / span) * 100))}%`;
      }
    }
  }

  // Upgrades View
  let currentUpgradeCat = "fuel";
  document.querySelectorAll(".cat-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".cat-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentUpgradeCat = tab.getAttribute("data-cat");
      document.getElementById("upgrade-cat-title").innerText = currentUpgradeCat.toUpperCase();
      renderUpgradeList();
    });
  });

  function renderUpgradeList() {
    const container = document.getElementById("upgrade-list-container");
    document.getElementById("upgrades-points").innerText = stats.data.totalPoints + " pts";
    if (!container) return;

    const d = stats.data;
    let html = "";

    if (currentUpgradeCat === "fuel") {
      GALAXTAR_DATA.fuelLevels.forEach(lvl => {
        const owned = d.fuelLevel >= lvl.level;
        const next = d.fuelLevel + 1 === lvl.level;
        const canAfford = d.totalPoints >= lvl.cost;
        html += `<div class="upgrade-card">
          <div class="upgrade-info">
            <h4>Level ${lvl.level}: ${lvl.name}</h4>
            <p>Max Fuel: ${lvl.max} ${lvl.solar ? "(Solar Charging)" : ""}</p>
          </div>
          <div>${owned ? '<span style="color:#2ecc71; font-weight:bold;">OWNED</span>' : `<button class="upgrade-btn ${canAfford && next ? 'green' : 'disabled'}" ${!canAfford || !next ? 'disabled' : ''} onclick="buyFuel(${lvl.level}, ${lvl.cost})">${lvl.cost} pts</button>`}</div>
        </div>`;
      });
    } else if (currentUpgradeCat === "shields") {
      GALAXTAR_DATA.shieldLevels.forEach(lvl => {
        const owned = d.shieldLevel >= lvl.level;
        const next = d.shieldLevel + 1 === lvl.level;
        const canAfford = d.totalPoints >= lvl.cost;
        html += `<div class="upgrade-card">
          <div class="upgrade-info">
            <h4>Level ${lvl.level}: ${lvl.name}</h4>
            <p>Max HP: ${lvl.maxHP} ${lvl.regen ? "(Regenerates HP)" : ""}</p>
          </div>
          <div>${owned ? '<span style="color:#2ecc71; font-weight:bold;">OWNED</span>' : `<button class="upgrade-btn ${canAfford && next ? 'green' : 'disabled'}" ${!canAfford || !next ? 'disabled' : ''} onclick="buyShield(${lvl.level}, ${lvl.cost})">${lvl.cost} pts</button>`}</div>
        </div>`;
      });
    } else if (currentUpgradeCat === "weapons") {
      GALAXTAR_DATA.weaponLevels.forEach(lvl => {
        const owned = d.weaponLevel >= lvl.level;
        const next = d.weaponLevel + 1 === lvl.level;
        const canAfford = d.totalPoints >= lvl.cost;
        html += `<div class="upgrade-card">
          <div class="upgrade-info">
            <h4>Level ${lvl.level}: ${lvl.name}</h4>
            <p>${lvl.desc} ${lvl.bonus || ""}</p>
          </div>
          <div>${owned ? '<span style="color:#2ecc71; font-weight:bold;">OWNED</span>' : `<button class="upgrade-btn ${canAfford && next ? 'green' : 'disabled'}" ${!canAfford || !next ? 'disabled' : ''} onclick="buyWeapon(${lvl.level}, ${lvl.cost})">${lvl.cost} pts</button>`}</div>
        </div>`;
      });
    } else if (currentUpgradeCat === "thrusters") {
      GALAXTAR_DATA.thrusterLevels.forEach(lvl => {
        const owned = d.thrusterLevel >= lvl.level;
        const next = d.thrusterLevel + 1 === lvl.level;
        const canAfford = d.totalPoints >= lvl.cost;
        html += `<div class="upgrade-card">
          <div class="upgrade-info">
            <h4>Level ${lvl.level}: ${lvl.name}</h4>
            <p>Speed Multiplier: ${lvl.speedMultiplier}x ${lvl.trail ? "(Ion Trail)" : ""}</p>
          </div>
          <div>${owned ? '<span style="color:#2ecc71; font-weight:bold;">OWNED</span>' : `<button class="upgrade-btn ${canAfford && next ? 'green' : 'disabled'}" ${!canAfford || !next ? 'disabled' : ''} onclick="buyThruster(${lvl.level}, ${lvl.cost})">${lvl.cost} pts</button>`}</div>
        </div>`;
      });
    } else if (currentUpgradeCat === "customization") {
      html += `<h4 style="margin-bottom:8px; color:#3498db;">Ship Colors</h4>`;
      GALAXTAR_DATA.colors.forEach(c => {
        const selected = d.selectedShipColor === c.hex;
        html += `<div class="upgrade-card">
          <div class="upgrade-info"><h4 style="color:${c.hex};">${c.name}</h4></div>
          <div>${selected ? '<span style="color:#2ecc71; font-weight:bold;">SELECTED</span>' : `<button class="upgrade-btn green" onclick="selectColor('${c.hex}')">Select</button>`}</div>
        </div>`;
      });
      html += `<h4 style="margin:16px 0 8px 0; color:#3498db;">Ship Shapes</h4>`;
      GALAXTAR_DATA.shapes.forEach(s => {
        const selected = d.selectedShipShape === s.id;
        html += `<div class="upgrade-card">
          <div class="upgrade-info"><h4>${s.name}</h4></div>
          <div>${selected ? '<span style="color:#2ecc71; font-weight:bold;">SELECTED</span>' : `<button class="upgrade-btn green" onclick="selectShape('${s.id}')">Select</button>`}</div>
        </div>`;
      });
    }

    container.innerHTML = html;
  }

  window.buyFuel = (lvl, cost) => {
    if (stats.data.totalPoints >= cost) {
      stats.data.totalPoints -= cost;
      stats.data.fuelLevel = lvl;
      stats.data.currentFuel = stats.maxFuel();
      stats.save();
      renderUpgradeList();
    }
  };
  window.buyShield = (lvl, cost) => {
    if (stats.data.totalPoints >= cost) {
      stats.data.totalPoints -= cost;
      stats.data.shieldLevel = lvl;
      stats.save();
      renderUpgradeList();
    }
  };
  window.buyWeapon = (lvl, cost) => {
    if (stats.data.totalPoints >= cost) {
      stats.data.totalPoints -= cost;
      stats.data.weaponLevel = lvl;
      stats.save();
      renderUpgradeList();
    }
  };
  window.buyThruster = (lvl, cost) => {
    if (stats.data.totalPoints >= cost) {
      stats.data.totalPoints -= cost;
      stats.data.thrusterLevel = lvl;
      stats.save();
      renderUpgradeList();
    }
  };
  window.selectColor = hex => {
    stats.data.selectedShipColor = hex;
    stats.save();
    renderUpgradeList();
  };
  window.selectShape = id => {
    stats.data.selectedShipShape = id;
    stats.save();
    renderUpgradeList();
  };

  function updateUpgradesDisplay() {
    renderUpgradeList();
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

  // Settings Toggles & Reset
  function updateSettingsDisplay() {
    const d = stats.data;
    setToggleState("set-peaceful", d.isPeacefulMode);
    setToggleState("set-hardcore", d.isHardcoreMode);
    setToggleState("set-music", d.musicOn);
    setToggleState("set-sfx", d.sfxOn);
  }

  function setToggleState(idPrefix, val) {
    const offBtn = document.getElementById(`${idPrefix}-off`);
    const onBtn = document.getElementById(`${idPrefix}-on`);
    if (offBtn && onBtn) {
      if (val) {
        offBtn.classList.remove("active");
        onBtn.classList.add("active");
      } else {
        onBtn.classList.remove("active");
        offBtn.classList.add("active");
      }
    }
  }

  const setupToggle = (idPrefix, settingKey, onChange) => {
    const offBtn = document.getElementById(`${idPrefix}-off`);
    const onBtn = document.getElementById(`${idPrefix}-on`);
    if (offBtn) {
      offBtn.addEventListener("click", () => {
        stats.data[settingKey] = false;
        stats.save();
        setToggleState(idPrefix, false);
        if (onChange) onChange(false);
      });
    }
    if (onBtn) {
      onBtn.addEventListener("click", () => {
        stats.data[settingKey] = true;
        stats.save();
        setToggleState(idPrefix, true);
        if (onChange) onChange(true);
      });
    }
  };

  setupToggle("set-peaceful", "isPeacefulMode");
  setupToggle("set-hardcore", "isHardcoreMode");
  setupToggle("set-music", "musicOn", val => { audio.setMusicEnabled(val); });
  setupToggle("set-sfx", "sfxOn", val => { audio.sfxEnabled = val; });

  const resetPromptBtn = document.getElementById("btn-reset-prompt");
  const resetConfirmBox = document.getElementById("reset-confirm-box");
  const resetConfirmBtn = document.getElementById("btn-reset-confirm");
  const resetCancelBtn = document.getElementById("btn-reset-cancel");

  if (resetPromptBtn) {
    resetPromptBtn.addEventListener("click", () => resetConfirmBox.classList.remove("hidden"));
  }
  if (resetCancelBtn) {
    resetCancelBtn.addEventListener("click", () => resetConfirmBox.classList.add("hidden"));
  }
  if (resetConfirmBtn) {
    resetConfirmBtn.addEventListener("click", () => {
      localStorage.clear();
      location.reload();
    });
  }

  // Mode Info Modal
  const infoModal = document.getElementById("info-modal");
  const infoTitle = document.getElementById("info-modal-title");
  const infoDesc = document.getElementById("info-modal-desc");
  const infoDismiss = document.getElementById("btn-info-dismiss");

  document.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-info");
      if (mode === "peaceful") {
        infoTitle.innerText = "Peaceful Mode";
        infoDesc.innerText = "No fuel consumption over distance, no enemies attacking, and infinite exploration. Perfect for reading flight logs and relaxing.";
      } else if (mode === "hardcore") {
        infoTitle.innerText = "Hardcore Mode";
        infoDesc.innerText = "Double fuel drain, increased enemy spawn rates, and relentless difficulty for veteran pilots.";
      }
      infoModal.classList.remove("hidden");
    });
  });

  if (infoDismiss) {
    infoDismiss.addEventListener("click", () => infoModal.classList.add("hidden"));
  }

  // Pilot's Guide Navigation
  const guidePages = [
    { title: "Mission Objective", text: "Welcome to GALAXTAR. You pilot a deep-space research vessel through an endless cosmic expanse.\n\nSurvive as long as you can, destroy incoming hostile ships and asteroids, defeat space bosses, collect points, and upgrade your ship!" },
    { title: "Flight Controls", text: "Drag your ship directly to steer smoothly.\n- Tap anywhere else on screen to shoot lasers. },
    { title: "Fuel & Asteroids", text: "Your ship constantly consumes fuel as you travel.\n\nShoot and destroy drifting asteroids to replenish your fuel reserves, earn points, and avoid hull damage.\n\nTap on your fuel gauge on the main menu to refuel" },
    { title: "Combat & Upgrades", text: "Enemies and bosses will attack as you travel deeper into space. Defeat them to survive and earn points.\n\nSpend earned points in the Upgrades menu to enhance your Fuel Capacity, Shield Strength, Weapon Firepower, and Thruster Speed, as well as customize ship colors and shapes." }
  ];
  let currentGuidePage = 0;

  function renderGuidePage() {
    const container = document.getElementById("guide-page-container");
    const dotsContainer = document.getElementById("guide-dots");
    if (!container) return;

    const page = guidePages[currentGuidePage];
    container.innerHTML = `<h3>${page.title}</h3><p style="white-space: pre-wrap;">${page.text}</p>`;

    if (dotsContainer) {
      dotsContainer.innerHTML = guidePages.map((_, i) => `<div class="guide-dot ${i === currentGuidePage ? 'active' : ''}"></div>`).join("");
    }
  }

  const btnGuidePrev = document.getElementById("btn-guide-prev");
  const btnGuideNext = document.getElementById("btn-guide-next");
  const btnGuideBack = document.getElementById("btn-guide-back");

  if (btnGuidePrev) {
    btnGuidePrev.addEventListener("click", () => {
      if (currentGuidePage > 0) {
        currentGuidePage--;
        renderGuidePage();
      }
    });
  }
  if (btnGuideNext) {
    btnGuideNext.addEventListener("click", () => {
      if (currentGuidePage < guidePages.length - 1) {
        currentGuidePage++;
        renderGuidePage();
      }
    });
  }
  if (btnGuideBack) {
    btnGuideBack.addEventListener("click", () => showView("view-menu"));
  }

  const openGuide = () => {
    currentGuidePage = 0;
    renderGuidePage();
    showView("view-guide");
  };

  const btnSettingsGuide = document.getElementById("btn-settings-guide");
  if (btnSettingsGuide) btnSettingsGuide.addEventListener("click", openGuide);
  const btnPauseGuide = document.getElementById("btn-pause-guide");
  if (btnPauseGuide) btnPauseGuide.addEventListener("click", openGuide);

  // Leaderboard Integration
  const SHEETDB_API = "https://sheetdb.io/api/v1/r8967tf5cqjdj";

  async function submitScore(pilotName, distance) {
    try {
      await fetch(SHEETDB_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [{
            name: pilotName,
            distance: distance,
            date: new Date().toLocaleDateString()
          }]
        })
      });
    } catch (err) {
      console.error("Failed to upload score:", err);
    }
  }

  async function loadLeaderboard() {
    const container = document.getElementById("leaderboard-list");
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">Synchronizing...</p>`;

    try {
      const response = await fetch(`${SHEETDB_API}?sort_by=distance&sort_order=desc&limit=10`);
      const data = await response.json();

      if (!data || data.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">No flight records found yet.</p>`;
        return;
      }

      let html = `
        <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold; color: #3498db; max-width: 600px; margin: 0 auto;">
          <span>RANK & PILOT</span>
          <span>DISTANCE</span>
        </div>
      `;

      data.forEach((row, index) => {
        const safeName = (row.name || "Unknown").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); margin: 6px auto; border-radius: 6px; max-width: 600px;">
            <span>#${index + 1} ${safeName}</span>
            <span style="font-weight: bold; color: #2ecc71;">${row.distance} m</span>
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (err) {
      container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">Failed to connect to galactic server.</p>`;
    }
  }

  const btnLeaderboard = document.getElementById("btn-leaderboard");
  if (btnLeaderboard) {
    btnLeaderboard.addEventListener("click", () => {
      loadLeaderboard();
      showView("view-leaderboard");
    });
  }
});
