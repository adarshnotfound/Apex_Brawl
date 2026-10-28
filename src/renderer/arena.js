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
    this.stunTimer = null;

    this.hp = charId === 'dummy' ? 1000 : (charId === 'strange' ? 960 : (charId === 'chunli' ? 950 : (charId === 'mewtwo' ? 940 : (charId === 'steve' ? 980 : 920))));
    this.maxHp = this.hp;

    // Movement speeds & Jump velocity (balanced fighting game frame data)
    this.walkSpeed = charId === 'dummy' ? 220 : (charId === 'strange' ? 215 : (charId === 'chunli' ? 260 : (charId === 'mewtwo' ? 250 : (charId === 'steve' ? 240 : 260))));
    this.dashSpeed = charId === 'dummy' ? 440 : (charId === 'strange' ? 460 : (charId === 'chunli' ? 495 : (charId === 'mewtwo' ? 500 : (charId === 'steve' ? 470 : 490))));
    this.jumpVel = charId === 'dummy' ? -720 : (charId === 'strange' ? -720 : (charId === 'chunli' ? -760 : (charId === 'mewtwo' ? -750 : (charId === 'steve' ? -730 : -760))));

    // Create sprite
    const initialTexture = charId === 'dummy' ? 'dummy_sprite' : (charId === 'strange' ? 'strange_sheet_idle' : (charId === 'chunli' ? 'chunli_sheet_idle' : (charId === 'mewtwo' ? 'mewtwo_sheet_idle' : (charId === 'steve' ? 'steve_sheet_idle' : 'harpy_sheet_idle'))));
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setDepth(10);
    if (charId === 'dummy') {
      // Static Robo Practice Dummy: 245x340 frame scaled to 0.68 visual height (~230px)
      this.sprite.setScale(0.68);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setDisplayOrigin(122, 170);
      this.sprite.body.setSize(110, 310);
      this.sprite.body.setOffset(68, 25);
    } else if (charId === 'strange') {
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

    if (charId === 'dummy') {
      // Practice Dummy uses static sprite frame with tint flash feedback
      this.sprite.clearTint();
    } else if (charId === 'strange') {
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
    if (!this.sprite || !this.sprite.body) return;
    const floorY = 575;

    // Fixed ground Y anchors that seat feet flush on the platform at y = 575
    if (this.charId === 'steve') {
      this.sprite.y = 476.60;
    } else if (this.charId === 'mewtwo') {
      this.sprite.y = 479.84;
    } else if (this.charId === 'chunli') {
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
    if (this.charId === 'dummy') {
      // Static Robot: never play sprite animations!
      this.currentAction = (this.scene && this.scene.trainingSettings && this.scene.trainingSettings.dummyAction === 'GUARD') ? 'GUARD' : 'STAND STILL';
      this.sprite.setTexture('dummy_sprite');
      this.sprite.clearTint();
      return;
    }

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
    if (this.stunTimer) {
      this.stunTimer.remove();
      this.stunTimer = null;
    }
    this.sprite.setAlpha(1);
    this.shadowBallFired = false;
    this.tntFired = false;

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
        if (animKey === 'steve_anim_atk_5a') {
          this.sprite.setScale(0.421);
          this.sprite.setOrigin(0.5, 0.499);
          this.sprite.body.setSize(170, 438);
          this.sprite.body.setOffset(171, 51);
        } else if (animKey === 'steve_anim_atk_5b') {
          this.sprite.setScale(0.459);
          this.sprite.setOrigin(0.5, 0.506);
          this.sprite.body.setSize(156, 400);
          this.sprite.body.setOffset(152, 49);
        } else if (animKey === 'steve_anim_atk_5c' || animKey === 'steve_anim_super') {
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

    if (this.charId === 'dummy') {
      // STATIC ROBO DUMMY GETS DAMAGE!
      this.hp = Math.max(0, this.hp - attackData.damage);

      // Floating damage number
      const textY = this.sprite.y - 120;
      this.scene.spawnDamageNumber(this.sprite.x, textY, attackData.damage, attackData.isSpecial);

      // Metallic impact flash (bright white tint on hit)
      this.sprite.setTint(0xffffff);
      this.scene.time.delayedCall(120, () => {
        if (this.sprite && this.sprite.active) {
          this.sprite.clearTint();
        }
      });

      // Subtle solid impact recoil (slight jolt then settles immediately)
      const attackerX = (attacker && attacker.sprite) ? attacker.sprite.x : (this.sprite.x - this.getFacingDir() * 100);
      const pushDir = this.sprite.x >= attackerX ? 1 : -1;
      const recoilSpeed = attackData.isSpecial ? 120 : 60;
      this.sprite.setVelocityX(pushDir * recoilSpeed);
      this.scene.time.delayedCall(100, () => {
        if (this.sprite && this.sprite.active) {
          this.sprite.setVelocityX(0);
        }
      });

      // Screen impact shake
      this.scene.cameras.main.shake(attackData.isSpecial ? 160 : 80, attackData.isSpecial ? 0.012 : 0.005);

      // Sound impact
      if (window.soundFX) {
        if (attackData.isSpecial) window.soundFX.playStartBoom();
        else window.soundFX.playSelect();
      }

      // Update HUD immediately
      this.scene.updateHUD();
      return;
    }

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
    this.sprite.setTint(this.charId === 'dummy' ? 0xffffff : 0xff2222);
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
      if (attackData.isStun) {
        this.isStunned = true;
        this.currentAction = 'STUNNED / RECOIL';
        if (this.stunTimer) this.stunTimer.remove();
        this.stunTimer = this.scene.time.delayedCall(attackData.stunDuration || 340, () => {
          this.isStunned = false;
          this.stunTimer = null;
          this.updateTextureForState();
        });
      }
      this.updateTextureForState();
    }
  }

  handleControls(input) {
    if (!this.sprite || !this.sprite.body) return;
    if (this.charId === 'dummy') {
      // Static Robo Dummy: completely static in place, absorbs damage cleanly
      this.sprite.setVelocityX(0);
      this.sprite.setTexture('dummy_sprite');
      const isGuard = (this.scene && this.scene.trainingSettings && this.scene.trainingSettings.dummyAction === 'GUARD');
      this.currentAction = isGuard ? 'GUARD' : 'STAND STILL';
      return;
    }
    if (this.isStunned) return;
    if (this.hp <= 0 || (this.scene && this.scene.roundState !== 'FIGHTING')) {
      if (this.hp <= 0) {
        this.currentAction = 'DEFEATED (K.O.)';
      } else {
        this.currentAction = 'READY';
      }
      this.sprite.setVelocityX(0);
      return;
    }

    // Determine whether fighter is holding Back away from opponent (Fighting Block)
    if (this.scene && this.scene.fighterP1 && this.scene.fighterP2) {
      const opponent = (this === this.scene.fighterP1) ? this.scene.fighterP2 : this.scene.fighterP1;
      if (opponent && opponent.sprite) {
        const opponentIsToRight = opponent.sprite.x > this.sprite.x;
        this.isHoldingBack = Boolean(opponentIsToRight ? input.left : input.right);
      } else {
        this.isHoldingBack = false;
      }
    } else {
      this.isHoldingBack = false;
    }

    // Ground Check: physical contact or world bottom
    const onGround = Boolean(
      this.isCrouching ||
      this.sprite.body.blocked.down ||
      this.sprite.body.touching.down ||
      this.sprite.body.bottom >= 568
    );

    // Landing detection
    if (onGround && (this.isInAir || this.isKnockedBack)) {
      if (this.isAttacking) {
        // Do not abort active attack animation upon ground contact
        this.isInAir = false;
        this.isKnockedBack = false;
        this.snapToGround();
      } else {
        this.isInAir = false;
        this.isKnockedBack = false;
        this.isAttacking = false;
        this.currentAttackData = null;
        if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
        this.updateTextureForState();
        this.snapToGround();
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
          }, 750);
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
            knockbackX: 360,
            knockbackY: -120,
            isSpecial: false
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
            knockbackX: 350,
            knockbackY: -130,
            isSpecial: false
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
        this.triggerAttack('KIKOKEN (PROJECTILE)', 'chunli_anim_sp_kikoken', {
          damage: 150,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 460,
          knockbackY: -270,
          isSpecial: true
        }, 1200);
      } else if (this.charId === 'mewtwo') {
        this.triggerAttack('SHADOW BALL (PROJECTILE)', 'mewtwo_anim_sp_shadow_ball', {
          damage: 155,
          rangeX: 140,
          rangeY: 100,
          knockbackX: 470,
          knockbackY: -270,
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
          knockbackX: 450,
          knockbackY: -260,
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
        if (this.scene && this.scene.spawnPsystrikeVFX) {
          this.scene.spawnPsystrikeVFX(this);
        }
      } else if (this.charId === 'steve') {
        this.triggerAttack('MEGATON DETONATION (SUPER)', 'steve_anim_super', {
          damage: 255,
          rangeX: 310,
          rangeY: 190,
          knockbackX: 710,
          knockbackY: -550,
          isSpecial: true
        }, 2200);
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
          this.sprite.setOrigin(0.5, 0.5);
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
            this.sprite.play('chunli_anim_crouch_down').chain('chunli_anim_crouch_hold');
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
            this.sprite.setTexture('chunli_sheet_idle');
            this.sprite.play('chunli_anim_idle', true);
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
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.471, 0.5);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 10);
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
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.471, 0.5);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 10);
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
              this.sprite.setOrigin(0.5, 0.5);
              this.sprite.play('chunli_anim_idle', true);
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
      } else if (this.charId === 'chunli' && this.sprite.anims.currentAnim?.key !== 'chunli_anim_jump') {
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
    this.load.spritesheet('mewtwo_sheet_walk', mBase + '02_Mewtwo_Walk.png', { frameWidth: 256, frameHeight: 256 });
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
    this.load.spritesheet('steve_sheet_tnt_flight', stBase + 'TNT_Flight.png', { frameWidth: 600, frameHeight: 448 });
    this.load.spritesheet('steve_sheet_tnt_fuse', stBase + 'TNT_Fuse.png', { frameWidth: 600, frameHeight: 448 });
    this.load.spritesheet('steve_sheet_tnt_explosion', stBase + 'TNT_Explosion.png', { frameWidth: 632, frameHeight: 424 });

    // 6. Training Dummy Assets
    this.load.image('dummy_sprite', 'assets/characters/dummy/dummy_sprite.png');
    this.load.image('dummy_portrait', 'assets/characters/dummy/portrait.png');
  }

  create() {
    this.isGameOver = false;
    this.isPaused = false;
    this.pauseObjects = [];
    this.currentRound = 1;
    this.p1RoundWins = 0;
    this.fightingAI = window.fightingAI || (typeof FightingAI !== 'undefined' ? new FightingAI() : null);
    this.isCpuMatch = !this.isTrainingMode && !window.isLanMatch && (window.isCpuMatch === true || window.isArcadeMode === true);
    this.cpuDifficulty = window.cpuDifficulty || 'MEDIUM';
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
    const p2Char = (window.isTrainingMode === true) ? 'dummy' : (window.selectedFighterP2 || 'strange');
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

    // 6.4. LAN Disconnection Guard
    if (window.isLanMatch && window.lanManager) {
      window.lanManager.on('PEER_DISCONNECTED', () => {
        if (this.lanDisconnected) return;
        this.lanDisconnected = true;

        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.75).setScrollFactor(0).setDepth(999);
        const modalBox = this.add.rectangle(640, 360, 560, 220, 0x18181b, 0.95).setScrollFactor(0).setDepth(1000);
        modalBox.setStrokeStyle(2, 0xef4444);

        this.add.text(640, 290, '⚠️ CONNECTION TERMINATED', {
          fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
          fontSize: '32px',
          color: '#ef4444'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        this.add.text(640, 335, 'The remote opponent disconnected or left the LAN match.', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '16px',
          color: '#e4e4e7'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        const btnReturn = this.add.rectangle(640, 395, 220, 44, 0x27272a).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true });
        btnReturn.setStrokeStyle(1, 0xef4444);
        this.add.text(640, 395, 'RETURN TO MAIN MENU', {
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: '15px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

        btnReturn.on('pointerdown', () => {
          window.isLanMatch = false;
          window.location.reload();
        });
        btnReturn.on('pointerover', () => btnReturn.setFillStyle(0x7f1d1d));
        btnReturn.on('pointerout', () => btnReturn.setFillStyle(0x27272a));
      });
    }

    // 6.5. Modern Feature-Complete Training Mode Initialization
    this.setupTrainingMode();

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
    defineAnim('mewtwo_anim_vfx_psystrike', 'mewtwo_sheet_vfx_psystrike', 0, 23, 14, 0);
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
    defineAnim('steve_anim_super', 'steve_sheet_pickaxe', 0, 23, 11, 0);

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
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const chargeX = caster.sprite.x + (facingRight ? 55 : -55);
    const chargeY = caster.sprite.y - 20;

    const charge = this.add.sprite(chargeX, chargeY, 'mewtwo_sheet_vfx_charge');
    charge.setDepth(25);
    charge.setScale(0.70);
    charge.play('mewtwo_anim_vfx_charge');
    caster.activeShadowBallChargeVFX = charge;

    this.time.delayedCall(500, () => {
      if (charge && charge.active) charge.destroy();
      if (caster.activeShadowBallChargeVFX === charge) caster.activeShadowBallChargeVFX = null;
    });
  }

  spawnShadowBallProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? -1 : 1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 75 : -75);
    const spawnY = caster.sprite.y - 25;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'mewtwo_sheet_projectile');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.65);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(120, 120);
    proj.body.setOffset(68, 68);
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
    impact.setScale(0.85);
    impact.play('mewtwo_anim_impact');
    impact.on('animationcomplete', () => impact.destroy());
    this.time.delayedCall(800, () => { if (impact && impact.active) impact.destroy(); });
  }

  spawnPsychicCrushVFX(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;
    if (!target || !target.sprite) return;

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;

    // After brief focus/clench startup (~200ms), psychic forcefield compresses directly around opponent!
    this.time.delayedCall(200, () => {
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      if (!target || !target.sprite || target.hp <= 0) return;

      // Forcefield VFX occurs directly centered around the opponent
      const vfxX = target.sprite.x;
      const vfxY = target.sprite.y - 10;

      const vfx = this.add.sprite(vfxX, vfxY, 'mewtwo_sheet_vfx_forcefield');
      vfx.setDepth(25);
      vfx.setScale(1.1);
      vfx.setFlipX(!facingRight);
      vfx.play('mewtwo_anim_vfx_forcefield');

      // Keep forcefield tracking opponent so it firmly encapsulates them
      const onUpdate = () => {
        if (vfx && vfx.active && target && target.sprite) {
          vfx.setPosition(target.sprite.x, target.sprite.y - 10);
        }
      };
      this.events.on('update', onUpdate);

      vfx.on('animationcomplete', () => {
        this.events.off('update', onUpdate);
        if (vfx.active) vfx.destroy();
      });
      this.time.delayedCall(1000, () => {
        this.events.off('update', onUpdate);
        if (vfx && vfx.active) vfx.destroy();
      });

      // Forcefield telekinetically compresses around opponent: impact effect, damage, and brief suspension!
      this.spawnShadowBallImpact(vfxX, vfxY);
      target.takeHit({
        damage: 95,
        isSpecial: false,
        isStun: true,
        stunDuration: 340,
        knockbackX: 250,
        knockbackY: -80
      }, caster);
      caster.hasDealtDamage = true;
      this.cameras.main.shake(180, 0.012);
      if (window.soundFX) window.soundFX.playStartBoom();
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
      proj.play('mewtwo_anim_vfx_psystrike');

      proj.body.allowGravity = false;
      proj.body.setAllowGravity(false);
      proj.body.gravity.y = 0;
      proj.body.setSize(180, 160);
      proj.body.setOffset(15, 26);

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

  spawnPsystrikeExplosion(x, y) {
    const explosion = this.add.sprite(x, y, 'mewtwo_sheet_vfx_psystrike');
    explosion.setDepth(28);
    explosion.setScale(1.3);
    explosion.play('mewtwo_anim_vfx_psystrike');
    explosion.on('animationcomplete', () => { if (explosion.active) explosion.destroy(); });
    this.time.delayedCall(1200, () => { if (explosion && explosion.active) explosion.destroy(); });
    this.spawnShadowBallImpact(x, y);
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

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const fuseX = caster.sprite.x + (facingRight ? 60 : -60);
    const fuseY = caster.sprite.y + 10;

    const fuse = this.add.sprite(fuseX, fuseY, 'steve_sheet_tnt_fuse');
    fuse.setDepth(25);
    fuse.setScale(0.38);
    fuse.setFlipX(!facingRight);
    fuse.play('steve_anim_tnt_fuse');
    caster.activeMegatonVFX = fuse;

    this.time.delayedCall(500, () => {
      if (fuse && fuse.active) fuse.destroy();
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      this.spawnTNTExplosion(fuseX, fuseY - 20, true);
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
    const isKikoken = Boolean(proj.isKikoken);
    const isShadowBall = Boolean(proj.isShadowBall);
    const isTNT = Boolean(proj.isTNT);
    const isPsystrike = Boolean(proj.isPsystrike);
    const caster = proj.caster;

    if (proj.active) {
      proj.destroy();
    }

    if (isKikoken) {
      this.spawnKikokenImpact(hitX, hitY);
    } else if (isShadowBall) {
      this.spawnShadowBallImpact(hitX, hitY);
    } else if (isTNT) {
      this.spawnTNTExplosion(hitX, hitY, false);
    } else if (isPsystrike) {
      this.spawnPsystrikeExplosion(hitX, hitY);
    }

    const atkData = {
      damage: isPsystrike ? 260 : (isShadowBall ? 155 : (isTNT ? 150 : (isKikoken ? 150 : 155))),
      isSpecial: true,
      knockbackX: isPsystrike ? 720 : (isShadowBall ? 470 : (isTNT ? 450 : (isKikoken ? 460 : 450))),
      knockbackY: isPsystrike ? -560 : (isShadowBall ? -270 : (isTNT ? -260 : (isKikoken ? -270 : -280)))
    };

    target.takeHit(atkData, caster);
    this.cameras.main.shake(isPsystrike ? 380 : 240, isPsystrike ? 0.026 : 0.018);
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
      this.togglePauseMenu();
    });
  }

  togglePauseMenu() {
    if (this.roundState === 'MATCH_OVER' || this.isGameOver) return;
    if (window.isLanMatch) return; // Disallow pausing during active LAN matches

    if (this.isPaused) {
      this.resumeMatch();
    } else {
      this.pauseMatch();
    }
  }

  pauseMatch() {
    this.isPaused = true;
    this.physics.world.pause();

    // Semi-transparent frosted dark glass overlay
    this.pauseOverlay = this.add.rectangle(640, 360, 1280, 720, 0x050408, 0.48).setScrollFactor(0).setDepth(300);

    // Centered glass card panel matching main menu translucent design
    this.pauseCard = this.add.rectangle(640, 360, 480, 330, 0x0e0b16, 0.52).setScrollFactor(0).setDepth(301);
    this.pauseCard.setStrokeStyle(1.5, 0xf59e0b, 0.85);

    this.pauseTitle = this.add.text(640, 235, '⏸️ KOMBAT PAUSED', {
      fontFamily: 'Bebas Neue, Cinzel, Rajdhani, sans-serif',
      fontSize: '36px',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(302);

    this.pauseObjects = [this.pauseOverlay, this.pauseCard, this.pauseTitle];

    const createPauseBtn = (y, text, icon, onClick, isDanger = false) => {
      const btnBg = this.add.rectangle(640, y, 380, 44, isDanger ? 0x220f14 : 0x140f1f, 0.6)
        .setScrollFactor(0)
        .setDepth(302)
        .setInteractive({ useHandCursor: true });
      btnBg.setStrokeStyle(1.2, isDanger ? 0xef4444 : 0xf59e0b, 0.7);

      const btnText = this.add.text(640, y, `${icon} ${text}`, {
        fontFamily: 'Cinzel, Oswald, Rajdhani, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        letterSpacing: 2,
        color: isDanger ? '#fca5a5' : '#fef3c7'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(303);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(isDanger ? 0xdc2626 : 0xd97706, 0.85);
        btnBg.setStrokeStyle(1.5, 0xffffff, 1);
        btnText.setColor('#ffffff');
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(isDanger ? 0x220f14 : 0x140f1f, 0.6);
        btnBg.setStrokeStyle(1.2, isDanger ? 0xef4444 : 0xf59e0b, 0.7);
        btnText.setColor(isDanger ? '#fca5a5' : '#fef3c7');
      });
      btnBg.on('pointerdown', onClick);

      this.pauseObjects.push(btnBg, btnText);
    };

    // 1. RESUME KOMBAT
    createPauseBtn(295, 'RESUME KOMBAT', '▶️', () => this.resumeMatch());

    // 2. RESTART MATCH
    createPauseBtn(355, 'RESTART MATCH', '🔄', () => {
      this.clearPauseUI();
      this.restartMatch();
    });

    // 3. EXIT TO MAIN MENU
    createPauseBtn(415, 'EXIT TO MAIN MENU', '🚪', () => {
      this.clearPauseUI();
      if (window.exitArenaToMenu) window.exitArenaToMenu();
      else window.location.reload();
    }, true);
  }

  resumeMatch() {
    this.clearPauseUI();
    this.physics.world.resume();
    this.isPaused = false;
  }

  clearPauseUI() {
    if (this.pauseObjects) {
      this.pauseObjects.forEach(obj => {
        if (obj && obj.destroy) obj.destroy();
      });
      this.pauseObjects = [];
    }
    this.isPaused = false;
  }

  buildDualPlayerHUD(p1Id, p2Id) {
    // --- PLAYER 1 HUD (Left) ---
    const p1Color = p1Id === 'strange' ? 0xf59e0b : (p1Id === 'chunli' ? 0x0284c7 : (p1Id === 'mewtwo' ? 0x9333ea : (p1Id === 'steve' ? 0x0d9488 : 0x06b6d4)));
    const p1Hex = p1Id === 'strange' ? '#f59e0b' : (p1Id === 'chunli' ? '#38bdf8' : (p1Id === 'mewtwo' ? '#c084fc' : (p1Id === 'steve' ? '#2dd4bf' : '#06b6d4')));
    const p1PortraitKey = p1Id === 'strange' ? 'strange_portrait' : (p1Id === 'chunli' ? 'chunli_portrait' : (p1Id === 'mewtwo' ? 'mewtwo_portrait' : (p1Id === 'steve' ? 'steve_portrait' : 'harpy_portrait')));
    const p1DisplayName = p1Id === 'chunli' ? 'CHUN-LI' : (p1Id === 'strange' ? 'DR. STRANGE' : (p1Id === 'mewtwo' ? 'MEWTWO' : (p1Id === 'steve' ? 'STEVE' : (p1Id === 'zoro' ? 'ZORO' : 'HARPY'))));

    const p1Card = this.add.rectangle(75, 60, 72, 72, p1Color, 0.4).setScrollFactor(0).setDepth(100);
    p1Card.setStrokeStyle(2, p1Color);
    const p1Img = this.add.image(75, 60, p1PortraitKey).setScrollFactor(0).setDepth(101);
    p1Img.setDisplaySize(68, 68);

    let p1Title = `P1: ${p1DisplayName}`;
    if (window.isLanMatch && window.lanManager) {
      p1Title = window.lanManager.role === 'HOST' ? `1P (YOU): ${p1DisplayName}` : `1P (HOST): ${p1DisplayName}`;
    }
    this.p1Name = this.add.text(125, 34, p1Title, {
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
    const p2Color = p2Id === 'dummy' ? 0x64748b : (p2Id === 'strange' ? 0xf59e0b : (p2Id === 'chunli' ? 0x0284c7 : (p2Id === 'mewtwo' ? 0x9333ea : (p2Id === 'steve' ? 0x0d9488 : 0x06b6d4))));
    const p2Hex = p2Id === 'dummy' ? '#94a3b8' : (p2Id === 'strange' ? '#f59e0b' : (p2Id === 'chunli' ? '#38bdf8' : (p2Id === 'mewtwo' ? '#c084fc' : (p2Id === 'steve' ? '#2dd4bf' : '#06b6d4'))));
    const p2PortraitKey = p2Id === 'dummy' ? 'dummy_portrait' : (p2Id === 'strange' ? 'strange_portrait' : (p2Id === 'chunli' ? 'chunli_portrait' : (p2Id === 'mewtwo' ? 'mewtwo_portrait' : (p2Id === 'steve' ? 'steve_portrait' : 'harpy_portrait'))));
    const p2DisplayName = p2Id === 'dummy' ? 'PRACTICE DUMMY' : (p2Id === 'chunli' ? 'CHUN-LI' : (p2Id === 'strange' ? 'DR. STRANGE' : (p2Id === 'mewtwo' ? 'MEWTWO' : (p2Id === 'steve' ? 'STEVE' : (p2Id === 'zoro' ? 'ZORO' : 'HARPY')))));

    const p2Card = this.add.rectangle(1205, 60, 72, 72, p2Color, 0.4).setScrollFactor(0).setDepth(100);
    p2Card.setStrokeStyle(2, p2Color);
    const p2Img = this.add.image(1205, 60, p2PortraitKey).setScrollFactor(0).setDepth(101);
    p2Img.setDisplaySize(68, 68);

    const p2Prefix = this.isTrainingMode ? 'DUMMY' : 'P2';
    let p2Title = `${p2Prefix}: ${p2DisplayName}`;
    if (window.isLanMatch && window.lanManager) {
      p2Title = window.lanManager.role === 'CLIENT' ? `2P (YOU): ${p2DisplayName}` : `2P (CHALLENGER): ${p2DisplayName}`;
    } else if (this.isCpuMatch && !window.isLanMatch && !this.isTrainingMode) {
      const diff = (window.cpuDifficulty || this.cpuDifficulty || 'MEDIUM').toUpperCase();
      p2Title = `CPU (${diff}): ${p2DisplayName}`;
    }
    this.p2Name = this.add.text(1155, 34, p2Title, {
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

      // 1. GUARD / BLOCK EVALUATION (Player & Dummy)
      let isBlocked = false;
      if (defender === this.fighterP2 && this.isTrainingMode && this.trainingSettings) {
        const dummyAction = this.trainingSettings.dummyAction;
        const guardSetting = this.trainingSettings.dummyGuard;
        if (dummyAction === 'GUARD' || guardSetting === 'ALL') {
          isBlocked = true;
        } else if (guardSetting === 'AFTER_FIRST_HIT' && this.comboHits > 0) {
          isBlocked = true;
        } else if (guardSetting === 'RANDOM' && Math.random() < 0.5) {
          isBlocked = true;
        }
      } else if (defender.isHoldingBack && !defender.isAttacking) {
        // Universal Block: Defender holding Back (away from attacker) while not attacking
        isBlocked = true;
      }

      if (isBlocked) {
        // Block Effect (Blue Tint + Guard Ping + Floating Text)
        if (window.soundFX && window.soundFX.playGuard) {
          window.soundFX.playGuard();
        } else if (window.soundFX) {
          window.soundFX.playSelect();
        }

        defender.sprite.setTint(0x60a5fa);
        this.time.delayedCall(150, () => {
          if (defender.isMirror) defender.sprite.setTint(0xc4b5fd);
          else defender.sprite.clearTint();
        });

        // Spawn Floating "BLOCKED!" Text
        const textY = defender.sprite.y - 105;
        const blockText = this.add.text(defender.sprite.x, textY, 'BLOCKED!', {
          fontFamily: 'Oswald',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#60a5fa',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
          targets: blockText,
          y: textY - 35,
          alpha: 0,
          duration: 650,
          ease: 'Power2',
          onComplete: () => blockText.destroy()
        });

        // Chip damage for special attacks only
        const chipDmg = atkData.isSpecial ? Math.max(6, Math.round(atkData.damage * 0.15)) : 0;
        if (chipDmg > 0) {
          defender.hp = Math.max(1, defender.hp - chipDmg);
          this.spawnDamageNumber(defender.sprite.x, textY - 20, chipDmg, false);
        }

        // Frame Advantage on Block
        let blockAdv = '-2F (SAFE)';
        if (atkData.isSpecial) blockAdv = '-14F (UNSAFE)';
        else if (atkData.damage >= 50) blockAdv = '-6F (UNSAFE)';
        else if (atkData.damage <= 25) blockAdv = '+1F (ADVANTAGE)';

        const moveName = atkData.name || (atkData.isSpecial ? 'SPECIAL' : 'NORMAL');
        this.updateAttackDataHUD(this.comboHits, chipDmg, this.comboDamage, 1.0, blockAdv, moveName);
        this.cameras.main.shake(80, 0.005);
        return;
      }

      // 2. CLEAN HIT CONNECTS
      let finalDamage = atkData.damage;

      // Counter Hit Check
      if (this.isTrainingMode && this.trainingSettings && this.trainingSettings.dummyCounterHit === 'ALWAYS') {
        finalDamage = Math.round(finalDamage * 1.25);
        const counterText = this.add.text(defender.sprite.x, defender.sprite.y - 135, 'COUNTER HIT!', {
          fontFamily: 'Oswald',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#f59e0b',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
          targets: counterText,
          y: defender.sprite.y - 170,
          alpha: 0,
          duration: 750,
          ease: 'Power2',
          onComplete: () => counterText.destroy()
        });
      }

      // Check if Damage is Disabled in Training Mode
      if (this.isTrainingMode && this.trainingSettings && this.trainingSettings.disableDamage) {
        finalDamage = 0;
      }

      // Combo Tracking & Damage Scaling (SF6 Standard: 100%, 90%, 80%, floor at 20%)
      this.comboHits++;
      const scaling = Math.max(0.2, 1.0 - (this.comboHits - 1) * 0.1);
      const scaledDamage = Math.round(finalDamage * scaling);
      this.comboDamage += scaledDamage;
      this.lastHitDamage = scaledDamage;
      this.comboTimer = 1.25;

      // Frame Advantage on Hit
      let hitAdv = '+4F (LINKABLE)';
      if (atkData.isSpecial) hitAdv = '+18F (HARD KNOCKDOWN)';
      else if (atkData.damage >= 50) hitAdv = '+8F (COMBOABLE)';
      else if (atkData.damage >= 35) hitAdv = '+6F (LINKABLE)';

      const moveName = atkData.name || (atkData.isSpecial ? 'SPECIAL' : 'NORMAL');
      if (this.isTrainingMode) {
        this.updateAttackDataHUD(this.comboHits, scaledDamage, this.comboDamage, scaling, hitAdv, moveName);
      }

      // Deliver Damage to entity
      defender.takeHit({ ...atkData, damage: scaledDamage }, attacker);

      // Camera impact shake
      this.cameras.main.shake(atkData.isSpecial ? 220 : 120, atkData.isSpecial ? 0.016 : 0.007);

      // Sound impact
      if (window.soundFX) {
        if (atkData.isSpecial) window.soundFX.playStartBoom();
        else window.soundFX.playSelect();
      }
    }
  }


  // ==========================================================================
  // MODERN TRAINING MODE ENGINE & DIAGNOSTICS (SF6 / TEKKEN 8 / MK1 STANDARD)
  // ==========================================================================
  setupTrainingMode() {
    this.isTrainingMode = window.isTrainingMode === true;
    this.trainingSettings = {
      dummyAction: 'STAND',       // 'STAND' (Stand Still) | 'GUARD' | 'ATTACK' | 'CROUCH' | 'JUMP' | 'CPU' | 'MANUAL'
      dummyGuard: 'NONE',         // 'NONE' | 'ALL' | 'AFTER_FIRST_HIT' | 'RANDOM'
      dummyGuardType: 'STAND',     // 'STAND' | 'CROUCH'
      dummyCounterHit: 'NORMAL',   // 'NORMAL' | 'ALWAYS'
      inputHistory: true,
      attackData: true,
      showHitboxes: false,
      healthRegen: true,
      disableDamage: false,       // When true, all hits deal 0 damage
      unlimitedHealth: false,     // Disabled by default so Dummy Robot visibly takes damage!
      p1HealthPreset: 100,
      p2HealthPreset: 100,
      infiniteSuper: true
    };

    // Diagnostic & Combo Tracking
    this.comboHits = 0;
    this.comboDamage = 0;
    this.lastHitDamage = 0;
    this.comboTimer = 0;
    this.advantageFrames = 0;
    this.p1InputHistory = [];
    this.lastLoggedInputKey = '';
    this.dummyJumpTimer = 0;

    // Hitbox Graphics Layer
    this.hitboxGraphics = this.add.graphics();
    this.hitboxGraphics.setDepth(48);

    // Setup Hotkeys: Tab (Training Menu), Backspace (Quick Reset), H (Hitboxes)
    if (this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-TAB', (e) => {
        if (this.isTrainingMode) {
          e.preventDefault();
          this.toggleTrainingMenu();
        }
      });

      this.input.keyboard.on('keydown-BACKSPACE', (e) => {
        if (this.isTrainingMode) {
          e.preventDefault();
          this.resetPositions('CENTER');
        }
      });

      this.input.keyboard.on('keydown-R', (e) => {
        // Shift+R or standalone R when not in text input
        if (this.isTrainingMode && !e.target.matches('input, textarea') && (e.shiftKey || e.ctrlKey)) {
          e.preventDefault();
          this.resetPositions('CENTER');
        }
      });

      this.input.keyboard.on('keydown-H', (e) => {
        if (this.isTrainingMode && !e.target.matches('input, textarea')) {
          this.toggleHitboxes();
        }
      });
    }

    // Toggle Training Mode UI in DOM
    const btnSettings = document.getElementById('btnToggleTrainingMenu');
    const btnReset = document.getElementById('btnResetTrainingPos');
    const btnHitbox = document.getElementById('btnToggleHitboxes');
    const inputHistory = document.getElementById('trainingInputHistory');
    const attackData = document.getElementById('trainingAttackData');

    if (this.isTrainingMode) {
      if (btnSettings) btnSettings.style.display = 'flex';
      if (btnReset) btnReset.style.display = 'flex';
      if (btnHitbox) btnHitbox.style.display = 'flex';
      if (inputHistory) inputHistory.style.display = 'flex';
      if (attackData) attackData.style.display = 'flex';

      // Override timer text with infinite symbol
      if (this.timerText) this.timerText.setText('∞');
    } else {
      if (btnSettings) btnSettings.style.display = 'none';
      if (btnReset) btnReset.style.display = 'none';
      if (btnHitbox) btnHitbox.style.display = 'none';
      if (inputHistory) inputHistory.style.display = 'none';
      if (attackData) attackData.style.display = 'none';
    }
  }

  setTrainingSetting(key, val) {
    if (!this.trainingSettings) return;
    this.trainingSettings[key] = val;

    if (key === 'showHitboxes') {
      const chk = document.getElementById('chkHitboxes');
      if (chk) chk.checked = !!val;
    } else if (key === 'inputHistory') {
      const el = document.getElementById('trainingInputHistory');
      if (el) el.style.display = val ? 'flex' : 'none';
    } else if (key === 'attackData') {
      const el = document.getElementById('trainingAttackData');
      if (el) el.style.display = val ? 'flex' : 'none';
    } else if (key === 'p1HealthPreset' && this.fighterP1) {
      this.fighterP1.hp = Math.round((val / 100) * this.fighterP1.maxHp);
      this.updateHUD();
    } else if (key === 'p2HealthPreset' && this.fighterP2) {
      this.fighterP2.hp = Math.round((val / 100) * this.fighterP2.maxHp);
      this.updateHUD();
    }
  }

  toggleTrainingMenu(force) {
    const modal = document.getElementById('trainingSettingsModal');
    if (!modal) return;
    const isCurrentlyOpen = modal.style.display === 'flex' || modal.classList.contains('open');
    const shouldOpen = force !== undefined ? force : !isCurrentlyOpen;
    modal.classList.toggle('open', shouldOpen);
    modal.style.display = shouldOpen ? 'flex' : 'none';
    if (window.soundFX) window.soundFX.playSelect();
  }

  toggleHitboxes() {
    if (!this.trainingSettings) return;
    this.setTrainingSetting('showHitboxes', !this.trainingSettings.showHitboxes);
    if (window.soundFX) window.soundFX.playSelect();
  }

  resetPositions(type = 'CENTER') {
    if (!this.fighterP1 || !this.fighterP2) return;

    if (type === 'CENTER') {
      this.fighterP1.sprite.setPosition(680, 575);
      this.fighterP2.sprite.setPosition(1240, 575);
      this.fighterP1.setFacingDir(1);
      this.fighterP2.setFacingDir(-1);
    } else if (type === 'LEFT_CORNER') {
      this.fighterP1.sprite.setPosition(220, 575);
      this.fighterP2.sprite.setPosition(420, 575);
      this.fighterP1.setFacingDir(1);
      this.fighterP2.setFacingDir(-1);
    } else if (type === 'RIGHT_CORNER') {
      this.fighterP1.sprite.setPosition(1500, 575);
      this.fighterP2.sprite.setPosition(1700, 575);
      this.fighterP1.setFacingDir(1);
      this.fighterP2.setFacingDir(-1);
    } else if (type === 'SWAP') {
      const tempX = this.fighterP1.sprite.x;
      this.fighterP1.sprite.setPosition(this.fighterP2.sprite.x, 575);
      this.fighterP2.sprite.setPosition(tempX, 575);
      this.fighterP1.setFacingDir(this.fighterP1.sprite.x < this.fighterP2.sprite.x ? 1 : -1);
      this.fighterP2.setFacingDir(this.fighterP2.sprite.x < this.fighterP1.sprite.x ? 1 : -1);
    }

    // Neutralize physical states
    [this.fighterP1, this.fighterP2].forEach(f => {
      f.sprite.setVelocity(0, 0);
      f.isAttacking = false;
      f.isKnockedBack = false;
      f.isInAir = false;
      f.isCrouching = false;
      f.currentAction = 'IDLE';
      f.currentAttackData = null;
      if (f.charId === 'strange') f.sprite.play('strange_anim_idle', true);
      else if (f.charId === 'chunli') f.sprite.play('chunli_anim_idle', true);
      else if (f.charId === 'mewtwo') f.sprite.play('mewtwo_anim_idle', true);
      else if (f.charId === 'steve') f.sprite.play('steve_anim_idle', true);
      else if (f.charId === 'zoro') f.sprite.play('zoro_anim_idle', true);
      else f.sprite.play('harpy_anim_idle', true);
    });

    // Reset health to target presets
    const p1Target = (this.trainingSettings.p1HealthPreset / 100) * this.fighterP1.maxHp;
    const p2Target = (this.trainingSettings.p2HealthPreset / 100) * this.fighterP2.maxHp;
    this.fighterP1.hp = Math.round(p1Target);
    this.fighterP2.hp = Math.round(p2Target);

    // Reset combo meters
    this.comboHits = 0;
    this.comboDamage = 0;
    this.lastHitDamage = 0;
    this.comboTimer = 0;
    this.updateAttackDataHUD(0, 0, 0, 1.0, '-');

    if (window.soundFX) window.soundFX.playSelect();
  }

  updateAttackDataHUD(hits, dmg, totalDmg, scaling, adv, attackName = '') {
    const atkEl = document.getElementById('tdAttackName');
    if (atkEl && attackName) {
      atkEl.textContent = attackName.toUpperCase();
    }
    const hitsEl = document.getElementById('tdComboHits');
    const dmgEl = document.getElementById('tdDamage');
    const totalEl = document.getElementById('tdTotalDamage');
    const scaleEl = document.getElementById('tdScaling');
    const advEl = document.getElementById('tdAdvantage');

    if (hitsEl) hitsEl.textContent = `${hits} HITS`;
    if (dmgEl) dmgEl.textContent = `${dmg}`;
    if (totalEl) totalEl.textContent = `${totalDmg}`;
    if (scaleEl) scaleEl.textContent = `${Math.round(scaling * 100)}%`;

    if (advEl) {
      advEl.textContent = adv;
      if (adv.includes('+') || adv.includes('SAFE') || adv.includes('LINK')) {
        advEl.className = 'data-val adv-safe';
      } else if (adv.includes('-') || adv.includes('UNSAFE')) {
        advEl.className = 'data-val adv-unsafe';
      } else {
        advEl.className = 'data-val';
      }
    }
  }

  logP1Input(p1Input) {
    if (!this.trainingSettings || !this.trainingSettings.inputHistory) return;

    let dir = '⬝';
    if (p1Input.up && p1Input.left) dir = '⬉';
    else if (p1Input.up && p1Input.right) dir = '⬈';
    else if (p1Input.down && p1Input.left) dir = '⬋';
    else if (p1Input.down && p1Input.right) dir = '⬊';
    else if (p1Input.up) dir = '⬆';
    else if (p1Input.down) dir = '⬇';
    else if (p1Input.left) dir = '⬅';
    else if (p1Input.right) dir = '➡';

    const btns = [];
    if (p1Input.lightJustDown) btns.push({ name: 'LP', cls: 'btn-light' });
    if (p1Input.mediumJustDown) btns.push({ name: 'MP', cls: 'btn-med' });
    if (p1Input.heavyJustDown) btns.push({ name: 'HP', cls: 'btn-heavy' });
    if (p1Input.specialJustDown) btns.push({ name: 'SP', cls: 'btn-special' });
    if (p1Input.superJustDown) btns.push({ name: 'EX', cls: 'btn-special' });

    const key = `${dir}_${btns.map(b => b.name).join('+')}`;
    const isNew = btns.length > 0 || (key !== this.lastLoggedInputKey && dir !== '⬝');

    if (isNew) {
      this.lastLoggedInputKey = key;
      this.p1InputHistory.unshift({
        dir,
        btns,
        frames: 1
      });
      if (this.p1InputHistory.length > 9) {
        this.p1InputHistory.pop();
      }
      this.renderInputHistory();
    } else if (this.p1InputHistory.length > 0) {
      this.p1InputHistory[0].frames++;
      const topFrameEl = document.querySelector('#trainingInputHistory .input-entry:last-child .frame-count');
      if (topFrameEl) {
        topFrameEl.textContent = `${this.p1InputHistory[0].frames}F`;
      }
    }
  }

  renderInputHistory() {
    const container = document.getElementById('trainingInputHistory');
    if (!container) return;

    container.innerHTML = this.p1InputHistory.map(item => `
      <div class="input-entry">
        <div class="input-icons">
          <span class="dir-icon">${item.dir}</span>
          ${item.btns.map(b => `<span class="btn-badge ${b.cls}">${b.name}</span>`).join('')}
        </div>
        <span class="frame-count">${item.frames}F</span>
      </div>
    `).join('');
  }

  renderHitboxes() {
    if (!this.hitboxGraphics) return;
    this.hitboxGraphics.clear();

    if (!this.trainingSettings || !this.trainingSettings.showHitboxes) return;

    // Draw Hurtboxes (Green) for Fighters
    [this.fighterP1, this.fighterP2].forEach(f => {
      if (!f || !f.sprite || !f.sprite.active) return;
      const x = f.sprite.x;
      const y = f.sprite.y;
      const w = 110;
      const h = f.isCrouching ? 110 : 180;
      const top = y - h + 20;

      // Green body hurtbox
      this.hitboxGraphics.lineStyle(2, 0x10b981, 0.95);
      this.hitboxGraphics.fillStyle(0x10b981, 0.16);
      this.hitboxGraphics.fillRect(x - w / 2, top, w, h);
      this.hitboxGraphics.strokeRect(x - w / 2, top, w, h);

      // Red attack hitbox if actively striking
      if (f.isAttacking && f.currentAttackData) {
        const atk = f.currentAttackData;
        const facing = f.getFacingDir();
        const rx = atk.rangeX || 160;
        const ry = atk.rangeY || 100;
        const atkX = facing === 1 ? x - 15 : x + 15 - rx;
        const atkY = y - ry;

        this.hitboxGraphics.lineStyle(2, 0xef4444, 0.95);
        this.hitboxGraphics.fillStyle(0xef4444, 0.28);
        this.hitboxGraphics.fillRect(atkX, atkY, rx, ry * 1.5);
        this.hitboxGraphics.strokeRect(atkX, atkY, rx, ry * 1.5);
      }
    });

    // Draw Projectile Hitboxes (Cyan)
    if (this.projectiles) {
      this.projectiles.children.iterate(proj => {
        if (proj && proj.active) {
          this.hitboxGraphics.lineStyle(2, 0x06b6d4, 0.95);
          this.hitboxGraphics.fillStyle(0x06b6d4, 0.28);
          this.hitboxGraphics.fillRect(proj.x - 30, proj.y - 30, 60, 60);
          this.hitboxGraphics.strokeRect(proj.x - 30, proj.y - 30, 60, 60);
        }
      });
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

    // Transparent glass overlay (screen-fixed)
    const overlay = this.add.rectangle(640, 360, 1280, 720, 0x07060a, 0.48).setScrollFactor(0).setDepth(120);
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

    let rematchLabel = '🔄 REMATCH';
    const isArcade = Boolean(window.isArcadeMode);
    const p1WonMatch = (this.p1RoundWins >= this.maxRoundsToWin);

    if (isArcade) {
      const stage = window.arcadeStage || 1;
      if (p1WonMatch) {
        rematchLabel = (stage < 3) ? `⚔️ ADVANCE TO FLOOR ${stage + 1}` : '🏆 TOWER CONQUERED';
      } else {
        rematchLabel = `🔄 RETRY FLOOR ${stage}`;
      }
    }

    // Rematch / Next Floor Button (Left)
    const btnRematch = this.add.rectangle(510, 435, 230, 46, 0x140f1f, 0.6).setScrollFactor(0).setDepth(122).setInteractive({ useHandCursor: true });
    btnRematch.setStrokeStyle(1.5, 0xf59e0b, 0.8);
    const txtRematch = this.add.text(510, 435, rematchLabel, {
      fontFamily: 'Cinzel, Oswald, Rajdhani, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fef3c7'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(123);

    btnRematch.on('pointerover', () => {
      btnRematch.setFillStyle(0xd97706, 0.9);
      btnRematch.setStrokeStyle(1.5, 0xffffff, 1);
      txtRematch.setColor('#ffffff');
    });
    btnRematch.on('pointerout', () => {
      btnRematch.setFillStyle(0x140f1f, 0.6);
      btnRematch.setStrokeStyle(1.5, 0xf59e0b, 0.8);
      txtRematch.setColor('#fef3c7');
    });
    btnRematch.on('pointerdown', () => {
      if (isArcade && p1WonMatch) {
        if ((window.arcadeStage || 1) < 3) this.advanceArcadeFloor();
        else window.location.reload();
      } else {
        this.restartMatch();
      }
    });

    // Exit Button (Right)
    const btnExit = this.add.rectangle(770, 435, 230, 46, 0x220f14, 0.6).setScrollFactor(0).setDepth(122).setInteractive({ useHandCursor: true });
    btnExit.setStrokeStyle(1.5, 0xef4444, 0.7);
    const txtExit = this.add.text(770, 435, '🚪 EXIT TO MENU', {
      fontFamily: 'Cinzel, Oswald, Rajdhani, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fca5a5'
    }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(123);

    btnExit.on('pointerover', () => {
      btnExit.setFillStyle(0xdc2626, 0.9);
      btnExit.setStrokeStyle(1.5, 0xffffff, 1);
      txtExit.setColor('#ffffff');
    });
    btnExit.on('pointerout', () => {
      btnExit.setFillStyle(0x220f14, 0.6);
      btnExit.setStrokeStyle(1.5, 0xef4444, 0.7);
      txtExit.setColor('#fca5a5');
    });
    btnExit.on('pointerdown', () => {
      if (window.exitArenaToMenu) window.exitArenaToMenu();
      else window.location.reload();
    });

    this.bannerObjects.push(btnRematch, txtRematch, btnExit, txtExit);

    this.tweens.add({
      targets: titleText,
      scale: 1,
      duration: 600,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: [champText, scoreText, txtRematch, txtExit],
          alpha: 1,
          duration: 400
        });
      }
    });
  }

  advanceArcadeFloor() {
    this.clearBanners();
    window.arcadeStage = (window.arcadeStage || 1) + 1;
    let nextOpponent = 'chunli';
    let nextStage = 'japanese_temple';
    if (window.arcadeStage >= 3) {
      nextOpponent = 'harpy';
      nextStage = 'sky_temple';
    }

    window.selectedFighterP2 = nextOpponent;
    window.selectedStage = nextStage;

    if (window.startMatchWithLoadingScreen) {
      window.startMatchWithLoadingScreen({
        p1Char: window.selectedFighterP1,
        p2Char: nextOpponent,
        stage: nextStage,
        isArcade: true,
        isCpu: true,
        difficulty: window.cpuDifficulty || 'MEDIUM'
      });
    } else {
      this.scene.restart();
    }
  }

  restartMatch() {
    if (window.isArcadeMode && (this.p1RoundWins >= this.maxRoundsToWin) && (window.arcadeStage || 1) < 3) {
      this.advanceArcadeFloor();
      return;
    }
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
    if (this.isPaused) return;
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
      if (this.isTrainingMode) {
        // Infinite Timer for Training Mode
        this.timerRemainingMs = 999999;
        this.roundTimer = 999;
        if (this.timerNumText && this.timerNumText.text !== '∞') {
          this.timerNumText.setText('∞');
        }

        // Combo Drop Timer & Smooth Health Regeneration
        const dt = delta / 1000;
        if (this.comboTimer > 0) {
          this.comboTimer -= dt;
          if (this.comboTimer <= 0) {
            this.comboHits = 0;
          }
        } else if (this.trainingSettings && this.trainingSettings.healthRegen) {
          // Smoothly refill P1 and P2 to preset levels
          const p1Target = (this.trainingSettings.p1HealthPreset / 100) * this.fighterP1.maxHp;
          const p2Target = (this.trainingSettings.p2HealthPreset / 100) * this.fighterP2.maxHp;

          if (this.fighterP1.hp < p1Target) {
            this.fighterP1.hp = Math.min(p1Target, this.fighterP1.hp + Math.round(300 * dt));
          }
          if (this.fighterP2.hp < p2Target) {
            this.fighterP2.hp = Math.min(p2Target, this.fighterP2.hp + Math.round(300 * dt));
          }
        }

        // Unlimited Health Mode
        if (this.trainingSettings && this.trainingSettings.unlimitedHealth) {
          this.fighterP1.hp = this.fighterP1.maxHp;
          this.fighterP2.hp = this.fighterP2.maxHp;
        }

        // Infinite Super Meter
        if (this.trainingSettings && this.trainingSettings.infiniteSuper) {
          this.fighterP1.superMeter = 100;
          this.fighterP2.superMeter = 100;
        }
      } else {
        this.timerRemainingMs = Math.max(0, this.timerRemainingMs - delta);
        const sec = Math.ceil(this.timerRemainingMs / 1000);

        if (sec !== this.roundTimer) {
          this.roundTimer = sec;

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

        if (this.timerRemainingMs <= 0) {
          this.roundTimer = 0;
          this.timerRemainingMs = 0;
          this.updateHUD();
          this.endRound('TIMEOUT');
          return;
        }
      }
    }

    // --- PLAYER 1 INPUT (WASD / Space / F / G / H / R / Y / Q / T) ---
    const p1Up = this.p1Keys.w.isDown || this.p1Keys.space.isDown;
    const p1UpJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.w) || Phaser.Input.Keyboard.JustDown(this.p1Keys.space);
    const p1Left = this.p1Keys.a.isDown;
    const p1Right = this.p1Keys.d.isDown;
    const p1Down = this.p1Keys.s.isDown;

    let p1Input = {
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

    let p2Input = {
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

    // Log P1 Inputs for Training Input History
    if (this.isTrainingMode) {
      this.logP1Input(p1Input);

      // Synthesize Dummy Behavior based on Training Settings
      if (this.trainingSettings) {
        const dummyAction = this.trainingSettings.dummyAction;

        if (dummyAction === 'STAND') {
          // Stationary Practice Opponent (Stand Still)
          p2Input = {
            up: false, upJustDown: false,
            down: false, left: false, right: false,
            isHoldingForward: false,
            lightJustDown: false, mediumJustDown: false, heavyJustDown: false,
            specialJustDown: false, superJustDown: false,
            dashJustDown: false, tauntJustDown: false
          };
        } else if (dummyAction === 'GUARD') {
          // Continuous Guard Mode: holds back to block all attacks
          p2Input = {
            up: false, upJustDown: false,
            down: false,
            left: this.fighterP2.getFacingDir() === 1 ? false : true,
            right: this.fighterP2.getFacingDir() === 1 ? true : false,
            isHoldingForward: false,
            lightJustDown: false, mediumJustDown: false, heavyJustDown: false,
            specialJustDown: false, superJustDown: false,
            dashJustDown: false, tauntJustDown: false
          };
        } else if (dummyAction === 'ATTACK') {
          // Continuous Attacking: repeats strikes so player can practice blocking and parrying
          const atkCycle = Math.floor(time / 650) % 3;
          const isAtkFrame = (time % 650 < 40);
          p2Input = {
            up: false, upJustDown: false,
            down: false, left: false, right: false,
            isHoldingForward: true,
            lightJustDown: (isAtkFrame && atkCycle === 0),
            mediumJustDown: (isAtkFrame && atkCycle === 1),
            heavyJustDown: (isAtkFrame && atkCycle === 2),
            specialJustDown: false, superJustDown: false,
            dashJustDown: false, tauntJustDown: false
          };
        } else if (dummyAction === 'CROUCH') {
          p2Input = {
            up: false, upJustDown: false,
            down: true, left: false, right: false,
            isHoldingForward: false,
            lightJustDown: false, mediumJustDown: false, heavyJustDown: false,
            specialJustDown: false, superJustDown: false,
            dashJustDown: false, tauntJustDown: false
          };
        } else if (dummyAction === 'JUMP') {
          const shouldJump = (time % 1800 < 30);
          p2Input = {
            up: shouldJump, upJustDown: shouldJump,
            down: false, left: false, right: false,
            isHoldingForward: false,
            lightJustDown: false, mediumJustDown: false, heavyJustDown: false,
            specialJustDown: false, superJustDown: false,
            dashJustDown: false, tauntJustDown: false
          };
        } else if (dummyAction === 'CPU') {
          // Sparring AI Combatant powered by FightingAI
          const diff = (this.trainingSettings && this.trainingSettings.cpuDifficulty) || 'MEDIUM';
          const aiEngine = this.fightingAI || window.fightingAI;
          if (aiEngine) {
            p2Input = aiEngine.update(time, delta, this.fighterP1, this.fighterP2, diff);
          }
        }
      }
    } else if (this.isCpuMatch && !window.isLanMatch && !this.isTrainingMode) {
      // Single Player VS CPU Match / Arcade Mode Ladder
      const aiEngine = this.fightingAI || window.fightingAI;
      if (aiEngine) {
        const diff = this.cpuDifficulty || window.cpuDifficulty || 'MEDIUM';
        p2Input = aiEngine.update(time, delta, this.fighterP1, this.fighterP2, diff);
      }
    }

    // --- LAN MULTIPLAYER INPUT SYNCHRONIZATION ---
    if (window.isLanMatch && window.lanManager && window.lanManager.isConnected) {
      if (window.lanManager.role === 'HOST') {
        // Host controls Player 1 -> broadcast input to Client
        window.lanManager.send('PLAYER_INPUT', { input: p1Input });
        // Player 2 is driven by Client's input received over LAN
        p2Input = window.lanManager.latestOpponentInput;

        // Periodic State Authority Sync (every 80ms)
        if (!this.lastLanSyncTime || time - this.lastLanSyncTime > 80) {
          this.lastLanSyncTime = time;
          window.lanManager.send('STATE_SYNC', {
            p1: { x: this.fighterP1.sprite.x, y: this.fighterP1.sprite.y, hp: this.fighterP1.hp },
            p2: { x: this.fighterP2.sprite.x, y: this.fighterP2.sprite.y, hp: this.fighterP2.hp },
            roundTimer: this.roundTimer,
            roundState: this.roundState,
            p1Wins: this.p1RoundWins,
            p2Wins: this.p2RoundWins
          });
        }
      } else if (window.lanManager.role === 'CLIENT') {
        // Client controls Player 2!
        // Client can use either WASD (P1 keys) or Arrows (P2 keys)
        const clientUp = p1Up || p2Up;
        const clientUpJustDown = p1UpJustDown || p2UpJustDown;
        const clientLeft = p1Left || p2Left;
        const clientRight = p1Right || p2Right;
        const clientDown = p1Down || p2Down;

        const myInput = {
          up: clientUp,
          upJustDown: clientUpJustDown,
          down: clientDown,
          left: clientLeft,
          right: clientRight,
          isHoldingForward: this.fighterP2.getFacingDir() === 1 ? clientRight : clientLeft,
          lightJustDown: p1Input.lightJustDown || p2Input.lightJustDown,
          mediumJustDown: p1Input.mediumJustDown || p2Input.mediumJustDown,
          heavyJustDown: p1Input.heavyJustDown || p2Input.heavyJustDown,
          specialJustDown: p1Input.specialJustDown || p2Input.specialJustDown,
          superJustDown: p1Input.superJustDown || p2Input.superJustDown,
          dashJustDown: p1Input.dashJustDown || p2Input.dashJustDown,
          tauntJustDown: p1Input.tauntJustDown || p2Input.tauntJustDown
        };

        // Send local input to Host
        window.lanManager.send('PLAYER_INPUT', { input: myInput });

        // Player 1 on client is driven by Host
        p1Input = window.lanManager.latestOpponentInput;
        p2Input = myInput;

        // Reconcile with Host's State Authority
        if (window.lanManager.latestStateSync) {
          const sync = window.lanManager.latestStateSync;
          if (Math.abs(this.fighterP1.sprite.x - sync.p1.x) > 35) {
            this.fighterP1.sprite.x = Phaser.Math.Linear(this.fighterP1.sprite.x, sync.p1.x, 0.25);
          }
          if (Math.abs(this.fighterP2.sprite.x - sync.p2.x) > 35) {
            this.fighterP2.sprite.x = Phaser.Math.Linear(this.fighterP2.sprite.x, sync.p2.x, 0.25);
          }
          this.fighterP1.hp = sync.p1.hp;
          this.fighterP2.hp = sync.p2.hp;
          this.roundTimer = sync.roundTimer;
          this.p1RoundWins = sync.p1Wins;
          this.p2RoundWins = sync.p2Wins;
        }
      }
    }

    // Feed controls to entities
    this.fighterP1.handleControls(p1Input);
    this.fighterP2.handleControls(p2Input);

    // Real-Time Hitbox & Combat Interaction Check (only during active battle)
    if (this.roundState === 'FIGHTING') {
      this.checkHit(this.fighterP1, this.fighterP2);
      this.checkHit(this.fighterP2, this.fighterP1);

      // Check K.O.
      if (this.fighterP1.hp <= 0 || this.fighterP2.hp <= 0) {
        if (this.isTrainingMode) {
          // Instant Soft Recovery & Refill in Training Mode (No Round Interruptions!)
          if (this.fighterP1.hp <= 0) {
            this.fighterP1.hp = this.fighterP1.maxHp;
            this.fighterP1.currentAction = 'IDLE';
            this.fighterP1.isKnockedBack = false;
            this.fighterP1.isInAir = false;
          }
          if (this.fighterP2.hp <= 0) {
            this.fighterP2.hp = this.fighterP2.maxHp;
            this.fighterP2.currentAction = 'IDLE';
            this.fighterP2.isKnockedBack = false;
            this.fighterP2.isInAir = false;
          }
          this.updateHUD();
        } else {
          this.endRound('KO');
          return;
        }
      }
    }

    // Real-Time Hitbox & Hurtbox Visualizer Rendering
    this.renderHitboxes();

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
  const inputHistory = document.getElementById('trainingInputHistory');
  const attackData = document.getElementById('trainingAttackData');
  const trainingModal = document.getElementById('trainingSettingsModal');

  if (container) container.style.display = 'none';
  if (arenaUI) arenaUI.style.display = 'none';
  if (inputHistory) inputHistory.style.display = 'none';
  if (attackData) attackData.style.display = 'none';
  if (trainingModal) {
    trainingModal.classList.remove('open');
    trainingModal.style.display = 'none';
  }
  if (menuWrapper) menuWrapper.style.display = 'flex';
};

window.restartMatch = function () {
  if (window.activeArenaScene) {
    window.activeArenaScene.restartMatch();
  } else if (window.startPhaserArena) {
    window.startPhaserArena();
  }
};
