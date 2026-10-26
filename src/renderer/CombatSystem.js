/**
 * CombatSystem.js
 * Frame-Data Combat Engine with AABB Hitbox/Hurtbox Collision Resolution.
 * 
 * Implements:
 * - Deterministic Frame Data State Machine (Startup -> Active -> Recovery)
 * - Distinct Head, Torso, Legs Hurtbox mapping
 * - Single-Hit attack latching per animation swing
 * - Blockstun, Hitstun, Damage & Recoil Pushback calculation
 * - Canvas Hitbox/Hurtbox visual debug renderer
 */

export const FighterStates = {
  IDLE: 'IDLE',
  WALKING: 'WALKING',
  JUMPING: 'JUMPING',
  ATTACKING: 'ATTACKING',
  HITSTUN: 'HITSTUN',
  BLOCKSTUN: 'BLOCKSTUN',
  KNOCKDOWN: 'KNOCKDOWN'
};

export const AttackPhases = {
  INACTIVE: 'INACTIVE',
  STARTUP: 'STARTUP',
  ACTIVE: 'ACTIVE',
  RECOVERY: 'RECOVERY'
};

/**
 * Standard Fighting Game Move Definitions & Frame-Data Schema
 */
export const SAMPLE_MOVES = {
  JAB_5A: {
    id: 'jab_5a',
    name: 'Standing Light Jab (5A)',
    startupFrames: 5,
    activeFrames: 3,
    recoveryFrames: 8,
    damage: 40,
    chipDamage: 0,
    hitstunFrames: 14,
    blockstunFrames: 9,
    pushbackForce: 180,
    hitLevel: 'mid', // 'high' | 'mid' | 'low' | 'overhead'
    hitbox: {
      offsetX: 60,
      offsetY: -160,
      width: 65,
      height: 35
    }
  },
  HIGH_KICK_5C: {
    id: 'high_kick_5c',
    name: 'Fierce High Kick (5C)',
    startupFrames: 11,
    activeFrames: 4,
    recoveryFrames: 16,
    damage: 115,
    chipDamage: 10,
    hitstunFrames: 22,
    blockstunFrames: 14,
    pushbackForce: 360,
    hitLevel: 'high',
    hitbox: {
      offsetX: 80,
      offsetY: -190,
      width: 85,
      height: 50
    }
  },
  CROUCH_SWEEP_2D: {
    id: 'crouch_sweep_2d',
    name: 'Crouching Sweep (2D)',
    startupFrames: 8,
    activeFrames: 4,
    recoveryFrames: 18,
    damage: 85,
    chipDamage: 5,
    hitstunFrames: 26,
    blockstunFrames: 12,
    pushbackForce: 280,
    hitLevel: 'low',
    hitbox: {
      offsetX: 70,
      offsetY: -35,
      width: 95,
      height: 35
    }
  },
  STRANGE_ELDRITCH_5A: {
    id: 'strange_eldritch_5a',
    name: 'Eldritch Strike (5A)',
    startupFrames: 6,
    activeFrames: 3,
    recoveryFrames: 7,
    damage: 45,
    chipDamage: 0,
    hitstunFrames: 15,
    blockstunFrames: 9,
    pushbackForce: 160,
    hitLevel: 'mid',
    hitbox: { offsetX: 60, offsetY: -150, width: 65, height: 35 }
  },
  STRANGE_ASTRAL_5B: {
    id: 'strange_astral_5b',
    name: 'Astral Impact (5B)',
    startupFrames: 8,
    activeFrames: 4,
    recoveryFrames: 11,
    damage: 80,
    chipDamage: 8,
    hitstunFrames: 18,
    blockstunFrames: 10,
    pushbackForce: 230,
    hitLevel: 'mid',
    hitbox: { offsetX: 75, offsetY: -160, width: 80, height: 45 }
  },
  STRANGE_FLAMES_5C: {
    id: 'strange_flames_5c',
    name: 'Flames of the Faltine (5C)',
    startupFrames: 12,
    activeFrames: 6,
    recoveryFrames: 18,
    damage: 125,
    chipDamage: 15,
    hitstunFrames: 24,
    blockstunFrames: 14,
    pushbackForce: 360,
    hitLevel: 'mid',
    hitbox: { offsetX: 95, offsetY: -170, width: 110, height: 60 }
  },
  STRANGE_CRIMSON_BANDS: {
    id: 'strange_crimson_bands',
    name: 'Crimson Bands of Cyttorak (Special Projectile)',
    startupFrames: 11,
    activeFrames: 8,
    recoveryFrames: 19,
    damage: 155,
    chipDamage: 25,
    hitstunFrames: 28,
    blockstunFrames: 16,
    pushbackForce: 450,
    hitLevel: 'mid',
    hitbox: { offsetX: 120, offsetY: -160, width: 130, height: 70 }
  },
  STRANGE_MIRROR_SUPER: {
    id: 'strange_mirror_super',
    name: 'Mirror Dimension Shatter (Super)',
    startupFrames: 10,
    activeFrames: 12,
    recoveryFrames: 22,
    damage: 245,
    chipDamage: 40,
    hitstunFrames: 34,
    blockstunFrames: 18,
    pushbackForce: 650,
    hitLevel: 'mid',
    hitbox: { offsetX: 130, offsetY: -170, width: 150, height: 90 }
  }
};

