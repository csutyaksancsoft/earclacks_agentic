// ============================================
// EARCLACKS - Battle Simulation
// ============================================
// Automatic arena battle where balls fight each other
// ============================================

// ============================================
// CONSTANTS
// ============================================

const TEAMS = {
  BLUE: { id: 'blue', color: '#00FFFF' },
  RED: { id: 'red', color: '#FF0055' }
};

const WEAPONS = {
  BLASTER: {
    name: 'Blaster',
    damage: 15,
    cooldown: 0.5,
    projectileSpeed: 500,
    projectileRadius: 4,
    range: 600,
    fireCount: 1,
    spreadAngle: 0
  },
  BURST_CANNON: {
    name: 'Burst Cannon',
    damage: 8,
    cooldown: 1.2,
    projectileSpeed: 350,
    projectileRadius: 3,
    range: 250,
    fireCount: 3,
    spreadAngle: 0.4
  }
};

const CONFIG = {
  ARENA_SIZE: 800,
  BALL_RADIUS: 15,
  BALL_SPEED: 100,
  MIN_SPEED: 0.8,
  MAX_SPEED: 1.2,
  BALLS_PER_TEAM: 12,
  MAX_HP: 120,
  MIN_HP: 90,
  SEPARATION_RADIUS: 40,
  SEPARATION_FORCE: 100,
  WALL_BOUNCE: 0.9,
  COLLISION_DAMAGE: 3
};

// ============================================
// AUDIO SYSTEM
// ============================================

class AudioSystem {
  constructor() {
    this.context = null;
    this.muted = true;
  }

  init() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  playTone(freq, type, duration, volume = 0.3) {
    if (this.muted || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.context.currentTime);
    
    gain.gain.setValueAtTime(volume, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playShot(weapon) {
    if (this.muted || !this.context) return;
    
    const freq = weapon === WEAPONS.BURST_CANNON ? 200 : 400;
    const duration = weapon === WEAPONS.BURST_CANNON ? 0.15 : 0.1;
    this.playTone(freq, 'sawtooth', duration, 0.25);
  }

  playHit() {
    if (this.muted || !this.context) return;
    
    const freq = 300 + Math.random() * 100;
    this.playTone(freq, 'triangle', 0.08, 0.2);
  }

  playDeath() {
    if (this.muted || !this.context) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.context.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.4, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.context.destination);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.5);
  }

  playWin() {
    if (this.muted || !this.context) return;
    
    const notes = [440, 554, 659, 880];
    let time = this.context.currentTime;
    
    notes.forEach((note, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.type = 'square';
      osc.frequency.value = note;
      
      gain.gain.setValueAtTime(0.1, time + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.1 + 0.3);
      
      osc.connect(gain);
      gain.connect(this.context.destination);
      
      osc.start(time + i * 0.1);
      osc.stop(time + i * 0.1 + 0.3);
    });
  }
}

// ============================================
// PARTICLE CLASS
// ============================================

class Particle {
  constructor(x, y, color, size, speed, life, type = 'explosion') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.type = type;
    
    const angle = Math.random() * Math.PI * 2;
    const speedMult = Math.random() * speed;
    this.vx = Math.cos(angle) * speedMult;
    this.vy = Math.sin(angle) * speedMult;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    
    if (this.type === 'explosion') {
      this.vx *= 0.95;
      this.vy *= 0.95;
    }
  }

  draw(ctx) {
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  isDead() {
    return this.life <= 0;
  }
}

// ============================================
// PROJECTILE CLASS
// ============================================

class Projectile {
  constructor(x, y, vx, vy, team, weapon, damage) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.team = team;
    this.weapon = weapon;
    this.damage = damage;
    this.radius = weapon.projectileRadius;
    this.rangeLeft = weapon.range;
    this.life = 2; // seconds
    this.active = true;
  }

  update(dt, arenaSize) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    const distance = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.rangeLeft -= distance * dt;
    this.life -= dt;
    
    if (this.x < 0 || this.x > arenaSize || 
        this.y < 0 || this.y > arenaSize ||
        this.rangeLeft <= 0 || this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.team.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.team.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }
}

// ============================================
// BALL CLASS
// ============================================

class Ball {
  constructor(x, y, team, weaponType) {
    this.x = x;
    this.y = y;
    this.team = team;
    this.weaponType = weaponType;
    
    this.radius = CONFIG.BALL_RADIUS;
    this.maxHP = CONFIG.MAX_HP + Math.random() * (CONFIG.MIN_HP - CONFIG.MAX_HP);
    this.currentHP = this.maxHP;
    this.speed = CONFIG.BALL_SPEED * (CONFIG.MIN_SPEED + Math.random() * (CONFIG.MAX_SPEED - CONFIG.MIN_SPEED));
    
    this.weapon = WEAPONS[weaponType];
    this.cooldownTimer = Math.random() * this.weapon.cooldown;
    
    this.alive = true;
    
    // Random initial velocity
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    
    this.target = null;
  }

