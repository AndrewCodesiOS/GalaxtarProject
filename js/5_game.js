class StarfieldBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.stars = [];
    this.running = true;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.populate();
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  populate() {
    this.stars = [];
    for (let i = 0; i < 95; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1 + Math.random() * 2.2,
        speed: 45 + Math.random() * 85,
        color: Math.random() < 0.15 ? "#a3d5ff" : "#ffffff"
      });
    }
  }

  loop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.running) {
      this.ctx.fillStyle = "#000000";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      for (const s of this.stars) {
        s.y += s.speed * dt;
        if (s.y > this.canvas.height) {
          s.y = -4;
          s.x = Math.random() * this.canvas.width;
        }
        this.ctx.fillStyle = s.color;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    requestAnimationFrame(this.loop);
  }
}

class ExploreGameEngine {
  constructor(canvas, stats, audio, logManager, onFlightComplete) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.stats = stats;
    this.audio = audio;
    this.logManager = logManager;
    this.onFlightComplete = onFlightComplete;

    this.isRunning = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.isManualEnd = false;

    // Boss State Properties & Milestone Trackers
    this.isBossActive = false;
    this.bossDefeatedAt20k = false;
    this.bossDefeatedAt40k = false;
    this.bossDefeatedAt60k = false;
    this.bossDefeatedAt80k = false;
    this.bossDefeatedAt100k = false;
    this.boss = null;
    this.solarFirewalls = [];

    this.keys = {};
    this.activeTouches = new Map();
    this.shipDragTouchId = null;
    this.hasMovedDistance = false;

    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener("keydown", e => {
      this.keys[e.code] = true;
      if (e.code === "Space" && this.isRunning && !this.isPaused && !this.isGameOver) {
        e.preventDefault();
        if (!this.stats.data.isPeacefulMode) this.shoot();
      }
    });
    window.addEventListener("keyup", e => {
      this.keys[e.code] = false;
    });

    const onDown = e => {
      if (!this.isRunning || this.isGameOver || this.isPaused) return;
      if (e.target.closest(".hud-btn")) return;
      if (e.cancelable) {
        e.preventDefault();
      }

      if (e.touches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });

          if (this.shipDragTouchId === null) {
            this.shipDragTouchId = t.identifier;
            this.shipDragStart = { x: t.clientX, y: t.clientY };
            this.shipStartPos = { x: this.ship.x, y: this.ship.y };
            this.hasMovedDistance = false;
          } else {
            if (!this.stats.data.isPeacefulMode) this.shoot();
          }
        }
      } else {
        this.isMouseDown = true;
        this.mouseDragStart = { x: e.clientX, y: e.clientY };
        this.shipStartPos = { x: this.ship.x, y: this.ship.y };
        this.hasMovedDistance = false;
        if (!this.stats.data.isPeacefulMode) this.shoot();
      }
    };

    const onMove = e => {
      if (!this.isRunning || this.isPaused || this.isGameOver) return;
      if (this.stats.data.currentFuel <= 0 && !this.stats.data.isPeacefulMode) return;

      if (e.touches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (this.activeTouches.has(t.identifier)) {
            this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
          }
          if (t.identifier === this.shipDragTouchId) {
            const dx = t.clientX - this.shipDragStart.x;
            const dy = t.clientY - this.shipDragStart.y;
            if (Math.hypot(dx, dy) > 8) {
              this.hasMovedDistance = true;
            }
            this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.shipStartPos.x + dx));
            this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.shipStartPos.y + dy));
          }
        }
      } else if (this.isMouseDown) {
        const dx = e.clientX - this.mouseDragStart.x;
        const dy = e.clientY - this.mouseDragStart.y;
        if (Math.hypot(dx, dy) > 8) {
          this.hasMovedDistance = true;
        }
        this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.shipStartPos.x + dx));
        this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.shipStartPos.y + dy));
      }
    };

    const onUp = e => {
      if (e.touches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.shipDragTouchId && !this.hasMovedDistance && !this.stats.data.isPeacefulMode) {
            this.shoot();
          }
          this.activeTouches.delete(t.identifier);
          if (t.identifier === this.shipDragTouchId) {
            this.shipDragTouchId = null;
            if (this.activeTouches.size > 0) {
              const [nextId, pos] = this.activeTouches.entries().next().value;
              this.shipDragTouchId = nextId;
              this.shipDragStart = { x: pos.x, y: pos.y };
              this.shipStartPos = { x: this.ship.x, y: this.ship.y };
              this.hasMovedDistance = false;
            }
          }
        }
      } else {
        if (!this.hasMovedDistance && this.isMouseDown && !this.stats.data.isPeacefulMode) {
          this.shoot();
        }
        this.isMouseDown = false;
      }
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
  }

  startSession(activeModules = []) {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.activeModules = new Set(activeModules);
    this.phoenixAvailable = this.activeModules.has("phoenix_protocol");
    this.haloAvailable = this.activeModules.has("halo_barrier");
    this.hasAiDrone = this.activeModules.has("ai_drone");

    const d = this.stats.data;
    const shieldInfo = GALAXTAR_DATA.shieldLevels[d.shieldLevel - 1];
    
    let bonusHP = 0;
    if (this.activeModules.has("reinforced_hull")) bonusHP += 2;
    if (this.activeModules.has("auxiliary_plating")) bonusHP += 1;

    this.ship = {
      x: this.canvas.width / 2,
      y: this.canvas.height * 0.72,
      w: d.selectedShipShape === "octagon" ? 50 : d.selectedShipShape === "square" ? 55 : 50,
      h: d.selectedShipShape === "octagon" ? 50 : d.selectedShipShape === "square" ? 55 : 60,
      hp: shieldInfo.maxHP + bonusHP,
      maxHP: shieldInfo.maxHP + bonusHP,
      hasRegen: shieldInfo.regen
    };

    // Initialize AI Drone with tracking capabilities
    this.drone = {
      x: this.canvas.width / 2,
      y: this.canvas.height - 120,
      w: 26,
      h: 26,
      vx: 180,
      fireTimer: 0
    };

    this.stars = [];
    this.planets = [];
    this.shootingStars = [];
    this.asteroids = [];
    this.enemies = [];
    this.bullets = [];
    this.droneBeams = [];
    this.chargeBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.trails = [];
    this.solarFirewalls = [];
    this.activeTouches.clear();
    this.shipDragTouchId = null;
    this.isMouseDown = false;
    this.hasMovedDistance = false;

    this.isBossActive = false;
    this.bossDefeatedAt20k = false;
    this.bossDefeatedAt40k = false;
    this.bossDefeatedAt60k = false;
    this.bossDefeatedAt80k = false;
    this.bossDefeatedAt100k = false;
    this.boss = null;

    for (let i = 0; i < 85; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 1.2 + Math.random() * 2.2,
        speed: 45 + Math.random() * 85,
        color: Math.random() < 0.2 ? "#9bd4ff" : "#ffffff"
      });
    }

    this.distance = 0;
    this.sessionPoints = 0;
    this.sessionShips = 0;
    this.sessionAsteroids = 0;
    this.sessionStars = 0;
    this.sessionPlanets = 0;
    this.sessionShootingStars = 0;
    this.sessionInitialFuel = d.currentFuel + (d.isPeacefulMode ? 0 : 1);
    this.elapsedTime = 0;

    this.isRunning = true;
    this.isPaused = false;
    this.isGameOver = false;
    this.isManualEnd = false;
    this.isInvulnerable = false;
    this.invulnTimer = 0;
    this.regenTimer = 0;

    this.lastTapTime = 0;
    this.tapCount = 0;
    this.isCharging = false;
    this.chargeTimer = 0;

    this.enemySpawnTimer = 0;
    this.asteroidSpawnTimer = 0;
    this.planetSpawnTimer = 0;
    this.shootingStarTimer = 0;
    this.trailTimer = 0;

    this.fuelTimer = 0;
    this.solarTimer = 0;

    this.nextDifficultyMilestone = 9000 + Math.random() * 7000;
    this.dynamicSpawnMult = 1.0;

    this.lastFrameTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
  }

  shoot() {
    const now = performance.now() / 1000;
    if (now - this.lastTapTime > 0.5) this.tapCount = 0;
    this.tapCount++;
    this.lastTapTime = now;

    const wLvl = this.stats.data.weaponLevel;
    if (this.tapCount === 3 && wLvl >= 4 && !this.isCharging) {
      this.isCharging = true;
      this.chargeTimer = 0.5;
      return;
    }

    const color = this.stats.data.selectedShipColor;
    const isOverclocked = this.activeModules && this.activeModules.has("overclock_core");
    const bSpeed = isOverclocked ? 650 : 520;
    const bonusDmg = isOverclocked ? 1 : 0;

    const spawnB = (ox, size, dmg) => {
      const heat = wLvl === 5 && Math.random() <= 0.15;
      this.bullets.push({
        x: this.ship.x + ox,
        y: this.ship.y - this.ship.h / 2,
        size,
        speed: bSpeed,
        color,
        damage: dmg + bonusDmg,
        isHeatSeeking: heat
      });
    };

    if (wLvl === 1) {
      spawnB(0, 8, 2);
    } else if (wLvl === 2) {
      spawnB(-20, 10, 1);
      spawnB(20, 10, 1);
    } else {
      spawnB(0, 12, 1);
      spawnB(-25, 12, 1);
      spawnB(25, 12, 1);
    }
    this.audio.playGunSound();
  }

  fireChargeBeam() {
    this.isCharging = false;
    const color = this.stats.data.selectedShipColor;
    const isOverclocked = this.activeModules && this.activeModules.has("overclock_core");
    this.chargeBullets.push({
      x: this.ship.x,
      y: this.ship.y - this.ship.h / 2,
      size: 26,
      speed: 620,
      color,
      damage: 4 + (isOverclocked ? 1 : 0)
    });
    this.audio.playChargeBeamSound();
  }

  spawnEnemy() {
    const x = 50 + Math.random() * (this.canvas.width - 100);
    const y = -60;
    if (this.enemies.some(e => Math.hypot(e.x - x, e.y - y) < 120)) return;

    let mirror = 0.01, blue = 0.02, orange = 0.02, green = 0.05, purple = 0.05;
    if (this.distance >= 20000) {
      mirror = 0.02; blue = 0.03; orange = 0.03; green = 0.06; purple = 0.06;
    }
    if (this.distance >= 50000) {
      blue = 0.04; orange = 0.04;
    }

    const r = Math.random();
    let typeKey = "normal";
    if (r <= mirror) typeKey = "mirrorShip";
    else if (r <= mirror + blue) typeKey = "blueBoss";
    else if (r <= mirror + blue + orange) typeKey = "orangeBoss";
    else if (r <= mirror + blue + orange + green) typeKey = "greenBoss";
    else if (r <= mirror + blue + orange + green + purple) typeKey = "purpleBoss";

    const spec = GALAXTAR_DATA.enemyTypes[typeKey];
    const bonusHP = Math.random() < 0.5 ? 2 : 0;
    const enemy = {
      typeKey,
      x,
      y,
      w: typeKey === "mirrorShip" ? this.ship.w : spec.w,
      h: typeKey === "mirrorShip" ? this.ship.h : spec.h,
      color: typeKey === "mirrorShip" ? this.stats.data.selectedShipColor : spec.color,
      shape: typeKey === "mirrorShip" ? this.stats.data.selectedShipShape : spec.shape,
      hp: spec.health + bonusHP + (typeKey === "mirrorShip" ? this.ship.hp : 0),
      points: spec.points,
      shotTimer: 0.4,
      shotPattern: 0,
      vx: 0,
      vy: 150,
      isDodging: false
    };
    this.enemies.push(enemy);
  }

  enemyShoot(enemy) {
    const spd = 300;
    const shootAngle = angle => {
      const dx = this.ship.x - enemy.x;
      const dy = this.ship.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;
      const bx = dx / dist;
      const by = dy / dist;
      const rx = bx * Math.cos(angle) - by * Math.sin(angle);
      const ry = bx * Math.sin(angle) + by * Math.cos(angle);
      this.enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.h / 2,
        vx: rx * spd,
        vy: ry * spd,
        size: 8,
        color: enemy.color
      });
    };

    switch (enemy.typeKey) {
      case "normal":
        shootAngle(0);
        break;
      case "purpleBoss":
        (enemy.shotPattern === 0 ? [-0.2, 0.2] : [-0.4, 0.4]).forEach(shootAngle);
        enemy.shotPattern = (enemy.shotPattern + 1) % 2;
        break;
      case "greenBoss":
        [-0.3, 0, 0.3].forEach(shootAngle);
        break;
      case "orangeBoss":
        [-0.4, -0.2, 0.2, 0.4].forEach(shootAngle);
        break;
      case "blueBoss":
        for (let i = 0; i < 8; i++) shootAngle((i * Math.PI) / 4);
        break;
      case "mirrorShip": {
        const w = this.stats.data.weaponLevel;
        const offsets = w === 1 ? [0] : w === 2 ? [-20, 20] : [-25, 0, 25];
        offsets.forEach(ox => {
          this.enemyBullets.push({
            x: enemy.x + ox,
            y: enemy.y + enemy.h / 2,
            vx: 0,
            vy: spd,
            size: 8,
            color: enemy.color
          });
        });
        break;
      }
    }
  }

  triggerMegaBoss(tier) {
    this.isBossActive = true;
    this.audio.switchToBossMusic();
    this.enemies = [];
    this.asteroids = [];

    if (tier === 20000) {
      this.boss = {
        tier: 20000,
        name: "ASTRAL TITAN (MK I)",
        x: this.canvas.width / 2,
        y: 120,
        w: 120,
        h: 90,
        maxHp: 150,
        hp: 150,
        vx: 120,
        color: "#ff3366",
        shape: "octagon",
        attackTimer: 0
      };
    } else if (tier === 40000) {
      this.boss = {
        tier: 40000,
        name: "VORTEX INTERCEPTOR 'THE SINGULARITY CORE'",
        x: this.canvas.width / 2,
        y: 100,
        w: 110,
        h: 110,
        maxHp: 220,
        hp: 220,
        vx: 140,
        color: "#00ffff",
        shape: "circle",
        attackTimer: 0,
        timer: 0
      };
    } else if (tier === 60000) {
      this.solarFirewalls = [];
      this.boss = {
        tier: 60000,
        name: "SOLAR DREADNOUGHT 'HELIOS PHOENIX'",
        x: this.canvas.width / 2,
        y: 110,
        w: 130,
        h: 100,
        maxHp: 300,
        hp: 300,
        vx: 160,
        color: "#ff9900",
        shape: "diamond",
        attackTimer: 0,
        firewallTimer: 0
      };
    } else if (tier === 80000) {
      this.boss = {
        tier: 80000,
        name: "QUANTUM SWARM MATRIX 'HYDRA-9'",
        x: this.canvas.width / 2,
        y: 120,
        w: 140,
        h: 90,
        maxHp: 400,
        hp: 400,
        vx: 180,
        color: "#9900ff",
        shape: "square",
        attackTimer: 0,
        orbitAngle: 0
      };
    } else if (tier === 100000) {
      this.boss = {
        tier: 100000,
        name: "THE VOID ARCHITECT 'ETERNITY ENGINE'",
        x: this.canvas.width / 2,
        y: 100,
        w: 160,
        h: 110,
        maxHp: 600,
        hp: 600,
        vx: 100,
        color: "#ffffff",
        shape: "octagon",
        attackTimer: 0,
        phase: 1,
        beamTimer: 0
      };
    }
  }

  bossShoot() {
    if (!this.boss) return;
    const spd = 280;

    if (this.boss.tier === 20000) {
      [-0.5, -0.25, 0, 0.25, 0.5].forEach(ang => {
        this.enemyBullets.push({
          x: this.boss.x + (ang * 60),
          y: this.boss.y + this.boss.h / 2,
          vx: ang * 150,
          vy: spd,
          size: 10,
          color: "#ff3366"
        });
      });
    } else if (this.boss.tier === 40000) {
      const numBullets = 10;
      for (let i = 0; i < numBullets; i++) {
        const angle = (Math.PI * 2 / numBullets) * i;
        this.enemyBullets.push({
          x: this.boss.x,
          y: this.boss.y,
          vx: Math.cos(angle) * 220,
          vy: Math.sin(angle) * 220,
          size: 8,
          color: "#00ffff"
        });
      }
    } else if (this.boss.tier === 60000) {
      [-0.6, -0.3, 0, 0.3, 0.6].forEach(ang => {
        this.enemyBullets.push({
          x: this.boss.x,
          y: this.boss.y + this.boss.h / 2,
          vx: ang * 180,
          vy: spd * 1.2,
          size: 9,
          color: "#ff9900"
        });
      });
      this.solarFirewalls.push({
        x: Math.random() * (this.canvas.width - 200),
        y: this.boss.y + 120,
        w: 220,
        h: 16,
        life: 5.0
      });
    } else if (this.boss.tier === 80000) {
      for (let i = -3; i <= 3; i++) {
        this.enemyBullets.push({
          x: this.boss.x + (i * 20),
          y: this.boss.y + this.boss.h / 2,
          vx: i * 70,
          vy: spd * 1.3,
          size: 7,
          color: "#9900ff"
        });
      }
    } else if (this.boss.tier === 100000) {
      if (this.boss.hp <= 300) this.boss.phase = 2;
      const spread = this.boss.phase === 2 ? 7 : 4;
      for (let i = -spread; i <= spread; i++) {
        this.enemyBullets.push({
          x: this.boss.x,
          y: this.boss.y + this.boss.h / 2,
          vx: i * 50,
          vy: 340,
          size: 11,
          color: this.boss.phase === 2 ? "#ff0055" : "#ffffff"
        });
      }
    }
  }

  spawnExplosion(x, y, color, count = 22) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.5 + Math.random() * 3,
        color,
        age: 0,
        life: 0.4 + Math.random() * 0.5
      });
    }
  }

  loop(now) {
    if (!this.isRunning || this.isPaused) return;
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = now;

    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const d = this.stats.data;
    const thrusterInfo = GALAXTAR_DATA.thrusterLevels[d.thrusterLevel - 1];
    
    const overdriveMult = (this.activeModules && this.activeModules.has("overdrive_thrusters")) ? 1.1 : 1.0;
    const passiveDistanceMultiplier = thrusterInfo.speedMultiplier * overdriveMult;
    const speedMult = 1.0;

    if (!this.isGameOver) {
      if (!this.isBossActive) {
        this.elapsedTime += dt;
        this.distance += 220 * passiveDistanceMultiplier * dt;

        if (this.distance >= 20000 && !this.bossDefeatedAt20k && !this.isBossActive) {
          this.triggerMegaBoss(20000);
        } else if (this.distance >= 40000 && !this.bossDefeatedAt40k && !this.isBossActive) {
          this.triggerMegaBoss(40000);
        } else if (this.distance >= 60000 && !this.bossDefeatedAt60k && !this.isBossActive) {
          this.triggerMegaBoss(60000);
        } else if (this.distance >= 80000 && !this.bossDefeatedAt80k && !this.isBossActive) {
          this.triggerMegaBoss(80000);
        } else if (this.distance >= 100000 && !this.bossDefeatedAt100k && !this.isBossActive) {
          this.triggerMegaBoss(100000);
        }
      }

      const moveSpeed = 360 * overdriveMult;
      if (d.currentFuel > 0 || d.isPeacefulMode) {
        if (this.keys["ArrowLeft"] || this.keys["KeyA"]) this.ship.x -= moveSpeed * dt;
        if (this.keys["ArrowRight"] || this.keys["KeyD"]) this.ship.x += moveSpeed * dt;
        if (this.keys["ArrowUp"] || this.keys["KeyW"]) this.ship.y -= moveSpeed * dt;
        if (this.keys["ArrowDown"] || this.keys["KeyS"]) this.ship.y += moveSpeed * dt;
        this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.ship.x));
        this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.ship.y));
      }

      // AI Drone Active Target Tracking with Screen-Clamp Boundaries
      if (this.hasAiDrone && this.drone) {
        let targetX = null;
        if (this.isBossActive && this.boss) {
          targetX = this.boss.x;
        } else if (this.enemies.length > 0) {
          let closest = this.enemies[0];
          let minDist = Infinity;
          for (const e of this.enemies) {
            const dist = Math.hypot(e.x - this.drone.x, e.y - this.drone.y);
            if (dist < minDist) {
              minDist = dist;
              closest = e;
            }
          }
          targetX = closest.x;
        }

        if (targetX !== null) {
          const dir = Math.sign(targetX - this.drone.x);
          this.drone.x += dir * this.drone.vx * 1.2 * dt;
        } else {
          this.drone.x += this.drone.vx * dt;
          if (this.drone.x < 50 || this.drone.x > this.canvas.width - 50) {
            this.drone.vx *= -1;
          }
        }
        // Strict boundary clamp so the drone never gets pinned against screen edges
        this.drone.x = Math.max(40, Math.min(this.canvas.width - 40, this.drone.x));

        this.drone.fireTimer += dt;
        if (this.drone.fireTimer >= 0.3) {
          this.drone.fireTimer = 0;
          this.droneBeams.push({
            x: this.drone.x,
            y: this.drone.y - 12,
            length: 24,
            speed: 750,
            color: "#00f0ff",
            damage: 2
          });
        }
      }

      if (this.isCharging) {
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0) this.fireChargeBeam();
      }

      if (this.isInvulnerable) {
        this.invulnTimer -= dt;
        if (this.invulnTimer <= 0) this.isInvulnerable = false;
      }
      if (this.ship.hp < this.ship.maxHP && this.ship.hasRegen) {
        this.regenTimer += dt;
        if (this.regenTimer >= 16.0) {
          this.ship.hp++;
          this.regenTimer = 0;
        }
      }

      if (!d.isPeacefulMode) {
        this.fuelTimer += dt;
        if (this.fuelTimer >= 2.0) {
          let baseCost = d.isHardcoreMode ? 5 : 3;
          if (this.activeModules && this.activeModules.has("cryo_thrusters")) {
            baseCost *= 0.75;
          }
          this.stats.consumeFuel(baseCost);
          this.fuelTimer = 0;
        }

        if (d.fuelLevel >= 5) {
          this.solarTimer += dt;
          if (this.solarTimer >= 12.0) {
            this.stats.addSolarFuel();
            this.solarTimer = 0;
          }
        }
      }

      if (this.distance >= this.nextDifficultyMilestone && !this.isBossActive) {
        this.dynamicSpawnMult += 0.1 + Math.random() * 0.1;
        this.nextDifficultyMilestone = this.distance + 9000 + Math.random() * 7000;
      }

      if (d.thrusterLevel === 5) {
        this.trailTimer += dt;
        if (this.trailTimer >= 0.025) {
          this.trailTimer = 0;
          this.trails.push({
            x: this.ship.x,
            y: this.ship.y + this.ship.h / 2 + 6,
            size: 14,
            alpha: 0.75,
            color: d.selectedShipColor
          });
        }
      }
    }

    for (const s of this.stars) {
      s.y += s.speed * speedMult * dt;
      if (s.y > this.canvas.height) {
        s.y = -4;
        s.x = Math.random() * this.canvas.width;
        if (!this.isGameOver) this.sessionStars++;
      }
    }

    this.planetSpawnTimer += dt * speedMult;
    if (this.planetSpawnTimer >= 9.5) {
      this.planetSpawnTimer = 0;
      const colors = ["#3498db", "#e67e22", "#9b59b6", "#1abc9c"];
      this.planets.push({
        x: 40 + Math.random() * (this.canvas.width - 80),
        y: -50,
        r: 18 + Math.random() * 22,
        speed: 40 + Math.random() * 25,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    this.planets = this.planets.filter(p => {
      p.y += p.speed * speedMult * dt;
      if (p.y - p.r > this.canvas.height) {
        if (!this.isGameOver) this.sessionPlanets++;
        return false;
      }
      return true;
    });

    this.shootingStarTimer += dt * speedMult;
    if (this.shootingStarTimer >= 13.0) {
      this.shootingStarTimer = 0;
      this.shootingStars.push({
        x: Math.random() * this.canvas.width,
        y: -20,
        vx: (Math.random() < 0.5 ? -1 : 1) * 260,
        vy: 420
      });
    }
    this.shootingStars = this.shootingStars.filter(ss => {
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;
      if (ss.y > this.canvas.height + 30) {
        if (!this.isGameOver) this.sessionShootingStars++;
        return false;
      }
      return true;
    });

    if (!this.isBossActive) {
      this.asteroidSpawnTimer += dt * speedMult;
      if (this.asteroidSpawnTimer >= 3.2) {
        this.asteroidSpawnTimer = 0;
        const tier = Math.random();
        const size = tier < 0.5 ? 28 : tier < 0.85 ? 42 : 58;
        
        const hasFracture = this.activeModules && this.activeModules.has("asteroid_fracture");
        const hp = hasFracture ? 1 : (size === 28 ? 2 : size === 42 ? 4 : 6);

        const fuelReward = size === 28 ? 2 : size === 42 ? 4 : 6;
        const pointReward = size === 28 ? 2 : size === 42 ? 5 : 10;
        this.asteroids.push({
          x: 30 + Math.random() * (this.canvas.width - 60),
          y: -40,
          size,
          hp,
          fuelReward,
          pointReward,
          speed: 110 + Math.random() * 60,
          rot: 0,
          rotSpeed: (Math.random() - 0.5) * 2.5,
          color: "#8d6e63"
        });
      }

      const spawnMult = (d.isHardcoreMode ? 4.0 : 1.0) * this.dynamicSpawnMult;
      this.enemySpawnTimer += dt;
      if (this.enemySpawnTimer >= 4.0 / spawnMult) {
        this.enemySpawnTimer = 0;
        this.spawnEnemy();
      }
    }

    if (this.isBossActive && this.boss) {
      this.boss.x += this.boss.vx * dt;
      
      const margin = 80;
      if (this.boss.x < margin) {
        this.boss.x = margin;
        this.boss.vx *= -1;
      } else if (this.boss.x > this.canvas.width - margin) {
        this.boss.x = this.canvas.width - margin;
        this.boss.vx *= -1;
      }

      if (this.boss.tier === 40000) {
        this.boss.timer++;
        const pullActive = Math.floor(this.boss.timer / 120) % 2 === 0;
        if (pullActive) {
          const centerX = this.canvas.width / 2;
          const pullStrength = 0.4;
          if (this.ship.x < centerX) this.ship.x += pullStrength;
          if (this.ship.x > centerX) this.ship.x -= pullStrength;
        }
      }

      if (this.boss.tier === 60000) {
        this.solarFirewalls.forEach(fw => {
          fw.life -= dt;
          if (Math.abs(this.ship.x - (fw.x + fw.w / 2)) < fw.w / 2 && Math.abs(this.ship.y - fw.y) < 15) {
            if (!this.isInvulnerable) this.damagePlayer(1);
          }
        });
        this.solarFirewalls = this.solarFirewalls.filter(fw => fw.life > 0);
      }

      this.boss.attackTimer += dt;
      const attackInterval = this.boss.tier === 100000 && this.boss.phase === 2 ? 0.8 : 1.2;
      if (this.boss.attackTimer >= attackInterval) {
        this.boss.attackTimer = 0;
        this.bossShoot();
      }
    }

    const enemySpeedMult = 1.0;
    this.enemies = this.enemies.filter(e => {
      if (d.isPeacefulMode) {
        e.y += 150 * enemySpeedMult * dt;
        return e.y < this.canvas.height + e.h;
      }

      let dodgeX = 0;
      for (const b of this.bullets) {
        const dist = Math.hypot(b.x - e.x, b.y - e.y);
        if (dist < 130 && e.y < this.ship.y && Math.random() < 0.25) {
          dodgeX = b.x < e.x ? 260 : -260;
          break;
        }
      }

      if (e.y < this.ship.y) {
        const dx = this.ship.x - e.x;
        const dir = Math.sign(dx);
        e.vx = dodgeX !== 0 ? dodgeX : dir * 130 * enemySpeedMult;
      } else {
        e.vx = 0;
      }

      e.x += e.vx * dt;
      e.y += 150 * enemySpeedMult * dt;

      if (!this.isGameOver && e.y < this.ship.y) {
        e.shotTimer += dt;
        if (e.shotTimer >= 1.0) {
          e.shotTimer = 0;
          this.enemyShoot(e);
        }
      }
      return e.y < this.canvas.height + e.h;
    });

    this.bullets = this.bullets.filter(b => {
      if (b.isHeatSeeking && this.enemies.length > 0) {
        let target = this.enemies[0];
        let minDist = Infinity;
        for (const e of this.enemies) {
          const dist = Math.hypot(e.x - b.x, e.y - b.y);
          if (dist < minDist) { minDist = dist; target = e; }
        }
        const dx = target.x - b.x;
        const dy = target.y - b.y;
        const len = Math.hypot(dx, dy) || 1;
        b.x += (dx / len) * b.speed * dt;
        b.y += (dy / len) * b.speed * dt;
      } else {
        b.y -= b.speed * dt;
      }
      return b.y > -20;
    });

    this.droneBeams = this.droneBeams.filter(b => {
      b.y -= b.speed * dt;
      return b.y > -30;
    });

    this.chargeBullets = this.chargeBullets.filter(b => {
      b.y -= b.speed * dt;
      return b.y > -40;
    });

    this.enemyBullets = this.enemyBullets.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y < this.canvas.height + 20 && b.x > -20 && b.x < this.canvas.width + 20;
    });

    this.asteroids = this.asteroids.filter(a => {
      a.y += a.speed * speedMult * dt;
      a.rot += a.rotSpeed * dt;
      return a.y < this.canvas.height + a.size;
    });

    this.particles = this.particles.filter(p => {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      return p.age < p.life;
    });

    this.trails = this.trails.filter(t => {
      t.alpha -= dt * 1.5;
      t.size *= 0.97;
      return t.alpha > 0;
    });

    if (!this.isGameOver) {
      this.handleCollisions();
    }
  }

  handleCollisions() {
    const d = this.stats.data;
    const hitBox = (ax, ay, aw, ah, bx, by, bw, bh) =>
      Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;

    const getCalculatedPoints = (basePts) => {
      let mult = 1;
      if (this.activeModules && this.activeModules.has("bounty_scanner")) mult += 0.25;
      if (this.activeModules && this.activeModules.has("yield_amplifier")) mult += 0.50;
      return Math.ceil(basePts * mult);
    };

    if (this.isBossActive && this.boss) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (hitBox(b.x, b.y, b.size, b.size, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
          this.boss.hp -= b.damage;
          this.spawnExplosion(b.x, b.y, this.boss.color, 6);
          this.bullets.splice(i, 1);

          if (this.boss.hp <= 0) {
            this.resolveBossDefeat();
            return;
          }
          break;
        }
      }

      for (let i = this.droneBeams.length - 1; i >= 0; i--) {
        const b = this.droneBeams[i];
        if (hitBox(b.x, b.y, 4, b.length, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
          this.boss.hp -= b.damage;
          this.spawnExplosion(b.x, b.y, "#00f0ff", 5);
          this.droneBeams.splice(i, 1);

          if (this.boss.hp <= 0) {
            this.resolveBossDefeat();
            return;
          }
          break;
        }
      }

      for (let i = this.chargeBullets.length - 1; i >= 0; i--) {
        const b = this.chargeBullets[i];
        if (hitBox(b.x, b.y, b.size, b.size, this.boss.x, this.boss.y, this.boss.w, this.boss.h)) {
          this.boss.hp -= b.damage;
          this.chargeBullets.splice(i, 1);

          if (this.boss.hp <= 0) {
            this.resolveBossDefeat();
            return;
          }
          break;
        }
      }

      if (hitBox(this.boss?.x || 0, this.boss?.y || 0, this.boss?.w || 0, this.boss?.h || 0, this.ship.x, this.ship.y, this.ship.w, this.ship.h)) {
        this.damagePlayer(999);
      }
    }

    // Handle Player Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      let consumed = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (hitBox(b.x, b.y, b.size, b.size, e.x, e.y, e.w, e.h)) {
          let dmg = b.damage;
          if (Math.random() <= 0.01) dmg *= Math.random() < 0.5 ? 2 : 3;
          e.hp -= dmg;
          this.spawnExplosion(b.x, b.y, "#e67e22", 6);
          consumed = true;

          if (e.hp <= 0) {
            const pts = e.points;
            this.sessionShips++;
            if (!d.isPeacefulMode) {
              this.sessionPoints += getCalculatedPoints(pts);
            }
            
            if (this.activeModules && this.activeModules.has("fuel_extractor")) {
              d.currentFuel = Math.min(this.stats.maxFuel(), d.currentFuel + 1);
            }

            this.audio.playExplosion(false);
            this.spawnExplosion(e.x, e.y, e.color, 24);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }

      if (!consumed) {
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          if (hitBox(b.x, b.y, b.size, b.size, a.x, a.y, a.size, a.size)) {
            a.hp -= b.damage;
            this.spawnExplosion(b.x, b.y, "#e67e22", 6);
            consumed = true;
            if (a.hp <= 0) {
              this.destroyAsteroid(j, getCalculatedPoints);
            }
            break;
          }
        }
      }

      if (consumed) this.bullets.splice(i, 1);
    }

    // Handle AI Drone Beam Collisions
    for (let i = this.droneBeams.length - 1; i >= 0; i--) {
      const b = this.droneBeams[i];
      let consumed = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (hitBox(b.x, b.y, 4, b.length, e.x, e.y, e.w, e.h)) {
          e.hp -= b.damage;
          this.spawnExplosion(b.x, b.y, "#00f0ff", 4);
          consumed = true;

          if (e.hp <= 0) {
            const pts = e.points;
            this.sessionShips++;
            if (!d.isPeacefulMode) {
              this.sessionPoints += getCalculatedPoints(pts);
            }
            if (this.activeModules && this.activeModules.has("fuel_extractor")) {
              d.currentFuel = Math.min(this.stats.maxFuel(), d.currentFuel + 1);
            }
            this.audio.playExplosion(false);
            this.spawnExplosion(e.x, e.y, e.color, 24);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }

      if (!consumed) {
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          if (hitBox(b.x, b.y, 4, b.length, a.x, a.y, a.size, a.size)) {
            a.hp -= b.damage;
            this.spawnExplosion(b.x, b.y, "#00f0ff", 4);
            consumed = true;
            if (a.hp <= 0) {
              this.destroyAsteroid(j, getCalculatedPoints);
            }
            break;
          }
        }
      }

      if (consumed) this.droneBeams.splice(i, 1);
    }

    for (let i = this.chargeBullets.length - 1; i >= 0; i--) {
      const b = this.chargeBullets[i];
      let consumed = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        if (hitBox(b.x, b.y, b.size, b.size, e.x, e.y, e.w, e.h)) {
          e.hp -= b.damage;
          consumed = true;
          if (e.hp <= 0) {
            const pts = e.points;
            this.sessionShips++;
            if (!d.isPeacefulMode) {
              this.sessionPoints += getCalculatedPoints(pts);
            }
            if (this.activeModules && this.activeModules.has("fuel_extractor")) {
              d.currentFuel = Math.min(this.stats.maxFuel(), d.currentFuel + 1);
            }
            this.audio.playExplosion(false);
            this.spawnExplosion(e.x, e.y, e.color, 26);
            this.enemies.splice(j, 1);
          }
          break;
        }
      }
      if (!consumed) {
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          if (hitBox(b.x, b.y, b.size, b.size, a.x, a.y, a.size, a.size)) {
            a.hp -= b.damage;
            consumed = true;
            if (a.hp <= 0) this.destroyAsteroid(j, getCalculatedPoints);
            break;
          }
        }
      }
      if (consumed) this.chargeBullets.splice(i, 1);
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      if (hitBox(eb.x, eb.y, eb.size, eb.size, this.ship.x, this.ship.y, this.ship.w * 0.8, this.ship.h * 0.8)) {
        this.enemyBullets.splice(i, 1);
        if (!this.isInvulnerable) {
          this.damagePlayer(1);
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (hitBox(e.x, e.y, e.w * 0.85, e.h * 0.85, this.ship.x, this.ship.y, this.ship.w * 0.85, this.ship.h * 0.85)) {
        const pts = e.points;
        this.sessionShips++;
        if (!d.isPeacefulMode) {
          this.sessionPoints += getCalculatedPoints(pts);
        }
        this.spawnExplosion(e.x, e.y, e.color, 24);
        this.enemies.splice(i, 1);
        this.damagePlayer(999);
        break;
      }
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (!this.isInvulnerable && hitBox(a.x, a.y, a.size * 0.8, a.size * 0.8, this.ship.x, this.ship.y, this.ship.w * 0.85, this.ship.h * 0.85)) {
        this.destroyAsteroid(i, getCalculatedPoints);
        this.damagePlayer(4);
      }
    }
  }

  resolveBossDefeat() {
    if (!this.boss) return;
    const tier = this.boss.tier;
    
    this.audio.playExplosion(false);
    this.spawnExplosion(this.boss.x, this.boss.y, this.boss.color, 60);

    const rewards = { 20000: 50, 40000: 100, 60000: 175, 80000: 250, 100000: 500 };
    const baseReward = rewards[tier] || 50;
    
    let mult = 1;
    if (this.activeModules && this.activeModules.has("bounty_scanner")) mult += 0.25;
    if (this.activeModules && this.activeModules.has("yield_amplifier")) mult += 0.50;

    this.sessionPoints += Math.ceil(baseReward * mult);
    this.sessionShips++;

    if (tier === 20000) this.bossDefeatedAt20k = true;
    if (tier === 40000) this.bossDefeatedAt40k = true;
    if (tier === 60000) this.bossDefeatedAt60k = true;
    if (tier === 80000) this.bossDefeatedAt80k = true;
    if (tier === 100000) this.bossDefeatedAt100k = true;

    this.boss = null;
    this.isBossActive = false;
    this.solarFirewalls = [];
    this.enemyBullets = [];

    this.audio.switchToNormalMusic();
  }

  destroyAsteroid(index, getCalculatedPoints) {
    const a = this.asteroids[index];
    const d = this.stats.data;
    const fuelMult = (this.activeModules && this.activeModules.has("fuel_scavenger")) ? 1.4 : 1;

    d.currentFuel = Math.min(this.stats.maxFuel(), d.currentFuel + Math.ceil(a.fuelReward * fuelMult));
    if (!d.isPeacefulMode) {
      this.sessionPoints += getCalculatedPoints(a.pointReward);
    }
    this.sessionAsteroids++;
    this.stats.save();
    this.audio.playExplosion(true);
    this.spawnExplosion(a.x, a.y, a.color, 18);
    this.asteroids.splice(index, 1);
  }

  damagePlayer(amount) {
    if (this.haloAvailable && amount >= 4) {
      this.haloAvailable = false;
      this.isInvulnerable = true;
      this.invulnTimer = 1.0;
      this.audio.playChargeBeamSound();
      this.spawnExplosion(this.ship.x, this.ship.y, "#00ffff", 30);
      return;
    }

    this.ship.hp = Math.max(0, this.ship.hp - amount);
    this.isInvulnerable = true;
    this.invulnTimer = 0.5;
    if (this.ship.hp <= 0) {
      if (this.phoenixAvailable) {
        this.phoenixAvailable = false;
        this.ship.hp = this.ship.maxHP;
        this.invulnTimer = 2.0;
        this.enemyBullets = [];
        this.enemies.forEach(e => this.spawnExplosion(e.x, e.y, e.color, 20));
        this.enemies = [];
        this.audio.playChargeBeamSound();
        this.spawnExplosion(this.ship.x, this.ship.y, "#f1c40f", 45);
        return;
      }
      this.audio.switchToNormalMusic();
      this.triggerGameOver(false);
    }
  }

  triggerGameOver(manualEnd = false) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isManualEnd = manualEnd;
    this.audio.switchToNormalMusic();
    if (!manualEnd) {
      this.audio.playExplosion(false);
      this.spawnExplosion(this.ship.x, this.ship.y, this.stats.data.selectedShipColor, 34);
    }

    const d = this.stats.data;
    const distInt = Math.floor(this.distance);
    const fuelConsumed = Math.max(0, this.sessionInitialFuel - d.currentFuel);
    const isNewRecord = distInt > d.longestFlight;

    if (!d.isPeacefulMode) {
      if (!d.firstFlightDate) d.firstFlightDate = new Date().toISOString();
      d.totalRuns += 1;
      d.totalTimePlayed += Math.floor(this.elapsedTime);
      d.totalDistanceTraveled += distInt;
      if (isNewRecord) d.longestFlight = distInt;

      d.shipsDestroyed += this.sessionShips;
      d.asteroidsDestroyed += this.sessionAsteroids;
      d.starsPassed += this.sessionStars;
      d.planetsPassed += this.sessionPlanets;
      d.shootingStarsPassed += this.sessionShootingStars;

      d.totalPoints += this.sessionPoints;
      d.lifetimePointsEarned += this.sessionPoints;

      d.lastSessionDistance = distInt;
      d.lastSessionShipsDestroyed = this.sessionShips;
      d.lastSessionAsteroidsDestroyed = this.sessionAsteroids;
      d.lastSessionPoints = this.sessionPoints;

      this.stats.save();

      this.logManager.generateFlightLog({
        distance: distInt,
        shipsDestroyed: this.sessionShips,
        isNewRecord
      });
    }

    this.onFlightComplete({
      distance: distInt,
      ships: this.sessionShips,
      points: this.sessionPoints,
      stars: this.sessionStars,
      planets: this.sessionPlanets,
      shootingStars: this.sessionShootingStars,
      asteroids: this.sessionAsteroids,
      fuelConsumed,
      time: this.elapsedTime,
      isPeaceful: d.isPeacefulMode
    });
  }

  drawPolygon(shape, x, y, w, h, color, isEnemy = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();

    if (shape === "circle") {
      const r = Math.min(w, h) / 2;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (shape === "square") {
      ctx.rect(-w / 2, -h / 2, w, h);
    } else if (shape === "diamond") {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(-w / 2, 0);
      ctx.closePath();
    } else if (shape === "octagon") {
      const r = w / 2;
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 + Math.PI / 8;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === "downTriangle" || (isEnemy && shape === "triangle")) {
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(-w / 2, -h / 2);
      ctx.closePath();
    } else if (shape === "triangle") {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
    }

    ctx.fill();
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const s of this.stars) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.planets) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ss of this.shootingStars) {
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 0.08, ss.y - ss.vy * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.fillStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 10;
      const spikes = 10;
      const outer = a.size / 2;
      const inner = outer * 0.72;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const ang = (i * Math.PI) / spikes;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const t of this.trails) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const fw of this.solarFirewalls) {
      ctx.save();
      ctx.fillStyle = "#ff5500";
      ctx.shadowColor = "#ff9900";
      ctx.shadowBlur = 15;
      ctx.fillRect(fw.x, fw.y, fw.w, fw.h);
      ctx.restore();
    }

    if (this.isCharging) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = this.stats.data.selectedShipColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.ship.x, this.ship.y - this.ship.h / 2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.bullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const b of this.droneBeams) {
      ctx.save();
      ctx.strokeStyle = "#00f0ff";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y + b.length);
      ctx.stroke();
      ctx.restore();
    }

    for (const b of this.chargeBullets) {
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const eb of this.enemyBullets) {
      ctx.fillStyle = eb.color;
      ctx.beginPath();
      ctx.arc(eb.x, eb.y, eb.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of this.enemies) {
      this.drawPolygon(e.shape, e.x, e.y, e.w, e.h, e.color, true);
    }

    if (this.isBossActive && this.boss) {
      this.drawPolygon(this.boss.shape, this.boss.x, this.boss.y, this.boss.w, this.boss.h, this.boss.color, true);
    }

    if (!this.isGameOver || this.isManualEnd) {
      this.drawPolygon(
        this.stats.data.selectedShipShape,
        this.ship.x,
        this.ship.y,
        this.ship.w,
        this.ship.h,
        this.stats.data.selectedShipColor,
        false
      );

      if (this.haloAvailable) {
        ctx.save();
        ctx.strokeStyle = "#00ffff";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.ship.x, this.ship.y, Math.max(this.ship.w, this.ship.h) * 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (this.hasAiDrone && this.drone) {
        this.drawPolygon("triangle", this.drone.x, this.drone.y, this.drone.w, this.drone.h, "#00f0ff", false);
      }
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.shadowColor = "#3498db";
    ctx.shadowBlur = 8;
    ctx.fillText(`DIST: ${Math.floor(this.distance)} m`, 75, 50);
    ctx.restore();

    if (this.isBossActive && this.boss) {
      const bossBarW = Math.min(320, this.canvas.width * 0.6);
      const bossBarH = 18;
      const bossBarX = (this.canvas.width - bossBarW) / 2;
      const bossBarY = 25;
      const bossHpPercent = Math.max(0, Math.min(1, this.boss.hp / this.boss.maxHp));

      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.strokeStyle = this.boss.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.boss.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);
      ctx.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);

      ctx.fillStyle = this.boss.color;
      ctx.fillRect(bossBarX + 2, bossBarY + 2, (bossBarW - 4) * bossHpPercent, bossBarH - 4);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.shadowBlur = 4;
      ctx.fillText(`${this.boss.name}`, this.canvas.width / 2, bossBarY + 13);
      ctx.restore();
    }

    const currentHp = Math.max(0, this.ship.hp);
    const maxHp = this.ship.maxHP;
    const hpPercent = Math.max(0, Math.min(1, currentHp / maxHp));

    const shieldBarWidth = 140;
    const shieldBarHeight = 14;
    const shieldBarX = 25;
    const shieldBarY = this.canvas.height - 35;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#3498db";
    ctx.shadowBlur = 6;
    ctx.fillRect(shieldBarX, shieldBarY, shieldBarWidth, shieldBarHeight);
    ctx.strokeRect(shieldBarX, shieldBarY, shieldBarWidth, shieldBarHeight);

    ctx.fillStyle = hpPercent > 0.25 ? "#3498db" : "#e74c3c";
    ctx.fillRect(shieldBarX + 2, shieldBarY + 2, (shieldBarWidth - 4) * hpPercent, shieldBarHeight - 4);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.shadowBlur = 4;
    ctx.fillText(`SHIELD: ${currentHp}/${maxHp}`, shieldBarX + 10, shieldBarY + 11);
    ctx.restore();

    const currentFuel = Math.floor(this.stats.data.currentFuel);
    const maxFuel = this.stats.maxFuel();
    const fuelPercent = Math.max(0, Math.min(1, currentFuel / maxFuel));
    
    const barWidth = 140;
    const barHeight = 14;
    const barX = this.canvas.width - barWidth - 25;
    const barY = this.canvas.height - 35;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 6;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = fuelPercent > 0.25 ? "#00f0ff" : "#e74c3c";
    ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * fuelPercent, barHeight - 4);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.shadowBlur = 4;
    ctx.fillText(`FUEL: ${currentFuel}/${maxFuel}`, barX + 10, barY + 11);
    ctx.restore();
  }
}
