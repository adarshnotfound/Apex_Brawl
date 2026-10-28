// Apex Brawl - Combat Arena Scene
// Deterministic 2-Player Combat, Real-Time Damage System, Doctor Strange Mirror Dimension Stage

class FighterEntity {
  constructor(scene, x, y, charId, playerNum, isMirror = false) {
    this.scene = scene;
    this.charId = charId;
    this.playerNum = playerNum;
    this.isMirror = isMirror;

    this.isAttacking = false;
    this.isKnockedBack = false;
    this.isInAir = false;
    this.hasDealtDamage = false;
    this.currentAttackData = null;
    this.currentAction = 'IDLE';
    this.attackTimer = null;
    this.kikokenFired = false;
    this.isCrouching = false;

    this.hp = charId === 'strange' ? 960 : (charId === 'chunli' ? 950 : 920);
    this.maxHp = this.hp;

    // Movement speeds & Jump velocity (polishing Chun-Li to match Harpy's agility)
    this.walkSpeed = charId === 'strange' ? 215 : (charId === 'chunli' ? 260 : 260);
    this.dashSpeed = charId === 'strange' ? 460 : (charId === 'chunli' ? 495 : 490);
    this.jumpVel = charId === 'strange' ? -720 : (charId === 'chunli' ? -760 : -760);

    // Create sprite
    const initialTexture = charId === 'strange' ? 'strange_sheet_idle' : (charId === 'chunli' ? 'chunli_sheet_idle' : 'harpy_sheet_idle');
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    if (charId === 'strange') {
      this.sprite.setScale(0.80);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.body.setSize(180, 360);
      this.sprite.body.setOffset(166, 120);
    } else if (charId === 'chunli') {
      // Scale 0.79 scales Chun-Li's 234px idle sprite to ~185px, perfectly matching Harpy's 185px visual height!
      this.sprite.setScale(0.79);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setDisplayOrigin(128, 128);
      this.sprite.body.setSize(100, 230);
      this.sprite.body.setOffset(78, 22);
    } else {
      this.sprite.setScale(0.25);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.body.setSize(340, 800);
      this.sprite.body.setOffset(370, 240);
    }

    // Initial orientation:
    // P1 (Left side) faces RIGHT towards P2 -> facingDir = 1
    // P2 (Right side) faces LEFT towards P1 -> facingDir = -1
    this.setFacingDir(playerNum === 1 ? 1 : -1);
    if (playerNum !== 1 && isMirror) {
      this.sprite.setTint(0xc4b5fd);
    }

    if (charId === 'strange') {
      this.sprite.play('strange_anim_idle');
    } else if (charId === 'chunli') {
      this.sprite.play('chunli_anim_idle');
    } else {
      this.sprite.play('harpy_anim_idle');
    }

    // Animation frame update & completion listeners
    this.sprite.on('animationupdate', (anim, frame) => {
      this.onAnimationUpdate(anim ? anim.key : null, frame);
    });
    this.sprite.on('animationcomplete', (anim) => {
      this.onAnimationComplete(anim ? anim.key : null);
    });
  }

  getFacingDir() {
    // Chun-Li's 3D sprites are authored facing RIGHT by default (flipX = false).
    // Harpy & Strange are authored facing LEFT by default (flipX = false).
    if (this.charId === 'chunli') {
      return this.sprite.flipX ? -1 : 1;
    }
    return this.sprite.flipX ? 1 : -1;
  }

  setFacingDir(dir) {
    // dir: 1 = facing RIGHT, -1 = facing LEFT
    if (this.charId === 'chunli') {
      this.sprite.setFlipX(dir === -1);
    } else {
      this.sprite.setFlipX(dir === 1);
    }
  }

