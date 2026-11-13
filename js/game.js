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
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.shipStart = { x: 0, y: 0 };

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

    const getPos = e => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = e => {
      if (!this.isRunning || this.isGameOver) return;
      if (e.target.closest(".hud-btn")) return;
      if (this.isPaused) return;
      const pos = getPos(e);
      this.isDragging = true;
      this.dragStart = pos;
      this.shipStart = { x: this.ship.x, y: this.ship.y };
    };

    const onMove = e => {
      if (!this.isDragging || !this.isRunning || this.isPaused || this.isGameOver) return;
      if (this.stats.data.currentFuel <= 0 && !this.stats.data.isPeacefulMode) return;
      const pos = getPos(e);
      const nx = this.shipStart.x + (pos.x - this.dragStart.x);
      const ny = this.shipStart.y + (pos.y - this.dragStart.y);
      this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, nx));
      this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, ny));
    };

    const onUp = () => {
      this.isDragging = false;
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
  }

  startSession() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    const d = this.stats.data;
    const shieldInfo = GALAXTAR_DATA.shieldLevels[d.shieldLevel - 1];

    this.ship = {
      x: this.canvas.width / 2,
      y: this.canvas.height * 0.72,
      w: d.selectedShipShape === "octagon" ? 50 : d.selectedShipShape === "square" ? 55 : 50,
      h: d.selectedShipShape === "octagon" ? 50 : d.selectedShipShape === "square" ? 55 : 60,
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
      const heat = wLvl === 5 && Math.random() <= 0.15;
      this.bullets.push({
        x: this.ship.x + ox,
        y: this.ship.y - this.ship.h / 2,
        size,
        speed: 520,
        color,
        damage: dmg,
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
    this.chargeBullets.push({
      x: this.ship.x,
      y: this.ship.y - this.ship.h / 2,
      size: 26,
      speed: 620,
      color,
      damage: 4
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
    if (this.isBoostActive && d.currentFuel <= 0 && !d.isPeacefulMode) {
      this.isBoostActive = false;
    }

    const speedMult = this.isBoostActive ? thrusterInfo.speedMultiplier : 1.0;

    if (!this.isGameOver) {
      this.elapsedTime += dt;
      this.distance += 220 * speedMult * dt;

      const moveSpeed = 360;
      if (d.currentFuel > 0 || d.isPeacefulMode) {
        if (this.keys["ArrowLeft"] || this.keys["KeyA"]) this.ship.x -= moveSpeed * dt;
        if (this.keys["ArrowRight"] || this.keys["KeyD"]) this.ship.x += moveSpeed * dt;
        if (this.keys["ArrowUp"] || this.keys["KeyW"]) this.ship.y -= moveSpeed * dt;
        if (this.keys["ArrowDown"] || this.keys["KeyS"]) this.ship.y += moveSpeed * dt;
        this.ship.x = Math.max(20, Math.min(this.canvas.width - 20, this.ship.x));
        this.ship.y = Math.max(30, Math.min(this.canvas.height - 40, this.ship.y));
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
        if (this.distance - this.lastFuelDeductDist >= 1500) {
          const baseCost = d.isHardcoreMode ? 4 : 2;
          const cost = this.isBoostActive ? Math.max(1, Math.floor(baseCost / 2)) : baseCost;
          this.stats.consumeFuel(cost);
          this.lastFuelDeductDist = this.distance;
        }
        if (this.distance - this.lastSolarChargeDist >= 6000) {
          this.stats.addSolarFuel();
          this.lastSolarChargeDist = this.distance;
        }
      }

      if (this.distance >= this.nextDifficultyMilestone) {
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

    this.asteroidSpawnTimer += dt * speedMult;
    if (this.asteroidSpawnTimer >= 3.2) {
      this.asteroidSpawnTimer = 0;
      const tier = Math.random();
      const size = tier < 0.5 ? 28 : tier < 0.85 ? 42 : 58;
      const hp = size === 28 ? 2 : size === 42 ? 4 : 6;
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

    const enemySpeedMult = this.isBoostActive ? Math.min(1 + (speedMult - 1) * 0.15, 1.5) : 1.0;
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
            const pts = this.isBoostActive ? e.points * 2 : e.points;
            this.sessionShips++;
            if (!d.isPeacefulMode) this.sessionPoints += pts;
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
              this.destroyAsteroid(j);
            }
            break;
          }
        }
      }

      if (consumed) this.bullets.splice(i, 1);
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
            const pts = this.isBoostActive ? e.points * 2 : e.points;
            this.sessionShips++;
            if (!d.isPeacefulMode) this.sessionPoints += pts;
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
            if (a.hp <= 0) this.destroyAsteroid(j);
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
        const pts = this.isBoostActive ? e.points * 2 : e.points;
        this.sessionShips++;
        if (!d.isPeacefulMode) this.sessionPoints += pts;
        this.spawnExplosion(e.x, e.y, e.color, 24);
        this.enemies.splice(i, 1);
        this.damagePlayer(999);
        break;
      }
    }

    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      if (!this.isInvulnerable && hitBox(a.x, a.y, a.size * 0.8, a.size * 0.8, this.ship.x, this.ship.y, this.ship.w * 0.85, this.ship.h * 0.85)) {
        this.destroyAsteroid(i);
        this.damagePlayer(4);
      }
    }
  }

  destroyAsteroid(index) {
    const a = this.asteroids[index];
    const d = this.stats.data;
    d.currentFuel = Math.min(this.stats.maxFuel(), d.currentFuel + a.fuelReward);
    if (!d.isPeacefulMode) {
      this.sessionPoints += a.pointReward;
    }
    this.sessionAsteroids++;
    this.stats.save();
    this.audio.playExplosion(true);
    this.spawnExplosion(a.x, a.y, a.color, 18);
    this.asteroids.splice(index, 1);
  }

  damagePlayer(amount) {
    this.ship.hp = Math.max(0, this.ship.hp - amount);
    this.isInvulnerable = true;
    this.invulnTimer = 0.5;
    if (this.ship.hp <= 0) {
      this.triggerGameOver(false);
    }
  }

  triggerGameOver(manualEnd = false) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isManualEnd = manualEnd;
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
  }
}
