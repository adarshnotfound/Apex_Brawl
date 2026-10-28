// ==============================================================================
// Apex Brawl: High-Performance Fighting Game AI Engine
// Features: Multi-Tier Difficulty, Dynamic Behavior Trees, Character Archetypes,
// Whiff Punishes, Hit Confirms, Anti-Air Reactions & Corner Pressure
// ==============================================================================

class FightingAI {
  constructor() {
    this.reset();
  }

  reset() {
    this.currentAction = 'NEUTRAL';
    this.actionTimer = 0;
    this.actionDuration = 0;

    // Reaction and perception timers
    this.reactionBuffer = [];
    this.nextDecisionTime = 0;

    // Offensive Combo chaining state
    this.comboStep = 0;
    this.comboTimer = 0;

    // Defense state
    this.isReactingToAttack = false;
    this.blockEndTime = 0;

    // Movement & spacing state
    this.targetDistance = 140;
    this.shimmyDir = 1;
    this.shimmyTimer = 0;
  }

  // Difficulty parameters
  getDifficultyProfile(difficulty = 'MEDIUM') {
    const diff = (difficulty || 'MEDIUM').toUpperCase();
    switch (diff) {
      case 'EASY':
        return {
          reactionDelayMs: 380,   // Slower reaction to player moves
          blockRate: 0.28,        // Blocks 28% of incoming attacks
          crouchBlockRate: 0.25,
          antiAirRate: 0.22,      // Infrequent anti-air
          whiffPunishRate: 0.25,
          comboConfirmRate: 0.30, // Occasionally links Light -> Medium
          specialFrequency: 0.02,
          superFrequency: 0.015,
          jumpFrequency: 0.01,
          dashFrequency: 0.015,
          spacingVariance: 80
        };

      case 'HARD':
        return {
          reactionDelayMs: 90,    // Fast human-tier reaction
          blockRate: 0.88,        // Blocks 88% of incoming attacks
          crouchBlockRate: 0.85,
          antiAirRate: 0.86,      // Consistently anti-airs jump-ins
          whiffPunishRate: 0.85,
          comboConfirmRate: 0.88, // Confirms 3-hit combos into specials
          specialFrequency: 0.065,
          superFrequency: 0.05,
          jumpFrequency: 0.02,
          dashFrequency: 0.05,
          spacingVariance: 25
        };

      case 'INSANE':
      case 'GRANDMASTER':
        return {
          reactionDelayMs: 35,    // Frame-perfect boss reactions
          blockRate: 0.96,
          crouchBlockRate: 0.94,
          antiAirRate: 0.95,
          whiffPunishRate: 0.95,
          comboConfirmRate: 0.98,
          specialFrequency: 0.09,
          superFrequency: 0.08,
          jumpFrequency: 0.025,
          dashFrequency: 0.07,
          spacingVariance: 10
        };

      case 'MEDIUM':
      default:
        return {
          reactionDelayMs: 180,   // Standard fighting game CPU
          blockRate: 0.65,        // Blocks 65% of incoming attacks
          crouchBlockRate: 0.60,
          antiAirRate: 0.62,
          whiffPunishRate: 0.60,
          comboConfirmRate: 0.65,
          specialFrequency: 0.045,
          superFrequency: 0.035,
          jumpFrequency: 0.015,
          dashFrequency: 0.03,
          spacingVariance: 45
        };
    }
  }

