/**
 * GameEngineIntegration.js
 * End-to-end Integration Harness tying PhysicsEngine, CombatSystem, and StageCamera
 * together into a deterministic 60 FPS fixed-timestep loop.
 */

import { PhysicsEngine } from './PhysicsEngine.js';
import { CombatSystem, FighterStates, SAMPLE_MOVES } from './CombatSystem.js';
import { StageCamera } from './StageCamera.js';

export class FightingGameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 1. Core Systems
    this.physics = new PhysicsEngine({
      groundY: 600,
      gravity: 2200,
      stageMinX: 0,
      stageMaxX: 2560
    });

    this.combat = new CombatSystem();

    this.camera = new StageCamera({
      viewportWidth: canvas.width,
      viewportHeight: canvas.height,
      stageWidth: 2560,
      lerpFactor: 0.08
    });

    // 2. Initialize Combatants
    this.p1 = this.createFighter('Player 1', 900, 600, 1);
    this.p2 = this.createFighter('Player 2', 1660, 600, -1);

    // 3. Game Loop Timers
    this.fixedTimeStep = 1000 / 60; // 16.666ms per tick
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.debugMode = true; // Shows hitboxes/hurtboxes
  }

  createFighter(name, x, y, facing) {
    const fighter = {
      name,
      x,
      y,
      vx: 0,
      vy: 0,
      jumpVx: 0,
      pushbackVx: 0,
      facingDirection: facing, // 1: Right, -1: Left
      isGrounded: true,
      canMove: true,
      isCrouching: false,
      isAtCorner: false,
      maxHp: 1000,
      hp: 1000,
      walkSpeed: 240,
      dashSpeed: 440,
      pushboxWidth: 100,
      pushboxHeight: 210
    };
    this.combat.initFighterCombat(fighter);
    return fighter;
  }

  /**
   * Deterministic Simulation Tick (Runs at strictly 60Hz)
   */
  fixedUpdate() {
    // 1. Maintain Auto-Facing (unless locked in attack)
    if (this.p1.state !== FighterStates.ATTACKING) {
      this.p1.facingDirection = this.p1.x <= this.p2.x ? 1 : -1;
    }
    if (this.p2.state !== FighterStates.ATTACKING) {
      this.p2.facingDirection = this.p2.x <= this.p1.x ? 1 : -1;
    }

    // 2. Advance Combat State Machines
    this.combat.updateFighterCombat(this.p1);
    this.combat.updateFighterCombat(this.p2);

    // 3. Resolve Hitbox / Hurtbox Interactions
    const hitP1ToP2 = this.combat.resolveCombatInteraction(this.p1, this.p2, this.physics);
    const hitP2ToP1 = this.combat.resolveCombatInteraction(this.p2, this.p1, this.physics);

    if (hitP1ToP2 || hitP2ToP1) {
      this.camera.shake(9, 8); // Trigger dynamic impact screen shake
    }

    // 4. Update Deterministic Kinematics
    this.physics.updateFighter(this.p1, this.camera);
    this.physics.updateFighter(this.p2, this.camera);

    // 5. Mutual Pushbox Separation
    this.physics.resolveBodyCollision(this.p1, this.p2);

    // 6. Update Dynamic Camera Panning
    this.camera.update(this.p1, this.p2);
  }

  /**
   * Render Pipeline (Separated into Background -> Entities -> Foreground -> HUD)
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Phase 1: Background & Playfield Floor
    this.camera.renderBackground(this.ctx);

    // Phase 2: Combatants & Hit Effects
    this.renderFighter(this.p1);
    this.renderFighter(this.p2);

    // Visual Hitbox / Hurtbox Debug Overlays
    if (this.debugMode) {
      this.physics.renderDebug(this.ctx, this.p1, this.camera);
      this.physics.renderDebug(this.ctx, this.p2, this.camera);
      this.combat.renderDebug(this.ctx, this.p1, this.camera);
      this.combat.renderDebug(this.ctx, this.p2, this.camera);
    }

    // Phase 3: Foreground Parallax Elements
    this.camera.renderForeground(this.ctx);

    // Phase 4: Fixed Screen Space HUD
    this.camera.renderHUD(this.ctx, this.p1, this.p2);
  }

  renderFighter(fighter) {
    const { offsetX } = this.camera.getViewOffset();
    const screenX = fighter.x - offsetX;
    const screenY = fighter.y;

    this.ctx.save();
    // Shadow under fighter
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.ctx.beginPath();
    this.ctx.ellipse(screenX, screenY, 45, 12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Body silhouette placeholder if sprites are loading
    this.ctx.fillStyle = fighter.name.includes('1') ? '#06b6d4' : '#ef4444';
    this.ctx.fillRect(screenX - 25, screenY - 190, 50, 190);
    this.ctx.restore();
  }

  /**
   * Main requestAnimationFrame Loop with Timestep Accumulator
   */
  start() {
    const loop = (currentTime) => {
      const delta = currentTime - this.lastTime;
      this.lastTime = currentTime;
      this.accumulator += delta;

      // Fixed timestep updates to prevent spiral of death
      while (this.accumulator >= this.fixedTimeStep) {
        this.fixedUpdate();
        this.accumulator -= this.fixedTimeStep;
      }

      this.render();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