  update(dt, allBalls, projectiles, particles) {
    if (!this.alive) return;
    
    // Update cooldown
    this.cooldownTimer -= dt;
    
    // Find nearest enemy
    this.findNearestEnemy(allBalls);
    
    // Apply AI movement
    this.applyAI(dt, allBalls);
    
    // Apply speed multiplier to velocities (check if simulation exists)
    if (window.simulation) {
      this.vx *= window.simulation.speedMultiplier;
      this.vy *= window.simulation.speedMultiplier;
    }
    
    // Move and handle wall collisions
    this.move(dt, particles);
    
    // Fire if ready
    if (this.target && this.target.alive && this.cooldownTimer <= 0) {
      this.fire(particles, projectiles);
    }
  }

  findNearestEnemy(allBalls) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const ball of allBalls) {
      if (ball !== this && ball.alive && ball.team !== this.team) {
        const dx = ball.x - this.x;
        const dy = ball.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
          minDist = dist;
          nearest = ball;
        }
      }
    }
    
    this.target = nearest;
  }

  applyAI(dt, allBalls) {
    // Separation from allies
    let separationX = 0;
    let separationY = 0;
    
    for (const ball of allBalls) {
      if (ball !== this && ball.alive && ball.team === this.team) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < CONFIG.SEPARATION_RADIUS) {
          const force = (CONFIG.SEPARATION_RADIUS - dist) / CONFIG.SEPARATION_RADIUS;
          separationX += (dx / dist) * force * CONFIG.SEPARATION_FORCE;
          separationY += (dy / dist) * force * CONFIG.SEPARATION_FORCE;
        }
      }
    }
    
    // Add to velocity
    this.vx += separationX * dt;
    this.vy += separationY * dt;
    
    // Target movement
    if (this.target && this.target.alive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 100) {
        // Move toward enemy
        this.vx += (dx / dist) * 100 * dt;
        this.vy += (dy / dist) * 100 * dt;
      } else {
        // Strafe
        const strafeAngle = Math.atan2(dy, dx) + Math.PI / 2;
        this.vx += Math.cos(strafeAngle) * 50 * dt;
        this.vy += Math.sin(strafeAngle) * 50 * dt;
      }
    }
    
    // Add some randomness/organic feel
    this.vx += (Math.random() - 0.5) * 30 * dt;
    this.vy += (Math.random() - 0.5) * 30 * dt;
    
    // Clamp speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.speed) {
      this.vx = (this.vx / speed) * this.speed;
      this.vy = (this.vy / speed) * this.speed;
    }
  }

  move(dt, particles) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Wall collisions
    let bounced = false;
    
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx = -this.vx * CONFIG.WALL_BOUNCE;
      bounced = true;
    } else if (this.x > CONFIG.ARENA_SIZE - this.radius) {
      this.x = CONFIG.ARENA_SIZE - this.radius;
      this.vx = -this.vx * CONFIG.WALL_BOUNCE;
      bounced = true;
    }
    
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy = -this.vy * CONFIG.WALL_BOUNCE;
      bounced = true;
    } else if (this.y > CONFIG.ARENA_SIZE - this.radius) {
      this.y = CONFIG.ARENA_SIZE - this.radius;
      this.vy = -this.vy * CONFIG.WALL_BOUNCE;
      bounced = true;
    }
    
    if (bounced) {
      this.addHitParticles(particles, 3);
    }
  }

  fire(particles, projectiles) {
    const weapon = this.weapon;
    this.cooldownTimer = weapon.cooldown;
    
    this.playSound('shot', weapon);
    
    const angle = Math.atan2(this.vy, this.vx);
    
    for (let i = 0; i < weapon.fireCount; i++) {
      const offsetAngle = (i - (weapon.fireCount - 1) / 2) * weapon.spreadAngle;
      const finalAngle = angle + offsetAngle + (Math.random() - 0.5) * 0.1;
      
      const pvx = Math.cos(finalAngle) * weapon.projectileSpeed;
      const pvy = Math.sin(finalAngle) * weapon.projectileSpeed;
      
      // Spawn projectile slightly in front of ball
      const spawnDist = this.radius + 5;
      const px = this.x + Math.cos(finalAngle) * spawnDist;
      const py = this.y + Math.sin(finalAngle) * spawnDist;
      
      projectiles.push(new Projectile(px, py, pvx, pvy, this.team, weapon, this.weapon.damage));
    }
    
    this.addHitParticles(particles, 5);
  }

  takeDamage(amount, source, particles) {
    this.currentHP -= amount;
    
    if (this.currentHP <= 0) {
      this.die(particles);
    } else {
      this.addHitParticles(particles, 8);
    }
  }

  playSound(type, weapon = null) {
    if (window.simulation && window.simulation.audio && !window.simulation.audio.muted) {
      if (type === 'shot' && weapon) {
        window.simulation.audio.playShot(weapon);
      } else if (type === 'hit') {
        window.simulation.audio.playHit();
      } else if (type === 'death') {
        window.simulation.audio.playDeath();
      } else if (type === 'win') {
        window.simulation.audio.playWin();
      }
    }
  }

  addHitParticles(particles, count) {
    this.playSound('hit');
    
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        this.x, 
        this.y, 
        this.team.color, 
        2 + Math.random() * 2, 
        50, 
        0.3
      ));
    }
  }

  die(particles) {
    this.alive = false;
    
    // Explosion particles
    const explosionCount = 20;
    for (let i = 0; i < explosionCount; i++) {
      particles.push(new Particle(
        this.x,
        this.y,
        this.team.color,
        3 + Math.random() * 4,
        150,
        0.6 + Math.random() * 0.4,
        'explosion'
      ));
    }
    
    this.playSound('death');
  }

  draw(ctx) {
    if (!this.alive) return;
    
    // Draw ball
    ctx.fillStyle = this.team.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.team.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Weapon indicator
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    if (this.weaponType === WEAPONS.BLASTER) {
      ctx.arc(this.x, this.y - this.radius + 5, 3, 0, Math.PI * 2);
    } else {
      ctx.moveTo(this.x, this.y - this.radius + 3);
      ctx.lineTo(this.x - 5, this.y - this.radius + 8);
      ctx.lineTo(this.x + 5, this.y - this.radius + 8);
    }
    ctx.fill();
    
    // HP bar
    const barWidth = 30;
    const barHeight = 4;
    const hpPercent = this.currentHP / this.maxHP;
    
    ctx.fillStyle = '#333';
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight);
    
    ctx.fillStyle = hpPercent > 0.5 ? '#00FF00' : (hpPercent > 0.25 ? '#FFFF00' : '#FF0000');
    ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth * hpPercent, barHeight);
    
    ctx.shadowBlur = 0;
  }
}

