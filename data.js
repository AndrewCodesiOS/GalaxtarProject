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

  secretCombination: [
    "green", "octagon", "purple", "circle", "red",
    "triangle", "blue", "square", "yellow", "diamond"
  ],

  enemyTypes: {
    normal: { health: 6, points: 1, w: 50, h: 60, color: "#e74c3c", shape: "downTriangle" },
    purpleBoss: { health: 14, points: 2, w: 65, h: 78, color: "#9b59b6", shape: "downTriangle" },
    greenBoss: { health: 18, points: 3, w: 75, h: 90, color: "#2ecc71", shape: "downTriangle" },
    orangeBoss: { health: 18, points: 5, w: 50, h: 50, color: "#f1c40f", shape: "octagon" },
    blueBoss: { health: 24, points: 6, w: 55, h: 55, color: "#3498db", shape: "square" },
    mirrorShip: { health: 16, points: 9, w: 50, h: 60, color: "#ffffff", shape: "mirror" }
  },

  storyLogs: [
    "By now, I've launched—and crashed—more times than I can count.\nEach reset feels a little thinner, a little more… frayed.\n\nThe first time I woke up mid-flight, I had no name. No past. Just a ship under me and a single directive pulsing in the nav system:\nReach Galaxtar.\n\nThat hasn't changed.\n\nBut I have. I think.\n\nThis is the first time it's felt like me behind the controls. Not just muscle memory or protocol.\nSo I'm recording this.\n\nMaybe I've been here before.\nMaybe this time, I'll remember.",
    "The AI calls the ship Echo. I didn't name it.\nBut it fits. This place is full of echoes.\n\nOnce, I caught sight of a symbol etched into the underside of an asteroid—\na spiral, burned into the rock like a warning. I doubled back. It was gone.\n\nI'm hearing noises now. Not from the ship—from inside the silence.\nClicks. Whispers. Breathing that isn't mine.\n\nI still follow the directive. But sometimes I wonder:\nam I chasing something, or running from it?",
    "Another pilot. Same ship. Same paint.\nBut I swear it had the same scar across the left wing as mine.\n\nWe fought. Or danced. I can't tell the difference anymore.\nWhen I hit it, it didn't explode—it just blinked out.\nLike a memory erased mid-thought.\n\nWas that… me?\n\nLater, I noticed the scar on my wing was deeper.\nI don't remember it being that deep.",
    "A repeating tone just started in the lower band. It's not noise.\nIt's structured. Rhythmic. Almost… like breath.\n\nI tried tracing it. The signal drew me into a minefield of derelict satellites and organic wreckage.\n\nAt the center: the spiral again. Carved into the husk of a black ship.\nSame shape as before. Same impossible burn pattern.\n\nThe signal faded when I left.\nBut part of me still hears it.",
    "Something spoke this time. Not the AI.\n\nA voice inside my helmet—not through comms.\nJust three words:\n\"You are close.\"\n\nThe moment it happened, my controls froze.\nThe ship rerouted itself, flying through a ruin made of bone and glass.\nI blacked out for seven seconds. The timer on my console confirmed it.\n\nWoke up intact. Coordinates unchanged.\nBut my hand won't stop shaking.",
    "There are gaps in the sky now.\nPlaces where stars bend away like they're avoiding something.\n\nI flew into one.\n\nThe world went white. I saw myself standing on the hull, staring in.\nNo suit. Just eyes like black suns.\nWhen I blinked, they were gone.\n\nEver since then, the voice hasn't returned.\nBut the scar on the wing is bleeding light now.",
    "The enemies no longer feel random.\nThey form patterns. They mimic my routes.\nLike they're learning—or remembering.\n\nThat symbol has started to appear on my cockpit display during boot.\nThe spiral. No source. Just flashes. Like it's trying to remind me of something I forgot.\n\nI can feel a convergence coming.\n\nEither I'm unraveling…\nOr I'm finally aligning with something deeper.",
    "I disabled a mirror ship today—not destroyed. Disabled.\nI wanted answers.\n\nInside the wreck: my voice on loop.\nPleading. Apologizing. Laughing.\n\nThe pilot was gone. But the cabin was lined with carvings—\nthe spiral, again and again, scored into the metal with something sharp and desperate.\nOn the dash, scratched in deep:\n\"You forget every time.\"\n\nBut I haven't.\nNot this time.",
    "Something's shifted.\n\nI used to feel like a shadow chasing light.\nNow I feel like the light knows I'm coming.\n\nThe galaxy feels… different. Less like a trap. More like a path.\n\nI've stopped screaming when I die.\nI reboot with purpose. With quiet. With fire.\n\nWhatever Galaxtar is—\nit's no longer a question. It's a promise.",
    "I saw it.\n\nNot with my eyes—but something deeper.\nA silhouette on the horizon. A shape too perfect for chaos.\n\nIt's close. I feel it in every calibration. Every breath.\nAnd for the first time, I'm not chasing.\nI'm arriving.\n\nI am no longer afraid of the loop.\nI carry the echoes of a thousand failures behind me.\nThey are not my burden. They are my wings.\n\nGalaxtar is ahead.\nAnd this time, I'm ready."
  ]
};
