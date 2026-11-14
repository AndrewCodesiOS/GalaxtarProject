const GALAXTAR_DATA = {
  ranks: [
    { name: "Star Cadet", minPoints: 0, maxPoints: 999, color: "#2ecc71" },
    { name: "Space Navigator", minPoints: 1000, maxPoints: 2499, color: "#3498db" },
    { name: "Cosmic Explorer", minPoints: 2500, maxPoints: 4999, color: "#9b59b6" },
    { name: "Galactic Commander", minPoints: 5000, maxPoints: 9999, color: "#f1c40f" },
    { name: "Astral Legend", minPoints: 10000, maxPoints: Infinity, color: "#e74c3c" }
  ],
  fuelLevels: [
    { level: 1, name: "Ion Fuel Cells", max: 200, cost: 0, color: "#2ecc71", solar: false },
    { level: 2, name: "Plasma Drive Fuel", max: 250, cost: 250, color: "#3498db", solar: false },
    { level: 3, name: "Fusion Reactor Cell", max: 300, cost: 500, color: "#9b59b6", solar: false },
    { level: 4, name: "Quantum Cell", max: 400, cost: 1000, color: "#f1c40f", solar: false },
    { level: 5, name: "Solar Reactor", max: 500, cost: 2000, color: "#e74c3c", solar: true }
  ],
  shieldLevels: [
    { level: 1, name: "Ion Shield", maxHP: 1, cost: 0, color: "#2ecc71", regen: false },
    { level: 2, name: "Plasma Shield", maxHP: 2, cost: 250, color: "#3498db", regen: false },
    { level: 3, name: "Quantum Shield", maxHP: 3, cost: 500, color: "#9b59b6", regen: false },
    { level: 4, name: "Void Shield", maxHP: 4, cost: 1000, color: "#f1c40f", regen: false },
    { level: 5, name: "Aegis Shield", maxHP: 5, cost: 2000, color: "#e74c3c", regen: true }
  ],
  weaponLevels: [
    { level: 1, name: "Photon Dart", desc: "Single shot", bonus: null, cost: 0, color: "#2ecc71" },
    { level: 2, name: "Twin Pulse", desc: "Dual shot", bonus: null, cost: 250, color: "#3498db" },
    { level: 3, name: "Trident Flare", desc: "Triple shot", bonus: null, cost: 500, color: "#9b59b6" },
    { level: 4, name: "Quantum Beam", desc: "Triple tap for charge beam", bonus: null, cost: 1000, color: "#f1c40f" },
    { level: 5, name: "Heat Seeker", desc: "", bonus: "+ 15% chance to heat seek", cost: 2000, color: "#e74c3c" }
  ],
  thrusterLevels: [
    { level: 1, name: "Basic Thrusters", speedMultiplier: 1.0, cost: 0, color: "#2ecc71", trail: false },
    { level: 2, name: "Plasma Thrusters", speedMultiplier: 3.0, cost: 250, color: "#3498db", trail: false },
    { level: 3, name: "Quantum Thrusters", speedMultiplier: 6.0, cost: 500, color: "#9b59b6", trail: false },
    { level: 4, name: "Hyperdrive", speedMultiplier: 9.0, cost: 1000, color: "#f1c40f", trail: false },
    { level: 5, name: "Warpdrive", speedMultiplier: 12.0, cost: 2000, color: "#e74c3c", trail: true }
  ],
  colors: [
    { name: "Green", hex: "#2ecc71", key: "green", cost: 0 },
    { name: "Blue", hex: "#3498db", key: "blue", cost: 200 },
    { name: "Purple", hex: "#9b59b6", key: "purple", cost: 200 },
    { name: "Yellow", hex: "#f1c40f", key: "yellow", cost: 200 },
    { name: "Red", hex: "#e74c3c", key: "red", cost: 200 }
  ],
  shapes: [
    { name: "Triangle", id: "triangle", cost: 0, color: "#2ecc71" },
    { name: "Octagon", id: "octagon", cost: 250, color: "#3498db" },
    { name: "Square", id: "square", cost: 500, color: "#9b59b6" },
    { name: "Circle", id: "circle", cost: 1000, color: "#f1c40f" },
    { name: "Diamond", id: "diamond", cost: 2000, color: "#e74c3c" }
  ],
  enemyTypes: {
    normal: { health: 6, points: 1, w: 50, h: 60, color: "#e74c3c", shape: "downTriangle" },
    purpleBoss: { health: 14, points: 2, w: 65, h: 78, color: "#9b59b6", shape: "downTriangle" },
    greenBoss: { health: 18, points: 3, w: 75, h: 90, color: "#2ecc71", shape: "downTriangle" },
    orangeBoss: { health: 18, points: 5, w: 50, h: 50, color: "#f1c40f", shape: "octagon" },
    blueBoss: { health: 24, points: 6, w: 55, h: 55, color: "#3498db", shape: "square" },
    mirrorShip: { health: 16, points: 9, w: 50, h: 60, color: "#ffffff", shape: "mirror" }
  }
};
