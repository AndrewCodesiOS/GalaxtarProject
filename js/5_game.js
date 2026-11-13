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
        speed: 25 + Math.random() * 65,
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
    this.keys = {};
    this.activeTouches = new Map();
    this.shipDragTouchId = null;
    this.bindInputs();
  }

  bindInputs() {
    window.addEventListener("keydown", e => {
      this.keys[e.code] = true;
      if (e.code === "Space" && this.isRunning && !this.isPaused && !this.isGameOver) {
        e.preventDefault();
        if (!this.stats.data.isPeacefulMode) this.shoot();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        if (this.isRunning && !this.isPaused && !this.isGameOver) this.toggleBoost();
      }
    });
    window.addEventListener("keyup", e => {
      this.keys[e.code] = false;
    });

    const onDown = e => {
      if (!this.isRunning || this.isGameOver || this.isPaused) return;
      if (e.target.closest(".hud-btn")) return;

      if (e.touches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          this.activeTouches.set(t.identifier, { x: t.clientX, y: t.clientY });
          if (this.shipDragTouchId === null) {
            this.shipDragTouchId = t.identifier;
            this.shipDragStart = { x: t.clientX, y: t.clientY };
            this.shipStartPos = { x: this.ship.x, y: this.ship.y };
          } else {
            if (!this.stats.data.isPeacefulMode) this.shoot();
          }
        }
      } else {
        this.isMouseDown = true;
        this.mouseDragStart = { x: e.clientX, y: e.clientY };
        this.shipStartPos = { x: this.ship.x, y: this.ship.y };
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
            this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.shipStartPos.x + dx));
            this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.shipStartPos.y + dy));
          }
        }
      } else if (this.isMouseDown) {
        const dx = e.clientX - this.mouseDragStart.x;
        const dy = e.clientY - this.mouseDragStart.y;
        this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.shipStartPos.x + dx));
        this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.shipStartPos.y + dy));
      }
    };

    const onUp = e => {
      if (e.touches) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          this.activeTouches.delete(t.identifier);
          if (t.identifier === this.shipDragTouchId) {
            this.shipDragTouchId = null;
            if (this.activeTouches.size > 0) {
              const [nextId, pos] = this.activeTouches.entries().next().value;
              this.shipDragTouchId = nextId;
              this.shipDragStart = { x: pos.x, y: pos.y };
              this.shipStartPos = { x: this.ship.x, y: this.ship.y };
            }
          }
        }
      } else {
        this.isMouseDown = false;
      }
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    this.canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
  }

  startSession() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const d = this.stats.data;
    const shieldInfo = GALAXTAR_DATA.shieldLevels[d.shieldLevel - 1];

    this.ship = {
      x: this.canvas.width / 2,
      y: this.canvas.height * 0.72,
      w: 50,
      h: 60,
      hp: shieldInfo.maxHP,
      maxHP: shieldInfo.maxHP,
      hasRegen: shieldInfo.regen
    };

    this.stars = [];
    this.planets = [];
    this.shootingStars = [];
    this.asteroids = [];
    this.enemies = [];
    this.bullets = [];
    this.chargeBullets = [];
    this.enemyBullets = [];
    this.particles = [];
    this.trails = [];
    this.activeTouches.clear();
    this.shipDragTouchId = null;
    this.isMouseDown = false;

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
    this.isBoostActive = false;
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
    this.lastFuelDeductDist = 0;
    this.lastSolarChargeDist = 0;
    this.nextDifficultyMilestone = 9000 + Math.random() * 7000;
    this.dynamicSpawnMult = 1.0;
    this.lastFrameTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  pause() { this.isPaused = true; }
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop);
  }
  stop() { this.isRunning = false; }
  toggleBoost() {
    if (this.stats.data.thrusterLevel < 2) return;
    if (this.stats.data.currentFuel <= 0 && !this.stats.data.isPeacefulMode) return;
    this.isBoostActive = !this.isBoostActive;
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
    const spawnB = (ox, size, dmg) => {
      this.bullets.push({
        x: this.ship.x + ox,
        y: this.ship.y - this.ship.h / 2,
        size,
        speed: 520,
        color,
        damage: dmg
      });
    };

    if (wLvl === 1) spawnB(0, 8, 2);
    else if (wLvl === 2) { spawnB(-20, 10, 1); spawnB(20, 10, 1); }
    else { spawnB(0, 12, 1); spawnB(-25, 12, 1); spawnB(25, 12, 1); }
    this.audio.playGunSound();
  }

  loop(now) {
    if (!this.isRunning || this.isPaused) return;
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = now;
    this.distance += 220 * dt;
    this.render();
    requestAnimationFrame(this.loop);
  }

  render() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (const s of this.stars) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Draw ship
    ctx.fillStyle = this.stats.data.selectedShipColor;
    ctx.beginPath();
    ctx.moveTo(this.ship.x, this.ship.y - this.ship.h / 2);
    ctx.lineTo(this.ship.x + this.ship.w / 2, this.ship.y + this.ship.h / 2);
    ctx.lineTo(this.ship.x - this.ship.w / 2, this.ship.y + this.ship.h / 2);
    ctx.closePath();
    ctx.fill();
  }
}