  onAnimationUpdate(key, frame) {
    if (key === 'chunli_anim_sp_kikoken' && !this.kikokenFired) {
      // User requirement: Kikoken projectile should be fired after 11th frame of kikoken animation
      // (1-based frame.index >= 12, or 0-based frame.textureFrame >= 11)
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 12 || textureFrameIdx >= 11) {
        this.kikokenFired = true;
        if (this.scene && this.scene.spawnKikokenProjectile) {
          this.scene.spawnKikokenProjectile(this);
        }
      }
    }
  }

  onAnimationComplete(key) {
    if (key === 'chunli_anim_sp_kikoken' && !this.kikokenFired) {
      this.kikokenFired = true;
      if (this.scene && this.scene.spawnKikokenProjectile) {
        this.scene.spawnKikokenProjectile(this);
      }
    }

    if (key.startsWith('harpy_anim_atk_') || 
        key.startsWith('harpy_anim_sp_') || 
        key === 'harpy_anim_taunt' || 
        key === 'harpy_anim_dash' || 
        key === 'harpy_anim_backdash' ||
        key.startsWith('strange_anim_atk_') || 
        key.startsWith('strange_anim_sp_') || 
        key === 'strange_anim_super' || 
        key === 'strange_anim_dash' ||
        key.startsWith('chunli_anim_atk_') ||
        key.startsWith('chunli_anim_sp_') ||
        key === 'chunli_anim_super' ||
        key === 'chunli_anim_dash') {
      this.isAttacking = false;
      this.currentAttackData = null;
      if (this.attackTimer) {
        this.attackTimer.remove();
        this.attackTimer = null;
      }
      if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      }
      this.updateTextureForState();
    } else if (key === 'harpy_anim_knockback' || key === 'strange_anim_knockback' || key === 'chunli_anim_knockback') {
      this.isKnockedBack = false;
      if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      }
      this.updateTextureForState();
    }
  }

  updateTextureForState() {
    if (this.charId === 'strange') {
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.setTexture('strange_sheet_jump');
        this.sprite.play('strange_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setTexture('strange_sheet_jump');
        this.sprite.play('strange_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.play('strange_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setTexture('strange_sheet_idle');
          this.sprite.play('strange_anim_idle', true);
        }
      }
      return;
    }

    if (this.charId === 'chunli') {
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.setTexture('chunli_sheet_hit');
        this.sprite.setDisplayOrigin(150, 169);
        this.sprite.body.setSize(100, 210);
        this.sprite.body.setOffset(100, 82);
        this.sprite.play('chunli_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.sprite.setOrigin(0.5, 0.5);
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setTexture('chunli_sheet_jump');
        this.sprite.play('chunli_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.play('chunli_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setTexture('chunli_sheet_idle');
          this.sprite.play('chunli_anim_idle', true);
        }
      }
      return;
    }

    if (this.isKnockedBack) {
      this.currentAction = 'KNOCKBACK / LAUNCH';
      this.sprite.setTexture('harpy_sheet_8c');
      this.sprite.play('harpy_anim_knockback', true);
      return;
    }

    if (this.isInAir) {
      this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
      this.sprite.setTexture('harpy_sheet_jump');
      this.sprite.play('harpy_anim_jump', true);
    } else {
      if (this.isCrouching) {
        this.currentAction = 'CROUCH';
        this.sprite.play('harpy_anim_crouch_hold', true);
      } else {
        this.currentAction = 'IDLE';
        this.sprite.setTexture('harpy_sheet_idle');
        this.sprite.play('harpy_anim_idle', true);
      }
    }
  }

  reset(x, y) {
    this.hp = this.maxHp;
    this.isAttacking = false;
    this.isKnockedBack = false;
    this.isInAir = false;
    this.hasDealtDamage = false;
    this.currentAttackData = null;
    this.currentAction = 'IDLE';
    this.isCrouching = false;
    if (this.sprite && this.sprite.chain) this.sprite.chain();
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }

    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
      this.sprite.body.setAllowGravity(true);
    }

    // Initial facing: P1 faces right (1), P2 faces left (-1)
    this.setFacingDir(this.playerNum === 1 ? 1 : -1);
    if (this.playerNum === 1) {
      this.sprite.clearTint();
    } else {
      if (this.isMirror) {
        this.sprite.setTint(0xc4b5fd);
      } else {
        this.sprite.clearTint();
      }
    }

    if (this.charId === 'strange') {
      this.sprite.setTexture('strange_sheet_idle');
      this.sprite.play('strange_anim_idle', true);
    } else if (this.charId === 'chunli') {
      this.sprite.setDisplayOrigin(128, 128);
      this.sprite.body.setSize(100, 230);
      this.sprite.body.setOffset(78, 22);
      this.sprite.setTexture('chunli_sheet_idle');
      this.sprite.play('chunli_anim_idle', true);
    } else {
      this.sprite.setTexture('harpy_sheet_idle');
      this.sprite.play('harpy_anim_idle', true);
    }
  }

  triggerAttack(actionKey, animKey, attackData, duration = 480) {
    if (this.isKnockedBack || this.hp <= 0 || (this.scene && this.scene.roundState !== 'FIGHTING')) return;
    this.isAttacking = true;
    this.isCrouching = false;
    if (this.sprite && this.sprite.chain) this.sprite.chain();
    this.hasDealtDamage = false;
    this.currentAttackData = attackData;
    this.currentAction = actionKey;
    this.kikokenFired = false;

    // Ground attacks stop horizontal movement
    if (!this.isInAir) {
      this.sprite.setVelocityX(0);
    }

    if (this.charId === 'chunli') {
      this.sprite.setDisplayOrigin(128, 128);
      this.sprite.body.setSize(100, 230);
      this.sprite.body.setOffset(78, 22);

      // Spinning Bird Kick: stay locked in one stationary position throughout the move
      if (animKey === 'chunli_anim_atk_5c' || animKey === 'chunli_anim_atk_8c' || animKey === 'chunli_anim_sp_spinning_bird') {
        this.sprite.setVelocity(0, 0);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(false);
          this.sprite.body.velocity.x = 0;
          this.sprite.body.velocity.y = 0;
        }
      }
    }

    this.sprite.play(animKey, true);

    // Guaranteed recovery failsafe: after animation duration, always release attack lock!
    if (this.attackTimer) this.attackTimer.remove();
    this.attackTimer = this.scene.time.delayedCall(duration, () => {
      if (this.isAttacking) {
        if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
        this.isAttacking = false;
        this.currentAttackData = null;
        this.updateTextureForState();
      }
    });

    if (window.soundFX) window.soundFX.playSelect();
  }

  takeHit(attackData, attacker) {
    if (this.hp <= 0 || (this.scene && this.scene.roundState !== 'FIGHTING')) return;

    // Apply Damage
    this.hp = Math.max(0, this.hp - attackData.damage);

    // Immediately cancel attacking and crouching state so player is never locked out
    this.isAttacking = false;
    this.isCrouching = false;
    if (this.sprite && this.sprite.chain) this.sprite.chain();
    this.currentAttackData = null;
    if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
      this.sprite.body.setAllowGravity(true);
    }
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }

    // Spawn floating damage text (adjusted for character scale)
    const textY = this.charId === 'strange' ? this.sprite.y - 120 : this.sprite.y - 95;
    this.scene.spawnDamageNumber(this.sprite.x, textY, attackData.damage, attackData.isSpecial);

    // Hit flash
    this.sprite.setTint(0xff2222);
    this.scene.time.delayedCall(160, () => {
      if (this.isMirror) {
        this.sprite.setTint(0xc4b5fd);
      } else {
        this.sprite.clearTint();
      }
    });

    // Knockback direction: away from attacker
    const attackerX = (attacker && attacker.sprite) ? attacker.sprite.x : (this.sprite.x - this.getFacingDir() * 100);
    const pushDir = this.sprite.x >= attackerX ? 1 : -1;

    // REQUIREMENT: Use Sheet8C for Harpy as knockback on special attack!
    if (attackData.isSpecial) {
      this.isKnockedBack = true;
      this.isInAir = true;
      this.currentAction = 'KNOCKBACK / LAUNCH';

      this.sprite.setVelocityX(pushDir * (attackData.knockbackX || 560));
      this.sprite.setVelocityY(attackData.knockbackY || -480);

      if (this.charId === 'strange') {
        this.sprite.setTexture('strange_sheet_jump');
        this.sprite.play('strange_anim_knockback', true);
      } else if (this.charId === 'chunli') {
        this.sprite.setTexture('chunli_sheet_hit');
        this.sprite.setDisplayOrigin(150, 169);
        this.sprite.body.setSize(100, 210);
        this.sprite.body.setOffset(100, 82);
        this.sprite.play('chunli_anim_knockback', true);
      } else if (this.charId === 'harpy') {
        this.sprite.setTexture('harpy_sheet_8c');
        this.sprite.play('harpy_anim_knockback', true);
      }
    } else {
      // Standard attack flinch pushback
      this.sprite.setVelocityX(pushDir * (attackData.knockbackX || 240));
      if (attackData.knockbackY && attackData.knockbackY < 0) {
        this.sprite.setVelocityY(attackData.knockbackY);
        this.isInAir = true;
      }
      this.updateTextureForState();
    }
  }

  handleControls(input) {
    if (!this.sprite || !this.sprite.body) return;
    if (this.hp <= 0 || (this.scene && this.scene.roundState !== 'FIGHTING')) {
      if (this.hp <= 0) {
        this.currentAction = 'DEFEATED (K.O.)';
      } else {
        this.currentAction = 'READY';
      }
      this.sprite.setVelocityX(0);
      return;
    }

    // Ground Check: physical contact or world bottom
    const onGround = Boolean(
      this.isCrouching ||
      this.sprite.body.blocked.down || 
      this.sprite.body.touching.down || 
      this.sprite.body.bottom >= 573
    );

    // Landing detection
    if (onGround && (this.isInAir || this.isKnockedBack)) {
      if (this.isAttacking) {
        // Do not abort active attack animation upon ground contact
        this.isInAir = false;
        this.isKnockedBack = false;
      } else {
        this.isInAir = false;
        this.isKnockedBack = false;
        this.isAttacking = false;
        this.currentAttackData = null;
        if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
        this.updateTextureForState();
      }
    } else if (!onGround) {
      this.isInAir = true;
    }

    // If knocked back through the air, allow momentum to play out
    if (this.isKnockedBack) return;

    // Prevent attack inputs from interrupting or restarting an ongoing attack animation
    if (this.isAttacking) {
      // Keep Spinning Bird Kick locked stationary in one position throughout the entire move
      if (this.charId === 'chunli' && (
          this.currentAction.includes('SPINNING BIRD') ||
          this.sprite.anims.currentAnim?.key === 'chunli_anim_atk_5c' ||
          this.sprite.anims.currentAnim?.key === 'chunli_anim_atk_8c' ||
          this.sprite.anims.currentAnim?.key === 'chunli_anim_sp_spinning_bird')) {
        this.sprite.setVelocity(0, 0);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(false);
          this.sprite.body.velocity.x = 0;
          this.sprite.body.velocity.y = 0;
        }
      }
      return;
    }

    // 1. Attacks (Ground & Air)
    if (input.lightJustDown) {
      if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('LEVITATION STRIKE (8A)', 'strange_anim_atk_8a', {
            damage: 50,
            rangeX: 165,
            rangeY: 100,
            knockbackX: 190,
            knockbackY: 60,
            isSpecial: false
          });
        } else {
          this.triggerAttack('ELDRITCH STRIKE (5A)', 'strange_anim_atk_5a', {
            damage: 45,
            rangeX: 160,
            rangeY: 80,
            knockbackX: 180,
            knockbackY: 0,
            isSpecial: false
          });
        }
      } else if (this.charId === 'chunli') {
        if (this.isInAir) {
          this.triggerAttack('AIR TENSHOKYAKU (8A)', 'chunli_anim_atk_8a', {
            damage: 48,
            rangeX: 160,
            rangeY: 90,
            knockbackX: 180,
            knockbackY: 50,
            isSpecial: false
          }, 450);
        } else {
          this.triggerAttack('BASIC STRIKE (5A)', 'chunli_anim_atk_5a', {
            damage: 42,
            rangeX: 165,
            rangeY: 80,
            knockbackX: 170,
            knockbackY: 0,
            isSpecial: false
          }, 460);
        }
      } else {
        if (this.isInAir) {
          this.triggerAttack('AIR TALON (8A)', 'harpy_anim_atk_8a', {
            damage: 45,
            rangeX: 160,
            rangeY: 100,
            knockbackX: 200,
            knockbackY: 80,
            isSpecial: false
          });
        } else {
          this.triggerAttack('TALON JAB (5A)', 'harpy_anim_atk_5a', {
            damage: 40,
            rangeX: 150,
            rangeY: 80,
            knockbackX: 180,
            knockbackY: 0,
            isSpecial: false
          });
        }
      }
      return;
    }

    if (input.mediumJustDown) {
      if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('ASTRAL CLEAVE (8B)', 'strange_anim_atk_8a', {
            damage: 85,
            rangeX: 175,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 90,
            isSpecial: false
          });
        } else if (input.isHoldingForward) {
          this.triggerAttack('MYSTIC THRUST (6B)', 'strange_anim_atk_6b', {
            damage: 95,
            rangeX: 200,
            rangeY: 90,
            knockbackX: 270,
            knockbackY: -50,
            isSpecial: false
          });
        } else {
          this.triggerAttack('ASTRAL PUNCH (5B)', 'strange_anim_atk_5b', {
            damage: 80,
            rangeX: 175,
            rangeY: 90,
            knockbackX: 240,
            knockbackY: -30,
            isSpecial: false
          });
        }
      } else if (this.charId === 'chunli') {
        if (this.isInAir) {
          this.triggerAttack('AIR LIGHTNING KICK (8B)', 'chunli_anim_atk_8a', {
            damage: 85,
            rangeX: 180,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 80,
            isSpecial: false
          }, 500);
        } else {
          this.triggerAttack('HYAKURETSUKYAKU (5B)', 'chunli_anim_atk_5b', {
            damage: 85,
            rangeX: 185,
            rangeY: 90,
            knockbackX: 230,
            knockbackY: -30,
            isSpecial: false
          }, 620);
          if (this.scene && this.scene.spawnLightningLegsVFX) {
            this.scene.spawnLightningLegsVFX(this);
          }
        }
      } else {
        if (this.isInAir) {
          this.triggerAttack('AIR CLEAVE (8C)', 'harpy_anim_atk_8c', {
            damage: 90,
            rangeX: 180,
            rangeY: 110,
            knockbackX: 260,
            knockbackY: 120,
            isSpecial: false
          });
        } else if (input.isHoldingForward) {
          this.triggerAttack('WING BLADE (6B)', 'harpy_anim_atk_6b', {
            damage: 85,
            rangeX: 175,
            rangeY: 90,
            knockbackX: 240,
            knockbackY: -50,
            isSpecial: false
          });
        } else {
          this.triggerAttack('WING FLURRY (5B)', 'harpy_anim_atk_5b', {
            damage: 75,
            rangeX: 160,
            rangeY: 90,
            knockbackX: 220,
            knockbackY: -40,
            isSpecial: false
          });
        }
      }
      return;
    }

    if (input.heavyJustDown) {
      if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('VAPORS OF VALTORR (8C)', 'strange_anim_atk_8c', {
            damage: 105,
            rangeX: 215,
            rangeY: 120,
            knockbackX: 300,
            knockbackY: 140,
            isSpecial: false
          });
        } else {
          this.triggerAttack('FLAMES OF FALTINE (5C)', 'strange_anim_atk_5c', {
            damage: 125,
            rangeX: 240,
            rangeY: 110,
            knockbackX: 360,
            knockbackY: -130,
            isSpecial: false
          });
        }
      } else if (this.charId === 'chunli') {
        if (this.isInAir) {
          this.triggerAttack('AIR SPINNING BIRD KICK (8C)', 'chunli_anim_atk_8c', {
            damage: 110,
            rangeX: 200,
            rangeY: 110,
            knockbackX: 290,
            knockbackY: 130,
            isSpecial: false
          }, 550);
          if (this.scene && this.scene.spawnSpinningBirdVFX) {
            this.scene.spawnSpinningBirdVFX(this);
          }
        } else {
          this.triggerAttack('SPINNING BIRD KICK (5C)', 'chunli_anim_atk_5c', {
            damage: 125,
            rangeX: 220,
            rangeY: 100,
            knockbackX: 350,
            knockbackY: -120,
            isSpecial: false
          }, 650);
          if (this.scene && this.scene.spawnSpinningBirdVFX) {
            this.scene.spawnSpinningBirdVFX(this);
          }
        }
      } else {
        if (this.isInAir) {
          this.triggerAttack('AIR DIVE (8D)', 'harpy_anim_atk_8d', {
            damage: 110,
            rangeX: 190,
            rangeY: 120,
            knockbackX: 320,
            knockbackY: 160,
            isSpecial: false
          });
        } else {
          this.triggerAttack('GALE STRIKE (5C)', 'harpy_anim_atk_5c', {
            damage: 120,
            rangeX: 180,
            rangeY: 100,
            knockbackX: 340,
            knockbackY: -120,
            isSpecial: false
          });
        }
      }
      return;
    }

    // Special Attack
    if (input.specialJustDown) {
      if (this.charId === 'strange') {
        if (input.up) {
          this.triggerAttack('SHIELD OF SERAPHIM (AA)', 'strange_anim_sp_projectile', {
            damage: 165,
            rangeX: 220,
            rangeY: 170,
            knockbackX: 240,
            knockbackY: -520,
            isSpecial: true
          });
        } else {
          this.triggerAttack('CRIMSON BANDS (PROJECTILE)', 'strange_anim_sp_projectile', {
            damage: 155,
            rangeX: 140,
            rangeY: 100,
            knockbackX: 450,
            knockbackY: -280,
            isSpecial: true
          });
          // Summon real traveling mystic projectile!
          if (this.scene && this.scene.spawnMysticProjectile) {
            this.scene.spawnMysticProjectile(this);
          }
        }
      } else if (this.charId === 'chunli') {
        // Special Attack (R / U / NUM4 / 4) ALWAYS triggers Kikoken even when moving
        // Duration 1200ms gives plenty of time for 16-frame 16 FPS (1000ms) animation to finish
        // so that the projectile is fired strictly on animationcomplete!
        this.triggerAttack('KIKOKEN (PROJECTILE)', 'chunli_anim_sp_kikoken', {
          damage: 150,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 460,
          knockbackY: -270,
          isSpecial: true
        }, 1200);
      } else {
        if (input.up) {
          this.triggerAttack('SKY DRAGON DP (262C)', 'harpy_anim_sp_262c', {
            damage: 160,
            rangeX: 230,
            rangeY: 160,
            knockbackX: 580,
            knockbackY: -500,
            isSpecial: true
          });
        } else {
          this.triggerAttack('TEMPEST CYCLONE (235B)', 'harpy_anim_sp_235b', {
            damage: 150,
            rangeX: 220,
            rangeY: 140,
            knockbackX: 550,
            knockbackY: -460,
            isSpecial: true
          });
        }
      }
      return;
    }

    // Super Move -> Massive Knockback!
    if (input.superJustDown) {
      if (this.charId === 'strange') {
        this.triggerAttack('MIRROR DIMENSION SHATTER (SUPER)', 'strange_anim_super', {
          damage: 245,
          rangeX: 300,
          rangeY: 190,
          knockbackX: 700,
          knockbackY: -550,
          isSpecial: true
        });
      } else if (this.charId === 'chunli') {
        this.triggerAttack('HOYOKU-SEN (SUPER)', 'chunli_anim_super', {
          damage: 250,
          rangeX: 300,
          rangeY: 190,
          knockbackX: 680,
          knockbackY: -540,
          isSpecial: true
        }, 2200);
        if (this.scene && this.scene.spawnHoyokuSenVFX) {
          this.scene.spawnHoyokuSenVFX(this);
        }
      } else {
        this.triggerAttack('FEATHER STORM (SUPER)', 'harpy_anim_super', {
          damage: 240,
          rangeX: 290,
          rangeY: 180,
          knockbackX: 680,
          knockbackY: -540,
          isSpecial: true
        });
      }
      return;
    }

    if (input.tauntJustDown && onGround) {
      if (this.charId === 'strange') {
        this.triggerAttack('MYSTIC MEDITATION', 'strange_anim_dash', null, 400);
      } else if (this.charId === 'chunli') {
        this.triggerAttack('GREETING BOW', 'chunli_anim_idle', null, 600);
      } else {
        this.triggerAttack('TAUNT', 'harpy_anim_taunt', null, 500);
      }
      return;
    }

    // 2. Dash & Backdash (fluid movement - does not lock attack input)
    if (input.dashJustDown && onGround && !this.isAttacking) {
      if (this.charId === 'strange') {
        this.currentAction = 'ASTRAL DASH';
        this.sprite.play('strange_anim_dash', true);
        this.sprite.setTint(0xfde047);
        this.scene.time.delayedCall(180, () => {
          if (this.isMirror) this.sprite.setTint(0xc4b5fd);
          else this.sprite.clearTint();
        });
      } else if (this.charId === 'chunli') {
        this.currentAction = 'LIGHTNING DASH';
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.play('chunli_anim_dash', true);
        this.sprite.setTint(0x38bdf8);
        this.scene.time.delayedCall(180, () => {
          if (this.isMirror) this.sprite.setTint(0xc4b5fd);
          else this.sprite.clearTint();
        });
      } else {
        this.currentAction = 'FORWARD DASH';
        this.sprite.play('harpy_anim_dash', true);
      }
      this.sprite.setVelocityX(this.getFacingDir() * this.dashSpeed);
      return;
    }

    if (this.isAttacking) return;

    // 3. Jump Input
    if (input.upJustDown || (input.up && onGround)) {
      if (onGround) {
        this.isCrouching = false;
        if (this.sprite && this.sprite.chain) this.sprite.chain();
        this.sprite.setVelocityY(this.jumpVel);
        this.isInAir = true;
        this.currentAction = 'JUMP / ASCENT';
        if (this.charId === 'strange') {
          this.sprite.setTexture('strange_sheet_jump');
          this.sprite.play('strange_anim_jump', true);
        } else if (this.charId === 'chunli') {
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.setTexture('chunli_sheet_jump');
          this.sprite.play('chunli_anim_jump');
        } else {
          this.sprite.setTexture('harpy_sheet_jump');
          this.sprite.play('harpy_anim_jump', true);
        }
        if (window.soundFX) window.soundFX.playHover();
      }
    }

    // 4. Ground vs Air Movement & Stances
    if (onGround) {
      if (input.down) {
        // --- CROUCHING MODE ---
        // Stays locked in crouching mode as long as the crouch button is held
        this.sprite.setVelocityX(0);
        this.currentAction = 'CROUCH';

        // Update facing direction if pressing left/right while crouched (e.g. down-back block)
        if (input.left) {
          this.setFacingDir(-1);
        } else if (input.right) {
          this.setFacingDir(1);
        }

        if (!this.isCrouching) {
          this.isCrouching = true;
          if (this.charId === 'strange') {
            this.sprite.play('strange_anim_crouch_down').chain('strange_anim_crouch_hold');
          } else if (this.charId === 'chunli') {
            this.sprite.play('chunli_anim_crouch_down').chain('chunli_anim_crouch_hold');
          } else {
            this.sprite.play('harpy_anim_crouch_down').chain('harpy_anim_crouch_hold');
          }
        }
      } else {
        // --- NOT CROUCHING (STANDS UP IMMEDIATELY AS SOON AS CROUCH IS RELEASED) ---
        if (this.isCrouching) {
          this.isCrouching = false;
          if (this.sprite && this.sprite.chain) this.sprite.chain();
          if (this.charId === 'chunli') {
            this.sprite.setTexture('chunli_sheet_idle');
            this.sprite.play('chunli_anim_idle', true);
          }
        }

        if (input.left) {
          this.sprite.setVelocityX(-this.walkSpeed);
          this.setFacingDir(-1); // Faces LEFT
          if (!input.up) {
            this.currentAction = 'WALK LEFT';
            if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_walk', true);
            } else this.sprite.play('harpy_anim_walk', true);
          }
        } else if (input.right) {
          this.sprite.setVelocityX(this.walkSpeed);
          this.setFacingDir(1); // Faces RIGHT
          if (!input.up) {
            this.currentAction = 'WALK RIGHT';
            if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_walk', true);
            } else this.sprite.play('harpy_anim_walk', true);
          }
        } else {
          this.sprite.setVelocityX(0);
          if (!input.up) {
            this.currentAction = 'IDLE';
            if (this.charId === 'strange') this.sprite.play('strange_anim_idle', true);
            else if (this.charId === 'chunli') {
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_idle', true);
            } else this.sprite.play('harpy_anim_idle', true);
          }
        }
      }
    } else {
      // --- AIRBORNE ---
      if (this.isCrouching) {
        this.isCrouching = false;
        if (this.sprite && this.sprite.chain) this.sprite.chain();
        if (this.charId === 'chunli') {
          this.sprite.setOrigin(0.5, 0.5);
        }
      }

      const airFactor = 0.9;
      if (input.left) {
        this.sprite.setVelocityX(-this.walkSpeed * airFactor);
        this.setFacingDir(-1);
      } else if (input.right) {
        this.sprite.setVelocityX(this.walkSpeed * airFactor);
        this.setFacingDir(1);
      }

      this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
      if (this.charId === 'strange' && this.sprite.anims.currentAnim?.key !== 'strange_anim_jump') {
        this.sprite.setTexture('strange_sheet_jump');
        this.sprite.play('strange_anim_jump', true);
      } else if (this.charId === 'chunli' && this.sprite.anims.currentAnim?.key !== 'chunli_anim_jump') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        this.sprite.setTexture('chunli_sheet_jump');
        this.sprite.play('chunli_anim_jump', true);
      } else if (this.charId === 'harpy' && this.sprite.anims.currentAnim?.key !== 'harpy_anim_jump') {
        this.sprite.setTexture('harpy_sheet_jump');
        this.sprite.play('harpy_anim_jump', true);
      }
    }
  }
}

class ArenaScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ArenaScene' });
    this.fighterP1 = null;
    this.fighterP2 = null;
    this.p1Keys = {};
    this.p2Keys = {};
    this.isGameOver = false;

    // Best of 3 and Round Timer State
    this.currentRound = 1;
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.maxRoundsToWin = 2; // Best of 3 (first to 2 wins)
    this.roundDurationSec = 120; // 2 minutes per round
    this.roundTimer = 120;
    this.timerRemainingMs = 120000;
    this.roundState = 'INTRO'; // 'INTRO' | 'FIGHTING' | 'ROUND_OVER' | 'MATCH_OVER'
    this.bannerObjects = [];
  }

  preload() {
    // 1. Doctor Strange Mirror Dimension Background & Character Portraits
    this.load.image('arena_bg', 'assets/mirror_dimension.png');
    this.load.image('harpy_portrait', '../../assets/characters/harpy/portrait.png');
    this.load.image('strange_portrait', '../../assets/characters/Dr Strange/portrait.png');
    this.load.image('chunli_portrait', '../../assets/characters/ChunLi/portrait.png');

    // 2. Doctor Strange Sprite Sheets (512x512 Standardized Grid)
    const sBase = '../../assets/characters/Dr Strange/';
    this.load.spritesheet('strange_sheet_idle', sBase + 'SheetIdle.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_walk', sBase + 'SheetWalk.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_crouch', sBase + 'SheetCrouch.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_jump', sBase + 'SheetJump.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_punch', sBase + 'SheetPunch.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_blast', sBase + 'SheetBlast.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_power', sBase + 'SheetPower.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('strange_sheet_ultimate', sBase + 'SheetUltimate.png', { frameWidth: 512, frameHeight: 512 });

    // 3. Harpy Sprite Sheets
    const hBase = '../../assets/characters/harpy/';

    // Movement & Stances
    this.load.spritesheet('harpy_sheet_idle', hBase + 'SheetIdle.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_walk', hBase + 'SheetWalk.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_dash', hBase + 'SheetDash.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_backdash', hBase + 'SheetBackdash.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_crouch', hBase + 'SheetCrouch.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_jump', hBase + 'SheetJumpFall1.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_taunt', hBase + 'SheetTaunt.png', { frameWidth: 1080, frameHeight: 1080 });

    // Attacks & Knockback (Sheet8C explicitly loaded for knockback!)
    this.load.spritesheet('harpy_sheet_5a', hBase + 'Sheet5A.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5b', hBase + 'Sheet5B1.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5c', hBase + 'Sheet5C.png', { frameWidth: 1200, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_6b', hBase + 'Sheet6B.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_8a', hBase + 'Sheet8A.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_8c', hBase + 'Sheet8C.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_8d', hBase + 'Sheet8D1.png', { frameWidth: 1200, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_235b', hBase + 'Sheet235B.png', { frameWidth: 1200, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_262c', hBase + 'Sheet262C.png', { frameWidth: 1080, frameHeight: 1190 });
    this.load.spritesheet('harpy_sheet_super', hBase + 'Sheet236236C.png', { frameWidth: 1200, frameHeight: 1080 });

    // 4. Chun-Li 3D Sprite Sheets & VFX (Section 1 of Guide)
    const cBase = '../../assets/characters/ChunLi/ChunLi_3D_Sprites/';
    this.load.spritesheet('chunli_sheet_idle', cBase + '01_ChunLi_Idle.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_walk', cBase + '02_ChunLi_Walk.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_jump', cBase + '03_ChunLi_Jump.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_crouch', cBase + '04_ChunLi_Crouch.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_hit', cBase + '05_ChunLi_HitReaction.png', { frameWidth: 300, frameHeight: 298 });
    this.load.spritesheet('chunli_sheet_basic_strike', cBase + '06_ChunLi_BasicStrike.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_lightning', cBase + '07_ChunLi_LightningLegs.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_spinning_bird', cBase + '08_ChunLi_SpinningBirdKick.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_kikoken', cBase + '09_ChunLi_Kikoken.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_hoyoku', cBase + '10_ChunLi_HoyokuSen.png', { frameWidth: 256, frameHeight: 256 });

    // 3D VFX & Projectile Sheets
    this.load.spritesheet('chunli_sheet_projectile', cBase + '11_Kikoken_Projectile.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_impact', cBase + '12_Kikoken_Impact.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_vfx_lightning', cBase + '13_LightningLegs_VFX.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_vfx_spinning_bird', cBase + '14_SpinningBird_VFX.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('chunli_sheet_vfx_hoyoku', cBase + '15_HoyokuSen_Finisher_VFX.png', { frameWidth: 256, frameHeight: 256 });
  }

  create() {
    this.isGameOver = false;
    this.currentRound = 1;
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.roundState = 'INTRO';
    this.roundTimer = this.roundDurationSec;
    this.timerRemainingMs = this.roundDurationSec * 1000;
    this.bannerObjects = [];

    window.activeArenaScene = this;

    // 1. World Floor at y = 575 (Directly on Mirror Dimension floating stone platform!)
    this.physics.world.setBounds(0, 0, 1280, 575);

    // 2. Doctor Strange Mirror Dimension Background
    const bg = this.add.image(640, 360, 'arena_bg');
    bg.setDisplaySize(1280, 720);

    // Glowing mystical barrier at bottom
    const platformGlow = this.add.rectangle(640, 582, 1280, 14, 0xf59e0b, 0.4);
    this.tweens.add({
      targets: platformGlow,
      alpha: 0.8,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // 3. Register Animations
    this.registerHarpyAnimations();
    this.registerStrangeAnimations();
    this.registerChunLiAnimations();

    // 3.5. Projectiles Group (no gravity so projectiles fly straight horizontally)
    this.projectiles = this.physics.add.group({ allowGravity: false });

    // 4. Resolve selected fighters
    const p1Char = window.selectedFighterP1 || 'harpy';
    const p2Char = window.selectedFighterP2 || 'strange';
    const isMirror = p1Char === p2Char;

    // Spawn Player 1 (Left side, faces right)
    this.fighterP1 = new FighterEntity(this, 320, 460, p1Char, 1, false);

    // Spawn Player 2 (Right side, faces left)
    this.fighterP2 = new FighterEntity(this, 960, 460, p2Char, 2, isMirror);

    // Solid pushbox collider between fighters
    this.physics.add.collider(this.fighterP1.sprite, this.fighterP2.sprite);

    // Overlap for projectiles against fighters
    this.physics.add.overlap(this.projectiles, this.fighterP1.sprite, (obj1, obj2) => {
      const proj = (obj1 === this.fighterP1.sprite) ? obj2 : obj1;
      this.handleProjectileHit(proj, this.fighterP1);
    });
    this.physics.add.overlap(this.projectiles, this.fighterP2.sprite, (obj1, obj2) => {
      const proj = (obj1 === this.fighterP2.sprite) ? obj2 : obj1;
      this.handleProjectileHit(proj, this.fighterP2);
    });

    // 5. Input Keys
    this.setupInputKeys();

    // 6. Visual HUD
    this.buildDualPlayerHUD(p1Char, p2Char);

    // 7. Start Round 1
    this.startRound(1);
  }

  registerHarpyAnimations() {
    const defineAnim = (key, sheet, start, end, rate = 14, repeat = 0) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start, end }),
          frameRate: rate,
          repeat
        });
      }
    };

    // Stances
    defineAnim('harpy_anim_idle', 'harpy_sheet_idle', 0, 6, 10, -1);
    defineAnim('harpy_anim_walk', 'harpy_sheet_walk', 0, 7, 12, -1);
    defineAnim('harpy_anim_dash', 'harpy_sheet_dash', 0, 8, 16, 0);
    defineAnim('harpy_anim_backdash', 'harpy_sheet_backdash', 0, 4, 14, 0);
    defineAnim('harpy_anim_crouch_down', 'harpy_sheet_crouch', 0, 7, 16, 0);
    defineAnim('harpy_anim_crouch_hold', 'harpy_sheet_crouch', 7, 9, 8, -1);
    defineAnim('harpy_anim_crouch', 'harpy_sheet_crouch', 7, 9, 8, -1);
    defineAnim('harpy_anim_jump', 'harpy_sheet_jump', 0, 13, 14, 0);
    defineAnim('harpy_anim_taunt', 'harpy_sheet_taunt', 0, 7, 12, 0);

    // REQUIREMENT: Sheet8C knockback animation!
    defineAnim('harpy_anim_knockback', 'harpy_sheet_8c', 0, 8, 14, 0);

    // Ground Attacks
    defineAnim('harpy_anim_atk_5a', 'harpy_sheet_5a', 0, 5, 14, 0);
    defineAnim('harpy_anim_atk_5b', 'harpy_sheet_5b', 0, 6, 14, 0);
    defineAnim('harpy_anim_atk_5c', 'harpy_sheet_5c', 0, 9, 14, 0);
    defineAnim('harpy_anim_atk_6b', 'harpy_sheet_6b', 0, 7, 14, 0);

    // Air Attacks
    defineAnim('harpy_anim_atk_8a', 'harpy_sheet_8a', 0, 4, 15, 0);
    defineAnim('harpy_anim_atk_8c', 'harpy_sheet_8c', 0, 8, 14, 0);
    defineAnim('harpy_anim_atk_8d', 'harpy_sheet_8d', 0, 6, 14, 0);

    // Specials & Super
    defineAnim('harpy_anim_sp_235b', 'harpy_sheet_235b', 0, 9, 14, 0);
    defineAnim('harpy_anim_sp_262c', 'harpy_sheet_262c', 0, 15, 14, 0);
    defineAnim('harpy_anim_super', 'harpy_sheet_super', 0, 10, 12, 0);
  }

  registerStrangeAnimations() {
    const defineAnim = (key, sheet, start, end, rate = 14, repeat = 0) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start, end }),
          frameRate: rate,
          repeat
        });
      }
    };

    // Stances
    defineAnim('strange_anim_idle', 'strange_sheet_idle', 0, 3, 6, -1);
    defineAnim('strange_anim_walk', 'strange_sheet_walk', 0, 7, 10, -1);
    defineAnim('strange_anim_dash', 'strange_sheet_walk', 0, 4, 18, 0);
    defineAnim('strange_anim_crouch_down', 'strange_sheet_crouch', 0, 4, 14, 0);
    defineAnim('strange_anim_crouch_hold', 'strange_sheet_crouch', 4, 6, 8, -1);
    defineAnim('strange_anim_crouch', 'strange_sheet_crouch', 4, 6, 8, -1);
    defineAnim('strange_anim_jump', 'strange_sheet_jump', 0, 7, 12, 0);
    defineAnim('strange_anim_knockback', 'strange_sheet_jump', 4, 8, 10, 0);

    // Normal Attacks
    defineAnim('strange_anim_atk_5a', 'strange_sheet_punch', 0, 4, 16, 0);
    defineAnim('strange_anim_atk_5b', 'strange_sheet_punch', 2, 7, 14, 0);
    defineAnim('strange_anim_atk_6b', 'strange_sheet_punch', 3, 9, 14, 0);
    defineAnim('strange_anim_atk_5c', 'strange_sheet_blast', 0, 14, 14, 0);

    // Air Attacks
    defineAnim('strange_anim_atk_8a', 'strange_sheet_punch', 0, 4, 15, 0);
    defineAnim('strange_anim_atk_8c', 'strange_sheet_blast', 6, 14, 14, 0);

    // Special & Super
    defineAnim('strange_anim_sp_projectile', 'strange_sheet_power', 0, 9, 14, 0);
    defineAnim('strange_anim_super', 'strange_sheet_ultimate', 0, 15, 12, 0);
    defineAnim('strange_anim_orb', 'strange_sheet_power', 8, 11, 12, -1);
  }

  registerChunLiAnimations() {
    const defineAnim = (key, sheet, start, end, rate = 16, repeat = 0) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(sheet, { start, end }),
          frameRate: rate,
          repeat
        });
      }
    };

    // Movement & Stances (Polished wushu frame rates & smooth fluid motion)
    defineAnim('chunli_anim_idle', 'chunli_sheet_idle', 0, 15, 14, -1);
    defineAnim('chunli_anim_walk', 'chunli_sheet_walk', 0, 15, 16, -1);
    defineAnim('chunli_anim_dash', 'chunli_sheet_walk', 0, 7, 18, 0);
    // Crouch: plays progressive crouch descent (frames 0-4) and holds compact low defensive stance (frames 4-6) while holding down
    defineAnim('chunli_anim_crouch_down', 'chunli_sheet_crouch', 0, 4, 16, 0);
    defineAnim('chunli_anim_crouch_hold', 'chunli_sheet_crouch', 4, 6, 8, -1);
    defineAnim('chunli_anim_crouch', 'chunli_sheet_crouch', 4, 6, 8, -1);
    // Jump: plays launch, apex tuck (frames 6-8) and descent pose (frame 10), then holds freefall pose until touching ground
    defineAnim('chunli_anim_jump', 'chunli_sheet_jump', 0, 10, 14, 0);
    defineAnim('chunli_anim_knockback', 'chunli_sheet_hit', 0, 11, 15, 0);

    // Normal Attacks (Crisp, snappy fighting-game frame data matching Harpy's responsiveness)
    defineAnim('chunli_anim_atk_5a', 'chunli_sheet_basic_strike', 0, 15, 18, 0);
    defineAnim('chunli_anim_atk_5b', 'chunli_sheet_lightning', 0, 15, 20, 0);
    defineAnim('chunli_anim_atk_6b', 'chunli_sheet_lightning', 0, 15, 20, 0);
    defineAnim('chunli_anim_atk_5c', 'chunli_sheet_spinning_bird', 0, 15, 18, 0);

    // Air Attacks
    defineAnim('chunli_anim_atk_8a', 'chunli_sheet_jump', 4, 10, 16, 0);
    defineAnim('chunli_anim_atk_8c', 'chunli_sheet_spinning_bird', 2, 12, 18, 0);

    // Specials & Super (Section 2 of Guide)
    defineAnim('chunli_anim_sp_kikoken', 'chunli_sheet_kikoken', 0, 15, 16, 0);
    defineAnim('chunli_anim_sp_spinning_bird', 'chunli_sheet_spinning_bird', 0, 15, 18, 0);
    defineAnim('chunli_anim_super', 'chunli_sheet_hoyoku', 0, 15, 8, 0);

    // Projectiles & 3D VFX Overlays (Section 1 & 2 of Guide)
    defineAnim('chunli_anim_projectile', 'chunli_sheet_projectile', 0, 15, 16, -1);
    defineAnim('chunli_anim_impact', 'chunli_sheet_impact', 0, 15, 20, 0);
    defineAnim('chunli_anim_vfx_lightning', 'chunli_sheet_vfx_lightning', 0, 15, 20, 0);
    defineAnim('chunli_anim_vfx_spinning_bird', 'chunli_sheet_vfx_spinning_bird', 0, 15, 18, 0);
    defineAnim('chunli_anim_vfx_hoyoku', 'chunli_sheet_vfx_hoyoku', 0, 15, 8, 0);
  }

  spawnMysticProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? 1 : -1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 70 : -70);
    const spawnY = caster.sprite.y - 25;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'strange_sheet_power');
    this.projectiles.add(proj);

    proj.setScale(0.55);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(180, 180);
    proj.body.setOffset(166, 166);
    proj.play('strange_anim_orb');
    proj.caster = caster;
    proj.setFlipX(!facingRight);

    const speed = 640;
    proj.setVelocityX(facingRight ? speed : -speed);
    proj.setVelocityY(0);
    proj.setTint(0xfde047);

    // Floating myst particles
    this.tweens.add({
      targets: proj,
      alpha: { from: 0.9, to: 1 },
      duration: 150,
      yoyo: true,
      repeat: -1
    });

    // Auto-destroy after 1.8 seconds
    this.time.delayedCall(1800, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  spawnKikokenProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const spawnX = caster.sprite.x + (facingDir * 75);
    const spawnY = caster.sprite.y - 12;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'chunli_sheet_projectile');
    this.projectiles.add(proj);

    proj.setScale(0.65);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(120, 120);
    proj.body.setOffset(68, 68);
    proj.play('chunli_anim_projectile');
    proj.caster = caster;
    proj.isKikoken = true;
    proj.setFlipX(facingDir === -1);

    const speed = 750;
    proj.setVelocityX(facingDir * speed);
    proj.setVelocityY(0);

    // Rotating cyan glow
    this.tweens.add({
      targets: proj,
      alpha: { from: 0.85, to: 1 },
      duration: 120,
      yoyo: true,
      repeat: -1
    });

    // Auto-destroy after 1.8 seconds
    this.time.delayedCall(1800, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  spawnKikokenImpact(x, y) {
    const impact = this.add.sprite(x, y, 'chunli_sheet_impact');
    impact.setScale(0.75);
    impact.play('chunli_anim_impact');
    impact.on('animationcomplete', () => impact.destroy());
    this.time.delayedCall(600, () => { if (impact && impact.active) impact.destroy(); });
  }

  spawnLightningLegsVFX(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const vfxX = caster.sprite.x + (facingRight ? 55 : -55);
    const vfxY = caster.sprite.y - 10;

    const vfx = this.add.sprite(vfxX, vfxY, 'chunli_sheet_vfx_lightning');
    vfx.setScale(0.75);
    vfx.setFlipX(!facingRight);
    vfx.play('chunli_anim_vfx_lightning');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(1000, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  spawnSpinningBirdVFX(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const vfxX = caster.sprite.x + (facingRight ? 25 : -25);
    const vfxY = caster.sprite.y - 12;

    const vfx = this.add.sprite(vfxX, vfxY, 'chunli_sheet_vfx_spinning_bird');
    vfx.setScale(0.78);
    vfx.setFlipX(!facingRight);
    vfx.play('chunli_anim_vfx_spinning_bird');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(1000, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  spawnHoyokuSenVFX(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const vfxX = caster.sprite.x + (facingRight ? 65 : -65);
    const vfxY = caster.sprite.y - 25;

    const vfx = this.add.sprite(vfxX, vfxY, 'chunli_sheet_vfx_hoyoku');
    vfx.setScale(0.80);
    vfx.setFlipX(!facingRight);
    vfx.play('chunli_anim_vfx_hoyoku');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(2500, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  handleProjectileHit(proj, target) {
    if (!proj || !target || !target.sprite) return;
    // Guard: Ensure proj is actually an active projectile and not accidentally a fighter sprite
    if (proj === target.sprite || (this.fighterP1 && proj === this.fighterP1.sprite) || (this.fighterP2 && proj === this.fighterP2.sprite)) return;
    if (!proj.active || target === proj.caster) return;
    if (target.hp <= 0 || (this.roundState !== 'FIGHTING')) return;

    const hitX = proj.x;
    const hitY = proj.y;
    const isKikoken = Boolean(proj.isKikoken);
    const caster = proj.caster;

    if (proj.active) {
      proj.destroy();
    }

    if (isKikoken) {
      this.spawnKikokenImpact(hitX, hitY);
    }

    const atkData = {
      damage: isKikoken ? 150 : 155,
      isSpecial: true,
      knockbackX: isKikoken ? 460 : 450,
      knockbackY: isKikoken ? -270 : -280
    };

    target.takeHit(atkData, caster);
    this.cameras.main.shake(240, 0.018);
    if (window.soundFX) window.soundFX.playStartBoom();
  }

  setupInputKeys() {
    // PLAYER 1: WASD / Space / F / G / H / R / Y / Q / T
    this.p1Keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      f: Phaser.Input.Keyboard.KeyCodes.F,     // Light (5A)
      g: Phaser.Input.Keyboard.KeyCodes.G,     // Medium (5B)
      h: Phaser.Input.Keyboard.KeyCodes.H,     // Heavy (5C)
      r: Phaser.Input.Keyboard.KeyCodes.R,     // Special
      y: Phaser.Input.Keyboard.KeyCodes.Y,     // Super
      q: Phaser.Input.Keyboard.KeyCodes.Q,     // Dash
      t: Phaser.Input.Keyboard.KeyCodes.T,     // Taunt
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    // PLAYER 2: Arrow Keys / J / K / L / U / I / O / P / Numpad / Number Row
    this.p2Keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      j: Phaser.Input.Keyboard.KeyCodes.J,     // Light (5A)
      k: Phaser.Input.Keyboard.KeyCodes.K,     // Medium (5B)
      l: Phaser.Input.Keyboard.KeyCodes.L,     // Heavy (5C)
      u: Phaser.Input.Keyboard.KeyCodes.U,     // Special
      i: Phaser.Input.Keyboard.KeyCodes.I,     // Super
      o: Phaser.Input.Keyboard.KeyCodes.O,     // Dash
      p: Phaser.Input.Keyboard.KeyCodes.P,     // Taunt
      num1: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      num2: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      num3: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
      num4: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
      num5: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE,
      num0: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO
    });

    this.p1Keys.esc.on('down', () => {
      if (window.exitArenaToMenu) window.exitArenaToMenu();
    });
  }

  buildDualPlayerHUD(p1Id, p2Id) {
    // --- PLAYER 1 HUD (Left) ---
    const p1Color = p1Id === 'strange' ? 0xf59e0b : (p1Id === 'chunli' ? 0x0284c7 : 0x06b6d4);
    const p1Hex = p1Id === 'strange' ? '#f59e0b' : (p1Id === 'chunli' ? '#38bdf8' : '#06b6d4');
    const p1PortraitKey = p1Id === 'strange' ? 'strange_portrait' : (p1Id === 'chunli' ? 'chunli_portrait' : 'harpy_portrait');
    const p1DisplayName = p1Id === 'chunli' ? 'CHUN-LI' : p1Id.toUpperCase();

    const p1Card = this.add.rectangle(75, 60, 72, 72, p1Color, 0.4);
    p1Card.setStrokeStyle(2, p1Color);
    const p1Img = this.add.image(75, 60, p1PortraitKey);
    p1Img.setDisplaySize(68, 68);

    this.p1Name = this.add.text(125, 34, `P1: ${p1DisplayName}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fef08a'
    });

    const p1BarBg = this.add.rectangle(300, 68, 330, 16, 0x18181b, 0.85);
    p1BarBg.setStrokeStyle(1, 0x52525b);
    this.p1BarFill = this.add.rectangle(137, 68, 326, 12, p1Color).setOrigin(0, 0.5);

    this.p1HpText = this.add.text(300, 68, `${this.fighterP1.hp} / ${this.fighterP1.maxHp}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.p1ActionText = this.add.text(125, 84, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p1Hex,
      fontStyle: 'bold'
    });

    // --- PLAYER 2 HUD (Right) ---
    const p2Color = p2Id === 'strange' ? 0xf59e0b : (p2Id === 'chunli' ? 0x0284c7 : 0x06b6d4);
    const p2Hex = p2Id === 'strange' ? '#f59e0b' : (p2Id === 'chunli' ? '#38bdf8' : '#06b6d4');
    const p2PortraitKey = p2Id === 'strange' ? 'strange_portrait' : (p2Id === 'chunli' ? 'chunli_portrait' : 'harpy_portrait');
    const p2DisplayName = p2Id === 'chunli' ? 'CHUN-LI' : p2Id.toUpperCase();

    const p2Card = this.add.rectangle(1205, 60, 72, 72, p2Color, 0.4);
    p2Card.setStrokeStyle(2, p2Color);
    const p2Img = this.add.image(1205, 60, p2PortraitKey);
    p2Img.setDisplaySize(68, 68);

    this.p2Name = this.add.text(1155, 34, `P2: ${p2DisplayName}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fef08a'
    }).setOrigin(1, 0);

    const p2BarBg = this.add.rectangle(980, 68, 330, 16, 0x18181b, 0.85);
    p2BarBg.setStrokeStyle(1, 0x52525b);
    this.p2BarFill = this.add.rectangle(1143, 68, 326, 12, p2Color).setOrigin(1, 0.5);

    this.p2HpText = this.add.text(980, 68, `${this.fighterP2.hp} / ${this.fighterP2.maxHp}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.p2ActionText = this.add.text(1155, 84, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p2Hex,
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // --- Stage Title ---
    this.add.text(640, 14, '🔮 MIRROR DIMENSION 🔮', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fde047'
    }).setOrigin(0.5);

    // --- Current Round Badge ---
    this.roundBadgeText = this.add.text(640, 31, 'ROUND 1', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // --- Central 2-Minute Timer Box (120s down to 0) ---
    this.timerBoxBg = this.add.rectangle(640, 62, 94, 52, 0x09090b, 0.92);
    this.timerBoxBg.setStrokeStyle(2, 0xf59e0b, 0.95);

    this.timerNumText = this.add.text(640, 53, '120', {
      fontFamily: 'Cinzel, Rajdhani, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.timerClockText = this.add.text(640, 75, '02:00', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#a1a1aa'
    }).setOrigin(0.5);

    // --- Best of 3 Round Win Pips ---
    // P1 Round Win Pips (Left of Timer)
    this.p1Pip1 = this.add.circle(548, 62, 7, 0x18181b).setStrokeStyle(2, 0x06b6d4);
    this.p1Pip2 = this.add.circle(568, 62, 7, 0x18181b).setStrokeStyle(2, 0x06b6d4);
    this.add.text(558, 77, 'P1 WINS', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#67e8f9'
    }).setOrigin(0.5);

    // P2 Round Win Pips (Right of Timer)
    this.p2Pip1 = this.add.circle(712, 62, 7, 0x18181b).setStrokeStyle(2, 0xef4444);
    this.p2Pip2 = this.add.circle(732, 62, 7, 0x18181b).setStrokeStyle(2, 0xef4444);
    this.add.text(722, 77, 'P2 WINS', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#f87171'
    }).setOrigin(0.5);

    // --- REQUIREMENT: PROMINENT KEY CONTROLS FOR BOTH PLAYERS ---
    const guideBox = this.add.rectangle(640, 672, 1180, 52, 0x09090b, 0.88);
    guideBox.setStrokeStyle(1.5, 0xf59e0b, 0.8);

    this.add.text(640, 660, 'P1 [WASD/SPACE]: Move/Jump | [F] 5A Light | [G] 5B Med | [H] 5C Heavy | [R] Special | [S+H / Y] Super | [Q] Dash', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#a5f3fc',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(640, 684, 'P2 [ARROWS]: Move/Jump | [J/NUM1] Light | [K/NUM2] Med | [L/NUM3] Heavy | [U/NUM4] Special | [↓+L / I] Super | [O] Dash', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#fef08a',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  spawnDamageNumber(x, y, damage, isSpecial) {
    const color = isSpecial ? '#f97316' : '#fef08a';
    const text = this.add.text(x, y, `-${damage}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: isSpecial ? '32px' : '24px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      scale: isSpecial ? 1.4 : 1.1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy()
    });
  }

  checkHit(attacker, defender) {
    if (!attacker || !defender || !attacker.sprite || !defender.sprite) return;
    if (!attacker.isAttacking || attacker.hasDealtDamage || !attacker.currentAttackData) {
      return;
    }

    const atkData = attacker.currentAttackData;
    const aSprite = attacker.sprite;
    const dSprite = defender.sprite;

    const dx = dSprite.x - aSprite.x;
    const dy = Math.abs(dSprite.y - aSprite.y);

    // Verify attacker is facing towards defender using character-accurate facing logic
    const facingDir = attacker.getFacingDir();
    const isInFront = (facingDir === 1 && dx > -20 && dx <= atkData.rangeX) ||
                      (facingDir === -1 && dx < 20 && dx >= -atkData.rangeX);

    if (isInFront && dy <= atkData.rangeY) {
      attacker.hasDealtDamage = true;
      defender.takeHit(atkData, attacker);

      // Camera impact shake
      this.cameras.main.shake(atkData.isSpecial ? 220 : 120, atkData.isSpecial ? 0.016 : 0.007);

      // Sound impact
      if (window.soundFX) {
        if (atkData.isSpecial) window.soundFX.playStartBoom();
        else window.soundFX.playSelect();
      }
    }
  }

  updateHUD() {
    if (!this.fighterP1 || !this.fighterP2) return;

    const p1Ratio = Math.max(0, this.fighterP1.hp / this.fighterP1.maxHp);
    const p2Ratio = Math.max(0, this.fighterP2.hp / this.fighterP2.maxHp);

    this.p1BarFill.width = 326 * p1Ratio;
    this.p2BarFill.width = 326 * p2Ratio;

    this.p1HpText.setText(`${this.fighterP1.hp} / ${this.fighterP1.maxHp}`);
    this.p2HpText.setText(`${this.fighterP2.hp} / ${this.fighterP2.maxHp}`);

    if (p1Ratio < 0.25) this.p1BarFill.fillColor = 0xef4444;
    else this.p1BarFill.fillColor = this.fighterP1.charId === 'strange' ? 0xf59e0b : (this.fighterP1.charId === 'chunli' ? 0x0284c7 : 0x06b6d4);

    if (p2Ratio < 0.25) this.p2BarFill.fillColor = 0xef4444;
    else this.p2BarFill.fillColor = this.fighterP2.charId === 'strange' ? 0xf59e0b : (this.fighterP2.charId === 'chunli' ? 0x0284c7 : 0x06b6d4);

    this.p1ActionText.setText(`ACTION: ${this.fighterP1.currentAction}`);
    this.p2ActionText.setText(`ACTION: ${this.fighterP2.currentAction}`);

    // Update Live 2-Minute Timer Display
    if (this.timerNumText && this.timerClockText) {
      this.timerNumText.setText(`${this.roundTimer}`);

      const minutes = Math.floor(this.roundTimer / 60);
      const seconds = this.roundTimer % 60;
      const formattedClock = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      this.timerClockText.setText(formattedClock);

      // Warning color transitions
      if (this.roundTimer <= 10) {
        this.timerNumText.setColor('#ef4444');
        if (this.timerBoxBg) this.timerBoxBg.setStrokeStyle(2, 0xef4444, 1);
      } else if (this.roundTimer <= 30) {
        this.timerNumText.setColor('#f97316');
        if (this.timerBoxBg) this.timerBoxBg.setStrokeStyle(2, 0xf97316, 0.95);
      } else {
        this.timerNumText.setColor('#fef08a');
        if (this.timerBoxBg) this.timerBoxBg.setStrokeStyle(2, 0xf59e0b, 0.95);
      }
    }

    // Update Best of 3 Round Win Pips
    if (this.p1Pip1 && this.p1Pip2) {
      this.p1Pip1.setFillStyle(this.p1RoundWins >= 1 ? 0x06b6d4 : 0x18181b);
      this.p1Pip2.setFillStyle(this.p1RoundWins >= 2 ? 0x06b6d4 : 0x18181b);
    }
    if (this.p2Pip1 && this.p2Pip2) {
      this.p2Pip1.setFillStyle(this.p2RoundWins >= 1 ? 0xef4444 : 0x18181b);
      this.p2Pip2.setFillStyle(this.p2RoundWins >= 2 ? 0xef4444 : 0x18181b);
    }
  }

  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.roundState = 'INTRO';
    this.roundTimer = this.roundDurationSec;
    this.timerRemainingMs = this.roundDurationSec * 1000;
    this.clearBanners();

    // Reset fighters to initial fighting marks
    this.fighterP1.reset(320, 460);
    this.fighterP2.reset(960, 460);

    // Update Round Badge Title
    const isFinalRound = (this.p1RoundWins === 1 && this.p2RoundWins === 1);
    const roundTitle = isFinalRound ? 'FINAL ROUND' : `ROUND ${roundNumber}`;
    if (this.roundBadgeText) {
      this.roundBadgeText.setText(roundTitle);
      this.roundBadgeText.setColor(isFinalRound ? '#ef4444' : '#fef08a');
    }

    this.updateHUD();

    // Round intro announcement sequence
    const introText = this.add.text(640, 260, roundTitle, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '76px',
      fontStyle: 'bold',
      color: isFinalRound ? '#ef4444' : '#fef08a',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0);
    this.bannerObjects.push(introText);

    if (window.soundFX) window.soundFX.playSelect();

    // Zoom in Round Announcement
    this.tweens.add({
      targets: introText,
      scale: 1,
      duration: 500,
      ease: 'Back.Out',
      onComplete: () => {
        this.time.delayedCall(700, () => {
          introText.setText('FIGHT!');
          introText.setColor('#ea580c');
          introText.setScale(1.3);
          this.roundState = 'FIGHTING'; // Enable fighting inputs immediately on FIGHT!

          if (window.soundFX) window.soundFX.playStartBoom();
          this.cameras.main.shake(140, 0.008);

          this.tweens.add({
            targets: introText,
            scale: 1,
            alpha: 0,
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
              this.clearBanners();
            }
          });
        });
      }
    });
  }

  endRound(reason) {
    if (this.roundState === 'ROUND_OVER' || this.roundState === 'MATCH_OVER') return;
    this.roundState = 'ROUND_OVER';
    this.clearBanners();

    // Freeze fighter velocities immediately
    this.fighterP1.sprite.setVelocity(0, 0);
    this.fighterP2.sprite.setVelocity(0, 0);

    let roundWinner = 'DRAW';
    let mainBannerText = 'K.O.';
    let mainColor = '#ef4444';
    let subBannerText = '';

    if (reason === 'TIMEOUT') {
      mainBannerText = 'TIME OVER';
      mainColor = '#f59e0b';
      const p1Hp = this.fighterP1.hp;
      const p2Hp = this.fighterP2.hp;

      // REQUIREMENT: When timer reaches zero, player with lower health loses!
      if (p1Hp > p2Hp) {
        roundWinner = 'PLAYER 1';
        this.p1RoundWins++;
        subBannerText = `PLAYER 1 WINS (P1: ${p1Hp} HP vs P2: ${p2Hp} HP)`;
      } else if (p2Hp > p1Hp) {
        roundWinner = 'PLAYER 2';
        this.p2RoundWins++;
        subBannerText = `PLAYER 2 WINS (P2: ${p2Hp} HP vs P1: ${p1Hp} HP)`;
      } else {
        roundWinner = 'DRAW';
        this.p1RoundWins++;
        this.p2RoundWins++;
        subBannerText = `DRAW! EQUAL HEALTH (${p1Hp} HP)`;
      }
    } else {
      // Reason is 'KO'
      mainBannerText = 'K.O.';
      mainColor = '#ef4444';

      if (this.fighterP1.hp <= 0 && this.fighterP2.hp <= 0) {
        roundWinner = 'DRAW';
        this.p1RoundWins++;
        this.p2RoundWins++;
        subBannerText = 'DOUBLE K.O. (DRAW)';
      } else if (this.fighterP1.hp <= 0) {
        roundWinner = 'PLAYER 2';
        this.p2RoundWins++;
        subBannerText = 'PLAYER 2 TAKES THE ROUND!';
      } else {
        roundWinner = 'PLAYER 1';
        this.p1RoundWins++;
        subBannerText = 'PLAYER 1 TAKES THE ROUND!';
      }
    }

    if (window.soundFX) window.soundFX.playStartBoom();
    this.cameras.main.shake(reason === 'KO' ? 450 : 300, reason === 'KO' ? 0.018 : 0.012);

    // Update the Round Win Pips visually with scale pulse tween
    this.updateHUD();
    this.animatePipUpdate(roundWinner);

    // Display primary banner
    const banner = this.add.text(640, 260, mainBannerText, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '84px',
      fontStyle: 'bold',
      color: mainColor,
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0);
    this.bannerObjects.push(banner);

    const subText = this.add.text(640, 350, subBannerText, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0);
    this.bannerObjects.push(subText);

    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: 500,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: subText,
          alpha: 1,
          duration: 350
        });

        // Delay to determine next step (Next Round or Match Victory)
        this.time.delayedCall(2400, () => {
          if (this.p1RoundWins >= this.maxRoundsToWin || this.p2RoundWins >= this.maxRoundsToWin) {
            this.triggerMatchOver();
          } else {
            // Proceed to next round in Best of 3!
            this.clearBanners();
            this.startRound(this.currentRound + 1);
          }
        });
      }
    });
  }

  animatePipUpdate(winner) {
    if (winner === 'PLAYER 1' || winner === 'DRAW') {
      const pip = this.p1RoundWins === 1 ? this.p1Pip1 : this.p1Pip2;
      if (pip) {
        this.tweens.add({
          targets: pip,
          scale: 1.7,
          duration: 250,
          yoyo: true,
          repeat: 2
        });
      }
    }
    if (winner === 'PLAYER 2' || winner === 'DRAW') {
      const pip = this.p2RoundWins === 1 ? this.p2Pip1 : this.p2Pip2;
      if (pip) {
        this.tweens.add({
          targets: pip,
          scale: 1.7,
          duration: 250,
          yoyo: true,
          repeat: 2
        });
      }
    }
  }

  triggerMatchOver() {
    this.roundState = 'MATCH_OVER';
    this.isGameOver = true;
    this.clearBanners();

    let matchChampion = 'PLAYER 1';
    let championColor = '#06b6d4';
    if (this.p1RoundWins >= this.maxRoundsToWin && this.p2RoundWins >= this.maxRoundsToWin) {
      matchChampion = 'DOUBLE APEX CHAMPIONS (TIE)';
      championColor = '#f59e0b';
    } else if (this.p2RoundWins >= this.maxRoundsToWin) {
      matchChampion = 'PLAYER 2';
      championColor = '#ef4444';
    }

    if (window.soundFX) window.soundFX.playStartBoom();
    this.cameras.main.shake(500, 0.02);

    // Dark semi-transparent overlay
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x07060a, 0.72);
    this.bannerObjects.push(overlay);

    const titleText = this.add.text(640, 220, 'MATCH COMPLETE', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '44px',
      fontStyle: 'bold',
      color: '#fde047',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScale(0);
    this.bannerObjects.push(titleText);

    const champText = this.add.text(640, 300, `🏆 ${matchChampion} VICTORIOUS! 🏆`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: championColor,
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setAlpha(0);
    this.bannerObjects.push(champText);

    const scoreText = this.add.text(640, 365, `FINAL SCORE:  PLAYER 1 [ ${this.p1RoundWins} ]  —  [ ${this.p2RoundWins} ] PLAYER 2`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setAlpha(0);
    this.bannerObjects.push(scoreText);

    const rematchBox = this.add.rectangle(640, 440, 520, 50, 0x18181b, 0.9);
    rematchBox.setStrokeStyle(2, 0xf59e0b);
    rematchBox.setInteractive({ useHandCursor: true });
    rematchBox.on('pointerdown', () => this.restartMatch());
    rematchBox.on('pointerover', () => rematchBox.setFillStyle(0x27272a, 1));
    rematchBox.on('pointerout', () => rematchBox.setFillStyle(0x18181b, 0.9));
    this.bannerObjects.push(rematchBox);

    const promptText = this.add.text(640, 440, '⚔️ PRESS [ENTER / SPACE] TO REMATCH (OR CLICK HERE)', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#fef08a'
    }).setOrigin(0.5).setAlpha(0);
    this.bannerObjects.push(promptText);

    const escText = this.add.text(640, 495, 'PRESS [ESC] TO RETURN TO THE ALTAR', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#a1a1aa',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    this.bannerObjects.push(escText);

    this.tweens.add({
      targets: titleText,
      scale: 1,
      duration: 600,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: [champText, scoreText, promptText, escText],
          alpha: 1,
          duration: 400
        });
      }
    });
  }

  restartMatch() {
    this.clearBanners();
    this.currentRound = 1;
    this.p1RoundWins = 0;
    this.p2RoundWins = 0;
    this.isGameOver = false;
    this.startRound(1);
  }

  clearBanners() {
    if (this.bannerObjects && this.bannerObjects.length > 0) {
      this.bannerObjects.forEach(obj => {
        try {
          if (obj && obj.destroy) obj.destroy();
        } catch (e) {}
      });
      this.bannerObjects = [];
    }
  }

  update(time, delta) {
    if (!this.fighterP1 || !this.fighterP2) return;

    // Check Rematch key press in Match Over state
    if (this.roundState === 'MATCH_OVER') {
      const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      if (Phaser.Input.Keyboard.JustDown(this.p1Keys.space) || Phaser.Input.Keyboard.JustDown(enterKey)) {
        this.restartMatch();
        return;
      }
    }

    // Active Timer Countdown during FIGHTING state
    if (this.roundState === 'FIGHTING') {
      this.timerRemainingMs = Math.max(0, this.timerRemainingMs - delta);
      const sec = Math.ceil(this.timerRemainingMs / 1000);

      if (sec !== this.roundTimer) {
        this.roundTimer = sec;

        // Audible & visual pulse alert when time <= 10s
        if (this.roundTimer <= 10 && this.roundTimer > 0) {
          if (window.soundFX && window.soundFX.playTimerTick) {
            window.soundFX.playTimerTick(true);
          }
          if (this.timerNumText) {
            this.tweens.add({
              targets: this.timerNumText,
              scale: 1.25,
              duration: 120,
              yoyo: true
            });
          }
        }
      }

      // Consistent 2-minute timer reached zero!
      // REQUIREMENT: when it reaches zero player with lower health loses!
      if (this.timerRemainingMs <= 0) {
        this.roundTimer = 0;
        this.timerRemainingMs = 0;
        this.updateHUD();
        this.endRound('TIMEOUT');
        return;
      }
    }

    // --- PLAYER 1 INPUT (WASD / Space / F / G / H / R / Y / Q / T) ---
    const p1Up = this.p1Keys.w.isDown || this.p1Keys.space.isDown;
    const p1UpJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.w) || Phaser.Input.Keyboard.JustDown(this.p1Keys.space);
    const p1Left = this.p1Keys.a.isDown;
    const p1Right = this.p1Keys.d.isDown;
    const p1Down = this.p1Keys.s.isDown;

    const p1Input = {
      up: p1Up,
      upJustDown: p1UpJustDown,
      down: p1Down,
      left: p1Left,
      right: p1Right,
      isHoldingForward: this.fighterP1.getFacingDir() === 1 ? p1Right : p1Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.f),
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.g),
      heavyJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.h),
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.r),
      superJustDown: (p1Down && Phaser.Input.Keyboard.JustDown(this.p1Keys.h)) || Phaser.Input.Keyboard.JustDown(this.p1Keys.y),
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.q),
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.t)
    };

    // --- PLAYER 2 INPUT (Arrows / J / K / L / U / I / O / P / Numpad / Number Row) ---
    const p2Up = this.p2Keys.up.isDown;
    const p2UpJustDown = Phaser.Input.Keyboard.JustDown(this.p2Keys.up);
    const p2Left = this.p2Keys.left.isDown;
    const p2Right = this.p2Keys.right.isDown;
    const p2Down = this.p2Keys.down.isDown;

    const p2Input = {
      up: p2Up,
      upJustDown: p2UpJustDown,
      down: p2Down,
      left: p2Left,
      right: p2Right,
      isHoldingForward: this.fighterP2.getFacingDir() === 1 ? p2Right : p2Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.j) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num1) || (this.p2Keys.one && Phaser.Input.Keyboard.JustDown(this.p2Keys.one)),
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.k) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num2) || (this.p2Keys.two && Phaser.Input.Keyboard.JustDown(this.p2Keys.two)),
      heavyJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3) || (this.p2Keys.three && Phaser.Input.Keyboard.JustDown(this.p2Keys.three)),
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.u) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num4) || (this.p2Keys.four && Phaser.Input.Keyboard.JustDown(this.p2Keys.four)),
      superJustDown: (p2Down && (Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3) || (this.p2Keys.three && Phaser.Input.Keyboard.JustDown(this.p2Keys.three)))) || Phaser.Input.Keyboard.JustDown(this.p2Keys.i) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num5) || (this.p2Keys.five && Phaser.Input.Keyboard.JustDown(this.p2Keys.five)),
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.o) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num0) || (this.p2Keys.zero && Phaser.Input.Keyboard.JustDown(this.p2Keys.zero)),
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.p)
    };

    // Feed controls to entities
    this.fighterP1.handleControls(p1Input);
    this.fighterP2.handleControls(p2Input);

    // Real-Time Hitbox & Combat Interaction Check (only during active battle)
    if (this.roundState === 'FIGHTING') {
      this.checkHit(this.fighterP1, this.fighterP2);
      this.checkHit(this.fighterP2, this.fighterP1);

      // Check K.O.
      if (this.fighterP1.hp <= 0 || this.fighterP2.hp <= 0) {
        this.endRound('KO');
        return;
      }
    }

    // Update Live Action, Health & Timer HUD
    this.updateHUD();
  }
}

// Global launchers & match control
window.startPhaserArena = function() {
  const container = document.getElementById('phaser-container');
  const menuWrapper = document.getElementById('menuWrapper');
  const arenaUI = document.getElementById('arenaControlBar');

  if (menuWrapper) menuWrapper.style.display = 'none';
  if (container) {
    container.style.display = 'block';
    container.focus();
  }
  if (arenaUI) arenaUI.style.display = 'flex';
  window.focus();

  if (!window.phaserGameInstance) {
    const config = Object.assign({}, GameConfig, {
      parent: 'phaser-container',
      scene: [ArenaScene]
    });
    window.phaserGameInstance = new Phaser.Game(config);
  } else {
    window.phaserGameInstance.scene.stop('ArenaScene');
    window.phaserGameInstance.scene.start('ArenaScene');
  }
};

window.exitArenaToMenu = function() {
  const container = document.getElementById('phaser-container');
  const menuWrapper = document.getElementById('menuWrapper');
  const arenaUI = document.getElementById('arenaControlBar');

  if (container) container.style.display = 'none';
  if (arenaUI) arenaUI.style.display = 'none';
  if (menuWrapper) menuWrapper.style.display = 'flex';
};

window.restartMatch = function() {
  if (window.activeArenaScene) {
    window.activeArenaScene.restartMatch();
  } else if (window.startPhaserArena) {
    window.startPhaserArena();
  }
};