export class CombatSystem {
  constructor() {
    this.hitEvents = []; // Collects hit spark / audio triggers for current frame
  }

  /**
   * Initializes a fighter entity with combat state variables.
   * @param {Object} fighter
   */
  initFighterCombat(fighter) {
    fighter.state = FighterStates.IDLE;
    fighter.currentMove = null;
    fighter.attackPhase = AttackPhases.INACTIVE;
    fighter.frameTimer = 0;
    fighter.hasHit = false; // Prevents multi-hitting on same swing
    fighter.stunFrames = 0;
    fighter.hp = fighter.maxHp || 1000;
    fighter.isBlocking = false;
  }

  /**
   * Triggers an attack execution if fighter is ready.
   * @param {Object} fighter
   * @param {Object} move Move specification from SAMPLE_MOVES or Grimoire
   */
  executeAttack(fighter, move) {
    if (fighter.state === FighterStates.HITSTUN || 
        fighter.state === FighterStates.BLOCKSTUN || 
        fighter.state === FighterStates.KNOCKDOWN) {
      return false; // Can't attack during stun
    }

    fighter.state = FighterStates.ATTACKING;
    fighter.currentMove = move;
    fighter.attackPhase = AttackPhases.STARTUP;
    fighter.frameTimer = 0;
    fighter.hasHit = false;
    fighter.canMove = false;
    return true;
  }

  /**
   * Advances the frame data state machine by 1 game tick.
   * @param {Object} fighter
   */
  updateFighterCombat(fighter) {
    // 1. Process Stun Counters
    if (fighter.state === FighterStates.HITSTUN || fighter.state === FighterStates.BLOCKSTUN) {
      fighter.stunFrames--;
      if (fighter.stunFrames <= 0) {
        fighter.state = FighterStates.IDLE;
        fighter.canMove = true;
      }
      return;
    }

    // 2. Process Attack Frame Phases
    if (fighter.state === FighterStates.ATTACKING && fighter.currentMove) {
      const move = fighter.currentMove;
      fighter.frameTimer++;

      const startupEnd = move.startupFrames;
      const activeEnd = startupEnd + move.activeFrames;
      const recoveryEnd = activeEnd + move.recoveryFrames;

      if (fighter.frameTimer <= startupEnd) {
        fighter.attackPhase = AttackPhases.STARTUP;
      } else if (fighter.frameTimer <= activeEnd) {
        fighter.attackPhase = AttackPhases.ACTIVE;
      } else if (fighter.frameTimer <= recoveryEnd) {
        fighter.attackPhase = AttackPhases.RECOVERY;
      } else {
        // Move completed -> return to neutral
        fighter.state = FighterStates.IDLE;
        fighter.attackPhase = AttackPhases.INACTIVE;
        fighter.currentMove = null;
        fighter.frameTimer = 0;
        fighter.hasHit = false;
        fighter.canMove = true;
      }
    }
  }

  /**
   * Resolves attack hitboxes against opponent hurtboxes.
   * @param {Object} attacker
   * @param {Object} defender
   * @param {Object} physicsEngine Reference to apply recoil pushback
   * @returns {Object|null} Hit resolution details or null
   */
  resolveCombatInteraction(attacker, defender, physicsEngine) {
    if (attacker.state !== FighterStates.ATTACKING || 
        attacker.attackPhase !== AttackPhases.ACTIVE || 
        attacker.hasHit) {
      return null;
    }

    // Generate active attack hitbox
    const hitbox = this.getHitbox(attacker);
    if (!hitbox) return null;

    // Generate opponent hurtboxes
    const hurtboxes = this.getHurtboxes(defender);

    // Test AABB intersection against each hurtbox zone
    let hitDetected = false;
    let hitZone = null;

    for (const [zone, hurtbox] of Object.entries(hurtboxes)) {
      if (this.intersectsAABB(hitbox, hurtbox)) {
        hitDetected = true;
        hitZone = zone;
        break;
      }
    }

    if (!hitDetected) return null;

    // Flag attacker so the attack cannot hit twice during active frames
    attacker.hasHit = true;

    // Check block validation:
    // Defender must be holding back away from attacker and not in recovery/attack
    const move = attacker.currentMove;
    const isGuarding = defender.isBlocking && 
                       defender.state !== FighterStates.ATTACKING && 
                       defender.state !== FighterStates.KNOCKDOWN;

    const hitResult = {
      x: hitbox.x + hitbox.width / 2,
      y: hitbox.y + hitbox.height / 2,
      zone: hitZone,
      isBlocked: isGuarding,
      damage: isGuarding ? (move.chipDamage || 0) : move.damage,
      hitstun: isGuarding ? move.blockstunFrames : move.hitstunFrames,
      pushback: move.pushbackForce
    };

    // Apply Damage
    defender.hp = Math.max(0, defender.hp - hitResult.damage);

    // Apply Stun State
    defender.state = isGuarding ? FighterStates.BLOCKSTUN : FighterStates.HITSTUN;
    defender.stunFrames = hitResult.hitstun;
    defender.canMove = false;

    // Cancel any opponent wind-up if clean hit
    if (!isGuarding && defender.currentMove) {
      defender.currentMove = null;
      defender.attackPhase = AttackPhases.INACTIVE;
    }

    // Apply Recoil / Pushback Physics
    if (physicsEngine) {
      physicsEngine.applyPushback(attacker, defender, hitResult.pushback);
    }

    this.hitEvents.push(hitResult);
    return hitResult;
  }

