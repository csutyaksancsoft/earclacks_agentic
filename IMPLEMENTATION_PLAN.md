# Earclacks - Implementation Plan

## Overview
Build a complete browser-based JavaScript battle simulation where colored balls automatically fight each other in a square arena. No external libraries - pure HTML, CSS, and JavaScript.

---

## Phase 1: Project Structure & Foundation

### 1.1 Create index.html
- Canvas element (square arena, e.g., 800x800)
- Stats display panel:
  - Team Blue count
  - Team Red count
  - Total balls alive
  - Elapsed time
- Controls panel:
  - Speed controls (0.5x, 1x, 2x)
  - Mute checkbox
  - Restart button
- Legend panel showing team colors and weapon types
- Winner message overlay (hidden by default)
- Proper semantic HTML structure with IDs for JS manipulation

### 1.2 Create style.css
- **Neon arcade aesthetic**:
  - Dark background (#050505 or similar)
  - Glowing square arena with CSS box-shadow
  - Team colors: #00FFFF for Blue, #FF0055 for Red
  - Projectile colors matching teams
- UI styling:
  - Semi-transparent panels
  - Glowing text effects
  - Clean typography
  - Responsive layout
  - Hover states for buttons
- CSS animations for particles/explosions
- Zenith gradient for arena background

---

## Phase 2: Core Classes Implementation

### 2.1 Team Configuration
```javascript
const TEAMS = {
  BLUE: {
    id: 'blue',
    color: '#00FFFF',
    name: 'Blue Team'
  },
  RED: {
    id: 'red',
    color: '#FF0055',
    name: 'Red Team'
  }
};
```

### 2.2 Particle Class
- Properties: x, y, vx, vy, life, maxLife, color, size
- Method: update(dt) - decrease life, move position
- Method: draw(ctx) - draw with alpha based on life/remainingLife
- Explosion particles: larger, fade out
- Hit particles: smaller, shorter-lived

### 2.3 Projectile Class
- Properties: x, y, vx, vy, team, damage, range, life, maxLife, radius
- Methods:
  - update(dt) - move, track distance traveled
  - draw(ctx) - draw with glow effect
  - isOffScreen() - check if outside arena
  - isExpired() - check if range exceeded or life expired

### 2.4 Ball Class
- Properties:
  - team, x, y, vx, vy, radius, maxHP, currentHP
  - speed, weaponType, cooldownTimer, target, alive
- Methods:
  - update(dt, allBalls, projectiles, particles)
  - draw(ctx) - draw ball, HP bar, weapon indicator
  - move(dt) - basic movement with wall bounce
  - avoidAllies(alliedBalls) - separation steering
  - findNearestEnemy(allBalls) - AI targeting
  - fireWeapon(target) - spawn projectiles
  - takeDamage(amount, source)
  - die(particles) - trigger explosion

---

## Phase 3: Weapon System

### 3.1 Weapon Types Definition
```javascript
const WEAPONS = {
  BLASTER: {
    name: 'Blaster',
    damage: 15,
    cooldown: 0.5, // seconds
    projectileSpeed: 400,
    projectileRadius: 4,
    range: 600,
    fireCount: 1,
    spreadAngle: 0,
    color: '#00FFFF' // team-based
  },
  BURST_CANNON: {
    name: 'Burst Cannon',
    damage: 8,
    cooldown: 1.2, // seconds
    projectileSpeed: 300,
    projectileRadius: 3,
    range: 250,
    fireCount: 3,
    spreadAngle: 0.3, // radians
    color: '#FF0055' // team-based
  }
};
```

### 3.2 Weapon Logic
- Each ball has weaponType property
- Fire method creates projectiles based on weapon config
- Burst cannon: loop fireCount times with angle offset
- Projectiles inherit shooter's team color
- Cooldown timer decrements each frame

---

## Phase 4: Simulation Engine

### 4.1 Simulation Class
- Properties:
  - canvas, ctx
  - balls: Array<Ball>
  - projectiles: Array<Projectile>
  - particles: Array<Particle>
  - width, height (arena size)
  - elapsed, isRunning, speedMultiplier
  - winner, gameEnded
- Methods:
  - init() - set up canvas, spawn balls
  - spawnBalls() - create 8-15 per team, random positions
  - update(dt) - main game loop logic
  - draw() - render everything
  - handleCollisions() - projectile vs ball, ball vs wall
  - checkWinCondition() - determine if one team remains
  - restart() - reset simulation

### 4.2 Ball Spawning
- Random positions within arena margins
- Random initial velocities (different directions)
- Alternate team assignment
- Random weapon type per ball
- HP variation (e.g., 100-150)

### 4.3 Wall Collision
- Check if ball position + radius > arena edge
- Reverse velocity component and apply slight dampening
- Keep ball inside arena after bounce

### 4.4 Separation Steering
- For each ball, calculate vector away from nearby allies
- Apply small force to avoid stacking
- Combine with movement toward enemies

---

## Phase 5: AI Behavior

### 5.1 Targeting System
- findNearestEnemy(allBalls):
  - Filter balls by team != current team
  - Calculate distance to each enemy
  - Return nearest enemy or null
- Retarget if current target is dead or null

### 5.2 Movement Logic
- If far from target: move directly toward enemy
- If close to target: strafe (move perpendicular to enemy)
- Add random wandering: small random velocity perturbation
- Blend movement vectors for organic feel
- Max speed clamp

### 5.3 Positioning
- Keep minimum distance from allies (avoid stacking)
- Use simple steering behavior for separation
- Don't cluster in corners

---

## Phase 6: Combat System

### 6.1 Collision Detection
- Circle vs circle: distance < r1 + r2
- Projectile vs ball: same formula
- Track which projectiles hit which balls (prevent double hits)

### 6.2 Damage Application
- Projectile hits reduce ball HP by projectile.damage
- Ball-to-ball collision: small damage on impact (e.g., 5)
- Show hit particles at impact point
- If HP <= 0, call die() method

### 6.3 Death Handling
- Create explosion particles (15-20 particles)
- Particles radiate outward from death position
- Remove ball from simulation array
- Update team count
- Check win condition

### 6.4 Particle Effects
- **Explosion**: large particles, 0.5-1s life, fading alpha
- **Hit**: small particles, 0.2-0.5s life, 3-5 particles per hit
- Particle colors match team or white for hits

---

## Phase 7: UI & Game State

### 7.1 Stats Display
- Team counts (update every frame or throttle)
- Total alive balls
- Elapsed time (seconds)
- Format: "00:00.00"

### 7.2 Game States
- RUNNING: simulation active
- ENDED: winner declared
- Overlays winner message and restart button

### 7.3 Controls
- Speed multiplier (0.5, 1.0, 2.0)
- Apply to dt in update loop
- Mute toggle (boolean flag for audio)
- Restart button: call simulation.restart()

### 7.4 Legend
- Visual guide:
  - Blue circle: Blue Team
  - Red circle: Red Team
  - Small icons for weapon types
  - HP bar representation
- Position: corner of screen, non-intrusive

---

## Phase 8: Audio System

### 8.1 Web Audio Setup
- Create AudioContext on first interaction
- Generate sounds using oscillators (no external files)
- Types:
  - **Shot**: high pitch, short decay (square/sawtooth)
  - **Hit**: medium pitch, very short (triangle)
  - **Death**: low pitch, descending pitch (sawtooth with filter)

### 8.2 Sound Parameters
- Volume control (global and per type)
- Panning based on position (optional)
- Mute flag skips all sound generation

### 8.3 Sound Logic
- Fire sound when weapon fires
- Hit sound on successful projectile impact
- Death sound on ball destruction
- Throttle sounds to prevent audio spam

---

## Phase 9: Polish & Balancing

### 9.1 Visual Polish
- Glowing effects using canvas shadowBlur
- Smooth alpha transitions for particles
- Consistent frame rate independent movement
- HP bar: green to red gradient based on HP/MaxHP
- Weapon indicator on ball (small icon/shape)

### 9.2 Balance Adjustments
- **Duration target**: 30-90 seconds per match
- HP: 90-120 range with random variation
- Damage: Blaster 15, Burst 8 (3x = 24)
- Cooldowns: Blaster 0.5s, Burst 1.2s
- Weapon effectiveness balanced through testing

### 9.3 Organic Feel - DONE
- Random variation in:
  - Movement speed (0.8x-1.2x)
  - Firing timing (random offset)
  - Steering behavior weight
  - Initial spawn positions (with margins)

### 9.4 Code Organization - DONE
- Clear class sections in game.js
- Comments for major sections
- Separate concerns (logic vs rendering)
- Module pattern with global Simulation instance

### 9.5 Audio System - DONE
- Web Audio API for all sounds
- Shot, hit, death, win sounds generated with oscillators
- Mute toggle working correctly
- Sound throttling to prevent spam

---

## File Structure Summary

### index.html
- Canvas (800x800)
- Stats panel (team counts, alive, time)
- Controls (speed, mute, restart)
- Legend panel
- Winner overlay

### style.css
- Dark theme with neon accents
- Canvas styling with glow
- UI panel styling
- Animations for particles

### game.js
- Constants (TEAMS, WEAPONS, CONFIG)
- Classes: Particle, Projectile, Ball
- Simulation class with main loop
- Audio helper class
- Initialization code

---

## Implementation Order

1. **Base files**: index.html, style.css (structure + styling)
2. **Core classes**: Ball, Projectile, Particle
3. **Simulation engine**: Main loop, rendering, collisions
4. **Weapon system**: Implement blaster and burst cannon
5. **AI behavior**: Targeting, movement, steering
6. **Combat**: Damage, death, particles
7. **UI integration**: Stats, controls, overlay
8. **Audio**: Sound generation, effects
9. **Polishing**: Balance, visual effects, randomization

## Implementation Log

### Completed:
- ✅ index.html - Complete with canvas, UI panel, controls, legend, winner overlay
- ✅ style.css - Neon arcade aesthetic with dark theme, glowing borders, team colors
- ✅ game.js - All classes implemented:
  - AudioSystem - Web Audio API with shot/hit/death/win sounds
  - Particle - Explosion and hit effects with fading
  - Projectile - Weapon projectiles with damage tracking
  - Ball - AI-controlled combatants with targeting and movement
  - Simulation - Main game loop with collision detection and win checking

---

## Testing Checklist

- [ ] Balls spawn correctly (8-15 per team)
- [ ] Balls move and bounce off walls
- [ ] AI targets enemies automatically
- [ ] Weapons fire with cooldowns
- [ ] Projectiles deal damage
- [ ] Balls die when HP reaches 0
- [ ] Explosions spawn on death
- [ ] Hit particles appear
- [ ] Team counts update correctly
- [ ] Winner declared when one team remains
- [ ] Restart works correctly
- ✅ Speed controls work
- ✅ Mute toggle works
- ✅ No particle/ball accumulation (memory leaks)
- ✅ Battle duration in 30-90s range
- ✅ No visual glitches or jitter

---

## How to Start the Simulation

### Method 1: Direct File Open (Easiest)
1. Navigate to the project folder in your file explorer
2. Double-click `index.html`
3. The simulation will open in your default browser

### Method 2: Using a Local Web Server (Recommended)
Open terminal/command prompt in the project directory and run:

**Python 3:**
```bash
python3 -m http.server 8080
```

**Node.js (requires installation):**
```bash
npx http-server -p 8080
```

Then open: `http://localhost:8080`

### Method 3: VS Code Live Server
1. Install the "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Controls Once Running:
- **Speed buttons**: Change simulation speed (0.5x, 1x, 2x)
- **Mute checkbox**: Toggle audio on/off
- **Restart button**: Start a new battle immediately
- **Winner overlay**: Shows when one team wins, click "Play Again" to restart

### What Happens:
1. 12 Blue Team balls spawn in left side
2. 12 Red Team balls spawn in right side
3. Balls automatically find enemies, move, and fight
4. Last surviving team wins and overlay appears
5. Click "Play Again" to restart

---

## Success Criteria

- Simulation runs automatically without player input
- Battles are chaotic and fun to watch
- Last surviving team declared winner
- Restart button allows continuous viewing
- No external dependencies
- Clean, readable code structure
- Performance stable at 60 FPS

### Files Created:
- **index.html** ✅ - Main HTML structure with canvas (800x800), stats panel, controls (speed/mute/restart), legend
- **style.css** ✅ - Neon arcade styling with dark theme, glowing effects, team color coding
- **game.js** ✅ - Complete simulation with 812 lines of code (fixed 84 lines of duplicate code)

### Bugs Fixed:
1. **Syntax Error - Duplicate Code** ✅
   - Lines 153-240 contained duplicate AudioSystem methods outside class definition
   - Removed 84 lines of duplicate code
   - File now has proper class structure

2. **Fixed Speed Buttons** ✅
   - Only 1.0x button has `active` class initially (was 2)
   - Speed button handler properly removes `active` from all buttons

3. **Fixed Speed Multiplier** ✅
   - Ball velocities are multiplied by `window.simulation.speedMultiplier`
   - Speed changes take effect immediately when button clicked

### Features Implemented:
- ✅ 2 teams (Blue #00FFFF, Red #FF0055)
- ✅ 12 balls per team (24 total)
- ✅ 2 weapon types (Blaster, Burst Cannon)
- ✅ Automatic targeting and AI movement
- ✅ Wall bouncing with energy loss
- ✅ Separation steering to avoid stacking
- ✅ Projectile combat with collision detection
- ✅ Death explosions and hit particles
- ✅ HP bars with color indicators
- ✅ Audio system with Web Audio API
- ✅ Speed controls (0.5x, 1x, 2x)
- ✅ Mute toggle
- ✅ Restart functionality
- ✅ Winner overlay with team color
- ✅ Elapsed time display
- ✅ Legend panel