  // Update AI every frame and generate deterministic input commands
  update(time, delta, p1, p2, difficulty = 'MEDIUM') {
    const input = {
      up: false,
      upJustDown: false,
      down: false,
      left: false,
      right: false,
      isHoldingForward: false,
      lightJustDown: false,
      mediumJustDown: false,
      heavyJustDown: false,
      specialJustDown: false,
      superJustDown: false,
      dashJustDown: false,
      tauntJustDown: false
    };

    if (!p1 || !p2 || !p1.sprite || !p2.sprite) return input;
    if (p2.hp <= 0 || p2.isStunned) return input;

    const profile = this.getDifficultyProfile(difficulty);
    const p1X = p1.sprite.x;
    const p2X = p2.sprite.x;
    const distToP1 = p1X - p2X;
    const absDist = Math.abs(distToP1);
    const p2Facing = p2.getFacingDir(); // 1 = facing right, -1 = facing left
    const isFacingP1 = (distToP1 > 0 && p2Facing === 1) || (distToP1 < 0 && p2Facing === -1);

    const p1InAir = p1.isInAir || (p1.sprite.body && p1.sprite.body.velocity.y < -30);
    const p2InAir = p2.isInAir || (p2.sprite.body && p2.sprite.body.velocity.y < -30);
    const p1Attacking = p1.isAttacking && p1.currentAttackData;

    // Buffer incoming player attacks with difficulty-based latency
    if (p1Attacking && absDist < 300) {
      if (!this.incomingAttackHandled) {
        this.incomingAttackHandled = true;
        this.reactionBuffer.push({
          detectTime: time + profile.reactionDelayMs,
          isLow: p1.isCrouching || (p1.currentAction && p1.currentAction.includes('LOW')),
          isJumpIn: p1InAir,
          isSpecial: p1.currentAttackData.isSpecial
        });
      }
    } else {
      this.incomingAttackHandled = false;
    }

    // Process buffered reactions
    while (this.reactionBuffer.length > 0 && this.reactionBuffer[0].detectTime <= time) {
      const reaction = this.reactionBuffer.shift();
      if (Math.random() < profile.blockRate) {
        this.isReactingToAttack = true;
        this.blockEndTime = time + 400; // Hold block for duration of incoming attack
        this.shouldCrouchBlock = (Math.random() < profile.crouchBlockRate) && reaction.isLow;

        // Anti-air check if player jumped in
        if (reaction.isJumpIn && Math.random() < profile.antiAirRate && !p2InAir) {
          this.isReactingToAttack = false; // Turn block into anti-air punish!
          input.heavyJustDown = true;     // Heavy anti-air strike
          input.isHoldingForward = false;
          return input;
        }
      }
    }

    // --- 1. DEFENSE: BLOCK INCOMING ATTACK ---
    if (this.isReactingToAttack && time < this.blockEndTime && !p2InAir) {
      // Walk away from player to initiate fighting block
      if (distToP1 > 0) {
        input.left = true;  // Player is to the right -> hold back (left)
      } else {
        input.right = true; // Player is to the left -> hold back (right)
      }
      if (this.shouldCrouchBlock) {
        input.down = true; // Crouch block low attacks
      }
      return input;
    } else {
      this.isReactingToAttack = false;
    }

    // --- 2. OFFENSIVE COMBO CHAINING ---
    // If CPU recently connected a strike, confirm into the next hit of the combo string!
    if (this.comboStep > 0 && time < this.comboTimer) {
      if (this.comboStep === 1) {
        input.mediumJustDown = true;
        this.comboStep = (Math.random() < profile.comboConfirmRate) ? 2 : 0;
        this.comboTimer = time + 180;
        return input;
      } else if (this.comboStep === 2) {
        if (Math.random() < profile.superFrequency && (p2.hp < 400 || difficulty === 'INSANE')) {
          input.superJustDown = true; // Level 3 Super confirm!
        } else {
          input.specialJustDown = true; // Special move confirm
        }
        this.comboStep = 0;
        return input;
      }
    } else if (time >= this.comboTimer) {
      this.comboStep = 0;
    }

    // --- 3. WHIFF PUNISH ---
    // If player is attacking but out of range, CPU capitalizes on their recovery frames
    if (p1Attacking && absDist > 180 && absDist < 320 && Math.random() < profile.whiffPunishRate) {
      // Dash in or strike with medium/heavy poke
      if (distToP1 > 0) input.right = true;
      else input.left = true;
      input.isHoldingForward = true;

      if (absDist > 240) {
        input.dashJustDown = true;
      } else {
        input.heavyJustDown = true;
      }
      return input;
    }

    // --- 4. TACTICAL DECISION MAKING & MOVEMENT ---
    if (time > this.nextDecisionTime) {
      this.nextDecisionTime = time + 140 + Math.random() * profile.spacingVariance;

      // Character-specific optimal ranges
      if (p2.charId === 'strange' || p2.charId === 'mewtwo') {
        this.optimalDistance = (Math.random() < 0.6) ? 320 : 130; // Zoners enjoy mid-to-far range
      } else if (p2.charId === 'harpy') {
        this.optimalDistance = 120; // Aggressive rushdown
      } else {
        this.optimalDistance = 140; // Chun-Li / Steve brawlers
      }

      // Shimmy behavior (subtle back-and-forth footsies in neutral)
      if (absDist > 150 && absDist < 300) {
        this.shimmyDir = Math.random() < 0.45 ? -1 : 1;
      } else {
        this.shimmyDir = distToP1 > 0 ? 1 : -1;
      }
    }

    // --- 5. EXECUTE COMBAT ACTIONS BY RANGE ---

    // A. CLOSE RANGE (dist < 155px)
    if (absDist < 155) {
      if (!p2.isAttacking) {
        const roll = Math.random();

        // 1. Super attack (if available / low health)
        if (roll < profile.superFrequency && p2.hp < 450) {
          input.superJustDown = true;
          return input;
        }

        // 2. Light Attack Starter -> Begin combo confirm chain
        if (roll < 0.35) {
          input.lightJustDown = true;
          this.comboStep = 1;
          this.comboTimer = time + 200;
          return input;
        }

        // 3. Medium Strike
        if (roll < 0.55) {
          input.mediumJustDown = true;
          return input;
        }

        // 4. Special Strike (e.g. Harpy Talon / Chun-Li Lightning Legs)
        if (roll < 0.70) {
          input.specialJustDown = true;
          return input;
        }

        // 5. Throw / Crouch mixup
        if (roll < 0.85) {
          input.down = true;
          input.lightJustDown = true;
          return input;
        }

        // 6. Backdash to create spacing
        if (roll < 0.95 && Math.random() < profile.dashFrequency) {
          if (distToP1 > 0) input.left = true;
          else input.right = true;
          input.dashJustDown = true;
          return input;
        }
      }
    }

    // B. MID RANGE (155px <= dist <= 340px - Footsies & Poking)
    else if (absDist <= 340) {
      const roll = Math.random();

      // Jump-in Attack
      if (roll < profile.jumpFrequency && !p2InAir && !p1InAir) {
        input.up = true;
        input.upJustDown = true;
        if (distToP1 > 0) input.right = true;
        else input.left = true;
        return input;
      }

      // Air-to-Air / Dive Attack while in air
      if (p2InAir) {
        if (roll < 0.45) input.mediumJustDown = true;
        else input.heavyJustDown = true;
        return input;
      }

      // Special Zoning / Fireball Poke
      if (roll < profile.specialFrequency) {
        input.specialJustDown = true;
        return input;
      }

      // Heavy Long-Range Poke (5C)
      if (roll < 0.15) {
        input.heavyJustDown = true;
        return input;
      }

      // Dash Forward to close distance
      if (roll < profile.dashFrequency) {
        if (distToP1 > 0) input.right = true;
        else input.left = true;
        input.dashJustDown = true;
        input.isHoldingForward = true;
        return input;
      }

      // Footsies Footwork: Walk towards or shimmy
      if (absDist > this.optimalDistance) {
        if (distToP1 > 0) input.right = true;
        else input.left = true;
        input.isHoldingForward = true;
      } else {
        if (distToP1 > 0) input.left = (this.shimmyDir < 0);
        else input.right = (this.shimmyDir < 0);
      }
    }

    // C. LONG RANGE (dist > 340px - Neutral & Projectile Zoning)
    else {
      const roll = Math.random();

      // Character-specific projectile barrage
      if ((p2.charId === 'strange' || p2.charId === 'chunli' || p2.charId === 'mewtwo') && roll < profile.specialFrequency * 1.5) {
        input.specialJustDown = true;
        return input;
      }

      // Jump Approach
      if (roll < profile.jumpFrequency * 1.5 && !p2InAir) {
        input.up = true;
        input.upJustDown = true;
        if (distToP1 > 0) input.right = true;
        else input.left = true;
        return input;
      }

      // Forward Dash to enter battle zone
      if (roll < profile.dashFrequency * 2) {
        if (distToP1 > 0) input.right = true;
        else input.left = true;
        input.dashJustDown = true;
        input.isHoldingForward = true;
        return input;
      }

      // Default: Walk toward opponent
      if (distToP1 > 0) input.right = true;
      else input.left = true;
      input.isHoldingForward = true;
    }

    return input;
  }
}

// Global Singleton instance for client & arena consumption
window.fightingAI = new FightingAI();
