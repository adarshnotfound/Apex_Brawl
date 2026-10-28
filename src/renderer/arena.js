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
    this.activeHoyokuVFX = null;
    this.activePsystrikeVFX = null;
    this.activeMegatonVFX = null;
    this.activeShadowBallChargeVFX = null;
    this.shadowBallFired = false;
    this.tntFired = false;
    this.isStunned = false;
    this.isCaptured = false;
    this.stunTimer = null;
    this.knockbackLaunchTime = 0;

    this.hp = charId === 'strange' ? 960 : (charId === 'chunli' ? 950 : (charId === 'mewtwo' ? 940 : (charId === 'steve' ? 980 : 920)));
    this.maxHp = this.hp;

    // Movement speeds & Jump velocity (balanced fighting game frame data)
    this.walkSpeed = charId === 'strange' ? 215 : (charId === 'chunli' ? 260 : (charId === 'mewtwo' ? 250 : (charId === 'steve' ? 240 : 260)));
    this.dashSpeed = charId === 'strange' ? 460 : (charId === 'chunli' ? 495 : (charId === 'mewtwo' ? 500 : (charId === 'steve' ? 470 : 490)));
    this.jumpVel = charId === 'strange' ? -720 : (charId === 'chunli' ? -760 : (charId === 'mewtwo' ? -750 : (charId === 'steve' ? -730 : -760)));

    // Create sprite
    const initialTexture = charId === 'strange' ? 'strange_sheet_idle' : (charId === 'chunli' ? 'chunli_sheet_idle' : (charId === 'mewtwo' ? 'mewtwo_sheet_idle' : (charId === 'steve' ? 'steve_sheet_idle' : 'harpy_sheet_idle')));
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setDepth(10);
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
    } else if (charId === 'mewtwo') {
      // Mewtwo: standardized 256x256 frame, scale 0.78 gives visual height ~187px, matching ground line exactly!
      this.sprite.setScale(0.78);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(110, 240);
      this.sprite.body.setOffset(73, 10);
    } else if (charId === 'steve') {
      // Steve: scale 0.40 gives visual height ~184px, matching ground line exactly!
      this.sprite.setScale(0.40);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(180, 460);
      this.sprite.body.setOffset(166, 42);
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
    } else if (charId === 'mewtwo') {
      this.sprite.play('mewtwo_anim_idle');
    } else if (charId === 'steve') {
      this.sprite.play('steve_anim_idle');
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
    // Chun-Li, Mewtwo & Steve sprites are authored facing RIGHT by default (flipX = false).
    // Harpy & Strange are authored facing LEFT by default (flipX = false).
    if (this.charId === 'chunli' || this.charId === 'mewtwo' || this.charId === 'steve') {
      return this.sprite.flipX ? -1 : 1;
    }
    return this.sprite.flipX ? 1 : -1;
  }

  setFacingDir(dir) {
    // dir: 1 = facing RIGHT, -1 = facing LEFT
    if (this.charId === 'chunli' || this.charId === 'mewtwo' || this.charId === 'steve') {
      this.sprite.setFlipX(dir === -1);
    } else {
      this.sprite.setFlipX(dir === 1);
    }
  }

  onAnimationUpdate(key, frame) {
    if (key === 'chunli_anim_sp_kikoken' && !this.kikokenFired) {
      // User requirement: Kikoken projectile should be fired after 11th frame of kikoken animation
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 12 || textureFrameIdx >= 11) {
        this.kikokenFired = true;
        if (this.scene && this.scene.spawnKikokenProjectile) {
          this.scene.spawnKikokenProjectile(this);
        }
      }
    } else if (key === 'mewtwo_anim_sp_shadow_ball' && !this.shadowBallFired) {
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 11 || textureFrameIdx >= 10) {
        this.shadowBallFired = true;
        if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
          this.activeShadowBallChargeVFX.destroy();
          this.activeShadowBallChargeVFX = null;
        }
        if (this.scene && this.scene.spawnShadowBallProjectile) {
          this.scene.spawnShadowBallProjectile(this);
        }
      }
    } else if (key === 'steve_anim_sp_tnt' && !this.tntFired) {
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 10 || textureFrameIdx >= 9) {
        this.tntFired = true;
        if (this.scene && this.scene.spawnTNTProjectile) {
          this.scene.spawnTNTProjectile(this);
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
    } else if (key === 'mewtwo_anim_sp_shadow_ball') {
      if (!this.shadowBallFired) {
        this.shadowBallFired = true;
        if (this.scene && this.scene.spawnShadowBallProjectile) {
          this.scene.spawnShadowBallProjectile(this);
        }
      }
      if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
        this.activeShadowBallChargeVFX.destroy();
        this.activeShadowBallChargeVFX = null;
      }
    } else if (key === 'steve_anim_sp_tnt' && !this.tntFired) {
      this.tntFired = true;
      if (this.scene && this.scene.spawnTNTProjectile) {
        this.scene.spawnTNTProjectile(this);
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
      key === 'chunli_anim_dash' ||
      key.startsWith('mewtwo_anim_atk_') ||
      key.startsWith('mewtwo_anim_sp_') ||
      key === 'mewtwo_anim_super' ||
      key === 'mewtwo_anim_dash' ||
      key.startsWith('steve_anim_atk_') ||
      key.startsWith('steve_anim_sp_') ||
      key === 'steve_anim_super' ||
      key === 'steve_anim_dash') {
      this.isAttacking = false;
      this.currentAttackData = null;
      if (this.attackTimer) {
        this.attackTimer.remove();
        this.attackTimer = null;
      }
      if (this.activeHoyokuVFX && this.activeHoyokuVFX.active) {
        this.activeHoyokuVFX.destroy();
        this.activeHoyokuVFX = null;
      }
      if (this.activePsystrikeVFX && this.activePsystrikeVFX.active) {
        this.activePsystrikeVFX.destroy();
        this.activePsystrikeVFX = null;
      }
      if (this.activeMegatonVFX && this.activeMegatonVFX.active) {
        this.activeMegatonVFX.destroy();
        this.activeMegatonVFX = null;
      }
      if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
        this.activeShadowBallChargeVFX.destroy();
        this.activeShadowBallChargeVFX = null;
      }
      this.sprite.setAlpha(1);
      if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      } else if (this.charId === 'mewtwo') {
        this.sprite.setScale(0.78);
        this.sprite.setOrigin(0.479, 0.5);
        this.sprite.body.setSize(110, 240);
        this.sprite.body.setOffset(73, 10);
      } else if (this.charId === 'steve') {
        this.sprite.setScale(0.40);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(180, 460);
        this.sprite.body.setOffset(166, 42);
      }
      this.updateTextureForState();
      if (!this.isInAir) {
        this.snapToGround();
      }
    } else if (key === 'harpy_anim_knockback' || key === 'strange_anim_knockback' || key === 'chunli_anim_knockback' || key === 'mewtwo_anim_knockback' || key === 'steve_anim_knockback') {
      this.isKnockedBack = false;
      this.isStunned = false;
      if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      } else if (this.charId === 'mewtwo') {
        this.sprite.setScale(0.78);
        this.sprite.setOrigin(0.479, 0.5);
        this.sprite.body.setSize(110, 240);
        this.sprite.body.setOffset(73, 10);
      } else if (this.charId === 'steve') {
        this.sprite.setScale(0.40);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(180, 460);
        this.sprite.body.setOffset(166, 42);
      }
      this.updateTextureForState();
      if (!this.isInAir) {
        this.snapToGround();
      }
    }
  }

  snapToGround() {
    if (!this.sprite || !this.sprite.body || this.isCaptured) return;
    const floorY = 575;

    // Fixed ground Y anchors that seat feet flush on the platform at y = 575
    if (this.charId === 'steve') {
      this.sprite.y = 476.60;
    } else if (this.charId === 'mewtwo') {
      this.sprite.y = 479.84;
    } else if (this.charId === 'chunli') {
      this.sprite.setDisplayOrigin(128, 128);
      this.sprite.body.setSize(100, 230);
      this.sprite.body.setOffset(78, 22);
      this.sprite.y = 477.04;
    } else if (this.charId === 'strange') {
      this.sprite.y = 395.80;
    } else if (this.charId === 'harpy') {
      this.sprite.y = 443.00;
    } else {
      const scaleY = Math.abs(this.sprite.scaleY);
      const bodyBottomRel = scaleY * (this.sprite.body.offset.y - this.sprite.displayOriginY + this.sprite.body.sourceHeight);
      this.sprite.y = floorY - bodyBottomRel;
    }

    if (this.sprite.body.updateFromGameObject) {
      this.sprite.body.updateFromGameObject();
    }
    this.sprite.body.position.y = floorY - this.sprite.body.height;
    this.sprite.body.prev.y = this.sprite.body.position.y;
    this.sprite.body.prev.x = this.sprite.body.position.x;
    if (this.sprite.body.prevFrame) {
      this.sprite.body.prevFrame.y = this.sprite.body.position.y;
      this.sprite.body.prevFrame.x = this.sprite.body.position.x;
    }
    this.sprite.body.velocity.y = 0;
    this.sprite.body.blocked.down = true;
    this.sprite.body.touching.down = true;
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
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setTexture('chunli_sheet_jump');
        this.sprite.play('chunli_anim_jump', true);
      } else {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.setTexture('chunli_sheet_crouch');
          this.sprite.play('chunli_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setTexture('chunli_sheet_idle');
          this.sprite.play('chunli_anim_idle', true);
        }
      }
      return;
    }

    if (this.charId === 'mewtwo') {
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.setScale(0.70);
        this.sprite.setOrigin(0.472, 0.483);
        this.sprite.body.setSize(110, 200);
        this.sprite.body.setOffset(95, 80);
        this.sprite.setTexture('mewtwo_sheet_hit');
        this.sprite.play('mewtwo_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.sprite.setScale(0.86);
        this.sprite.setOrigin(0.484, 0.510);
        this.sprite.body.setSize(110, 216);
        this.sprite.body.setOffset(60, 10);
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setTexture('mewtwo_sheet_jump');
        this.sprite.play('mewtwo_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.setScale(0.68);
          this.sprite.setOrigin(0.462, 0.504);
          this.sprite.body.setSize(110, 160);
          this.sprite.body.setOffset(95, 130);
          this.sprite.play('mewtwo_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setScale(0.78);
          this.sprite.setOrigin(0.479, 0.5);
          this.sprite.body.setSize(110, 240);
          this.sprite.body.setOffset(73, 10);
          this.sprite.setTexture('mewtwo_sheet_idle');
          this.sprite.play('mewtwo_anim_idle', true);
        }
      }
      return;
    }

    if (this.charId === 'steve') {
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.setScale(0.343);
        this.sprite.setOrigin(0.5, 0.488);
        this.sprite.body.setSize(210, 525);
        this.sprite.body.setOffset(195, 53);
        this.sprite.setTexture('steve_sheet_hit');
        this.sprite.play('steve_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.sprite.setScale(0.519);
        this.sprite.setOrigin(0.5, 0.509);
        this.sprite.body.setSize(140, 355);
        this.sprite.body.setOffset(160, 71);
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setTexture('steve_sheet_jump');
        this.sprite.play('steve_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.setScale(0.343);
          this.sprite.setOrigin(0.5, 0.503);
          this.sprite.body.setSize(210, 465);
          this.sprite.body.setOffset(195, 122);
          this.sprite.play('steve_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setScale(0.40);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(180, 460);
          this.sprite.body.setOffset(166, 42);
          this.sprite.setTexture('steve_sheet_idle');
          this.sprite.play('steve_anim_idle', true);
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
    this.isCaptured = false;
    if (this.sprite && this.sprite.body) {
      this.sprite.body.setAllowGravity(true);
    }
    if (this.sprite && this.sprite.chain) this.sprite.chain();
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }
    if (this.activeHoyokuVFX && this.activeHoyokuVFX.active) {
      this.activeHoyokuVFX.destroy();
      this.activeHoyokuVFX = null;
    }
    if (this.activePsystrikeVFX && this.activePsystrikeVFX.active) {
      this.activePsystrikeVFX.destroy();
      this.activePsystrikeVFX = null;
    }
    if (this.activeMegatonVFX && this.activeMegatonVFX.active) {
      this.activeMegatonVFX.destroy();
      this.activeMegatonVFX = null;
    }
    if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
      this.activeShadowBallChargeVFX.destroy();
      this.activeShadowBallChargeVFX = null;
    }
    this.isStunned = false;
    this.isCaptured = false;
    this.knockbackLaunchTime = 0;
    if (this.stunTimer) {
      this.stunTimer.remove();
      this.stunTimer = null;
    }
    this.sprite.setAlpha(1);
    this.shadowBallFired = false;
    this.tntFired = false;

    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
    if (this.sprite && this.sprite.body) {
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
    } else if (this.charId === 'mewtwo') {
      this.sprite.setScale(0.78);
      this.sprite.setOrigin(0.479, 0.5);
      this.sprite.body.setSize(110, 240);
      this.sprite.body.setOffset(73, 10);
      this.sprite.setTexture('mewtwo_sheet_idle');
      this.sprite.play('mewtwo_anim_idle', true);
    } else if (this.charId === 'steve') {
      this.sprite.setScale(0.40);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(180, 460);
      this.sprite.body.setOffset(166, 42);
      this.sprite.setTexture('steve_sheet_idle');
      this.sprite.play('steve_anim_idle', true);
    } else {
      this.sprite.setTexture('harpy_sheet_idle');
      this.sprite.play('harpy_anim_idle', true);
    }
    this.snapToGround();
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
    this.shadowBallFired = false;
    this.tntFired = false;

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
    } else if (this.charId === 'mewtwo') {
      if (this.isInAir) {
        if (animKey === 'mewtwo_anim_atk_8a') {
          this.sprite.setScale(0.78);
          this.sprite.setOrigin(0.473, 0.5);
          this.sprite.body.setSize(110, 240);
          this.sprite.body.setOffset(73, 10);
        } else if (animKey === 'mewtwo_anim_atk_8c') {
          this.sprite.setScale(0.98);
          this.sprite.setOrigin(0.483, 0.509);
          this.sprite.body.setSize(110, 195);
          this.sprite.body.setOffset(50, 10);
        }
      } else {
        if (animKey === 'mewtwo_anim_atk_5a') {
          this.sprite.setScale(0.78);
          this.sprite.setOrigin(0.473, 0.5);
          this.sprite.body.setSize(110, 240);
          this.sprite.body.setOffset(73, 10);
        } else if (animKey === 'mewtwo_anim_atk_5b') {
          this.sprite.setScale(0.98);
          this.sprite.setOrigin(0.479, 0.523);
          this.sprite.body.setSize(110, 198);
          this.sprite.body.setOffset(50, 10);
        } else if (animKey === 'mewtwo_anim_atk_5c') {
          this.sprite.setScale(0.98);
          this.sprite.setOrigin(0.483, 0.509);
          this.sprite.body.setSize(110, 195);
          this.sprite.body.setOffset(50, 10);
        } else if (animKey === 'mewtwo_anim_sp_shadow_ball') {
          this.sprite.setScale(0.86);
          this.sprite.setOrigin(0.457, 0.497);
          this.sprite.body.setSize(110, 216);
          this.sprite.body.setOffset(60, 10);
        } else if (animKey === 'mewtwo_anim_super') {
          this.sprite.setScale(0.98);
          this.sprite.setOrigin(0.476, 0.523);
          this.sprite.body.setSize(110, 198);
          this.sprite.body.setOffset(50, 10);
        } else {
          this.sprite.setScale(0.78);
          this.sprite.setOrigin(0.479, 0.5);
          this.sprite.body.setSize(110, 240);
          this.sprite.body.setOffset(73, 10);
        }
      }
    } else if (this.charId === 'steve') {
      if (this.isInAir) {
        if (animKey === 'steve_anim_atk_8a') {
          this.sprite.setScale(0.421);
          this.sprite.setOrigin(0.5, 0.501);
          this.sprite.body.setSize(170, 436);
          this.sprite.body.setOffset(171, 51);
        } else if (animKey === 'steve_anim_atk_8c') {
          this.sprite.setScale(0.458);
          this.sprite.setOrigin(0.5, 0.502);
          this.sprite.body.setSize(156, 400);
          this.sprite.body.setOffset(152, 49);
        }
      } else {
        // Ground attacks: precise floor anchoring & consistent character scale
        if (animKey === 'steve_anim_atk_5a' || animKey === 'steve_anim_super') {
          this.sprite.setScale(0.421);
          this.sprite.setOrigin(0.5, 0.499);
          this.sprite.body.setSize(170, 438);
          this.sprite.body.setOffset(171, 51);
        } else if (animKey === 'steve_anim_atk_5b') {
          this.sprite.setScale(0.459);
          this.sprite.setOrigin(0.5, 0.506);
          this.sprite.body.setSize(156, 400);
          this.sprite.body.setOffset(152, 49);
        } else if (animKey === 'steve_anim_atk_5c') {
          this.sprite.setScale(0.509);
          this.sprite.setOrigin(0.5, 0.513);
          this.sprite.body.setSize(142, 362);
          this.sprite.body.setOffset(139, 49);
        } else if (animKey === 'steve_anim_sp_tnt') {
          this.sprite.setScale(0.437);
          this.sprite.setOrigin(0.5, 0.487);
          this.sprite.body.setSize(164, 422);
          this.sprite.body.setOffset(148, 29);
        } else {
          this.sprite.setScale(0.40);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(180, 460);
          this.sprite.body.setOffset(166, 42);
        }
      }
    }

    this.sprite.play(animKey, true);
    if (!this.isInAir) {
      this.snapToGround();
    }

    // Guaranteed recovery failsafe: after animation duration, always release attack lock!
    if (this.attackTimer) this.attackTimer.remove();
    this.attackTimer = this.scene.time.delayedCall(duration, () => {
      if (this.isAttacking) {
        if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.setDisplayOrigin(128, 128);
          this.sprite.body.setSize(100, 230);
          this.sprite.body.setOffset(78, 22);
          this.sprite.body.setAllowGravity(true);
        } else if (this.charId === 'mewtwo' && this.sprite && this.sprite.body) {
          this.sprite.setScale(0.78);
          this.sprite.setOrigin(0.479, 0.5);
          this.sprite.body.setSize(110, 240);
          this.sprite.body.setOffset(73, 10);
        } else if (this.charId === 'steve' && this.sprite && this.sprite.body) {
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(180, 460);
          this.sprite.body.setOffset(166, 42);
        }
        this.isAttacking = false;
        this.currentAttackData = null;
        this.updateTextureForState();
        if (!this.isInAir) {
          this.snapToGround();
        }
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
    this.isCaptured = false;
    this.isStunned = false;
    if (this.sprite && this.sprite.chain) this.sprite.chain();
    this.currentAttackData = null;
    if (this.sprite && this.sprite.body) {
      this.sprite.body.setAllowGravity(true);
    }
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }
    if (this.stunTimer) {
      this.stunTimer.remove();
      this.stunTimer = null;
    }
    if (this.activeHoyokuVFX && this.activeHoyokuVFX.active) {
      this.activeHoyokuVFX.destroy();
      this.activeHoyokuVFX = null;
    }
    if (this.activePsystrikeVFX && this.activePsystrikeVFX.active) {
      this.activePsystrikeVFX.destroy();
      this.activePsystrikeVFX = null;
    }
    if (this.activeMegatonVFX && this.activeMegatonVFX.active) {
      this.activeMegatonVFX.destroy();
      this.activeMegatonVFX = null;
    }
    if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
      this.activeShadowBallChargeVFX.destroy();
      this.activeShadowBallChargeVFX = null;
    }
    this.sprite.setAlpha(1);
    this.shadowBallFired = false;
    this.tntFired = false;
    // Spawn floating damage text (adjusted for character scale)
    const textY = this.charId === 'strange' ? this.sprite.y - 120 : (this.charId === 'steve' ? this.sprite.y - 110 : this.sprite.y - 95);
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

      this.sprite.setVelocityX(pushDir * (attackData.knockbackX || 500));
      this.sprite.setVelocityY(attackData.knockbackY || -380);

      if (this.sprite.body) {
        this.sprite.body.blocked.down = false;
        this.sprite.body.touching.down = false;
      }
      this.sprite.y = Math.min(this.sprite.y, 465);
      this.knockbackLaunchTime = (this.scene && this.scene.time) ? this.scene.time.now : Date.now();

      if (this.charId === 'strange') {
        this.sprite.setTexture('strange_sheet_jump');
        this.sprite.play('strange_anim_knockback', true);
      } else if (this.charId === 'chunli') {
        this.sprite.setTexture('chunli_sheet_hit');
        this.sprite.setDisplayOrigin(150, 169);
        this.sprite.body.setSize(100, 210);
        this.sprite.body.setOffset(100, 82);
        this.sprite.play('chunli_anim_knockback', true);
      } else if (this.charId === 'mewtwo') {
        this.sprite.setScale(0.70);
        this.sprite.setOrigin(0.472, 0.483);
        this.sprite.body.setSize(110, 200);
        this.sprite.body.setOffset(95, 80);
        this.sprite.setTexture('mewtwo_sheet_hit');
        this.sprite.play('mewtwo_anim_knockback', true);
      } else if (this.charId === 'steve') {
        this.sprite.setScale(0.343);
        this.sprite.setOrigin(0.5, 0.488);
        this.sprite.body.setSize(210, 525);
        this.sprite.body.setOffset(195, 53);
        this.sprite.setTexture('steve_sheet_hit');
        this.sprite.play('steve_anim_knockback', true);
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
      this.isStunned = true;
      this.currentAction = 'STUNNED / RECOIL';
      if (this.stunTimer) this.stunTimer.remove();
      this.stunTimer = this.scene.time.delayedCall(attackData.stunDuration || 140, () => {
        this.isStunned = false;
        this.stunTimer = null;
        this.updateTextureForState();
        if (this.sprite && this.sprite.body && (this.sprite.body.blocked.down || this.sprite.y >= (this.charId === 'strange' ? 392 : 472))) {
          this.isInAir = false;
          this.snapToGround();
        }
      });
      this.updateTextureForState();
    }
  }

  handleControls(input) {
    if (!this.sprite || !this.sprite.body) return;
    if (this.isStunned || this.isCaptured) return;
    if (this.hp <= 0 || (this.scene && this.scene.roundState !== 'FIGHTING')) {
      if (this.hp <= 0) {
        this.currentAction = 'DEFEATED (K.O.)';
      } else {
        this.currentAction = 'READY';
      }
      this.sprite.setVelocityX(0);
      return;
    }

    // A fighter in launch momentum (moving upward or recently launched) cannot land yet
    const currentTime = (this.scene && this.scene.time) ? this.scene.time.now : Date.now();
    const isRecentlyLaunched = this.isKnockedBack && (this.knockbackLaunchTime && (currentTime - this.knockbackLaunchTime < 180));
    const isMovingUpward = this.sprite.body.velocity.y < 0;

    // Ground Check: physical contact or world bottom
    const onGround = Boolean(
      this.isCrouching ||
      this.sprite.body.blocked.down ||
      this.sprite.body.touching.down ||
      this.sprite.body.bottom >= 568 ||
      (this.sprite.y >= (this.charId === 'strange' ? 392 : 472))
    );

    // Landing detection: ONLY when falling downward (velocity.y >= 0) and not during active launch ascent!
    if (onGround && !isMovingUpward && !isRecentlyLaunched && (this.isInAir || this.isKnockedBack)) {
      if (this.isAttacking) {
        // Do not abort active attack animation upon ground contact
        this.isInAir = false;
        this.isKnockedBack = false;
        this.isStunned = false;
        this.snapToGround();
      } else {
        this.isInAir = false;
        this.isKnockedBack = false;
        this.isStunned = false;
        this.isAttacking = false;
        this.currentAttackData = null;
        if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.setDisplayOrigin(128, 128);
          this.sprite.body.setSize(100, 230);
          this.sprite.body.setOffset(78, 22);
          this.sprite.body.setAllowGravity(true);
        }
        this.updateTextureForState();
        this.snapToGround();
      }
    } else if (!onGround || isMovingUpward || isRecentlyLaunched) {
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
      } else if (this.charId === 'mewtwo') {
        if (this.isInAir) {
          this.triggerAttack('AIR PSYCHIC JAB (8A)', 'mewtwo_anim_atk_8a', {
            damage: 50,
            rangeX: 165,
            rangeY: 90,
            knockbackX: 190,
            knockbackY: 50,
            isSpecial: false
          }, 450);
        } else {
          this.triggerAttack('PSYCHIC PALM (5A)', 'mewtwo_anim_atk_5a', {
            damage: 45,
            rangeX: 170,
            rangeY: 80,
            knockbackX: 180,
            knockbackY: 0,
            isSpecial: false
          }, 460);
        }
      } else if (this.charId === 'steve') {
        if (this.isInAir) {
          this.triggerAttack('AIR PUNCH (8A)', 'steve_anim_atk_8a', {
            damage: 48,
            rangeX: 160,
            rangeY: 90,
            knockbackX: 180,
            knockbackY: 50,
            isSpecial: false
          }, 450);
        } else {
          this.triggerAttack('BLOCKY PUNCH (5A)', 'steve_anim_atk_5a', {
            damage: 42,
            rangeX: 160,
            rangeY: 80,
            knockbackX: 170,
            knockbackY: 0,
            isSpecial: false
          }, 500);
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
      } else if (this.charId === 'mewtwo') {
        if (this.isInAir) {
          this.triggerAttack('AIR PSYCHIC BURST (8B)', 'mewtwo_anim_atk_8a', {
            damage: 85,
            rangeX: 180,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 80,
            isSpecial: false
          }, 500);
        } else {
          this.triggerAttack('PSYCHIC CRUSH (5B)', 'mewtwo_anim_atk_5b', {
            damage: 95,
            rangeX: 800,
            rangeY: 160,
            knockbackX: 250,
            knockbackY: -80,
            isSpecial: false
          }, 1000);
          this.hasDealtDamage = true; // Damage applied on ground slam impact in spawnPsychicCrushVFX
          if (this.scene && this.scene.spawnPsychicCrushVFX) {
            this.scene.spawnPsychicCrushVFX(this);
          }
        }
      } else if (this.charId === 'steve') {
        if (this.isInAir) {
          this.triggerAttack('AIR SWORD SWEEP (8B)', 'steve_anim_atk_8c', {
            damage: 84,
            rangeX: 180,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 80,
            isSpecial: false
          }, 550);
        } else {
          this.triggerAttack('DIAMOND SWORD SLASH (5B)', 'steve_anim_atk_5b', {
            damage: 84,
            rangeX: 190,
            rangeY: 90,
            knockbackX: 230,
            knockbackY: -30,
            isSpecial: false
          }, 750);
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
            knockbackX: 440,
            knockbackY: -300,
            isSpecial: true
          });
        }
      } else if (this.charId === 'chunli') {
        if (this.isInAir) {
          this.triggerAttack('AIR SPINNING BIRD KICK (8C)', 'chunli_anim_atk_8c', {
            damage: 110,
            rangeX: 200,
            rangeY: 110,
            knockbackX: 380,
            knockbackY: 140,
            isSpecial: true
          }, 550);
          if (this.scene && this.scene.spawnSpinningBirdVFX) {
            this.scene.spawnSpinningBirdVFX(this);
          }
        } else {
          this.triggerAttack('SPINNING BIRD KICK (5C)', 'chunli_anim_atk_5c', {
            damage: 125,
            rangeX: 220,
            rangeY: 100,
            knockbackX: 420,
            knockbackY: -290,
            isSpecial: true
          }, 650);
          if (this.scene && this.scene.spawnSpinningBirdVFX) {
            this.scene.spawnSpinningBirdVFX(this);
          }
        }
      } else if (this.charId === 'mewtwo') {
        if (this.isInAir) {
          this.triggerAttack('AIR TELEPORT CLEAVE (8C)', 'mewtwo_anim_atk_8c', {
            damage: 110,
            rangeX: 200,
            rangeY: 110,
            knockbackX: 290,
            knockbackY: 130,
            isSpecial: false
          }, 550);
        } else {
          this.triggerAttack('TELEPORT STRIKE (5C)', 'mewtwo_anim_atk_5c', {
            damage: 125,
            rangeX: 230,
            rangeY: 100,
            knockbackX: 440,
            knockbackY: -300,
            isSpecial: true
          }, 750);
          if (this.scene && this.scene.executeTeleportStrike) {
            this.scene.executeTeleportStrike(this);
          }
        }
      } else if (this.charId === 'steve') {
        if (this.isInAir) {
          this.triggerAttack('AIR DOWNWARD SLASH (8C)', 'steve_anim_atk_8c', {
            damage: 112,
            rangeX: 200,
            rangeY: 110,
            knockbackX: 280,
            knockbackY: 130,
            isSpecial: false
          }, 550);
        } else {
          this.triggerAttack('PICKAXE GROUND SMASH (5C)', 'steve_anim_atk_5c', {
            damage: 128,
            rangeX: 220,
            rangeY: 100,
            knockbackX: 420,
            knockbackY: -320,
            isSpecial: true
          }, 850);
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
            knockbackX: 420,
            knockbackY: -280,
            isSpecial: true
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
            knockbackX: 320,
            knockbackY: -540,
            isSpecial: true
          });
        } else {
          this.triggerAttack('CRIMSON BANDS (PROJECTILE)', 'strange_anim_sp_projectile', {
            damage: 155,
            rangeX: 140,
            rangeY: 100,
            knockbackX: 480,
            knockbackY: -340,
            isSpecial: true
          });
          // Summon real traveling mystic projectile!
          if (this.scene && this.scene.spawnMysticProjectile) {
            this.scene.spawnMysticProjectile(this);
          }
        }
      } else if (this.charId === 'chunli') {
        this.triggerAttack('KIKOKEN (PROJECTILE)', 'chunli_anim_sp_kikoken', {
          damage: 150,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 500,
          knockbackY: -350,
          isSpecial: true
        }, 1200);
      } else if (this.charId === 'mewtwo') {
        this.triggerAttack('SHADOW BALL (PROJECTILE)', 'mewtwo_anim_sp_shadow_ball', {
          damage: 155,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 520,
          knockbackY: -360,
          isSpecial: true
        }, 1100);
        if (this.scene && this.scene.spawnShadowBallChargeVFX) {
          this.scene.spawnShadowBallChargeVFX(this);
        }
      } else if (this.charId === 'steve') {
        this.triggerAttack('TNT TOSS (PROJECTILE)', 'steve_anim_sp_tnt', {
          damage: 150,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 540,
          knockbackY: -380,
          isSpecial: true
        }, 1000);
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
      } else if (this.charId === 'mewtwo') {
        this.triggerAttack('PSYSTRIKE (SUPER)', 'mewtwo_anim_super', {
          damage: 260,
          rangeX: 320,
          rangeY: 200,
          knockbackX: 720,
          knockbackY: -560,
          isSpecial: true
        }, 2200);
        this.hasDealtDamage = true; // Damage applies only when the Psystrike energy ball explodes upon the opponent!
        if (this.scene && this.scene.spawnPsystrikeVFX) {
          this.scene.spawnPsystrikeVFX(this);
        }
      } else if (this.charId === 'steve') {
        this.triggerAttack('MEGATON DETONATION (SUPER)', 'steve_anim_super', {
          damage: 260,
          rangeX: 800,
          rangeY: 600,
          knockbackX: 720,
          knockbackY: -560,
          isSpecial: true
        }, 750);
        this.hasDealtDamage = true; // Damage applied when TNT auto-spawns on opponent and explodes to pieces!
        if (this.scene && this.scene.spawnMegatonSuperVFX) {
          this.scene.spawnMegatonSuperVFX(this);
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
      } else if (this.charId === 'mewtwo') {
        this.triggerAttack('TELEKINETIC MEDITATION', 'mewtwo_anim_idle', null, 500);
      } else if (this.charId === 'steve') {
        this.triggerAttack('CROUCH SPAM', 'steve_anim_crouch_down', null, 500);
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
      } else if (this.charId === 'mewtwo') {
        this.currentAction = 'TELEPORT DASH';
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.play('mewtwo_anim_dash', true);
        this.sprite.setTint(0xc084fc);
        if (this.scene && this.scene.spawnTeleportVFX) {
          this.scene.spawnTeleportVFX(this.sprite.x, this.sprite.y);
        }
        this.scene.time.delayedCall(180, () => {
          if (this.isMirror) this.sprite.setTint(0xc4b5fd);
          else this.sprite.clearTint();
        });
      } else if (this.charId === 'steve') {
        this.currentAction = 'SPRINT DASH';
        this.sprite.setScale(0.40);
        this.sprite.setOrigin(0.492, 0.502);
        this.sprite.body.setSize(180, 460);
        this.sprite.body.setOffset(166, 42);
        this.sprite.play('steve_anim_dash', true);
        this.sprite.setTint(0x2dd4bf);
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
          this.sprite.setDisplayOrigin(128, 128);
          this.sprite.body.setSize(100, 230);
          this.sprite.body.setOffset(78, 22);
          this.sprite.setTexture('chunli_sheet_jump');
          this.sprite.play('chunli_anim_jump');
        } else if (this.charId === 'mewtwo') {
          this.sprite.setScale(0.86);
          this.sprite.setOrigin(0.484, 0.510);
          this.sprite.body.setSize(110, 216);
          this.sprite.body.setOffset(60, 10);
          this.sprite.setTexture('mewtwo_sheet_jump');
          this.sprite.play('mewtwo_anim_jump');
        } else if (this.charId === 'steve') {
          this.sprite.setScale(0.519);
          this.sprite.setOrigin(0.5, 0.509);
          this.sprite.body.setSize(140, 355);
          this.sprite.body.setOffset(160, 71);
          this.sprite.setTexture('steve_sheet_jump');
          this.sprite.play('steve_anim_jump');
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
            this.sprite.setDisplayOrigin(128, 128);
            this.sprite.body.setSize(100, 230);
            this.sprite.body.setOffset(78, 22);
            this.sprite.setTexture('chunli_sheet_crouch');
            this.sprite.play('chunli_anim_crouch_down').chain('chunli_anim_crouch_hold');
            this.snapToGround();
          } else if (this.charId === 'mewtwo') {
            this.sprite.setScale(0.68);
            this.sprite.setOrigin(0.462, 0.504);
            this.sprite.body.setSize(110, 160);
            this.sprite.body.setOffset(95, 130);
            this.sprite.play('mewtwo_anim_crouch_down').chain('mewtwo_anim_crouch_hold');
            this.snapToGround();
          } else if (this.charId === 'steve') {
            this.sprite.setScale(0.343);
            this.sprite.setOrigin(0.5, 0.503);
            this.sprite.body.setSize(210, 465);
            this.sprite.body.setOffset(195, 122);
            this.sprite.play('steve_anim_crouch_down').chain('steve_anim_crouch_hold');
            this.snapToGround();
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
            this.sprite.setDisplayOrigin(128, 128);
            this.sprite.body.setSize(100, 230);
            this.sprite.body.setOffset(78, 22);
            this.sprite.setTexture('chunli_sheet_idle');
            this.sprite.play('chunli_anim_idle', true);
            this.snapToGround();
          } else if (this.charId === 'mewtwo') {
            this.sprite.setScale(0.78);
            this.sprite.setOrigin(0.479, 0.5);
            this.sprite.body.setSize(110, 240);
            this.sprite.body.setOffset(73, 10);
            this.sprite.setTexture('mewtwo_sheet_idle');
            this.sprite.play('mewtwo_anim_idle', true);
            this.snapToGround();
          } else if (this.charId === 'steve') {
            this.sprite.setScale(0.40);
            this.sprite.setOrigin(0.5, 0.5);
            this.sprite.body.setSize(180, 460);
            this.sprite.body.setOffset(166, 42);
            this.sprite.setTexture('steve_sheet_idle');
            this.sprite.play('steve_anim_idle', true);
            this.snapToGround();
          }
        }

        if (input.left) {
          this.sprite.setVelocityX(-this.walkSpeed);
          this.setFacingDir(-1); // Faces LEFT
          if (!input.up) {
            this.currentAction = 'WALK LEFT';
            if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
              this.sprite.setTexture('chunli_sheet_walk');
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.502, 0.5);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 20);
              this.sprite.play('mewtwo_anim_walk', true);
            } else if (this.charId === 'steve') {
              this.sprite.setScale(0.40);
              this.sprite.setOrigin(0.492, 0.502);
              this.sprite.body.setSize(180, 460);
              this.sprite.body.setOffset(166, 42);
              this.sprite.play('steve_anim_walk', true);
            } else this.sprite.play('harpy_anim_walk', true);
          }
        } else if (input.right) {
          this.sprite.setVelocityX(this.walkSpeed);
          this.setFacingDir(1); // Faces RIGHT
          if (!input.up) {
            this.currentAction = 'WALK RIGHT';
            if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
              this.sprite.setTexture('chunli_sheet_walk');
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.502, 0.5);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 20);
              this.sprite.play('mewtwo_anim_walk', true);
            } else if (this.charId === 'steve') {
              this.sprite.setScale(0.40);
              this.sprite.setOrigin(0.492, 0.502);
              this.sprite.body.setSize(180, 460);
              this.sprite.body.setOffset(166, 42);
              this.sprite.play('steve_anim_walk', true);
            } else this.sprite.play('harpy_anim_walk', true);
          }
        } else {
          this.sprite.setVelocityX(0);
          if (!input.up) {
            this.currentAction = 'IDLE';
            if (this.charId === 'strange') this.sprite.play('strange_anim_idle', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
              this.sprite.setTexture('chunli_sheet_idle');
              this.sprite.play('chunli_anim_idle', true);
              this.snapToGround();
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.479, 0.5);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 10);
              this.sprite.play('mewtwo_anim_idle', true);
              this.snapToGround();
            } else if (this.charId === 'steve') {
              this.sprite.setScale(0.40);
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.body.setSize(180, 460);
              this.sprite.body.setOffset(166, 42);
              this.sprite.play('steve_anim_idle', true);
              this.snapToGround();
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
      } else if (this.charId === 'chunli' && !onGround && this.sprite.anims.currentAnim?.key !== 'chunli_anim_jump') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        this.sprite.setTexture('chunli_sheet_jump');
        this.sprite.play('chunli_anim_jump', true);
      } else if (this.charId === 'mewtwo' && this.sprite.anims.currentAnim?.key !== 'mewtwo_anim_jump') {
        this.sprite.setScale(0.86);
        this.sprite.setOrigin(0.484, 0.510);
        this.sprite.body.setSize(110, 216);
        this.sprite.body.setOffset(60, 10);
        this.sprite.setTexture('mewtwo_sheet_jump');
        this.sprite.play('mewtwo_anim_jump', true);
      } else if (this.charId === 'steve' && this.sprite.anims.currentAnim?.key !== 'steve_anim_jump') {
        this.sprite.setScale(0.519);
        this.sprite.setOrigin(0.5, 0.509);
        this.sprite.body.setSize(140, 355);
        this.sprite.body.setOffset(160, 71);
        this.sprite.setTexture('steve_sheet_jump');
        this.sprite.play('steve_anim_jump', true);
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
    // Real-time synchronization with the VS loading screen
    this.load.on('progress', (value) => {
      if (window.onPhaserPreloadProgress) {
        window.onPhaserPreloadProgress(value);
      }
    });

    this.load.on('fileprogress', (file) => {
      if (window.onPhaserPreloadFile && file && file.key) {
        window.onPhaserPreloadFile(file.key);
      }
    });

    this.load.on('complete', () => {
      if (window.onPhaserPreloadComplete) {
        window.onPhaserPreloadComplete();
      }
    });

    // 1. Japanese Dark-Fantasy Temple Arena Assets (Moonlit Mountain Shrine Courtyard)
    const jBase = 'assets/backgrounds/japanese_temple/';
    this.load.image('japan_sky_mountains', jBase + 'layer1_2_sky_mountains_backdrop.png');
    this.load.image('japan_temple_master', jBase + 'aaa_japanese_temple_arena_1080p.png');
    this.load.image('japan_floor', jBase + 'layer4_fighting_arena_floor_transparent.png');
    this.load.spritesheet('japan_lantern', jBase + 'hanging_lantern_spritesheet_transparent.png', { frameWidth: 344, frameHeight: 768 });
    this.load.spritesheet('japan_brazier', jBase + 'kagaribi_fire_brazier_spritesheet_transparent.png', { frameWidth: 344, frameHeight: 768 });
    this.load.spritesheet('japan_sakura', jBase + 'sakura_petals_spritesheet_transparent.png', { frameWidth: 229, frameHeight: 256 });

    // 1.5. Sky Temple Arena Assets (The Eternal Sky Temple - Modern Clean AAA 2.5D Environment)
    const skBase = 'assets/backgrounds/sky_temple/';
    this.load.image('sky_backdrop', skBase + 'sky_temple_backdrop_1080p.png');
    this.load.image('sky_distant', skBase + 'sky_temple_sky_distant_720p.png');
    this.load.image('sky_floor', skBase + 'sky_temple_floor_transparent.png');

    // Character Portraits
    this.load.image('harpy_portrait', '../../assets/characters/harpy/portrait.png');
    this.load.image('strange_portrait', '../../assets/characters/Dr Strange/portrait.png');
    this.load.image('chunli_portrait', '../../assets/characters/ChunLi/portrait.png');
    this.load.image('mewtwo_portrait', '../../assets/characters/Mewtwo/portrait.png');
    this.load.image('steve_portrait', '../../assets/characters/Steve/portrait.png');

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

    // 5. Mewtwo Sprite Sheets & VFX (Exact Grid Dimensions)
    const mBase = '../../assets/characters/Mewtwo/';
    this.load.spritesheet('mewtwo_sheet_idle', mBase + '01_Mewtwo_Idle.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_walk', mBase + '02_Mewtwo_Walk.png', { frameWidth: 256, frameHeight: 272 });
    this.load.spritesheet('mewtwo_sheet_jump', mBase + '03_Mewtwo_Jump.png', { frameWidth: 230, frameHeight: 232 });
    this.load.spritesheet('mewtwo_sheet_crouch', mBase + '04_Mewtwo_Crouch.png', { frameWidth: 300, frameHeight: 298 });
    this.load.spritesheet('mewtwo_sheet_hit', mBase + '05_Mewtwo_HitReaction.png', { frameWidth: 300, frameHeight: 298 });
    this.load.spritesheet('mewtwo_sheet_basic_strike', mBase + '06_Mewtwo_BasicStrike.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_shadow_ball', mBase + '07_Mewtwo_ShadowBall.png', { frameWidth: 230, frameHeight: 232 });
    this.load.spritesheet('mewtwo_sheet_psychic_crush', mBase + '08_Mewtwo_PsychicCrush.png', { frameWidth: 210, frameHeight: 212 });
    this.load.spritesheet('mewtwo_sheet_teleport_strike', mBase + '09_Mewtwo_TeleportStrike.png', { frameWidth: 210, frameHeight: 212 });
    this.load.spritesheet('mewtwo_sheet_psystrike', mBase + '10_Mewtwo_Psystrike.png', { frameWidth: 210, frameHeight: 212 });

    // Mewtwo VFX & Projectiles
    this.load.spritesheet('mewtwo_sheet_projectile', mBase + '11_ShadowBall_Projectile.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_impact', mBase + '12_ShadowBall_Impact.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_charge', mBase + '13_Psychic_Charge.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_disappear', mBase + '14_Teleport_Disappear.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_reappear', mBase + '15_Teleport_Reappear.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_forcefield', mBase + '16_PsychicCrush_ForceField.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_psystrike', mBase + '17_Psystrike_Explosion.png', { frameWidth: 210, frameHeight: 212 });

    // 6. Steve Sprite Sheets & VFX (Exact Grid Dimensions)
    const stBase = '../../assets/characters/Steve/';
    this.load.spritesheet('steve_sheet_idle', stBase + 'Steve_Idle.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_walk', stBase + 'Steve_Walk.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_jump', stBase + 'Steve_Jump.png', { frameWidth: 460, frameHeight: 464 });
    this.load.spritesheet('steve_sheet_crouch', stBase + 'Steve_Crouch.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_hit', stBase + 'Steve_HitReaction.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_punch', stBase + 'Steve_Punch.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_sword', stBase + 'Steve_SwordSlash.png', { frameWidth: 460, frameHeight: 464 });
    this.load.spritesheet('steve_sheet_pickaxe', stBase + 'Steve_PickaxeSmash.png', { frameWidth: 421, frameHeight: 424 });
    this.load.spritesheet('steve_sheet_tnt_throw', stBase + 'Steve_TNT_Throw.png', { frameWidth: 460, frameHeight: 464 });

    // Steve VFX & Projectiles
    this.load.spritesheet('steve_sheet_tnt_flight', stBase + 'TNT_Flight.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_tnt_fuse', stBase + 'TNT_Fuse.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_tnt_explosion', stBase + 'TNT_Explosion.png', { frameWidth: 421, frameHeight: 424 });
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

    // 1. World Floor at y = 575 across 1920-wide combat arena
    this.physics.world.setBounds(0, 0, 1920, 575);
    this.cameras.main.setBounds(0, 0, 1920, 720);

    // 2. Register Animations (Fighters + Environmental Props)
    this.registerEnvironmentAnimations();
    this.registerHarpyAnimations();
    this.registerStrangeAnimations();
    this.registerChunLiAnimations();
    this.registerMewtwoAnimations();
    this.registerSteveAnimations();

    // 3. Build Selected Arena Environment (Japanese Mountain Shrine or Eternal Sky Temple)
    this.currentStage = window.selectedStage || 'japanese_temple';
    if (this.currentStage === 'sky_temple') {
      this.buildSkyTempleEnvironment();
    } else {
      this.buildJapaneseEnvironment();
    }

    // 3.5. Projectiles Group (no gravity so projectiles fly straight horizontally)
    this.projectiles = this.physics.add.group({ allowGravity: false });

    // 4. Resolve selected fighters
    const p1Char = window.selectedFighterP1 || 'harpy';
    const p2Char = window.selectedFighterP2 || 'strange';
    const isMirror = p1Char === p2Char;

    // Spawn Player 1 (Left mark, faces right)
    this.fighterP1 = new FighterEntity(this, 550, 460, p1Char, 1, false);

    // Spawn Player 2 (Right mark, faces left)
    this.fighterP2 = new FighterEntity(this, 1370, 460, p2Char, 2, isMirror);

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

    // 6. Visual Screen-Locked HUD
    this.buildDualPlayerHUD(p1Char, p2Char);

    // 7. Start Round 1
    this.startRound(1);

    // Notify Loading Screen that arena is 100% created and ready
    if (window.onPhaserArenaReady) {
      window.onPhaserArenaReady();
    }
  }

  buildSkyTempleEnvironment() {
    // Generate crisp vector-based celestial glowing particle texture if not already created
    if (!this.textures.exists('celestial_mote_tex')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // Inner glowing core
      g.fillStyle(0xffffff, 1);
      g.fillCircle(12, 12, 4);
      // Outer aura
      g.fillStyle(0x38bdf8, 0.45);
      g.fillCircle(12, 12, 8);
      g.fillStyle(0x06b6d4, 0.20);
      g.fillCircle(12, 12, 12);
      g.generateTexture('celestial_mote_tex', 24, 24);
      g.destroy();
    }

    // Layer 1: Distant Celestial Night Sky & Mountaintops (Parallax 0.12x, 0)
    this.skyDistant = this.add.image(0, 0, 'sky_distant').setOrigin(0, 0);
    this.skyDistant.setDisplaySize(2100, 720);
    this.skyDistant.setScrollFactor(0.12, 0);
    this.skyDistant.setDepth(1);

    // Dynamic Celestial Ambient Pulse
    this.tweens.add({
      targets: this.skyDistant,
      alpha: { from: 0.94, to: 1.0 },
      duration: 3800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    // Layer 2: Master Midground Celestial Sanctuary & Floating Shrines (Parallax 0.55x, 0.35x)
    this.skyMaster = this.add.image(0, 0, 'sky_backdrop').setOrigin(0, 0);
    this.skyMaster.setDisplaySize(1920, 720);
    this.skyMaster.setScrollFactor(0.55, 0.35);
    this.skyMaster.setDepth(2);

    // Subtle Sanctuary Levitation Oscillation
    this.tweens.add({
      targets: this.skyMaster,
      y: { from: -4, to: 4 },
      duration: 4200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    // Layer 3: Pristine Walkable Ancient Stone Combat Floor (Direct 1.0x, 1.0x Scroll Factor)
    this.skyFloor = this.add.image(0, 0, 'sky_floor').setOrigin(0, 0);
    this.skyFloor.setDisplaySize(1920, 720);
    this.skyFloor.setScrollFactor(1.0, 1.0);
    this.skyFloor.setDepth(3);

    // Floor Boundary Mystic Leyline Glow (Cyan Surge along stone edge at y = 575)
    this.skyFloorGlow = this.add.rectangle(960, 576, 1920, 5, 0x06b6d4, 0.45).setDepth(4);
    this.skyFloorGlowWide = this.add.rectangle(960, 576, 1920, 14, 0x38bdf8, 0.20).setDepth(4);
    this.tweens.add({
      targets: [this.skyFloorGlow, this.skyFloorGlowWide],
      alpha: { from: 0.25, to: 0.65 },
      scaleY: { from: 0.85, to: 1.25 },
      duration: 1300,
      yoyo: true,
      repeat: -1
    });

    // Stage Perimeter Framing: Floating Ancient Celestial Crystal Beacons at extreme left & right edges
    // Framing elements are placed far out (x = 160 and x = 1760) so the entire combat area is 100% unobstructed!
    this.skyBeacons = [];
    [160, 1760].forEach(bx => {
      // Beacon base aura
      const beaconAura = this.add.circle(bx, 480, 55, 0x06b6d4, 0.22).setDepth(4);
      // Floating crystal core diamond
      const beaconCore = this.add.polygon(bx, 480, [0, -28, 16, 0, 0, 28, -16, 0], 0x38bdf8, 0.85).setDepth(5);
      const beaconGlow = this.add.polygon(bx, 480, [0, -32, 19, 0, 0, 32, -19, 0], 0xffffff, 0.45).setDepth(5);

      this.tweens.add({
        targets: [beaconCore, beaconGlow],
        y: '-=12',
        duration: 2200 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });

      this.tweens.add({
        targets: beaconAura,
        scale: { from: 0.85, to: 1.20 },
        alpha: { from: 0.15, to: 0.35 },
        duration: 1100 + Math.random() * 300,
        yoyo: true,
        repeat: -1
      });

      this.skyBeacons.push({ aura: beaconAura, core: beaconCore, glow: beaconGlow });
    });

    // Dynamic Atmospheric Ground Mist Ribbons (Swirling across the stone platform)
    this.groundMist1 = this.add.rectangle(0, 556, 2600, 32, 0x67e8f9, 0.10).setOrigin(0, 0).setDepth(4);
    this.groundMist2 = this.add.rectangle(-400, 566, 2600, 24, 0x0284c7, 0.12).setOrigin(0, 0).setDepth(4);

    // Procedural Dynamic Celestial Energy Particles (Luminous rising motes, zero sprite sheet borders)
    this.skyParticles = [];
    for (let i = 0; i < 35; i++) {
      const p = this.add.image(
        Phaser.Math.Between(-100, 2020),
        Phaser.Math.Between(150, 720),
        'celestial_mote_tex'
      );
      p.setScale(Phaser.Math.FloatBetween(0.4, 1.1));
      p.setAlpha(Phaser.Math.FloatBetween(0.35, 0.85));
      p.setDepth(5);
      p.setBlendMode(Phaser.BlendModes.ADD);
      p.speedX = Phaser.Math.FloatBetween(-25, 35);
      p.speedY = Phaser.Math.FloatBetween(-35, -85);
      p.wobblePhase = Math.random() * Math.PI * 2;
      p.wobbleSpeed = Phaser.Math.FloatBetween(1.5, 3.2);
      this.skyParticles.push(p);
    }
  }

  updateSkyTempleEnvironment(delta) {
    const dt = delta / 1000;

    // 1. Horizontal Mist Ribbons Flow
    if (this.groundMist1) {
      this.groundMist1.x -= 20 * dt;
      if (this.groundMist1.x < -300) this.groundMist1.x = 0;
    }
    if (this.groundMist2) {
      this.groundMist2.x += 16 * dt;
      if (this.groundMist2.x > 0) this.groundMist2.x = -400;
    }

    // 2. Rising Procedural Celestial Particles with Sinusoidal Sway
    if (this.skyParticles) {
      for (let i = 0; i < this.skyParticles.length; i++) {
        const p = this.skyParticles[i];
        p.wobblePhase += p.wobbleSpeed * dt;
        p.x += (p.speedX + Math.sin(p.wobblePhase) * 16) * dt;
        p.y += p.speedY * dt;

        if (p.y < -30) {
          p.y = 730;
          p.x = Phaser.Math.Between(-100, 2020);
          p.setAlpha(Phaser.Math.FloatBetween(0.35, 0.85));
        }
        if (p.x < -120) p.x = 2040;
        else if (p.x > 2040) p.x = -120;
      }
    }
  }

  buildJapaneseEnvironment() {
    // Layer 1: Distant Celestial Night Sky & Alpine Mountains (Slow Parallax 0.18x)
    this.envSky = this.add.image(0, 0, 'japan_sky_mountains').setOrigin(0, 0);
    this.envSky.setDisplaySize(2100, 720);
    this.envSky.setScrollFactor(0.18, 0);
    this.envSky.setDepth(1);

    // Ambient Moon Illumination Breathing Pulse
    this.tweens.add({
      targets: this.envSky,
      alpha: { from: 0.92, to: 1 },
      duration: 3500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    // Layer 2: Master Japanese Temple & Torii Courtyard (Midground Parallax 0.65x)
    this.envTemple = this.add.image(0, 0, 'japan_temple_master').setOrigin(0, 0);
    this.envTemple.setDisplaySize(1920, 720);
    this.envTemple.setScrollFactor(0.65, 0.4);
    this.envTemple.setDepth(2);

    // Layer 3: Isolated Stone Courtyard Combat Floor (Direct 1.0x Scroll Factor)
    this.envFloor = this.add.image(0, 0, 'japan_floor').setOrigin(0, 0);
    this.envFloor.setDisplaySize(1920, 720);
    this.envFloor.setScrollFactor(1.0, 1.0);
    this.envFloor.setDepth(3);

    // Floor Boundary Mystic Underglow along stone courtyard
    const floorGlow = this.add.rectangle(960, 578, 1920, 8, 0xf59e0b, 0.28).setDepth(4);
    this.tweens.add({
      targets: floorGlow,
      alpha: { from: 0.2, to: 0.5 },
      duration: 1400,
      yoyo: true,
      repeat: -1
    });

    // Environmental Props: Ceremonial Fire Braziers (Kagaribi) at Left & Right stage edges
    const brazierLeft = this.add.sprite(220, 575, 'japan_brazier').setOrigin(0.5, 1).setScale(0.35).setDepth(5);
    brazierLeft.play('japan_brazier_burn');
    const brazierRight = this.add.sprite(1700, 575, 'japan_brazier').setOrigin(0.5, 1).setScale(0.35).setDepth(5);
    brazierRight.play('japan_brazier_burn');

    // Dynamic Brazier Fire Auras (projecting warm ambient glow onto wet stone)
    [brazierLeft, brazierRight].forEach(b => {
      const aura = this.add.circle(b.x, b.y - 140, 95, 0xf59e0b, 0.18).setDepth(4);
      this.tweens.add({
        targets: aura,
        scale: { from: 0.9, to: 1.15 },
        alpha: { from: 0.12, to: 0.26 },
        duration: 180 + Math.random() * 90,
        yoyo: true,
        repeat: -1
      });
    });

    // Environmental Props: Hanging Swaying Paper Lanterns from temple eaves
    const lanternLeft = this.add.sprite(360, 15, 'japan_lantern').setOrigin(0.5, 0).setScale(0.27).setDepth(5);
    lanternLeft.play('japan_lantern_sway');
    const lanternRight = this.add.sprite(1560, 15, 'japan_lantern').setOrigin(0.5, 0).setScale(0.27).setDepth(5);
    lanternRight.play('japan_lantern_sway');

    // Dynamic Ground Mist Ribbons (creeping across stone floor)
    this.groundMist1 = this.add.rectangle(0, 555, 2600, 36, 0xd6e3f8, 0.08).setOrigin(0, 0).setDepth(4);
    this.groundMist2 = this.add.rectangle(-400, 565, 2600, 28, 0x232b3e, 0.12).setOrigin(0, 0).setDepth(4);

    // Dynamic Sakura Petal Particles System (Drifting across moonlit courtyard)
    this.sakuraParticles = [];
    for (let i = 0; i < 35; i++) {
      const p = this.add.sprite(
        Phaser.Math.Between(-100, 2020),
        Phaser.Math.Between(-50, 720),
        'japan_sakura',
        Phaser.Math.Between(0, 5)
      );
      p.setScale(Phaser.Math.FloatBetween(0.12, 0.24));
      p.setAlpha(Phaser.Math.FloatBetween(0.55, 0.92));
      p.setDepth(6);
      p.speedX = Phaser.Math.FloatBetween(-60, -120);
      p.speedY = Phaser.Math.FloatBetween(35, 75);
      p.rotSpeed = Phaser.Math.FloatBetween(-0.035, 0.035);
      p.wobblePhase = Math.random() * Math.PI * 2;
      p.wobbleSpeed = Phaser.Math.FloatBetween(2.2, 4.0);
      this.sakuraParticles.push(p);
    }

    // Foreground Cinematic Out-of-Focus Sakura Petals (2.5D Camera Depth)
    this.foregroundPetals = [];
    for (let i = 0; i < 6; i++) {
      const fp = this.add.sprite(
        Phaser.Math.Between(-100, 2020),
        Phaser.Math.Between(-50, 720),
        'japan_sakura',
        Phaser.Math.Between(0, 5)
      );
      fp.setScale(Phaser.Math.FloatBetween(0.42, 0.65));
      fp.setAlpha(0.5);
      fp.setDepth(15);
      fp.setScrollFactor(1.35, 1.1);
      fp.speedX = Phaser.Math.FloatBetween(-150, -230);
      fp.speedY = Phaser.Math.FloatBetween(75, 130);
      fp.rotSpeed = Phaser.Math.FloatBetween(-0.05, 0.05);
      this.foregroundPetals.push(fp);
    }
  }

  registerEnvironmentAnimations() {
    if (!this.anims.exists('japan_brazier_burn')) {
      this.anims.create({
        key: 'japan_brazier_burn',
        frames: this.anims.generateFrameNumbers('japan_brazier', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('japan_lantern_sway')) {
      this.anims.create({
        key: 'japan_lantern_sway',
        frames: this.anims.generateFrameNumbers('japan_lantern', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1,
        yoyo: true
      });
    }
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

  registerMewtwoAnimations() {
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

    // Mewtwo Movement & Stances
    defineAnim('mewtwo_anim_idle', 'mewtwo_sheet_idle', 0, 15, 14, -1);
    defineAnim('mewtwo_anim_walk', 'mewtwo_sheet_walk', 0, 15, 16, -1);
    defineAnim('mewtwo_anim_dash', 'mewtwo_sheet_walk', 0, 7, 18, 0);
    defineAnim('mewtwo_anim_crouch_down', 'mewtwo_sheet_crouch', 0, 4, 16, 0);
    defineAnim('mewtwo_anim_crouch_hold', 'mewtwo_sheet_crouch', 4, 7, 8, -1);
    defineAnim('mewtwo_anim_crouch', 'mewtwo_sheet_crouch', 4, 7, 8, -1);
    defineAnim('mewtwo_anim_jump', 'mewtwo_sheet_jump', 0, 19, 16, 0);
    defineAnim('mewtwo_anim_knockback', 'mewtwo_sheet_hit', 0, 11, 15, 0);

    // Normal Attacks
    defineAnim('mewtwo_anim_atk_5a', 'mewtwo_sheet_basic_strike', 0, 15, 22, 0);
    defineAnim('mewtwo_anim_atk_5b', 'mewtwo_sheet_psychic_crush', 0, 23, 22, 0);
    defineAnim('mewtwo_anim_atk_5c', 'mewtwo_sheet_teleport_strike', 0, 23, 22, 0);

    // Air Attacks
    defineAnim('mewtwo_anim_atk_8a', 'mewtwo_sheet_basic_strike', 2, 10, 18, 0);
    defineAnim('mewtwo_anim_atk_8c', 'mewtwo_sheet_teleport_strike', 6, 18, 20, 0);

    // Special & Super
    defineAnim('mewtwo_anim_sp_shadow_ball', 'mewtwo_sheet_shadow_ball', 0, 19, 18, 0);
    defineAnim('mewtwo_anim_super', 'mewtwo_sheet_psystrike', 0, 23, 11, 0);

    // VFX & Projectiles
    defineAnim('mewtwo_anim_projectile', 'mewtwo_sheet_projectile', 0, 15, 20, -1);
    defineAnim('mewtwo_anim_impact', 'mewtwo_sheet_impact', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_charge', 'mewtwo_sheet_vfx_charge', 0, 15, 20, 0);
    defineAnim('mewtwo_anim_vfx_disappear', 'mewtwo_sheet_vfx_disappear', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_reappear', 'mewtwo_sheet_vfx_reappear', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_forcefield', 'mewtwo_sheet_vfx_forcefield', 0, 14, 18, 0);
    defineAnim('mewtwo_anim_vfx_psystrike', 'mewtwo_sheet_vfx_psystrike', 0, 23, 16, 0);
    defineAnim('mewtwo_anim_vfx_psystrike_ball', 'mewtwo_sheet_vfx_psystrike', 0, 5, 14, -1);
    defineAnim('mewtwo_anim_vfx_psystrike_explosion', 'mewtwo_sheet_vfx_psystrike', 0, 22, 16, 0);
  }

  registerSteveAnimations() {
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

    // Steve Movement & Stances
    defineAnim('steve_anim_idle', 'steve_sheet_idle', 0, 15, 14, -1);
    defineAnim('steve_anim_walk', 'steve_sheet_walk', 0, 15, 16, -1);
    defineAnim('steve_anim_dash', 'steve_sheet_walk', 0, 7, 20, 0);
    defineAnim('steve_anim_crouch_down', 'steve_sheet_crouch', 0, 4, 16, 0);
    defineAnim('steve_anim_crouch_hold', 'steve_sheet_crouch', 4, 7, 8, -1);
    defineAnim('steve_anim_crouch', 'steve_sheet_crouch', 4, 7, 8, -1);
    defineAnim('steve_anim_jump', 'steve_sheet_jump', 0, 19, 16, 0);
    defineAnim('steve_anim_knockback', 'steve_sheet_hit', 0, 11, 15, 0);

    // Normal Attacks
    defineAnim('steve_anim_atk_5a', 'steve_sheet_punch', 0, 15, 24, 0);
    defineAnim('steve_anim_atk_5b', 'steve_sheet_sword', 0, 19, 22, 0);
    defineAnim('steve_anim_atk_5c', 'steve_sheet_pickaxe', 0, 23, 22, 0);

    // Air Attacks
    defineAnim('steve_anim_atk_8a', 'steve_sheet_punch', 2, 10, 18, 0);
    defineAnim('steve_anim_atk_8c', 'steve_sheet_sword', 4, 15, 20, 0);

    // Special & Super
    defineAnim('steve_anim_sp_tnt', 'steve_sheet_tnt_throw', 0, 19, 18, 0);
    defineAnim('steve_anim_super', 'steve_sheet_punch', 0, 15, 24, 0);

    // Steve VFX & Projectiles
    defineAnim('steve_anim_tnt_flight', 'steve_sheet_tnt_flight', 0, 11, 18, -1);
    defineAnim('steve_anim_tnt_fuse', 'steve_sheet_tnt_fuse', 0, 11, 20, 0);
    defineAnim('steve_anim_tnt_explosion', 'steve_sheet_tnt_explosion', 0, 23, 22, 0);
  }

  spawnMysticProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? 1 : -1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 70 : -70);
    const spawnY = caster.sprite.y - 25;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'strange_sheet_power');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.55);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(180, 180);
    proj.body.setOffset(166, 166);
    proj.play('strange_anim_orb');
    proj.caster = caster;
    proj.isMystic = true;
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
    proj.setDepth(20);

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
    impact.setDepth(25);
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
    vfx.setDepth(25);
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
    vfx.setDepth(25);
    vfx.setScale(0.78);
    vfx.setFlipX(!facingRight);
    vfx.play('chunli_anim_vfx_spinning_bird');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(1000, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  spawnHoyokuSenVFX(caster) {
    if (!caster || !caster.sprite) return;

    if (caster.activeHoyokuVFX && caster.activeHoyokuVFX.active) {
      caster.activeHoyokuVFX.destroy();
    }

    const getVFXTransform = () => {
      const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
      const facingRight = facingDir === 1;
      return {
        x: caster.sprite.x + (facingRight ? 65 : -65),
        y: caster.sprite.y - 25,
        flipX: !facingRight
      };
    };

    const initial = getVFXTransform();
    const vfx = this.add.sprite(initial.x, initial.y, 'chunli_sheet_vfx_hoyoku');
    vfx.setDepth(25);
    vfx.setScale(0.80);
    vfx.setFlipX(initial.flipX);
    vfx.play('chunli_anim_vfx_hoyoku');
    caster.activeHoyokuVFX = vfx;

    const onUpdate = () => {
      if (!vfx || !vfx.active) {
        this.events.off('update', onUpdate);
        if (caster.activeHoyokuVFX === vfx) caster.activeHoyokuVFX = null;
        return;
      }

      // Check if caster is still valid and actively in Hoyoku-sen animation cycle
      const isStillInAnimCycle = (
        caster &&
        caster.sprite &&
        caster.sprite.active &&
        caster.hp > 0 &&
        !caster.isKnockedBack &&
        caster.isAttacking &&
        caster.currentAction === 'HOYOKU-SEN (SUPER)' &&
        caster.sprite.anims &&
        caster.sprite.anims.currentAnim &&
        caster.sprite.anims.currentAnim.key === 'chunli_anim_super'
      );

      if (!isStillInAnimCycle) {
        this.events.off('update', onUpdate);
        if (caster.activeHoyokuVFX === vfx) caster.activeHoyokuVFX = null;
        if (vfx.active) vfx.destroy();
        return;
      }

      // Follow Chun-Li while she is in the animation cycle
      const pos = getVFXTransform();
      vfx.x = pos.x;
      vfx.y = pos.y;
      vfx.setFlipX(pos.flipX);
    };

    this.events.on('update', onUpdate);

    vfx.on('animationcomplete', () => {
      this.events.off('update', onUpdate);
      if (caster.activeHoyokuVFX === vfx) caster.activeHoyokuVFX = null;
      if (vfx.active) vfx.destroy();
    });

    vfx.on('destroy', () => {
      this.events.off('update', onUpdate);
      if (caster.activeHoyokuVFX === vfx) caster.activeHoyokuVFX = null;
    });

    this.time.delayedCall(2500, () => {
      this.events.off('update', onUpdate);
      if (caster.activeHoyokuVFX === vfx) caster.activeHoyokuVFX = null;
      if (vfx && vfx.active) vfx.destroy();
    });
  }

  spawnShadowBallChargeVFX(caster) {
    if (!caster || !caster.sprite) return;
    if (caster.activeShadowBallChargeVFX && caster.activeShadowBallChargeVFX.active) {
      caster.activeShadowBallChargeVFX.destroy();
      caster.activeShadowBallChargeVFX = null;
    }

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const chargeX = caster.sprite.x + (facingRight ? 52 : -52);
    const chargeY = caster.sprite.y - 18;

    const charge = this.add.sprite(chargeX, chargeY, 'mewtwo_sheet_vfx_charge');
    charge.setDepth(25);
    charge.setScale(0.42);
    charge.setFlipX(!facingRight);
    charge.play('mewtwo_anim_vfx_charge');
    caster.activeShadowBallChargeVFX = charge;

    // Follow Mewtwo in real-time as he moves, jumps, or faces the opponent
    const onUpdate = () => {
      if (charge && charge.active && caster && caster.sprite) {
        const dir = caster.getFacingDir ? caster.getFacingDir() : 1;
        const isRight = dir === 1;
        charge.setPosition(
          caster.sprite.x + (isRight ? 52 : -52),
          caster.sprite.y - 18
        );
        charge.setFlipX(!isRight);
      }
    };
    this.events.on('update', onUpdate);

    const cleanup = () => {
      this.events.off('update', onUpdate);
      if (caster && caster.activeShadowBallChargeVFX === charge) {
        caster.activeShadowBallChargeVFX = null;
      }
    };

    charge.once('destroy', cleanup);

    // Failsafe cleanup (charges are released or destroyed on shot/hit)
    this.time.delayedCall(1200, () => {
      if (charge && charge.active) {
        charge.destroy();
      }
    });
  }

  spawnShadowBallProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? -1 : 1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 65 : -65);
    const spawnY = caster.sprite.y - 20;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'mewtwo_sheet_projectile');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.40);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(75, 75);
    proj.body.setOffset(90, 90);
    proj.play('mewtwo_anim_projectile');
    proj.caster = caster;
    proj.isShadowBall = true;
    proj.setFlipX(!facingRight);

    const speed = 660;
    proj.setVelocityX(facingRight ? speed : -speed);
    proj.setVelocityY(0);

    this.time.delayedCall(3000, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  spawnShadowBallImpact(x, y) {
    const impact = this.add.sprite(x, y, 'mewtwo_sheet_impact');
    impact.setDepth(25);
    impact.setScale(0.55);
    impact.play('mewtwo_anim_impact');
    impact.on('animationcomplete', () => impact.destroy());
    this.time.delayedCall(800, () => { if (impact && impact.active) impact.destroy(); });
  }

  spawnSlamGroundEffect(x, y) {
    if (!this.textures.exists('psychic_slam_ring')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      // Layer 1: Outer cosmic purple glow
      g.lineStyle(6, 0xc084fc, 0.95);
      g.strokeEllipse(80, 40, 150, 68);
      // Layer 2: Vivid psychic cyan ring
      g.lineStyle(3, 0x38bdf8, 1.0);
      g.strokeEllipse(80, 40, 130, 56);
      // Layer 3: Blinding white core
      g.lineStyle(1.5, 0xffffff, 1.0);
      g.strokeEllipse(80, 40, 110, 44);
      g.generateTexture('psychic_slam_ring', 160, 80);
      g.destroy();
    }

    // Outer shockwave expansion across the platform floor
    const wave1 = this.add.image(x, y + 14, 'psychic_slam_ring');
    wave1.setDepth(24);
    wave1.setScale(0.3, 0.2);
    wave1.setAlpha(1);
    this.tweens.add({
      targets: wave1,
      scaleX: 2.5,
      scaleY: 0.95,
      alpha: 0,
      duration: 360,
      ease: 'Quad.Out',
      onComplete: () => wave1.destroy()
    });

    // Layered inner shockwave ripple (delayed slightly)
    this.time.delayedCall(45, () => {
      const wave2 = this.add.image(x, y + 14, 'psychic_slam_ring');
      wave2.setDepth(24);
      wave2.setScale(0.2, 0.15);
      wave2.setAlpha(0.9);
      wave2.setTint(0x9333ea);
      this.tweens.add({
        targets: wave2,
        scaleX: 1.9,
        scaleY: 0.75,
        alpha: 0,
        duration: 300,
        ease: 'Cubic.Out',
        onComplete: () => wave2.destroy()
      });
    });
  }

  spawnPsychicCrushVFX(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;
    if (!target || !target.sprite) return;

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;

    // Check distance: target must be in front within reach
    const dx = target.sprite.x - caster.sprite.x;
    const dy = Math.abs(target.sprite.y - caster.sprite.y);
    const isInFront = (facingRight && dx > -30 && dx <= 550) ||
                      (!facingRight && dx < 30 && dx >= -550);

    // If target is out of range or dead, don't trap them
    if (!isInFront || dy > 160 || target.hp <= 0) return;

    // Phase 1: Startup & telekinetic capture at ~180ms
    this.time.delayedCall(180, () => {
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      if (!target || !target.sprite || target.hp <= 0) return;
      if (this.roundState !== 'FIGHTING') return;

      // Telekinetically capture the opponent
      target.isCaptured = true;
      target.isStunned = true;
      target.isAttacking = false;
      target.isCrouching = false;
      target.currentAttackData = null;
      if (target.attackTimer) {
        target.attackTimer.remove();
        target.attackTimer = null;
      }
      target.sprite.setVelocity(0, 0);
      if (target.sprite.body) {
        target.sprite.body.setAllowGravity(false);
        target.sprite.body.velocity.x = 0;
        target.sprite.body.velocity.y = 0;
      }
      target.currentAction = 'PSYCHIC CAPTURED';
      target.sprite.setTint(0xd8b4fe);

      // Forcefield VFX occurs directly centered around the opponent
      const vfxX = target.sprite.x;
      const vfxY = target.sprite.y - 10;

      const vfx = this.add.sprite(vfxX, vfxY, 'mewtwo_sheet_vfx_forcefield');
      vfx.setDepth(26);
      vfx.setScale(1.15);
      vfx.setFlipX(!facingRight);
      vfx.play('mewtwo_anim_vfx_forcefield');

      // Keep forcefield tracking opponent as they are levitated
      const onUpdate = () => {
        if (vfx && vfx.active && target && target.sprite) {
          vfx.setPosition(target.sprite.x, target.sprite.y - 10);
        }
      };
      this.events.on('update', onUpdate);

      // Phase 2: Telekinetic lift upwards over 420ms
      const startY = target.sprite.y;
      const peakY = Math.max(160, startY - 140);

      this.tweens.add({
        targets: target.sprite,
        y: peakY,
        duration: 420,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (this.roundState !== 'FIGHTING' || caster.hp <= 0) {
            this.events.off('update', onUpdate);
            if (vfx.active) vfx.destroy();
            target.isCaptured = false;
            target.isStunned = false;
            if (target.sprite.body) target.sprite.body.setAllowGravity(true);
            target.snapToGround();
            return;
          }

          // Phase 3: Hold briefly at peak (~160ms) while Mewtwo raises hands overhead
          this.time.delayedCall(160, () => {
            if (this.roundState !== 'FIGHTING' || caster.hp <= 0) {
              this.events.off('update', onUpdate);
              if (vfx.active) vfx.destroy();
              target.isCaptured = false;
              target.isStunned = false;
              if (target.sprite.body) target.sprite.body.setAllowGravity(true);
              target.snapToGround();
              return;
            }

            // Phase 4: THE SLAM! Mewtwo thrusts his hands downward violently!
            const landingY = target.charId === 'steve' ? 476.60 :
                             (target.charId === 'mewtwo' ? 479.84 :
                             (target.charId === 'chunli' ? 477.04 :
                             (target.charId === 'strange' ? 395.80 : 443.00)));

            // Opponent slammed down at extreme velocity (120ms)
            this.tweens.add({
              targets: target.sprite,
              y: landingY,
              duration: 120,
              ease: 'Quad.In',
              onComplete: () => {
                this.events.off('update', onUpdate);
                if (vfx.active) vfx.destroy();

                // Release hold & restore gravity
                target.isCaptured = false;
                target.isStunned = false;
                if (target.sprite.body) {
                  target.sprite.body.setAllowGravity(true);
                }
                target.snapToGround();

                // Clear psychic tint
                if (target.isMirror) {
                  target.sprite.setTint(0xc4b5fd);
                } else {
                  target.sprite.clearTint();
                }

                // --- GROUND SLAM IMPACT EFFECTS ---
                // 1. Expanding Ground Slam Shockwave Ring along the floor
                this.spawnSlamGroundEffect(target.sprite.x, landingY);

                // 2. Heavy Shadow Ball Impact Explosion at the impact point
                this.spawnShadowBallImpact(target.sprite.x, landingY);

                // 3. Violent Screen Shake on impact
                this.cameras.main.shake(280, 0.024);

                // 4. Heavy Boom Audio
                if (window.soundFX) window.soundFX.playStartBoom();

                // 5. Apply slam damage and trigger knockdown launch reaction!
                target.takeHit({
                  damage: 105,
                  isSpecial: true,
                  knockbackX: 360,
                  knockbackY: -340
                }, caster);
              }
            });
          });
        }
      });
    });
  }

  executeTeleportStrike(caster) {
    if (!caster || !caster.sprite) return;
    const startX = caster.sprite.x;
    const startY = caster.sprite.y;

    // 1. Startup: Disappear VFX at origin
    this.spawnTeleportDisappearVFX(startX, startY);

    // 2. Body dissolves into purple teleport energy
    this.time.delayedCall(120, () => {
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      caster.sprite.setAlpha(0);

      // 3. Move actual position to opponent
      this.time.delayedCall(130, () => {
        if (!caster || !caster.sprite || caster.hp <= 0) return;
        const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;
        let destX = startX;
        if (target && target.sprite) {
          const targetX = target.sprite.x;
          const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
          const offset = facingDir === 1 ? -95 : 95;
          destX = targetX + offset;

          // Arena bounds avoidance (keep within platform 180..1740)
          if (destX < 180) {
            destX = targetX + 95;
            caster.setFacingDir(-1);
          } else if (destX > 1740) {
            destX = targetX - 95;
            caster.setFacingDir(1);
          } else {
            caster.setFacingDir(destX <= targetX ? 1 : -1);
          }
        }

        destX = Phaser.Math.Clamp(destX, 180, 1740);
        caster.sprite.setPosition(destX, 479.84);
        caster.snapToGround();

        // 4. Reappear VFX at destination & restore visibility
        this.spawnTeleportReappearVFX(destX, 479.84);
        caster.sprite.setAlpha(1);

        // Quick camera shake on sudden relocation
        this.cameras.main.shake(120, 0.008);
        if (window.soundFX) window.soundFX.playSelect();
      });
    });
  }

  spawnTeleportDisappearVFX(x, y) {
    const vfx = this.add.sprite(x, y, 'mewtwo_sheet_vfx_disappear');
    vfx.setDepth(25);
    vfx.setScale(0.85);
    vfx.play('mewtwo_anim_vfx_disappear');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(800, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  spawnTeleportReappearVFX(x, y) {
    const vfx = this.add.sprite(x, y, 'mewtwo_sheet_vfx_reappear');
    vfx.setDepth(25);
    vfx.setScale(0.85);
    vfx.play('mewtwo_anim_vfx_reappear');
    vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
    this.time.delayedCall(800, () => { if (vfx && vfx.active) vfx.destroy(); });
  }

  spawnTeleportVFX(x, y) {
    this.spawnTeleportDisappearVFX(x, y);
  }

  spawnPsystrikeVFX(caster) {
    if (!caster || !caster.sprite) return;
    if (caster.activePsystrikeVFX && caster.activePsystrikeVFX.active) {
      caster.activePsystrikeVFX.destroy();
    }

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;

    // 1. Swirling psychic charge aura on Mewtwo during charging pose
    const charge = this.add.sprite(caster.sprite.x, caster.sprite.y - 10, 'mewtwo_sheet_vfx_charge');
    charge.setDepth(25);
    charge.setScale(0.85);
    charge.play('mewtwo_anim_vfx_charge');
    charge.on('animationcomplete', () => { if (charge.active) charge.destroy(); });

    // 2. Releases powerful ranged blast shot across the stage in the facing direction
    this.time.delayedCall(300, () => {
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      const spawnX = caster.sprite.x + (facingRight ? 95 : -95);
      const spawnY = caster.sprite.y - 25;

      const proj = this.physics.add.sprite(spawnX, spawnY, 'mewtwo_sheet_vfx_psystrike');
      this.projectiles.add(proj);
      proj.setDepth(26);
      proj.setScale(1.15);
      proj.setFlipX(!facingRight);
      proj.play('mewtwo_anim_vfx_psystrike_ball');

      proj.body.allowGravity = false;
      proj.body.setAllowGravity(false);
      proj.body.gravity.y = 0;
      proj.body.setSize(140, 140);
      proj.body.setOffset(35, 36);

      proj.caster = caster;
      proj.isPsystrike = true;

      const speed = 900;
      proj.setVelocityX(facingRight ? speed : -speed);
      proj.setVelocityY(0);

      caster.activePsystrikeVFX = proj;
      this.cameras.main.shake(220, 0.018);
      if (window.soundFX) window.soundFX.playStartBoom();

      this.time.delayedCall(2500, () => {
        if (proj && proj.active) proj.destroy();
        if (caster.activePsystrikeVFX === proj) caster.activePsystrikeVFX = null;
      });
    });
  }

  spawnPsystrikeExplosion(target, caster, hitX, hitY) {
    if (!target || !target.sprite) return;

    // 1. Engulf and capture opponent in place while the cosmic energy ball gathers for detonation
    target.isCaptured = true;
    target.isStunned = true;
    target.isAttacking = false;
    target.isCrouching = false;
    target.currentAttackData = null;
    if (target.attackTimer) {
      target.attackTimer.remove();
      target.attackTimer = null;
    }
    target.sprite.setVelocity(0, 0);
    if (target.sprite.body) {
      target.sprite.body.setAllowGravity(false);
      target.sprite.body.velocity.x = 0;
      target.sprite.body.velocity.y = 0;
    }
    target.currentAction = 'PSYSTRIKE ENGULFED';
    target.sprite.setTint(0xd8b4fe);

    // Center explosion directly around the engulfed opponent
    const explosionX = target.sprite.x;
    const explosionY = target.sprite.y - 15;

    const explosion = this.add.sprite(explosionX, explosionY, 'mewtwo_sheet_vfx_psystrike');
    explosion.setDepth(28);
    explosion.setScale(1.35);
    explosion.play('mewtwo_anim_vfx_psystrike_explosion');

    // Subtle buildup rumble while sphere coalesces
    this.cameras.main.shake(180, 0.008);

    let hasDetonated = false;
    const detonate = () => {
      if (hasDetonated) return;
      hasDetonated = true;

      // Release capture state & restore gravity
      target.isCaptured = false;
      target.isStunned = false;
      if (target.sprite && target.sprite.body) {
        target.sprite.body.setAllowGravity(true);
      }

      // Clear psychic tint
      if (target.sprite) {
        if (target.isMirror) {
          target.sprite.setTint(0xc4b5fd);
        } else {
          target.sprite.clearTint();
        }
      }

      // Shockwave ring & ground flash at detonation peak
      this.spawnShadowBallImpact(explosion.x, explosion.y);

      // Supernova screen shake & heavy boom audio
      this.cameras.main.shake(440, 0.030);
      if (window.soundFX) window.soundFX.playStartBoom();

      // Apply the 260 damage and massive knockback launch ONLY NOW when the ball actually explodes!
      const atkData = {
        damage: 260,
        isSpecial: true,
        knockbackX: 720,
        knockbackY: -560
      };
      target.takeHit(atkData, caster);
    };

    // Detonate at the supernova explosion peak (Frame 9/10 of Psystrike sheet)
    explosion.on('animationupdate', (anim, frame) => {
      const texFrame = frame ? (frame.textureFrame !== undefined ? Number(frame.textureFrame) : (frame.index !== undefined ? frame.index - 1 : -1)) : -1;
      if (texFrame >= 9) {
        detonate();
      }
    });

    // Failsafe timer: at 16 fps, frame 9 is ~562ms. If frame event doesn't trigger, detonate at 580ms.
    this.time.delayedCall(580, () => {
      detonate();
    });

    explosion.on('animationcomplete', () => {
      if (!hasDetonated) detonate();
      if (explosion.active) explosion.destroy();
    });

    this.time.delayedCall(1600, () => {
      if (!hasDetonated) detonate();
      if (explosion && explosion.active) explosion.destroy();
    });
  }

  spawnTNTProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? -1 : 1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 65 : -65);
    const spawnY = caster.sprite.y - 20;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'steve_sheet_tnt_flight');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.38);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(180, 180);
    proj.body.setOffset(210, 208);
    proj.play('steve_anim_tnt_flight');
    proj.caster = caster;
    proj.isTNT = true;
    proj.setFlipX(!facingRight);

    const speed = 600;
    proj.setVelocityX(facingRight ? speed : -speed);
    proj.setVelocityY(0);

    this.time.delayedCall(3000, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  spawnTNTExplosion(x, y, isSuper = false) {
    const impact = this.add.sprite(x, y, 'steve_sheet_tnt_explosion');
    impact.setDepth(25);
    impact.setScale(isSuper ? 0.70 : 0.45);
    impact.play('steve_anim_tnt_explosion');
    this.cameras.main.shake(isSuper ? 350 : 200, isSuper ? 0.025 : 0.015);
    impact.on('animationcomplete', () => impact.destroy());
    this.time.delayedCall(1000, () => { if (impact && impact.active) impact.destroy(); });
  }

  spawnMegatonSuperVFX(caster) {
    if (!caster || !caster.sprite) return;
    if (caster.activeMegatonVFX && caster.activeMegatonVFX.active) {
      caster.activeMegatonVFX.destroy();
    }

    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;
    if (!target || !target.sprite || target.hp <= 0) return;

    // 1. TNT auto-spawns directly on the opponent's body!
    const tnt = this.add.sprite(target.sprite.x, target.sprite.y - 10, 'steve_sheet_tnt_fuse');
    tnt.setDepth(26);
    tnt.setScale(0.44);
    tnt.play('steve_anim_tnt_fuse');
    caster.activeMegatonVFX = tnt;

    // Red warning pulse on opponent while fuse sizzles
    target.sprite.setTint(0xff6666);

    // Keep TNT tracking opponent's body during fuse burning
    const onUpdate = () => {
      if (tnt && tnt.active && target && target.sprite) {
        tnt.setPosition(target.sprite.x, target.sprite.y - 10);
      }
    };
    this.events.on('update', onUpdate);

    // 2. TNT explodes to pieces at ~300ms (timed with Steve's punch extension!)
    this.time.delayedCall(300, () => {
      this.events.off('update', onUpdate);
      if (tnt && tnt.active) tnt.destroy();
      caster.activeMegatonVFX = null;

      if (!target || !target.sprite || target.hp <= 0) return;

      // Clear warning tint
      if (target.isMirror) {
        target.sprite.setTint(0xc4b5fd);
      } else {
        target.sprite.clearTint();
      }

      const expX = target.sprite.x;
      const expY = target.sprite.y - 15;

      // A. Main massive TNT explosion fireball
      const explosion = this.add.sprite(expX, expY, 'steve_sheet_tnt_explosion');
      explosion.setDepth(28);
      explosion.setScale(1.05);
      explosion.play('steve_anim_tnt_explosion');
      explosion.on('animationcomplete', () => { if (explosion.active) explosion.destroy(); });
      this.time.delayedCall(1200, () => { if (explosion && explosion.active) explosion.destroy(); });

      // B. Explodes to pieces! Spawn multiple flying TNT block fragments bursting in all directions
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
        const speed = 280 + Math.random() * 240;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 160;

        const piece = this.physics.add.sprite(expX, expY, 'steve_sheet_tnt_flight');
        piece.setDepth(27);
        piece.setScale(0.18 + Math.random() * 0.08);
        piece.play('steve_anim_tnt_flight');
        piece.body.setAllowGravity(true);
        piece.body.gravity.y = 850;
        piece.setVelocity(vx, vy);
        piece.setAngularVelocity((Math.random() - 0.5) * 800);

        this.tweens.add({
          targets: piece,
          alpha: 0,
          scaleX: 0.05,
          scaleY: 0.05,
          duration: 500 + Math.random() * 220,
          ease: 'Quad.In',
          onComplete: () => {
            if (piece.active) piece.destroy();
          }
        });
      }

      // C. Expanding ground slam shockwave ring
      const floorY = target.charId === 'strange' ? 395.80 : (target.charId === 'chunli' ? 477.04 : 476.60);
      this.spawnSlamGroundEffect(expX, floorY);

      // D. Heavy camera shake & audio
      this.cameras.main.shake(380, 0.028);
      if (window.soundFX) window.soundFX.playStartBoom();

      // E. Apply full Super damage & launch knockback to opponent
      const pushDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      target.takeHit({
        damage: 260,
        isSpecial: true,
        knockbackX: pushDir * 720,
        knockbackY: -560
      }, caster);
    });
  }

  handleProjectileHit(proj, target) {
    if (!proj || !target || !target.sprite) return;
    // Guard: Ensure proj is actually an active projectile and not accidentally a fighter sprite
    if (proj === target.sprite || (this.fighterP1 && proj === this.fighterP1.sprite) || (this.fighterP2 && proj === this.fighterP2.sprite)) return;
    if (!proj.active || target === proj.caster) return;
    if (target.hp <= 0 || (this.roundState !== 'FIGHTING')) return;

    const hitX = proj.x;
    const hitY = proj.y;
    const isMystic = Boolean(proj.isMystic);
    const isKikoken = Boolean(proj.isKikoken);
    const isShadowBall = Boolean(proj.isShadowBall);
    const isTNT = Boolean(proj.isTNT);
    const isPsystrike = Boolean(proj.isPsystrike);
    const caster = proj.caster;

    if (proj.active) {
      proj.destroy();
    }

    if (isPsystrike) {
      // Psystrike deals damage ONLY when the cosmic ball explodes!
      this.spawnPsystrikeExplosion(target, caster, hitX, hitY);
      return;
    }

    if (isKikoken) {
      this.spawnKikokenImpact(hitX, hitY);
    } else if (isShadowBall) {
      this.spawnShadowBallImpact(hitX, hitY);
    } else if (isTNT) {
      this.spawnTNTExplosion(hitX, hitY, false);
    } else if (isMystic) {
      this.spawnShadowBallImpact(hitX, hitY);
    }

    const atkData = {
      damage: isShadowBall ? 155 : (isTNT ? 150 : (isKikoken ? 150 : (isMystic ? 155 : 155))),
      isSpecial: true,
      knockbackX: isShadowBall ? 520 : (isTNT ? 540 : (isKikoken ? 500 : (isMystic ? 480 : 500))),
      knockbackY: isShadowBall ? -360 : (isTNT ? -380 : (isKikoken ? -350 : (isMystic ? -340 : -350)))
    };

    target.takeHit(atkData, caster);
    this.cameras.main.shake(250, 0.019);
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
    const p1Color = p1Id === 'strange' ? 0xf59e0b : (p1Id === 'chunli' ? 0x0284c7 : (p1Id === 'mewtwo' ? 0x9333ea : (p1Id === 'steve' ? 0x0d9488 : 0x06b6d4)));
    const p1Hex = p1Id === 'strange' ? '#f59e0b' : (p1Id === 'chunli' ? '#38bdf8' : (p1Id === 'mewtwo' ? '#c084fc' : (p1Id === 'steve' ? '#2dd4bf' : '#06b6d4')));
    const p1PortraitKey = p1Id === 'strange' ? 'strange_portrait' : (p1Id === 'chunli' ? 'chunli_portrait' : (p1Id === 'mewtwo' ? 'mewtwo_portrait' : (p1Id === 'steve' ? 'steve_portrait' : 'harpy_portrait')));
    const p1DisplayName = p1Id === 'chunli' ? 'CHUN-LI' : (p1Id === 'strange' ? 'DR. STRANGE' : (p1Id === 'mewtwo' ? 'MEWTWO' : (p1Id === 'steve' ? 'STEVE' : 'HARPY')));

    const p1Card = this.add.rectangle(75, 60, 72, 72, p1Color, 0.4).setScrollFactor(0).setDepth(100);
    p1Card.setStrokeStyle(2, p1Color);
    const p1Img = this.add.image(75, 60, p1PortraitKey).setScrollFactor(0).setDepth(101);
    p1Img.setDisplaySize(68, 68);

    this.p1Name = this.add.text(125, 34, `P1: ${p1DisplayName}`, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '22px',
      color: '#fef08a'
    }).setScrollFactor(0).setDepth(100);

    const p1BarBg = this.add.rectangle(300, 68, 330, 16, 0x18181b, 0.85).setScrollFactor(0).setDepth(100);
    p1BarBg.setStrokeStyle(1, 0x52525b);
    this.p1BarFill = this.add.rectangle(137, 68, 326, 12, p1Color).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.p1HpText = this.add.text(300, 68, `${this.fighterP1.hp} / ${this.fighterP1.maxHp}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.p1ActionText = this.add.text(125, 84, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p1Hex,
      fontStyle: 'bold'
    }).setScrollFactor(0).setDepth(100);

    // --- PLAYER 2 HUD (Right) ---
    const p2Color = p2Id === 'strange' ? 0xf59e0b : (p2Id === 'chunli' ? 0x0284c7 : (p2Id === 'mewtwo' ? 0x9333ea : (p2Id === 'steve' ? 0x0d9488 : 0x06b6d4)));
    const p2Hex = p2Id === 'strange' ? '#f59e0b' : (p2Id === 'chunli' ? '#38bdf8' : (p2Id === 'mewtwo' ? '#c084fc' : (p2Id === 'steve' ? '#2dd4bf' : '#06b6d4')));
    const p2PortraitKey = p2Id === 'strange' ? 'strange_portrait' : (p2Id === 'chunli' ? 'chunli_portrait' : (p2Id === 'mewtwo' ? 'mewtwo_portrait' : (p2Id === 'steve' ? 'steve_portrait' : 'harpy_portrait')));
    const p2DisplayName = p2Id === 'chunli' ? 'CHUN-LI' : (p2Id === 'strange' ? 'DR. STRANGE' : (p2Id === 'mewtwo' ? 'MEWTWO' : (p2Id === 'steve' ? 'STEVE' : 'HARPY')));

    const p2Card = this.add.rectangle(1205, 60, 72, 72, p2Color, 0.4).setScrollFactor(0).setDepth(100);
    p2Card.setStrokeStyle(2, p2Color);
    const p2Img = this.add.image(1205, 60, p2PortraitKey).setScrollFactor(0).setDepth(101);
    p2Img.setDisplaySize(68, 68);

    this.p2Name = this.add.text(1155, 34, `P2: ${p2DisplayName}`, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '22px',
      color: '#fef08a'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    const p2BarBg = this.add.rectangle(980, 68, 330, 16, 0x18181b, 0.85).setScrollFactor(0).setDepth(100);
    p2BarBg.setStrokeStyle(1, 0x52525b);
    this.p2BarFill = this.add.rectangle(1143, 68, 326, 12, p2Color).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    this.p2HpText = this.add.text(980, 68, `${this.fighterP2.hp} / ${this.fighterP2.maxHp}`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.p2ActionText = this.add.text(1155, 84, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p2Hex,
      fontStyle: 'bold'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // --- Stage Title ---
    this.add.text(640, 14, 'GEKKA NO REIBYŌ // MOONLIT SHRINE COURTYARD', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      letterSpacing: 1,
      color: '#fde047'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // --- Current Round Badge ---
    this.roundBadgeText = this.add.text(640, 31, 'ROUND 1', {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '20px',
      letterSpacing: 1,
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // --- Central 2-Minute Timer Box (120s down to 0) ---
    this.timerBoxBg = this.add.rectangle(640, 62, 94, 52, 0x09090b, 0.92).setScrollFactor(0).setDepth(100);
    this.timerBoxBg.setStrokeStyle(2, 0xf59e0b, 0.95);

    this.timerNumText = this.add.text(640, 53, '120', {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '32px',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.timerClockText = this.add.text(640, 75, '02:00', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#a1a1aa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // --- Best of 3 Round Win Pips ---
    // P1 Round Win Pips (Left of Timer)
    this.p1Pip1 = this.add.circle(548, 62, 7, 0x18181b).setStrokeStyle(2, 0x06b6d4).setScrollFactor(0).setDepth(100);
    this.p1Pip2 = this.add.circle(568, 62, 7, 0x18181b).setStrokeStyle(2, 0x06b6d4).setScrollFactor(0).setDepth(100);
    this.add.text(558, 77, 'P1 WINS', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#67e8f9'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // P2 Round Win Pips (Right of Timer)
    this.p2Pip1 = this.add.circle(712, 62, 7, 0x18181b).setStrokeStyle(2, 0xef4444).setScrollFactor(0).setDepth(100);
    this.p2Pip2 = this.add.circle(732, 62, 7, 0x18181b).setStrokeStyle(2, 0xef4444).setScrollFactor(0).setDepth(100);
    this.add.text(722, 77, 'P2 WINS', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#f87171'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // --- REQUIREMENT: PROMINENT KEY CONTROLS FOR BOTH PLAYERS ---
    const guideBox = this.add.rectangle(640, 674, 1180, 50, 0x09090b, 0.88).setScrollFactor(0).setDepth(100);
    guideBox.setStrokeStyle(1.5, 0xf59e0b, 0.8);

    this.add.text(640, 663, 'P1 [WASD/SPACE]: Move/Jump | [F] 5A Light | [G] 5B Med | [H] 5C Heavy | [R] Special | [S+H / Y] Super | [Q] Dash', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#a5f3fc',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.text(640, 686, 'P2 [ARROWS]: Move/Jump | [J/NUM1] Light | [K/NUM2] Med | [L/NUM3] Heavy | [U/NUM4] Special | [↓+L / I] Super | [O] Dash', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#fef08a',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
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
    }).setOrigin(0.5).setDepth(30);

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
    else this.p1BarFill.fillColor = this.fighterP1.charId === 'strange' ? 0xf59e0b : (this.fighterP1.charId === 'chunli' ? 0x0284c7 : (this.fighterP1.charId === 'mewtwo' ? 0x9333ea : (this.fighterP1.charId === 'steve' ? 0x0d9488 : 0x06b6d4)));

    if (p2Ratio < 0.25) this.p2BarFill.fillColor = 0xef4444;
    else this.p2BarFill.fillColor = this.fighterP2.charId === 'strange' ? 0xf59e0b : (this.fighterP2.charId === 'chunli' ? 0x0284c7 : (this.fighterP2.charId === 'mewtwo' ? 0x9333ea : (this.fighterP2.charId === 'steve' ? 0x0d9488 : 0x06b6d4)));

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

    // Reset fighters to initial fighting marks in 1920-wide arena
    this.fighterP1.reset(550, 460);
    this.fighterP2.reset(1370, 460);

    // Update Round Badge Title
    const isFinalRound = (this.p1RoundWins === 1 && this.p2RoundWins === 1);
    const roundTitle = isFinalRound ? 'FINAL ROUND' : `ROUND ${roundNumber}`;
    if (this.roundBadgeText) {
      this.roundBadgeText.setText(roundTitle);
      this.roundBadgeText.setColor(isFinalRound ? '#ef4444' : '#fef08a');
    }

    this.updateHUD();

    // Round intro announcement sequence (screen-fixed)
    const introText = this.add.text(640, 260, roundTitle, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '84px',
      color: isFinalRound ? '#ef4444' : '#fef08a',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0).setScrollFactor(0).setDepth(110);
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
          if (!introText || !introText.active || !introText.scene) return;
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

    // Display primary banner (screen-fixed)
    const banner = this.add.text(640, 260, mainBannerText, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '94px',
      color: mainColor,
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0).setScrollFactor(0).setDepth(120);
    this.bannerObjects.push(banner);

    const subText = this.add.text(640, 350, subBannerText, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(120);
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

    // Dark semi-transparent overlay (screen-fixed)
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x07060a, 0.76).setScrollFactor(0).setDepth(120);
    this.bannerObjects.push(overlay);

    const titleText = this.add.text(640, 220, 'MATCH COMPLETE', {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '52px',
      color: '#f59e0b',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setScale(0).setScrollFactor(0).setDepth(121);
    this.bannerObjects.push(titleText);

    const champText = this.add.text(640, 290, `${matchChampion.toUpperCase()} VICTORIOUS`, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '42px',
      color: championColor,
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(121);
    this.bannerObjects.push(champText);

    const scoreText = this.add.text(640, 355, `FINAL SCORE // 1P [ ${this.p1RoundWins} ] — [ ${this.p2RoundWins} ] 2P`, {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#e2e8f0'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(121);
    this.bannerObjects.push(scoreText);

    const rematchBox = this.add.rectangle(640, 430, 460, 46, 0x0f111a, 0.9).setScrollFactor(0).setDepth(122);
    rematchBox.setStrokeStyle(1.5, 0xf59e0b);
    rematchBox.setInteractive({ useHandCursor: true });
    rematchBox.on('pointerdown', () => this.restartMatch());
    rematchBox.on('pointerover', () => rematchBox.setFillStyle(0x1e2235, 1));
    rematchBox.on('pointerout', () => rematchBox.setFillStyle(0x0f111a, 0.9));
    this.bannerObjects.push(rematchBox);

    const promptText = this.add.text(640, 430, '[ ENTER / SPACE ] REMATCH', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(123);
    this.bannerObjects.push(promptText);

    const escText = this.add.text(640, 485, '[ ESC ] RETURN TO MAIN MENU', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(123);
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
        } catch (e) { }
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

    // --- DYNAMIC MODERN FIGHTING GAME CAMERA SYSTEM ---
    if (this.fighterP1 && this.fighterP2 && this.fighterP1.sprite && this.fighterP2.sprite) {
      const p1Sprite = this.fighterP1.sprite;
      const p2Sprite = this.fighterP2.sprite;

      const midX = (p1Sprite.x + p2Sprite.x) / 2;
      const midY = (p1Sprite.y + p2Sprite.y) / 2;
      const dist = Math.abs(p1Sprite.x - p2Sprite.x);

      // 1. Dynamic Zoom:
      // Intense close-ups when fighters clash (< 360px), smooth wide-lens when fighters separate (> 760px)
      let targetZoom = 1.0;
      if (dist < 360) {
        targetZoom = 1.08;
      } else if (dist > 760) {
        targetZoom = 0.94;
      } else {
        const factor = (dist - 360) / (760 - 360);
        targetZoom = 1.08 - factor * (1.08 - 0.94);
      }

      this.cameras.main.zoom = Phaser.Math.Linear(this.cameras.main.zoom, targetZoom, 0.04);

      // 2. Dynamic Center Tracking:
      // Clamp target cam X so camera never shows outside the 1920 stage bounds
      const halfViewW = (640 / this.cameras.main.zoom);
      const minCamX = halfViewW;
      const maxCamX = 1920 - halfViewW;
      const targetCamX = Phaser.Math.Clamp(midX, minCamX, maxCamX);

      // Vertical camera tracks aerial jumps with subtle damping
      const groundY = 460;
      const jumpOffset = Math.min(0, midY - groundY);
      const targetCamY = 360 + jumpOffset * 0.28;

      this.cameras.main.centerOn(
        Phaser.Math.Linear(this.cameras.main.midPoint.x, targetCamX, 0.08),
        Phaser.Math.Linear(this.cameras.main.midPoint.y, targetCamY, 0.06)
      );
    }

    // --- DYNAMIC ENVIRONMENTAL MOTION SIMULATION (Selected Stage) ---
    if (this.currentStage === 'sky_temple') {
      this.updateSkyTempleEnvironment(delta);
    }
    const dt = delta / 1000;
    // Midground Ambient Sakura Petals
    if (this.sakuraParticles) {
      for (let i = 0; i < this.sakuraParticles.length; i++) {
        const p = this.sakuraParticles[i];
        p.wobblePhase += p.wobbleSpeed * dt;
        p.x += (p.speedX + Math.sin(p.wobblePhase) * 18) * dt;
        p.y += p.speedY * dt;
        p.rotation += p.rotSpeed;

        if (p.x < -120) p.x = 2050;
        if (p.y > 740) {
          p.y = -30;
          p.x = Phaser.Math.Between(-100, 2050);
        }
      }
    }

    // Foreground Cinematic Out-of-Focus Sakura Petals
    if (this.foregroundPetals) {
      for (let i = 0; i < this.foregroundPetals.length; i++) {
        const fp = this.foregroundPetals[i];
        fp.x += fp.speedX * dt;
        fp.y += fp.speedY * dt;
        fp.rotation += fp.rotSpeed;

        if (fp.x < -160) fp.x = 2100;
        if (fp.y > 750) {
          fp.y = -40;
          fp.x = Phaser.Math.Between(0, 2100);
        }
      }
    }

    // Creeping Ground Mist Ribbons
    if (this.groundMist1) {
      this.groundMist1.x -= 24 * dt;
      if (this.groundMist1.x < -480) this.groundMist1.x = 0;
    }
    if (this.groundMist2) {
      this.groundMist2.x -= 14 * dt;
      if (this.groundMist2.x < -600) this.groundMist2.x = -200;
    }

    // Update Live Action, Health & Timer HUD
    this.updateHUD();
  }
}

// Global launchers & match control
window.startPhaserArena = function () {
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

window.exitArenaToMenu = function () {
  if (window.hideLoadingScreen) window.hideLoadingScreen();
  const container = document.getElementById('phaser-container');
  const menuWrapper = document.getElementById('menuWrapper');
  const arenaUI = document.getElementById('arenaControlBar');

  if (container) container.style.display = 'none';
  if (arenaUI) arenaUI.style.display = 'none';
  if (menuWrapper) menuWrapper.style.display = 'flex';
};

window.restartMatch = function () {
  if (window.activeArenaScene) {
    window.activeArenaScene.restartMatch();
  } else if (window.startPhaserArena) {
    window.startPhaserArena();
  }
};
