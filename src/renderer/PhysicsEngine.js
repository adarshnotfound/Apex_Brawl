/**
 * PhysicsEngine.js
 * High-performance deterministic 2D fighting game kinematics engine.
 * 
 * Features:
 * - Fixed timestep simulation (60Hz lockstep compatible)
 * - Zero-inertia horizontal movement (instant walk velocity & stops)
 * - Parabolic jump arc with fixed committed velocities
 * - Camera viewport & stage boundary hard-clamping
 * - Dynamic hit/block recoil & corner pushback transfer
 * - Pushbox mutual body separation
 */

export class PhysicsEngine {
  /**
   * @param {Object} options
   * @param {number} [options.groundY=600] Stage floor Y coordinate
   * @param {number} [options.gravity=2200] Gravitational pull in px/s^2
   * @param {number} [options.stageMinX=0] Left stage wall boundary
   * @param {number} [options.stageMaxX=2560] Right stage wall boundary
   * @param {number} [options.pushboxWidth=120] Default fighter pushbox width
   * @param {number} [options.pushboxHeight=220] Default fighter pushbox height
   */
  constructor({
    groundY = 600,
    gravity = 2200,
    stageMinX = 0,
    stageMaxX = 2560,
    pushboxWidth = 120,
    pushboxHeight = 220
  } = {}) {
    this.groundY = groundY;
    this.gravity = gravity;
    this.stageMinX = stageMinX;
    this.stageMaxX = stageMaxX;
    this.pushboxWidth = pushboxWidth;
    this.pushboxHeight = pushboxHeight;

    // Fixed timestep constants
    this.fixedDelta = 1 / 60; // 60 FPS tick
    this.pushbackFriction = 0.88; // Per-frame pushback decay
  }

  /**
   * Updates an individual fighter's deterministic kinematic state.
   * @param {Object} fighter Fighter entity
   * @param {Object} camera Viewport camera reference for viewport clamping
   * @param {number} [dt=this.fixedDelta] Timestep in seconds
   */
  updateFighter(fighter, camera, dt = this.fixedDelta) {
    // 1. Process Horizontal Pushback / Recoil
    if (Math.abs(fighter.pushbackVx) > 0.5) {
      fighter.x += fighter.pushbackVx * dt;
      fighter.pushbackVx *= this.pushbackFriction;
    } else {
      fighter.pushbackVx = 0;
    }

    // 2. Vertical Kinematics & Gravity
    if (!fighter.isGrounded) {
      fighter.vy += this.gravity * dt;
      fighter.y += fighter.vy * dt;

      // Floor collision check
      if (fighter.y >= this.groundY) {
        fighter.y = this.groundY;
        fighter.vy = 0;
        fighter.isGrounded = true;
        if (fighter.onLand) fighter.onLand();
      }
    } else {
      fighter.vy = 0;
    }

    // 3. Grounded / Airborne Horizontal Walking Movement
    // Fighting games require instant zero-acceleration walking speed:
    if (fighter.isGrounded && fighter.canMove) {
      fighter.x += fighter.vx * dt;
    } else if (!fighter.isGrounded) {
      // Committed Jump Arc: fighters preserve airborne momentum
      fighter.x += fighter.jumpVx * dt;
    }

    // 4. Viewport & Stage Boundary Clamping
    this.clampFighterToBoundaries(fighter, camera);
  }

  /**
   * Clamps fighter position to both the physical stage and active camera view.
   * @param {Object} fighter
   * @param {Object} camera
   */
  clampFighterToBoundaries(fighter, camera) {
    const halfWidth = (fighter.pushboxWidth || this.pushboxWidth) / 2;

    // Viewport edge bounds (fighters cannot move off-screen)
    let minX = this.stageMinX + halfWidth;
    let maxX = this.stageMaxX - halfWidth;

    if (camera) {
      const cameraLeft = camera.x - camera.viewportWidth / 2 + halfWidth + 10;
      const cameraRight = camera.x + camera.viewportWidth / 2 - halfWidth - 10;
      minX = Math.max(minX, cameraLeft);
      maxX = Math.min(maxX, cameraRight);
    }

    if (fighter.x < minX) {
      fighter.x = minX;
      fighter.isAtCorner = true;
    } else if (fighter.x > maxX) {
      fighter.x = maxX;
      fighter.isAtCorner = true;
    } else {
      fighter.isAtCorner = false;
    }
  }

