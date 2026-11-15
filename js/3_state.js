class StatsStore {
  constructor() {
    this.defaultData = {
      pilotName: "",
      currentFuel: 200,
      fuelLevel: 1,
      shieldLevel: 1,
      weaponLevel: 1,
      thrusterLevel: 1,
      selectedShipColor: "#2ecc71",
      selectedShipShape: "triangle",
      totalPoints: 250,
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
      sfxOn: true,
      moduleInventory: {
        fuel_scavenger: 1
      }
    };
    this.load();
  }
  load() {
    const saved = localStorage.getItem("galaxtar_save_v1");
    if (saved) {
      try {
        this.data = Object.assign({}, this.defaultData, JSON.parse(saved));
        if (!this.data.moduleInventory) {
          this.data.moduleInventory = { fuel_scavenger: 1 };
        }
      } catch(e) {
        this.data = Object.assign({}, this.defaultData);
      }
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
    if (this.data.fuelLevel < 5) return;
    const m = this.maxFuel();
    this.data.currentFuel = Math.min(m, this.data.currentFuel + 20);
    this.save();
  }
  addModule(moduleId, count = 1) {
    if (!this.data.moduleInventory) this.data.moduleInventory = {};
    this.data.moduleInventory[moduleId] = (this.data.moduleInventory[moduleId] || 0) + count;
    this.save();
  }
  consumeModules(moduleIds) {
    if (!this.data.moduleInventory) return;
    moduleIds.forEach(id => {
      if (this.data.moduleInventory[id] && this.data.moduleInventory[id] > 0) {
        this.data.moduleInventory[id] -= 1;
        if (this.data.moduleInventory[id] <= 0) {
          delete this.data.moduleInventory[id];
        }
      }
    });
    this.save();
  }
}