// ============================================
// SIMULATION CLASS
// ============================================

class Simulation {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.balls = [];
    this.projectiles = [];
    this.particles = [];
    
    this.audio = new AudioSystem();
    
    this.elapsed = 0;
    this.lastTime = 0;
    this.speedMultiplier = 1.0;
    this.gameEnded = false;
    this.winner = null;
    
    this.initInput();
    this.start();
  }

  initInput() {
    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const allBtns = document.querySelectorAll('.speed-btn');
        allBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.speedMultiplier = parseFloat(e.target.dataset.speed);
      });
    });
    
    // Mute toggle
    document.getElementById('muteAudio').addEventListener('change', (e) => {
      this.audio.setMuted(e.target.checked);
    });
    
    // Restart buttons
    document.getElementById('restartBtn').addEventListener('click', () => this.start());
    document.getElementById('winnerRestartBtn').addEventListener('click', () => this.start());
  }

  start() {
    this.balls = [];
    this.projectiles = [];
    this.particles = [];
    
    this.elapsed = 0;
    this.gameEnded = false;
    this.winner = null;
    
    // Hide winner overlay
    document.getElementById('winnerOverlay').classList.add('hidden');
    
    // Initialize audio context on first interaction
    this.audio.init();
    
    // Spawn balls
    this.spawnBalls();
    
    // Reset last time
    this.lastTime = performance.now();
    
    // Start loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.loop();
  }

  spawnBalls() {
    const margin = 80;
    const halfArena = CONFIG.ARENA_SIZE / 2;
    
    // Spawn blue team
    for (let i = 0; i < CONFIG.BALLS_PER_TEAM; i++) {
      const x = margin + Math.random() * (halfArena - margin * 2);
      const y = margin + Math.random() * (CONFIG.ARENA_SIZE - margin * 2);
      const weaponType = i % 2 === 0 ? 'BLASTER' : 'BURST_CANNON';
      
      this.balls.push(new Ball(x, y, TEAMS.BLUE, weaponType));
    }
    
    // Spawn red team
    for (let i = 0; i < CONFIG.BALLS_PER_TEAM; i++) {
      const x = halfArena + margin + Math.random() * (CONFIG.ARENA_SIZE - halfArena - margin * 2);
      const y = margin + Math.random() * (CONFIG.ARENA_SIZE - margin * 2);
      const weaponType = i % 2 === 0 ? 'BLASTER' : 'BURST_CANNON';
      
      this.balls.push(new Ball(x, y, TEAMS.RED, weaponType));
    }
  }

  update(dt) {
    this.elapsed += dt;
    
    // Update balls
    for (const ball of this.balls) {
      ball.update(dt, this.balls, this.projectiles, this.particles);
    }
    
    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt, CONFIG.ARENA_SIZE);
      
      if (!proj.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // Check collisions with balls
      for (const ball of this.balls) {
        if (ball.alive && ball.team !== proj.team) {
          const dx = proj.x - ball.x;
          const dy = proj.y - ball.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < ball.radius + proj.radius) {
            ball.takeDamage(proj.damage, proj, this.particles);
            proj.active = false;
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }
    
    // Ball-to-ball collision (damage)
    for (let i = 0; i < this.balls.length; i++) {
      const ball1 = this.balls[i];
      if (!ball1.alive) continue;
      
      for (let j = i + 1; j < this.balls.length; j++) {
        const ball2 = this.balls[j];
        if (!ball2.alive) continue;
        
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < ball1.radius + ball2.radius) {
          // Push apart
          const overlap = (ball1.radius + ball2.radius - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          
          ball1.x -= nx * overlap;
          ball1.y -= ny * overlap;
          ball2.x += nx * overlap;
          ball2.y += ny * overlap;
          
          // Apply collision damage if different teams
          if (ball1.team !== ball2.team) {
            ball1.takeDamage(CONFIG.COLLISION_DAMAGE, ball2, this.particles);
            ball2.takeDamage(CONFIG.COLLISION_DAMAGE, ball1, this.particles);
          }
        }
      }
    }
    
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
    
    // Check win condition
    if (!this.gameEnded) {
      this.checkWinCondition();
    }
    
    // Update UI
    this.updateUI();
  }

  checkWinCondition() {
    const blueCount = this.balls.filter(b => b.alive && b.team === TEAMS.BLUE).length;
    const redCount = this.balls.filter(b => b.alive && b.team === TEAMS.RED).length;
    
    if (blueCount === 0 || redCount === 0) {
      this.gameEnded = true;
      this.winner = blueCount > 0 ? TEAMS.BLUE : TEAMS.RED;
      this.showWinner();
      this.audio.playWin();
    }
  }

  showWinner() {
    const overlay = document.getElementById('winnerOverlay');
    const winnerText = document.getElementById('winnerText');
    
    const color = this.winner === TEAMS.BLUE ? '#00FFFF' : '#FF0055';
    const name = this.winner === TEAMS.BLUE ? 'BLUE TEAM' : 'RED TEAM';
    
    overlay.querySelector('.winner-title').style.color = color;
    winnerText.innerHTML = `<span style="color:${color}; text-shadow:0 0 10px ${color}">${name}</span> WINS!`;
    overlay.classList.remove('hidden');
  }

  updateUI() {
    const blueCount = this.balls.filter(b => b.alive && b.team === TEAMS.BLUE).length;
    const redCount = this.balls.filter(b => b.alive && b.team === TEAMS.RED).length;
    const aliveCount = blueCount + redCount;
    
    document.getElementById('blueCount').textContent = blueCount;
    document.getElementById('redCount').textContent = redCount;
    document.getElementById('aliveCount').textContent = aliveCount;
    
    // Format time
    const minutes = Math.floor(this.elapsed / 60);
    const seconds = Math.floor(this.elapsed % 60);
    const ms = Math.floor(this.elapsed * 10) % 10;
    document.getElementById('elapsedTime').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms}`;
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, CONFIG.ARENA_SIZE, CONFIG.ARENA_SIZE);
    
    // Draw grid
    this.ctx.strokeStyle = '#111';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i <= CONFIG.ARENA_SIZE; i += 50) {
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, CONFIG.ARENA_SIZE);
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(CONFIG.ARENA_SIZE, i);
    }
    this.ctx.stroke();
    
    // Draw arena border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(0, 0, CONFIG.ARENA_SIZE, CONFIG.ARENA_SIZE);
    
    // Draw entities
    for (const ball of this.balls) {
      ball.draw(this.ctx);
    }
    
    for (const proj of this.projectiles) {
      proj.draw(this.ctx);
    }
    
    for (const particle of this.particles) {
      particle.draw(this.ctx);
    }
  }

  loop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1) * this.speedMultiplier;
    this.lastTime = now;
    
    this.update(dt);
    this.draw();
    
    this.animationId = requestAnimationFrame(() => this.loop());
  }
}

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('DOMContentLoaded', () => {
  window.simulation = new Simulation();
});