  /**
   * Resolves physical pushbox overlap between two fighters and transfers corner pushback.
   * @param {Object} f1 Fighter 1
   * @param {Object} f2 Fighter 2
   */
  resolveBodyCollision(f1, f2) {
    const p1Box = this.getPushbox(f1);
    const p2Box = this.getPushbox(f2);

    // Test AABB intersection
    const overlapX = (p1Box.width / 2 + p2Box.width / 2) - Math.abs(f1.x - f2.x);
    const overlapY = (p1Box.height / 2 + p2Box.height / 2) - Math.abs((f1.y - p1Box.height / 2) - (f2.y - p2Box.height / 2));

    if (overlapX > 0 && overlapY > 0) {
      const pushDirection = f1.x < f2.x ? -1 : 1;
      const separation = overlapX;

      // Check corner pinning: if one fighter is stuck against the wall/screen edge,
      // the entire separation displacement transfers to the opposing fighter!
      if (f1.isAtCorner && !f2.isAtCorner) {
        f2.x -= pushDirection * separation;
      } else if (f2.isAtCorner && !f1.isAtCorner) {
        f1.x += pushDirection * separation;
      } else {
        // Equal 50/50 mutual displacement
        f1.x += pushDirection * (separation / 2);
        f2.x -= pushDirection * (separation / 2);
      }
    }
  }

  /**
   * Applies horizontal hit recoil/pushback to a defender or transfers to attacker in corners.
   * @param {Object} attacker
   * @param {Object} defender
   * @param {number} force Base pushback velocity
   */
  applyPushback(attacker, defender, force) {
    const facing = attacker.facingDirection; // 1 = right, -1 = left

    if (defender.isAtCorner) {
      // Classic Street Fighter / Mortal Kombat mechanic:
      // If defender is cornered, attacker absorbs the recoil in reverse!
      attacker.pushbackVx = -facing * force;
      defender.pushbackVx = 0;
    } else {
      defender.pushbackVx = facing * force;
      attacker.pushbackVx = -facing * (force * 0.2); // Minor attacker recoil
    }
  }

  /**
   * Initiates a committed jump arc.
   * @param {Object} fighter
   * @param {number} jumpVelocity Vertical launch impulse (negative Y)
   * @param {number} [horizontalDirection=0] -1 (Back), 0 (Neutral), 1 (Forward)
   * @param {number} [jumpSpeedX=280] Horizontal jump travel velocity
   */
  initiateJump(fighter, jumpVelocity = -800, horizontalDirection = 0, jumpSpeedX = 280) {
    if (!fighter.isGrounded) return;
    fighter.isGrounded = false;
    fighter.vy = jumpVelocity;
    fighter.jumpVx = horizontalDirection * jumpSpeedX;
  }

  /**
   * Returns calculated AABB pushbox for a fighter.
   * @param {Object} fighter
   * @returns {{x: number, y: number, width: number, height: number}}
   */
  getPushbox(fighter) {
    const width = fighter.pushboxWidth || this.pushboxWidth;
    const height = fighter.pushboxHeight || this.pushboxHeight;
    return {
      x: fighter.x - width / 2,
      y: fighter.y - height,
      width,
      height
    };
  }

  /**
   * Renders visual pushbox debug overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} fighter
   * @param {Object} [camera]
   */
  renderDebug(ctx, fighter, camera) {
    const box = this.getPushbox(fighter);
    const renderX = camera ? box.x - (camera.x - camera.viewportWidth / 2) : box.x;
    const renderY = box.y;

    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(renderX, renderY, box.width, box.height);
    ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.fillRect(renderX, renderY, box.width, box.height);

    // Ground anchor point
    ctx.fillStyle = '#f59e0b';
    const anchorX = camera ? fighter.x - (camera.x - camera.viewportWidth / 2) : fighter.x;
    ctx.beginPath();
    ctx.arc(anchorX, fighter.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
