class FlightLogController {
  constructor(statsStore) {
    this.stats = statsStore;
    this.load();
  }

  load() {
    this.logs = JSON.parse(localStorage.getItem("galaxtar_logs_v1") || "[]");
    this.flags = JSON.parse(localStorage.getItem("galaxtar_log_flags_v1") || JSON.stringify({
      hasGeneratedFirstFlightLog: false,
      hasGeneratedGuideCompletionLog: false,
      hasCombatBreakthrough: false,
      lastShipColor: "#2ecc71",
      lastWeaponLevel: 1,
      lastShieldLevel: 1,
      lastThrusterLevel: 1
    }));
  }

  save() {
    localStorage.setItem("galaxtar_logs_v1", JSON.stringify(this.logs));
    localStorage.setItem("galaxtar_log_flags_v1", JSON.stringify(this.flags));
  }

  clearAll() {
    this.logs = [];
    this.flags = {
      hasGeneratedFirstFlightLog: false,
      hasGeneratedGuideCompletionLog: false,
      hasCombatBreakthrough: false,
      lastShipColor: "#2ecc71",
      lastWeaponLevel: 1,
      lastShieldLevel: 1,
      lastThrusterLevel: 1
    };
    this.save();
  }

  hasUnreadLogs() {
    return this.logs.some(l => !l.isRead);
  }

  markAsRead(id) {
    const log = this.logs.find(l => l.id === id);
    if (log) {
      log.isRead = true;
      this.save();
    }
  }

  deleteLog(id) {
    this.logs = this.logs.filter(l => l.id !== id);
    this.save();
  }

  generateFlightLog(session) {
    const d = this.stats.data;
    if (d.isPeacefulMode) return;

    if (!this.flags.hasGeneratedFirstFlightLog && d.totalRuns === 1) {
      this.flags.hasGeneratedFirstFlightLog = true;
      if (d.hasCompletedPilotsGuide) {
        this.flags.hasGeneratedGuideCompletionLog = true;
        d.totalPoints += 200;
        d.lifetimePointsEarned += 200;
        this.stats.save();
      }
      this.appendLog(
        `Cycle 001 initialized. Thrusters responsive, navigation locked on signal: GALAXTAR.\nDistance logged: ${session.distance}. No origin memory detected—only the directive remains.`,
        ["firstFlight"],
        d.totalRuns
      );
      return;
    }

    if (d.totalRuns % 20 === 0 && d.totalRuns <= 200) {
      const idx = Math.floor(d.totalRuns / 20) - 1;
      if (GALAXTAR_DATA.storyLogs[idx]) {
        this.appendLog(GALAXTAR_DATA.storyLogs[idx], ["storyLog"], d.totalRuns);
        return;
      }
    }

    if (!this.flags.hasGeneratedGuideCompletionLog && d.hasCompletedPilotsGuide) {
      this.flags.hasGeneratedGuideCompletionLog = true;
      d.totalPoints += 200;
      d.lifetimePointsEarned += 200;
      this.stats.save();
      this.appendLog(
        "Onboard manual Revision 9.16 assimilated. Systems efficiency calibrated. (+200 pts awarded)",
        ["pilotsGuideCompletion"],
        d.totalRuns
      );
      return;
    }

    if (
      !this.flags.hasCombatBreakthrough &&
      session.shipsDestroyed >= 25 &&
      !d.unlockedWeaponLevels.includes(2) &&
      !d.unlockedShieldLevels.includes(2) &&
      !d.unlockedThrusterLevels.includes(2)
    ) {
      this.flags.hasCombatBreakthrough = true;
      const roll = Math.floor(Math.random() * 3);
      let sysName = "weapon system";
      if (roll === 0) {
        d.weaponLevel = 2;
        d.unlockedWeaponLevels.push(2);
        sysName = "weapon system";
      } else if (roll === 1) {
        d.shieldLevel = 2;
        d.unlockedShieldLevels.push(2);
        sysName = "shield system";
      } else {
        d.thrusterLevel = 2;
        d.unlockedThrusterLevels.push(2);
        sysName = "thruster system";
      }
      this.stats.save();
      this.appendLog(
        `Combat threshold exceeded: ${session.shipsDestroyed} hostiles neutralized without external upgrades. Emergency adaptive protocol upgraded ${sysName} to Level 2.`,
        ["combatBreakthrough"],
        d.totalRuns
      );
      return;
    }

    const chunks = [];
    const triggers = [];

    if (session.isNewRecord) {
      chunks.push(`New distance record established: ${session.distance}. Pushing deeper into uncharted sector space.`);
      triggers.push("longestFlightRecord");
    }

    if (d.totalRuns % 25 === 0) {
      chunks.push(`Cycle milestone reached: ${d.totalRuns} launches recorded. The void feels increasingly familiar.`);
      triggers.push("milestone");
    }

    if (session.shipsDestroyed >= 75) {
      chunks.push(`Total sector dominance: ${session.shipsDestroyed} hostile vessels eliminated in a single run.`);
      triggers.push("enemyEncounter75");
    } else if (session.shipsDestroyed >= 50) {
      chunks.push(`Heavy resistance overcome: ${session.shipsDestroyed} enemy craft destroyed.`);
      triggers.push("enemyEncounter50");
    } else if (session.shipsDestroyed >= 25) {
      chunks.push(`Sustained engagement logged: ${session.shipsDestroyed} hostiles neutralized.`);
      triggers.push("enemyEncounter25");
    } else if (session.shipsDestroyed >= 15) {
      chunks.push(`Hostile swarm intercepted: ${session.shipsDestroyed} vectors cleared.`);
      triggers.push("enemyEncounter");
    }

    if (d.currentFuel < 25) {
      chunks.push(`Warning: Fuel reserves critical (${d.currentFuel} remaining). Drift risk imminent.`);
      triggers.push("lowFuel");
    } else if (d.currentFuel <= 50) {
      chunks.push(`Advisory: Fuel reserves below 50 units (${d.currentFuel} remaining).`);
      triggers.push("fuelWarning50");
    }

    if (d.selectedShipColor !== this.flags.lastShipColor) {
      chunks.push(`Hull livery recalibrated. Visual signature updated.`);
      triggers.push("shipColorChange");
      this.flags.lastShipColor = d.selectedShipColor;
    }

    if (d.weaponLevel > this.flags.lastWeaponLevel) {
      chunks.push(`Weapon array upgraded to Level ${d.weaponLevel}. Firepower output elevated.`);
      triggers.push("weaponUpgrade");
      this.flags.lastWeaponLevel = d.weaponLevel;
    }

    if (d.shieldLevel > this.flags.lastShieldLevel) {
      chunks.push(`Shield matrix reinforced to Level ${d.shieldLevel}.`);
      triggers.push("shieldUpgrade");
      this.flags.lastShieldLevel = d.shieldLevel;
    }

    if (d.thrusterLevel > this.flags.lastThrusterLevel) {
      chunks.push(`Thruster assembly upgraded to Level ${d.thrusterLevel}.`);
      triggers.push("engineUpgrade");
      this.flags.lastThrusterLevel = d.thrusterLevel;
    }

    if (chunks.length > 0) {
      this.appendLog(chunks.join("\n\n"), triggers, d.totalRuns);
    } else {
      this.save();
    }
  }

  appendLog(content, triggers, flightNumber) {
    this.logs.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      timestamp: new Date().toISOString(),
      content,
      triggers,
      flightNumber,
      isRead: false
    });
    this.save();
  }
}
