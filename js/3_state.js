class StatsStore {
  constructor() {
    this.defaultData = {
      pilotName: "",
      pilotId: null,
      currentFuel: 200,
      fuelLevel: 1,
      shieldLevel: 1,
      weaponLevel: 1,
      thrusterLevel: 1,
      selectedShipColor: "#2ecc71",
      selectedShipShape: "triangle",
      totalPoints: 500,
      lifetimePointsEarned: 500,
      longestFlight: 0,
      totalRuns: 0,
      totalTimePlayed: 0,
      totalDistanceTraveled: 0,
      shipsDestroyed: 0,
      asteroidsDestroyed: 0,
      starsPassed: 0,
      planetsPassed: 0,
      shootingStarsPassed: 0,
      firstFlightDate: null,
      lastSessionDistance: 0,
      lastSessionShipsDestroyed: 0,
      lastSessionAsteroidsDestroyed: 0,
      lastSessionPoints: 0,
      isPeacefulMode: false,
      isHardcoreMode: false,
      musicOn: true,
      sfxOn: true
    };
    this.load();
  }
  load() {
    const saved = localStorage.getItem("galaxtar_save_v1");
    if (saved) {
      try { this.data = Object.assign({}, this.defaultData, JSON.parse(saved)); }
      catch(e) { this.data = Object.assign({}, this.defaultData); }
    } else {
      this.data = Object.assign({}, this.defaultData);
    }
  }
  save() {
    localStorage.setItem("galaxtar_save_v1", JSON.stringify(this.data));
  }
  maxFuel() {
    return GALAXTAR_DATA.fuelLevels[this.data.fuelLevel - 1].max;
  }
  consumeFuel(amount) {
    if (this.data.isPeacefulMode) return;
    this.data.currentFuel = Math.max(0, this.data.currentFuel - amount);
    this.save();
  }
  addSolarFuel() {
    const m = this.maxFuel();
    this.data.currentFuel = Math.min(m, this.data.currentFuel + 15);
    this.save();
  }
}
