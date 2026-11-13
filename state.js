class StatsStore {
  constructor() {
    this.load();
  }

  defaultState() {
    return {
      playerName: "Pilot",
      firstFlightDate: null,
      totalTimePlayed: 0,
      totalRuns: 0,
      totalDistanceTraveled: 0,
      longestFlight: 0,
      shipsDestroyed: 0,
      asteroidsDestroyed: 0,
      starsPassed: 0,
      planetsPassed: 0,
      shootingStarsPassed: 0,
      totalPoints: 0,
      lifetimePointsEarned: 0,

      lastSessionDistance: 0,
      lastSessionShipsDestroyed: 0,
      lastSessionAsteroidsDestroyed: 0,
      lastSessionPoints: 0,

      fuelLevel: 1,
      currentFuel: 200,
      shieldLevel: 1,
      weaponLevel: 1,
      thrusterLevel: 1,

      unlockedFuelLevels: [1],
      unlockedShieldLevels: [1],
      unlockedWeaponLevels: [1],
      unlockedThrusterLevels: [1],

      selectedShipColor: "#2ecc71",
      selectedShipShape: "triangle",
      unlockedColors: ["Green"],
      unlockedShapes: ["Triangle"],

      isPeacefulMode: false,
      isHardcoreMode: false,
      hasCompletedPilotsGuide: false,
      guideVariation: 0
    };
  }

  load() {
    const raw = localStorage.getItem("galaxtar_save_v1");
    this.data = Object.assign(this.defaultState(), raw ? JSON.parse(raw) : {});
  }

  save() {
    localStorage.setItem("galaxtar_save_v1", JSON.stringify(this.data));
  }

  resetAll() {
    this.data = this.defaultState();
    this.save();
  }

  maxFuel() {
    const info = GALAXTAR_DATA.fuelLevels.find(f => f.level === this.data.fuelLevel);
    return info ? info.max : 200;
  }

  canLaunch() {
    return this.data.currentFuel >= 1;
  }

  consumeFuel(amount) {
    if (this.data.isPeacefulMode) return;
    this.data.currentFuel = Math.max(0, this.data.currentFuel - amount);
    this.save();
  }

  addSolarFuel() {
    if (this.data.fuelLevel === 5 && this.data.currentFuel < this.maxFuel()) {
      this.data.currentFuel += 1;
      this.save();
    }
  }

  refuel() {
    this.data.currentFuel = this.maxFuel();
    this.save();
  }

  getCurrentRank() {
    const pts = this.data.lifetimePointsEarned;
    return GALAXTAR_DATA.ranks.find(r => pts >= r.minPoints && pts <= r.maxPoints) || GALAXTAR_DATA.ranks[0];
  }

  getRankProgress() {
    const rank = this.getCurrentRank();
    if (rank.maxPoints === Infinity) return { current: 1, next: 1 };
    return {
      current: this.data.lifetimePointsEarned - rank.minPoints,
      next: (rank.maxPoints + 1) - rank.minPoints
    };
  }

  selectRandomGuideVariation() {
    this.data.guideVariation = Math.floor(Math.random() * 3) + 1;
    this.save();
  }
}

function formatCompactNumber(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return `${Math.floor(num)}`;
}

function formatDurationMMSS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function formatDurationHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
