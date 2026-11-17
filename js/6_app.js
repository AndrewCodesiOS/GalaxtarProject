document.addEventListener("DOMContentLoaded", () => {
  // Register Service Worker for PWA Installation
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(err => {
        console.log("Service Worker registration failed:", err);
      });
    });
  }

  const audio = new AudioController();
  const stats = new StatsStore();
  const logManager = new FlightLogController(stats);

  audio.musicEnabled = stats.data.musicOn;
  audio.sfxEnabled = stats.data.sfxOn;

  // Unlock and start background music on the very first user interaction anywhere on the screen
  const unlockAudioOnFirstInteraction = () => {
    audio.init();
    if (stats.data.musicOn) {
      audio.bgMusic.play().catch(e => console.log("Initial music play blocked:", e));
    }
    window.removeEventListener("pointerdown", unlockAudioOnFirstInteraction);
    window.removeEventListener("keydown", unlockAudioOnFirstInteraction);
  };
  window.addEventListener("pointerdown", unlockAudioOnFirstInteraction);
  window.addEventListener("keydown", unlockAudioOnFirstInteraction);

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
      if (viewId === "view-menu") updateFuelWidget();
      if (viewId === "view-profile") updateProfileDisplay();
      if (viewId === "view-upgrades") updateUpgradesDisplay();
      if (viewId === "view-settings") updateSettingsDisplay();
    }
  }

  // Fuel Widget & Expansion Elements
  const fuelIcon = document.getElementById("btn-fuel-icon");
  const fuelExpansion = document.getElementById("fuel-expansion");
  const fuelText = document.getElementById("fuel-text");
  const btnRefuel = document.getElementById("btn-refuel");

  // Define updateFuelWidget globally so it can be called anywhere
  window.updateFuelWidget = function() {
    const current = Math.floor(stats.data.currentFuel);
    const max = stats.maxFuel();
    if (fuelText) fuelText.innerText = `${current}/${max}`;
    
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    const fuelRing = document.getElementById("fuel-ring");
    if (fuelRing) {
      fuelRing.style.transition = "none";
      fuelRing.style.strokeDasharray = `${percent}, 100`;
      void fuelRing.getBoundingClientRect(); // Force reflow
      requestAnimationFrame(() => {
        fuelRing.style.transition = "stroke-dasharray 0.3s ease";
      });
    }

    const missing = max - current;
    const refuelCost = Math.floor(missing * 0.5);
    if (btnRefuel) {
      if (missing > 0) {
        btnRefuel.classList.remove("hidden");
        
        // Soft-lock prevention: Emergency Refuel is only available for free when currentFuel is 0 and player cannot afford the cost
        if (stats.data.currentFuel <= 0 && stats.data.totalPoints < refuelCost) {
          btnRefuel.innerText = `EMERGENCY REFUEL (FREE)`;
          btnRefuel.disabled = false;
          btnRefuel.classList.remove("disabled");
        } else {
          btnRefuel.innerText = `Refuel (${refuelCost} pts)`;
          btnRefuel.disabled = stats.data.totalPoints < refuelCost;
          if (btnRefuel.disabled) btnRefuel.classList.add("disabled");
          else btnRefuel.classList.remove("disabled");
        }
      } else {
        btnRefuel.classList.add("hidden");
      }
    }
  };

  // Run immediately on startup
  window.updateFuelWidget();

  if (fuelIcon) {
    fuelIcon.addEventListener("click", e => {
      e.stopPropagation();
      window.updateFuelWidget();
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
      
      if (missing > 0) {
        if (stats.data.totalPoints >= cost) {
          // Normal paid refuel
          stats.data.totalPoints -= cost;
          stats.data.currentFuel = max;
          stats.save();
          window.updateFuelWidget();
        } else {
          if (stats.data.currentFuel <= 0) {
            // EMERGENCY STIPEND: Triggered only when completely out of fuel (0) and unable to afford
            stats.data.currentFuel = max;
            stats.save();
            window.updateFuelWidget();
            alert("DISTRESS BEACON RECEIVED: Star Command has fully refueled your vessel on the house to get you back into the void!");
          } else {
            // Player has fuel remaining but cannot afford the full refuel cost
            alert("Insufficient points for full refuel.");
          }
        }
      }
    });
  }

  // Pre-Flight Module Loadout Modal Logic
  const loadoutModal = document.getElementById("loadout-modal");
  const loadoutList = document.getElementById("loadout-list");
  const loadoutCount = document.getElementById("loadout-count");
  const btnCancelLoadout = document.getElementById("btn-cancel-loadout");
  const btnConfirmLaunch = document.getElementById("btn-confirm-launch");
  let selectedLoadoutModules = [];

  function openLoadoutModal() {
    selectedLoadoutModules = [];
    renderLoadoutList();
    if (loadoutModal) loadoutModal.classList.remove("hidden");
  }

  function renderLoadoutList() {
    if (!loadoutList) return;
    if (loadoutCount) loadoutCount.innerText = `${selectedLoadoutModules.length}/3`;

    const inv = stats.data.moduleInventory || {};
    const ownedModules = GALAXTAR_DATA.modules.filter(m => (inv[m.id] || 0) > 0);

    if (ownedModules.length === 0) {
      loadoutList.innerHTML = `<p style="text-align: center; color: #777; padding: 18px; font-size: 0.85rem;">No modules in hangar.<br>Complete deep-space runs to purchase modules from the telemetry shop!</p>`;
      return;
    }

    loadoutList.innerHTML = ownedModules.map(mod => {
      const count = inv[mod.id] || 0;
      const isSelected = selectedLoadoutModules.includes(mod.id);
      const isFull = selectedLoadoutModules.length >= 3 && !isSelected;
      const alreadySelected = selectedLoadoutModules.includes(mod.id);

      return `
        <div class="module-card ${isSelected ? "selected" : ""} ${isFull || alreadySelected ? "disabled" : ""}" data-mod-id="${mod.id}">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span style="font-size: 0.65rem; font-weight: bold; color: ${mod.color};">${mod.rarity}</span>
              <strong style="font-size: 0.9rem; color: #fff;">${mod.name}</strong>
            </div>
            <p style="font-size: 0.78rem; color: #aaa; line-height: 1.3;">${mod.desc}</p>
          </div>
          <span class="module-badge">x${count}</span>
        </div>
      `;
    }).join("");

    loadoutList.querySelectorAll(".module-card").forEach(card => {
      card.addEventListener("click", () => {
        const modId = card.getAttribute("data-mod-id");
        if (selectedLoadoutModules.includes(modId)) {
          selectedLoadoutModules = selectedLoadoutModules.filter(id => id !== modId);
        } else if (selectedLoadoutModules.length < 3) {
          selectedLoadoutModules.push(modId);
        }
        renderLoadoutList();
      });
    });
  }

  if (btnCancelLoadout) {
    btnCancelLoadout.addEventListener("click", () => {
      if (loadoutModal) loadoutModal.classList.add("hidden");
    });
  }

  if (btnConfirmLaunch) {
    btnConfirmLaunch.addEventListener("click", () => {
      if (loadoutModal) loadoutModal.classList.add("hidden");
      if (!stats.data.isPeacefulMode && selectedLoadoutModules.length > 0) {
        stats.consumeModules(selectedLoadoutModules);
      }
      const modulesToActivate = stats.data.isPeacefulMode ? [] : [...selectedLoadoutModules];
      showView("view-explore");
      gameEngine.startSession(modulesToActivate);
    });
  }

  // Low-Fuel Warning Modal Elements & Flow
  const lowFuelModal = document.getElementById("low-fuel-modal");
  const lowFuelMsg = document.getElementById("low-fuel-msg");
  const btnFuelBack = document.getElementById("btn-fuel-back");
  const btnFuelLaunch = document.getElementById("btn-fuel-launch");

  function proceedWithLaunch() {
    if (stats.data.isPeacefulMode) {
      showView("view-explore");
      gameEngine.startSession([]);
    } else {
      openLoadoutModal();
    }
  }

  if (btnFuelBack) {
    btnFuelBack.addEventListener("click", () => {
      if (lowFuelModal) lowFuelModal.classList.add("hidden");
    });
  }

  if (btnFuelLaunch) {
    btnFuelLaunch.addEventListener("click", () => {
      if (lowFuelModal) lowFuelModal.classList.add("hidden");
      proceedWithLaunch();
    });
  }

  // Menu Buttons
  const btnLaunch = document.getElementById("btn-launch");
  if (btnLaunch) {
    btnLaunch.addEventListener("click", () => {
      if (!stats.data.pilotName || stats.data.pilotName.trim() === "") {
        if (introModal) introModal.classList.remove("hidden");
        return;
      }

      const currentFuel = stats.data.currentFuel;
      const maxFuel = stats.maxFuel();
      const fuelPercentage = currentFuel / maxFuel;

      if (!stats.data.isPeacefulMode && fuelPercentage < 0.25) {
        if (lowFuelMsg) {
          lowFuelMsg.innerText = `Your fuel reserves are critically low (${Math.floor(currentFuel)}/${maxFuel}). Consider refueling from the main menu first!\n\nDo you still wish to launch anyway?`;
        }
        if (lowFuelModal) {
          lowFuelModal.classList.remove("hidden");
        }
        return;
      }

      proceedWithLaunch();
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
      showView("view-explore");
      gameEngine.triggerGameOver(true);
    });
  }

  // Post-Flight Shop Logic
  let lastRunResult = null;
  let currentShopOfferings = [];
  const moduleShopModal = document.getElementById("module-shop-modal");
  const shopPlayerPoints = document.getElementById("shop-player-points");
  const moduleShopList = document.getElementById("module-shop-list");
  const btnCloseShop = document.getElementById("btn-close-shop");

  function getRandomShopOfferings() {
    const pool = [...GALAXTAR_DATA.modules];
    const offered = [];
    for (let i = 0; i < 3; i++) {
      if (pool.length === 0) break;
      const index = Math.floor(Math.random() * pool.length);
      offered.push(pool[index]);
      pool.splice(index, 1);
    }
    return offered;
  }

  function renderShopModal() {
    if (!moduleShopList) return;
    if (shopPlayerPoints) shopPlayerPoints.innerText = `Points Available: ${stats.data.totalPoints} pts`;

    moduleShopList.innerHTML = currentShopOfferings.map((mod, idx) => {
      const canAfford = stats.data.totalPoints >= mod.price;
      const isPurchased = mod.purchased;

      return `
        <div style="background: rgba(20, 20, 28, 0.9); border: 1px solid ${isPurchased ? '#2ecc71' : 'rgba(255,255,255,0.15)'}; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.7rem; font-weight: bold; color: ${mod.color};">${mod.rarity}</span>
            <span style="font-size: 0.85rem; font-weight: bold; color: #f1c40f;">${mod.price} pts</span>
          </div>
          <h4 style="color: #fff; font-size: 0.95rem; margin: 2px 0;">${mod.name}</h4>
          <p style="font-size: 0.78rem; color: #ccc; line-height: 1.3;">${mod.desc}</p>
          <button class="upgrade-btn ${isPurchased ? 'disabled' : (canAfford ? 'green' : 'disabled')}" ${isPurchased || !canAfford ? 'disabled' : ''} onclick="buyShopModule(${idx})">
            ${isPurchased ? 'STORED IN HANGAR' : 'PURCHASE'}
          </button>
        </div>
      `;
    }).join("");
  }

  window.buyShopModule = function(idx) {
    const mod = currentShopOfferings[idx];
    if (!mod || mod.purchased) return;
    if (stats.data.totalPoints >= mod.price) {
      stats.data.totalPoints -= mod.price;
      stats.addModule(mod.id, 1);
      mod.purchased = true;
      stats.save();
      renderShopModal();
    }
  };

  if (btnCloseShop) {
    btnCloseShop.addEventListener("click", () => {
      if (moduleShopModal) moduleShopModal.classList.add("hidden");
      showView("view-menu");
    });
  }

  const btnContinue = document.getElementById("btn-continue");
  if (btnContinue) {
    btnContinue.addEventListener("click", () => {
      document.getElementById("gameover-overlay").classList.add("hidden");
      if (lastRunResult && !lastRunResult.isPeaceful && lastRunResult.distance >= 10000) {
        currentShopOfferings = getRandomShopOfferings().map(m => ({ ...m, purchased: false }));
        renderShopModal();
        if (moduleShopModal) {
          moduleShopModal.classList.remove("hidden");
          return;
        }
      }
      showView("view-menu");
    });
  }

  function showGameOver(res) {
    lastRunResult = res;
    const overlay = document.getElementById("gameover-overlay");
    const grid = document.getElementById("gameover-grid");
    
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

      html += `<h4 style="margin:16px 0 8px 0; color:#00f0ff;">AI Drone Colors</h4>`;
      GALAXTAR_DATA.droneColors.forEach(dc => {
        const selected = d.selectedDroneColor === dc.hex;
        html += `<div class="upgrade-card">
          <div class="upgrade-info"><h4 style="color:${dc.hex || '#00f0ff'};">${dc.name}</h4></div>
          <div>${selected ? '<span style="color:#2ecc71; font-weight:bold;">SELECTED</span>' : `<button class="upgrade-btn green" onclick="selectDroneColor(${dc.hex ? `'${dc.hex}'` : 'null'})">Select</button>`}</div>
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
  window.selectDroneColor = hex => {
    stats.data.selectedDroneColor = hex;
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

  // Settings Toggles & Reset + Secret Cheat Code Logic
  let cheatStep = 0;
  let secretUnlockStep = 0; // Tracks sequence for awarding both AI Drone and Phoenix Protocol

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
        offBtn.classList.add("active");
        onBtn.classList.remove("active");
      }
    }
  }

  // Clean sequential step-checker for the secret unlock cheat
  const advanceSecretUnlock = (expectedStep) => {
    if (secretUnlockStep === expectedStep) {
      secretUnlockStep++;
    } else {
      secretUnlockStep = 0;
    }
  };

  const pOff = document.getElementById("set-peaceful-off");
  const pOn = document.getElementById("set-peaceful-on");
  const hOff = document.getElementById("set-hardcore-off");
  const hOn = document.getElementById("set-hardcore-on");
  const mOff = document.getElementById("set-music-off");
  const mOn = document.getElementById("set-music-on");
  const sOff = document.getElementById("set-sfx-off");
  const sOn = document.getElementById("set-sfx-on");

  if (pOn) {
    pOn.addEventListener("click", () => {
      if (secretUnlockStep === 0) secretUnlockStep = 1;
      else secretUnlockStep = 0;
    });
  }
  if (pOff) {
    if (pOff) pOff.addEventListener("click", () => advanceSecretUnlock(1));
  }
  if (hOn) {
    hOn.addEventListener("click", () => advanceSecretUnlock(2));
  }
  if (hOff) {
    hOff.addEventListener("click", () => advanceSecretUnlock(3));
  }
  if (mOff) {
    mOff.addEventListener("click", () => advanceSecretUnlock(4));
  }
  if (mOn) {
    mOn.addEventListener("click", () => {
      advanceSecretUnlock(5);
      if (cheatStep === 4) cheatStep = 5;
    });
  }
  if (sOff) {
    sOff.addEventListener("click", () => advanceSecretUnlock(6));
  }
  if (sOn) {
    sOn.addEventListener("click", () => {
      advanceSecretUnlock(7);
      if (cheatStep === 3) cheatStep = 4;
    });
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
        if (settingKey === "isPeacefulMode") {
          stats.data.isHardcoreMode = false;
          setToggleState("set-hardcore", false);
        } else if (settingKey === "isHardcoreMode") {
          stats.data.isPeacefulMode = false;
          setToggleState("set-peaceful", false);
        }
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
    resetPromptBtn.addEventListener("click", () => {
      resetConfirmBox.classList.remove("hidden");
      
      const d = stats.data;
      const allOff = !d.isPeacefulMode && !d.isHardcoreMode && !d.sfxOn && !d.musicOn;

      if (cheatStep === 0 && allOff) {
        cheatStep = 1;
      } else if (cheatStep === 5) {
        cheatStep = 6;
      } else if (secretUnlockStep === 8) {
        secretUnlockStep = 9; // 9th step: clicked reset prompt after sfx on
      } else {
        cheatStep = 0;
        secretUnlockStep = 0;
      }
    });
  }

  if (resetCancelBtn) {
    resetCancelBtn.addEventListener("click", () => {
      resetConfirmBox.classList.add("hidden");

      if (cheatStep === 1) {
        cheatStep = 3;
      } else if (cheatStep === 6) {
        stats.data.totalPoints += 50000;
        stats.data.lifetimePointsEarned += 50000;
        stats.save();
        alert("DEV CHEAT ACTIVATED: +50,000 Points Added!");
        cheatStep = 0;
      } else if (secretUnlockStep === 9) {
        // Awards both the AI Drone and Phoenix Protocol simultaneously!
        stats.addModule("ai_drone", 1);
        stats.addModule("phoenix_protocol", 1);
        alert("SECRET UNLOCKED: AI Companion Drone & Phoenix Protocol added to your hangar inventory!");
        secretUnlockStep = 0;
      } else {
        cheatStep = 0;
        secretUnlockStep = 0;
      }
    });
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
    { 
      title: "1. MISSION BRIEFING", 
      text: "Welcome to GALAXTAR, Pilot.\n\nYou command an advanced deep-space research vessel navigating an infinite, shifting cosmic expanse. Your directive is simple: push deeper into the void and go as far as you can, eliminating hostile ships, harvesting asteroid resources, and defeating bosses as you traverse as far as your ship will take you.\n\nYour ship can be upgraded to increase fuel capacity, shields, firepower, and speed boost. Along the way you will collect single-use modules that can be stacked up to 3 for a single flight."  
    },
    { 
      title: "2. FLIGHT & COMBAT", 
      text: "STEERING:\nDrag anywhere on screen for smooth, precise vector control.\n\nFIRE:\nTap anywhere outside your ship to fire your lasers. Unlocking advanced weapon upgrades will introduce multi-shot spreads, charge beams, and heat-seeking projectiles." 
    },
    { 
      title: "3. FUEL & RESOURCES", 
      text: "Your engines burn fuel continuously as you travel. Running on empty will leave you stranded in deep space.\n\n- Destroy drifting asteroids to scavenge fuel and points.\n- High-tier reactor upgrades unlock solar charging over time.\n- Tap the fuel gauge on the main menu to top off your reserves using earned points before launch." 
    },
    { 
      title: "4. MODULES & HANGAR", 
      text: "After flights you may access the Telemetry Shop upon your return.\n\n- Purchase single-run modules (Common, Rare, and Epic) to gain powerful tactical perks.\n- Select up to 3 unique modules in your pre-flight loadout to customize your build.\n- Modules are consumed upon flight completion, keeping every run fresh and tactical." 
    }
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

  // ==========================================
  // FIREBASE REALTIME DATABASE LEADERBOARD
  // ==========================================
  const firebaseConfig = {
    apiKey: "AIzaSyBJft7-AF2YCNjxOMe43DLRYyv9CORBSzs",
    authDomain: "galaxtar-leaderboard.firebaseapp.com",
    databaseURL: "https://galaxtar-leaderboard-default-rtdb.firebaseio.com",
    projectId: "galaxtar-leaderboard",
    storageBucket: "galaxtar-leaderboard.firebasestorage.app",
    messagingSenderId: "293499450142",
    appId: "1:293499450142:web:d8ac8b79c06bcf7f634f0f"
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const dbRef = firebase.database().ref("leaderboard");

  async function submitScore(pilotName, distance) {
    try {
      const newScoreRef = dbRef.push();
      await newScoreRef.set({
        name: pilotName,
        distance: distance,
        date: new Date().toLocaleDateString(),
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
    } catch (err) {
      console.error("Failed to upload score to Firebase:", err);
    }
  }

  async function loadLeaderboard() {
    const container = document.getElementById("leaderboard-list");
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">Synchronizing with galactic telemetry...</p>`;

    try {
      dbRef.orderByChild("distance").limitToLast(10).once("value", snapshot => {
        const scores = [];
        snapshot.forEach(childSnapshot => {
          scores.push(childSnapshot.val());
        });

        scores.reverse();

        if (scores.length === 0) {
          container.innerHTML = `<p style="text-align: center; color: #888; padding: 20px;">No flight records found yet.</p>`;
          return;
        }

        let html = `
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold; color: #3498db; max-width: 600px; margin: 0 auto;">
            <span>RANK & PILOT</span>
            <span>DISTANCE</span>
          </div>
        `;

        scores.forEach((row, index) => {
          const safeName = (row.name || "Unknown").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); margin: 6px auto; border-radius: 6px; max-width: 600px;">
              <span>#${index + 1} ${safeName}</span>
              <span style="font-weight: bold; color: #2ecc71;">${row.distance} m</span>
            </div>
          `;
        });

        container.innerHTML = html;
      }, error => {
        throw error;
      });
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