  /**
   * AABB Collision Detection between two bounding boxes.
   */
  intersectsAABB(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.width &&
      rectA.x + rectA.width > rectB.x &&
      rectA.y < rectB.y + rectB.height &&
      rectA.y + rectA.height > rectB.y
    );
  }

  /**
   * Calculates world-space attack Hitbox for the active move.
   * @param {Object} fighter
   * @returns {{x: number, y: number, width: number, height: number}|null}
   */
  getHitbox(fighter) {
    if (!fighter.currentMove || fighter.attackPhase !== AttackPhases.ACTIVE) {
      return null;
    }

    const hb = fighter.currentMove.hitbox;
    const facing = fighter.facingDirection; // 1 = right, -1 = left
    
    const worldX = facing === 1 
      ? fighter.x + hb.offsetX 
      : fighter.x - hb.offsetX - hb.width;

    return {
      x: worldX,
      y: fighter.y + hb.offsetY,
      width: hb.width,
      height: hb.height
    };
  }

  /**
   * Calculates distinct anatomical hurtboxes relative to fighter position and stance.
   * @param {Object} fighter
   * @returns {{head: Object, body: Object, legs: Object}}
   */
  getHurtboxes(fighter) {
    const isCrouching = fighter.isCrouching || false;
    const facing = fighter.facingDirection;

    if (isCrouching) {
      return {
        head: {
          x: fighter.x - 35 + (facing * 10),
          y: fighter.y - 120,
          width: 70,
          height: 40
        },
        body: {
          x: fighter.x - 45,
          y: fighter.y - 80,
          width: 90,
          height: 50
        },
        legs: {
          x: fighter.x - 55,
          y: fighter.y - 30,
          width: 110,
          height: 30
        }
      };
    }

    // Default standing hurtbox zones
    return {
      head: {
        x: fighter.x - 30 + (facing * 8),
        y: fighter.y - 210,
        width: 60,
        height: 45
      },
      body: {
        x: fighter.x - 45,
        y: fighter.y - 165,
        width: 90,
        height: 85
      },
      legs: {
        x: fighter.x - 40,
        y: fighter.y - 80,
        width: 80,
        height: 80
      }
    };
  }

  /**
   * Helper: Renders canvas visual debug overlays (Green Hurtboxes, Red Hitboxes).
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} fighter
   * @param {Object} [camera]
   */
  renderDebug(ctx, fighter, camera) {
    const offsetX = camera ? (camera.x - camera.viewportWidth / 2) : 0;

    // 1. Draw Hurtboxes in GREEN
    const hurtboxes = this.getHurtboxes(fighter);
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22c55e'; // Green
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';

    for (const hb of Object.values(hurtboxes)) {
      const rx = hb.x - offsetX;
      ctx.strokeRect(rx, hb.y, hb.width, hb.height);
      ctx.fillRect(rx, hb.y, hb.width, hb.height);
    }

    // 2. Draw Hitbox in RED (if in ACTIVE phase)
    const activeHitbox = this.getHitbox(fighter);
    if (activeHitbox) {
      ctx.strokeStyle = '#ef4444'; // Red
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      const rx = activeHitbox.x - offsetX;
      ctx.strokeRect(rx, activeHitbox.y, activeHitbox.width, activeHitbox.height);
      ctx.fillRect(rx, activeHitbox.y, activeHitbox.width, activeHitbox.height);
    }

    // 3. Status text
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fef08a';
    const textX = fighter.x - offsetX - 40;
    ctx.fillText(`${fighter.state} (${fighter.attackPhase})`, textX, fighter.y - 225);
    ctx.restore();
  }
}
