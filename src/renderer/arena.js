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

    this.hp = charId === 'dummy' ? 1000 : (charId === 'zoro' ? 970 : (charId === 'strange' ? 960 : (charId === 'chunli' ? 950 : (charId === 'mewtwo' ? 940 : (charId === 'steve' ? 980 : 920)))));
    this.maxHp = this.hp;

    // 3-Section Ki Meter: 100 Ki per section, 300 Ki total (starts at 100 Ki / 1 section)
    this.ki = 100;
    this.maxKi = 300;

    // Movement speeds & Jump velocity (balanced fighting game frame data)
    this.walkSpeed = charId === 'dummy' ? 220 : (charId === 'zoro' ? 255 : (charId === 'strange' ? 215 : (charId === 'chunli' ? 260 : (charId === 'mewtwo' ? 250 : (charId === 'steve' ? 240 : 260)))));
    this.dashSpeed = charId === 'dummy' ? 440 : (charId === 'zoro' ? 510 : (charId === 'strange' ? 460 : (charId === 'chunli' ? 495 : (charId === 'mewtwo' ? 500 : (charId === 'steve' ? 470 : 490)))));
    this.jumpVel = charId === 'dummy' ? -720 : (charId === 'zoro' ? -750 : (charId === 'strange' ? -720 : (charId === 'chunli' ? -760 : (charId === 'mewtwo' ? -750 : (charId === 'steve' ? -730 : -760)))));

    // Create sprite
    const initialTexture = charId === 'dummy' ? 'dummy_sprite' : (charId === 'zoro' ? 'zoro_sheet_idle' : (charId === 'strange' ? 'strange_sheet_master' : (charId === 'chunli' ? 'chunli_sheet_idle' : (charId === 'mewtwo' ? 'mewtwo_sheet_idle' : (charId === 'steve' ? 'steve_sheet_idle' : 'harpy_sheet_idle')))));
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setDepth(10);
    if (charId === 'dummy') {
      // Static Robo Practice Dummy: 245x340 frame scaled to 0.68 visual height (~230px)
      this.sprite.setScale(0.68);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setDisplayOrigin(122, 170);
      this.sprite.body.setSize(110, 310);
      this.sprite.body.setOffset(68, 25);
    } else if (charId === 'zoro') {
      // Zoro: scale 0.60 gives visual height ~183px, matching ground line exactly!
      this.sprite.setScale(0.60);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(160, 320);
      this.sprite.body.setOffset(176, 130);
    } else if (charId === 'strange') {
      // Scale 1.04 scales Strange's 180px sprite to ~187px, perfectly matching Chun-Li and Zoro's heroic stature!
      this.sprite.setScale(1.04);
      this.sprite.setCollideWorldBounds(true);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(90, 182);
      this.sprite.body.setOffset(83, 54);
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
    } else if (charId === 'zoro') {
      this.sprite.play('zoro_anim_idle');
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
    // Chun-Li, Mewtwo, Steve, Strange & Zoro sprites are authored facing RIGHT by default (flipX = false).
    // Harpy is authored facing LEFT by default (flipX = false).
    if (this.charId === 'dummy' || this.charId === 'zoro' || this.charId === 'chunli' || this.charId === 'mewtwo' || this.charId === 'steve' || this.charId === 'strange') {
      return this.sprite.flipX ? -1 : 1;
    }
    return this.sprite.flipX ? 1 : -1;
  }

  setFacingDir(dir) {
    // dir: 1 = facing RIGHT, -1 = facing LEFT
    if (this.charId === 'dummy' || this.charId === 'zoro' || this.charId === 'chunli' || this.charId === 'mewtwo' || this.charId === 'steve' || this.charId === 'strange') {
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
      if (frameIdx >= 13 || textureFrameIdx >= 12) {
        this.shadowBallFired = true;
        if (this.activeShadowBallChargeVFX && this.activeShadowBallChargeVFX.active) {
          this.activeShadowBallChargeVFX.destroy();
          this.activeShadowBallChargeVFX = null;
        }
        if (this.scene && this.scene.spawnShadowBallProjectile) {
          this.scene.spawnShadowBallProjectile(this);
        }
      }
    } else if ((key === 'steve_anim_super' || key === 'steve_anim_sp_tnt') && !this.tntFired) {
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 14 || textureFrameIdx >= 13) {
        this.tntFired = true;
        if (this.scene) {
          if (key === 'steve_anim_super' && this.scene.spawnSteveUltimateTNT) {
            this.scene.spawnSteveUltimateTNT(this);
          } else if (this.scene.spawnTNTProjectile) {
            this.scene.spawnTNTProjectile(this);
          }
        }
      }
    } else if (key === 'strange_anim_sp_projectile' && !this.mysticOrbFired) {
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 10 || textureFrameIdx >= 219) {
        this.mysticOrbFired = true;
        if (this.scene && this.scene.spawnMysticProjectile) {
          this.scene.spawnMysticProjectile(this);
        }
      }
    } else if (key === 'zoro_anim_sp_cannon' && !this.poundCannonFired) {
      const frameIdx = frame ? (frame.index !== undefined ? frame.index : Number(frame.textureFrame) + 1) : 0;
      const textureFrameIdx = frame && frame.textureFrame !== undefined ? Number(frame.textureFrame) : -1;
      if (frameIdx >= 10 || textureFrameIdx >= 9) {
        this.poundCannonFired = true;
        if (this.scene && this.scene.spawnPoundCannonProjectile) {
          this.scene.spawnPoundCannonProjectile(this);
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
    } else if ((key === 'steve_anim_super' || key === 'steve_anim_sp_tnt') && !this.tntFired) {
      this.tntFired = true;
      if (this.scene) {
        if (key === 'steve_anim_super' && this.scene.spawnSteveUltimateTNT) {
          this.scene.spawnSteveUltimateTNT(this);
        } else if (this.scene.spawnTNTProjectile) {
          this.scene.spawnTNTProjectile(this);
        }
      }
    } else if (key === 'strange_anim_sp_projectile' && !this.mysticOrbFired) {
      this.mysticOrbFired = true;
      if (this.scene && this.scene.spawnMysticProjectile) {
        this.scene.spawnMysticProjectile(this);
      }
    } else if (key === 'zoro_anim_sp_cannon' && !this.poundCannonFired) {
      this.poundCannonFired = true;
      if (this.scene && this.scene.spawnPoundCannonProjectile) {
        this.scene.spawnPoundCannonProjectile(this);
      }
    }

    if (key.startsWith('harpy_anim_atk_') ||
      key.startsWith('harpy_anim_sp_') ||
      key === 'harpy_anim_taunt' ||
      key === 'harpy_anim_dash' ||
      key === 'harpy_anim_backdash' ||
      key.startsWith('zoro_anim_atk_') ||
      key.startsWith('zoro_anim_sp_') ||
      key === 'zoro_anim_super' ||
      key === 'zoro_anim_dash' ||
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
      if (this.charId === 'zoro') {
        this.sprite.setScale(0.60);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(160, 320);
        this.sprite.body.setOffset(176, 130);
      } else if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      } else if (this.charId === 'strange') {
        this.sprite.setScale(1.04);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(90, 182);
        this.sprite.body.setOffset(83, 54);
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
    } else if (key === 'harpy_anim_knockback' || key === 'zoro_anim_knockback' || key === 'strange_anim_knockback' || key === 'chunli_anim_knockback' || key === 'mewtwo_anim_knockback' || key === 'steve_anim_knockback') {
      this.isKnockedBack = false;
      this.isStunned = false;
      if (this.charId === 'zoro') {
        this.sprite.setScale(0.60);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(160, 320);
        this.sprite.body.setOffset(176, 130);
      } else if (this.charId === 'chunli') {
        this.sprite.setDisplayOrigin(128, 128);
        this.sprite.body.setSize(100, 230);
        this.sprite.body.setOffset(78, 22);
        if (this.sprite.body) {
          this.sprite.body.setAllowGravity(true);
        }
      } else if (this.charId === 'strange') {
        this.sprite.setScale(1.04);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(90, 182);
        this.sprite.body.setOffset(83, 54);
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
    if (this.charId === 'zoro') {
      this.sprite.y = 458.60;
    } else if (this.charId === 'steve') {
      this.sprite.y = 476.60;
    } else if (this.charId === 'mewtwo') {
      this.sprite.y = 479.84;
    } else if (this.charId === 'chunli') {
      this.sprite.setDisplayOrigin(128, 128);
      this.sprite.body.setSize(100, 230);
      this.sprite.body.setOffset(78, 22);
      this.sprite.y = 477.04;
    } else if (this.charId === 'strange') {
      this.sprite.y = 462.68;
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
    if (this.charId === 'zoro') {
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.setScale(0.60);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(160, 320);
        this.sprite.body.setOffset(176, 130);
        this.sprite.play('zoro_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.setScale(0.60);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(160, 320);
        this.sprite.body.setOffset(176, 130);
        this.sprite.play('zoro_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.setScale(0.60);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(160, 240);
          this.sprite.body.setOffset(176, 210);
          this.sprite.play('zoro_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.setScale(0.60);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(160, 320);
          this.sprite.body.setOffset(176, 130);
          this.sprite.setTexture('zoro_sheet_idle');
          this.sprite.play('zoro_anim_idle', true);
        }
      }
      return;
    }

    if (this.charId === 'dummy') {
      // Static Robot: never play sprite animations!
      this.currentAction = (this.scene && this.scene.trainingSettings && this.scene.trainingSettings.dummyAction === 'GUARD') ? 'GUARD' : 'STAND STILL';
      this.sprite.setTexture('dummy_sprite');
      this.sprite.clearTint();
      return;
    }

    if (this.charId === 'strange') {
      this.sprite.setScale(1.04);
      this.sprite.setOrigin(0.5, 0.5);
      if (this.isKnockedBack) {
        this.currentAction = 'KNOCKBACK / LAUNCH';
        this.sprite.body.setSize(90, 182);
        this.sprite.body.setOffset(83, 54);
        this.sprite.play('strange_anim_knockback', true);
        return;
      }
      if (this.isInAir) {
        this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
        this.sprite.body.setSize(90, 182);
        this.sprite.body.setOffset(83, 54);
        this.sprite.play('strange_anim_jump', true);
      } else {
        if (this.isCrouching) {
          this.currentAction = 'CROUCH';
          this.sprite.body.setSize(90, 140);
          this.sprite.body.setOffset(83, 96);
          this.sprite.play('strange_anim_crouch_hold', true);
        } else {
          this.currentAction = 'IDLE';
          this.sprite.body.setSize(90, 182);
          this.sprite.body.setOffset(83, 54);
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

  addKi(amount) {
    this.ki = Math.min(this.maxKi, Math.max(0, this.ki + amount));
  }

  hasKi(amount) {
    if (this.scene && this.scene.isTrainingMode) return true;
    return this.ki >= amount;
  }

  useKi(amount) {
    if (this.scene && this.scene.isTrainingMode) {
      this.ki = this.maxKi;
      return true;
    }
    if (this.ki >= amount) {
      this.ki -= amount;
      return true;
    }
    return false;
  }

  getKiSections() {
    return Math.floor(this.ki / 100);
  }

  reset(x, y, resetKi = false) {
    this.hp = this.maxHp;
    if (resetKi) {
      this.ki = 100;
    } else {
      this.ki = Math.max(100, Math.min(this.maxKi, this.ki));
    }
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
    this.poundCannonFired = false;

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

    if (this.charId === 'dummy') {
      this.sprite.setScale(0.68);
      this.sprite.setDisplayOrigin(122, 170);
      this.sprite.body.setSize(110, 310);
      this.sprite.body.setOffset(68, 25);
      this.sprite.setTexture('dummy_sprite');
      this.sprite.clearTint();
    } else if (this.charId === 'zoro') {
      this.sprite.setScale(0.60);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(160, 320);
      this.sprite.body.setOffset(176, 130);
      this.sprite.setTexture('zoro_sheet_idle');
      this.sprite.play('zoro_anim_idle', true);
    } else if (this.charId === 'strange') {
      this.sprite.setScale(1.04);
      this.sprite.setOrigin(0.5, 0.5);
      this.sprite.body.setSize(90, 182);
      this.sprite.body.setOffset(83, 54);
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
    this.mysticOrbFired = false;
    this.poundCannonFired = false;

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
        } else if (animKey === 'mewtwo_anim_sp_psystrike' || animKey === 'mewtwo_anim_super') {
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
        if (animKey === 'steve_anim_atk_5a' || animKey === 'steve_anim_sp_punch') {
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
        } else if (animKey === 'steve_anim_sp_tnt' || animKey === 'steve_anim_super') {
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
        if (this.charId === 'zoro' && this.sprite && this.sprite.body) {
          this.sprite.setScale(0.60);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(160, 320);
          this.sprite.body.setOffset(176, 130);
        } else if (this.charId === 'chunli' && this.sprite && this.sprite.body) {
          this.sprite.setDisplayOrigin(128, 128);
          this.sprite.body.setSize(100, 230);
          this.sprite.body.setOffset(78, 22);
          this.sprite.body.setAllowGravity(true);
        } else if (this.charId === 'strange' && this.sprite && this.sprite.body) {
          this.sprite.setScale(1.04);
          this.sprite.setOrigin(0.5, 0.5);
          this.sprite.body.setSize(90, 182);
          this.sprite.body.setOffset(83, 54);
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

    if (this.charId === 'dummy' || (this.scene && this.scene.isTrainingMode && this === this.scene.fighterP2)) {
      // STATIC ROBO DUMMY HAS INFINITE HEALTH IN TRAINING MODE!
      this.hp = this.maxHp;

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
    if (this.scene && this.scene.isTrainingMode && (this.charId === 'dummy' || this === this.scene.fighterP2)) {
      this.hp = this.maxHp;
    } else {
      this.hp = Math.max(0, this.hp - attackData.damage);
    }

    // Ki Energy generation: attacker gains Ki upon successfully landing attack, defender builds 10 Ki
    if (attacker && attacker.addKi) {
      const kiAward = attackData.isSpecial ? 25 : (attackData.damage >= 70 ? 35 : 25);
      attacker.addKi(kiAward);
    }
    this.addKi(10);

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
    const textY = (this.charId === 'strange' || this.charId === 'zoro') ? this.sprite.y - 120 : (this.charId === 'steve' ? this.sprite.y - 110 : this.sprite.y - 95);
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

      this.sprite.setVelocityX(pushDir * (attackData.knockbackX || 500));
      this.sprite.setVelocityY(attackData.knockbackY || -380);

      if (this.sprite.body) {
        this.sprite.body.blocked.down = false;
        this.sprite.body.touching.down = false;
      }
      this.sprite.y = Math.min(this.sprite.y, 465);
      this.knockbackLaunchTime = (this.scene && this.scene.time) ? this.scene.time.now : Date.now();

      if (this.charId === 'zoro') {
        this.sprite.setScale(0.60);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.body.setSize(160, 320);
        this.sprite.body.setOffset(176, 130);
        this.sprite.play('zoro_anim_knockback', true);
      } else if (this.charId === 'strange') {
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
      if (this.charId === 'zoro') {
        this.sprite.play('zoro_anim_hurt', true);
      } else if (this.charId === 'strange') {
        this.sprite.play('strange_anim_hurt', true);
      }
      if (this.stunTimer) this.stunTimer.remove();
      this.stunTimer = this.scene.time.delayedCall(attackData.stunDuration || 140, () => {
        this.isStunned = false;
        this.stunTimer = null;
        this.updateTextureForState();
        if (this.sprite && this.sprite.body && (this.sprite.body.blocked.down || (this.charId === 'zoro' ? this.sprite.y >= 450 : this.sprite.y >= 472))) {
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

    // A fighter in launch momentum (moving upward or recently launched) cannot land yet
    const currentTime = (this.scene && this.scene.time) ? this.scene.time.now : Date.now();
    const isRecentlyLaunched = this.isKnockedBack && (this.knockbackLaunchTime && (currentTime - this.knockbackLaunchTime < 180));
    const isMovingUpward = this.sprite.body.velocity.y < 0;
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
      this.sprite.body.bottom >= 568 ||
      ((this.charId === 'zoro' || this.charId === 'strange') ? this.sprite.y >= 455 : this.sprite.y >= 472)
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
      // In Training Mode: Gamer can use their powers any number of times with NO COOLDOWN!
      const canCancelInTraining = this.scene && this.scene.isTrainingMode && (this === this.scene.fighterP1) &&
        (input.specialJustDown || input.superJustDown || input.heavyJustDown || input.mediumJustDown || input.lightJustDown);
      if (canCancelInTraining) {
        if (this.attackTimer) {
          this.attackTimer.remove();
          this.attackTimer = null;
        }
        if (this.scene && this.scene.cleanupMewtwoChargeVFX) {
          this.scene.cleanupMewtwoChargeVFX(this);
        }
        this.isAttacking = false;
        this.currentAttackData = null;
        this.shadowBallFired = false;
        this.tntFired = false;
      } else {
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
    }

    // 1. Attacks (Ground & Air)
    if (input.lightJustDown) {
      if (this.charId === 'zoro') {
        if (this.isInAir) {
          this.triggerAttack('AERIAL SLASH (8A)', 'zoro_anim_atk_8a', {
            damage: 50,
            rangeX: 175,
            rangeY: 100,
            knockbackX: 190,
            knockbackY: 60,
            isSpecial: false
          }, 650);
        } else {
          this.triggerAttack('CRESCENT SLASH (5A)', 'zoro_anim_atk_5a', {
            damage: 48,
            rangeX: 180,
            rangeY: 85,
            knockbackX: 180,
            knockbackY: 0,
            isSpecial: false
          }, 850);
        }
      } else if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('LEVITATION STRIKE (8A)', 'strange_anim_atk_8a', {
            damage: 50,
            rangeX: 165,
            rangeY: 100,
            knockbackX: 190,
            knockbackY: 60,
            isSpecial: false
          }, 667);
        } else {
          this.triggerAttack('ELDRITCH STRIKE (5A)', 'strange_anim_atk_5a', {
            damage: 45,
            rangeX: 160,
            rangeY: 80,
            knockbackX: 180,
            knockbackY: 0,
            isSpecial: false
          }, 667);
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
      if (this.charId === 'zoro') {
        if (this.isInAir) {
          this.triggerAttack('AERIAL DUAL CLEAVE (8B)', 'zoro_anim_atk_8a', {
            damage: 85,
            rangeX: 180,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 80,
            isSpecial: false
          }, 700);
        } else if (input.isHoldingForward) {
          this.triggerAttack('OVERHEAD CLEAVE (6B)', 'zoro_anim_atk_6b', {
            damage: 90,
            rangeX: 210,
            rangeY: 95,
            knockbackX: 260,
            knockbackY: -40,
            isSpecial: false
          }, 920);
        } else {
          this.triggerAttack('DUAL CLEAVE (5B)', 'zoro_anim_atk_5b', {
            damage: 85,
            rangeX: 190,
            rangeY: 90,
            knockbackX: 240,
            knockbackY: -30,
            isSpecial: false
          }, 920);
        }
      } else if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('ASTRAL CLEAVE (8B)', 'strange_anim_atk_8a', {
            damage: 85,
            rangeX: 175,
            rangeY: 100,
            knockbackX: 230,
            knockbackY: 90,
            isSpecial: false
          }, 800);
        } else if (input.isHoldingForward) {
          this.triggerAttack('MYSTIC THRUST (6B)', 'strange_anim_atk_6b', {
            damage: 95,
            rangeX: 200,
            rangeY: 90,
            knockbackX: 270,
            knockbackY: -50,
            isSpecial: false
          }, 800);
        } else {
          this.triggerAttack('ASTRAL PUNCH (5B)', 'strange_anim_atk_5b', {
            damage: 80,
            rangeX: 175,
            rangeY: 90,
            knockbackX: 240,
            knockbackY: -30,
            isSpecial: false
          }, 800);
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
          // Ground Psychic Crush: Heavy damage-dealing special move costs 2 sections (200 Ki)
          if (!this.hasKi(200)) {
            if (this.scene && this.scene.showKiDeniedAlert) {
              this.scene.showKiDeniedAlert(this, 2);
            }
            return;
          }
          this.useKi(200);
          this.triggerAttack('PSYCHIC CRUSH (5B)', 'mewtwo_anim_atk_5b', {
            damage: 95,
            rangeX: 800,
            rangeY: 160,
            knockbackX: 250,
            knockbackY: -80,
            isSpecial: true
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

    // Super Move -> Costs all 3 sections of Ki meter (300 Ki / MAX)!
    if (input.superJustDown) {
      if (!this.hasKi(300)) {
        if (this.scene && this.scene.showKiDeniedAlert) {
          this.scene.showKiDeniedAlert(this, 3);
        }
        return;
      }
      this.useKi(300);
      if (this.charId === 'zoro') {
        this.triggerAttack('ONI GIRI (SUPER)', 'zoro_anim_super', {
          damage: 260,
          rangeX: 340,
          rangeY: 190,
          knockbackX: 720,
          knockbackY: -560,
          isSpecial: true
        }, 1000);
        if (this.scene && this.scene.spawnOniGiriVFX) {
          this.scene.spawnOniGiriVFX(this);
        }
      } else if (this.charId === 'strange') {
        this.triggerAttack('MIRROR DIMENSION SHATTER (SUPER)', 'strange_anim_super', {
          damage: 245,
          rangeX: 300,
          rangeY: 190,
          knockbackX: 700,
          knockbackY: -550,
          isSpecial: true
        }, 1000);
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
        this.triggerAttack('PSYSTRIKE (ULTIMATE)', 'mewtwo_anim_super', {
          damage: 260,
          rangeX: 850,
          rangeY: 500,
          knockbackX: 720,
          knockbackY: -560,
          isSpecial: true
        }, 1500);
        this.hasDealtDamage = true; // Damage applies when Psystrike supernova detonates!
        if (this.scene && this.scene.spawnPsystrikeVFX) {
          this.scene.spawnPsystrikeVFX(this);
        }
      } else if (this.charId === 'steve') {
        this.tntFired = false;
        this.triggerAttack('TNT DETONATION (ULTIMATE)', 'steve_anim_super', {
          damage: 260,
          rangeX: 850,
          rangeY: 500,
          knockbackX: 780,
          knockbackY: -580,
          isSpecial: true
        }, 1300);
        this.hasDealtDamage = true; // Damage applied when thrown TNT blasts!
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

    // Special Attack -> Costs 1 section of Ki meter (100 Ki)
    if (input.specialJustDown) {
      if (!this.hasKi(100)) {
        if (this.scene && this.scene.showKiDeniedAlert) {
          this.scene.showKiDeniedAlert(this, 1);
        }
        return;
      }
      this.useKi(100);
      if (this.charId === 'zoro') {
        this.triggerAttack('360 POUND CANNON (PROJECTILE)', 'zoro_anim_sp_cannon', {
          damage: 160,
          rangeX: 160,
          rangeY: 100,
          knockbackX: 520,
          knockbackY: -360,
          isSpecial: true
        }, 1000);
      } else if (this.charId === 'strange') {
        if (input.up) {
          this.triggerAttack('SHIELD OF SERAPHIM (AA)', 'strange_anim_guard', {
            damage: 165,
            rangeX: 220,
            rangeY: 170,
            knockbackX: 320,
            knockbackY: -540,
            isSpecial: true
          }, 667);
        } else {
          this.triggerAttack('CRIMSON BANDS (PROJECTILE)', 'strange_anim_sp_projectile', {
            damage: 155,
            rangeX: 140,
            rangeY: 100,
            knockbackX: 480,
            knockbackY: -340,
            isSpecial: true
          }, 1000);
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
        this.shadowBallFired = false;
        this.triggerAttack('SHADOW BALL (SPECIAL)', 'mewtwo_anim_sp_shadow_ball', {
          damage: 155,
          rangeX: 180,
          rangeY: 100,
          knockbackX: 520,
          knockbackY: -360,
          isSpecial: true
        }, 1000);
        this.hasDealtDamage = true; // Damage applies when projectile hits!
        if (this.scene && this.scene.spawnShadowBallChargeVFX) {
          this.scene.spawnShadowBallChargeVFX(this);
        }
      } else if (this.charId === 'steve') {
        this.triggerAttack('MEGATON PUNCH (SPECIAL)', 'steve_anim_sp_punch', {
          damage: 155,
          rangeX: 180,
          rangeY: 110,
          knockbackX: 540,
          knockbackY: -380,
          isSpecial: true
        }, 850);
        const facingDir = this.getFacingDir ? this.getFacingDir() : 1;
        this.sprite.setVelocityX(facingDir * 240);
        if (this.scene && this.scene.spawnShadowBallImpact) {
          this.scene.time.delayedCall(160, () => {
            if (this.sprite) {
              this.scene.spawnShadowBallImpact(this.sprite.x + facingDir * 60, this.sprite.y - 10);
            }
          });
        }
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

    // Heavy Damage-Dealing Special Moves -> Costs 2 sections of Ki meter (200 Ki)
    if (input.heavyJustDown) {
      if (!this.hasKi(200)) {
        if (this.scene && this.scene.showKiDeniedAlert) {
          this.scene.showKiDeniedAlert(this, 2);
        }
        return;
      }
      this.useKi(200);
      if (this.charId === 'zoro') {
        if (this.isInAir) {
          this.triggerAttack('AERIAL SANTORYU (8C)', 'zoro_anim_atk_8c', {
            damage: 110,
            rangeX: 210,
            rangeY: 120,
            knockbackX: 300,
            knockbackY: 140,
            isSpecial: false
          }, 850);
        } else {
          this.triggerAttack('SANTORYU DASH SLASH (5C)', 'zoro_anim_sp_dash', {
            damage: 135,
            rangeX: 250,
            rangeY: 120,
            knockbackX: 460,
            knockbackY: -320,
            isSpecial: true
          }, 1200);
          this.hasDealtDamage = true; // Wait for the slash to land!
          if (this.scene && this.scene.executeZoroHeavyDashCleave) {
            this.scene.executeZoroHeavyDashCleave(this);
          }
        }
      } else if (this.charId === 'strange') {
        if (this.isInAir) {
          this.triggerAttack('VAPORS OF VALTORR (8C)', 'strange_anim_atk_8c', {
            damage: 105,
            rangeX: 215,
            rangeY: 120,
            knockbackX: 300,
            knockbackY: 140,
            isSpecial: false
          }, 1000);
        } else {
          this.triggerAttack('FLAMES OF FALTINE (5C)', 'strange_anim_atk_5c', {
            damage: 125,
            rangeX: 240,
            rangeY: 110,
            knockbackX: 440,
            knockbackY: -300,
            isSpecial: true
          }, 1000);
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

    if (input.tauntJustDown && onGround) {
      if (this.charId === 'zoro') {
        this.triggerAttack('BLADE SHEATHE TAUNT', 'zoro_anim_crouch_down', null, 500);
      } else if (this.charId === 'strange') {
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
      if (this.charId === 'zoro') {
        this.currentAction = 'DASH SLASH STEP';
        this.sprite.play('zoro_anim_dash', true);
        this.sprite.setTint(0x10b981);
        this.scene.time.delayedCall(180, () => {
          if (this.isMirror) this.sprite.setTint(0xc4b5fd);
          else this.sprite.clearTint();
        });
      } else if (this.charId === 'strange') {
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
        this.sprite.setOrigin(0.5, 0.507);
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
        if (this.charId === 'zoro') {
          this.sprite.play('zoro_anim_jump', true);
        } else if (this.charId === 'strange') {
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
          if (this.charId === 'zoro') {
            this.sprite.body.setSize(160, 240);
            this.sprite.body.setOffset(176, 210);
            this.sprite.play('zoro_anim_crouch_down').chain('zoro_anim_crouch_hold');
            this.snapToGround();
          } else if (this.charId === 'strange') {
            this.sprite.body.setSize(96, 140);
            this.sprite.body.setOffset(46, 94);
            this.sprite.play('strange_anim_crouch_down').chain('strange_anim_crouch_hold');
            this.snapToGround();
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
          if (this.charId === 'zoro') {
            this.sprite.setScale(0.60);
            this.sprite.setOrigin(0.5, 0.5);
            this.sprite.body.setSize(160, 320);
            this.sprite.body.setOffset(176, 130);
            this.sprite.play('zoro_anim_idle', true);
            this.snapToGround();
          } else if (this.charId === 'strange') {
            this.sprite.setScale(0.78);
            this.sprite.setOrigin(0.5, 0.5);
            this.sprite.body.setSize(96, 220);
            this.sprite.body.setOffset(46, 14);
            this.sprite.play('strange_anim_idle', true);
            this.snapToGround();
          } else if (this.charId === 'chunli') {
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
            if (this.charId === 'zoro') this.sprite.play('zoro_anim_walk', true);
            else if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.502, 0.507);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 22);
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
            if (this.charId === 'zoro') this.sprite.play('zoro_anim_walk', true);
            else if (this.charId === 'strange') this.sprite.play('strange_anim_walk', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
              this.sprite.play('chunli_anim_walk', true);
            } else if (this.charId === 'mewtwo') {
              this.sprite.setScale(0.78);
              this.sprite.setOrigin(0.502, 0.507);
              this.sprite.body.setSize(110, 240);
              this.sprite.body.setOffset(73, 22);
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
            if (this.charId === 'zoro') {
              this.sprite.play('zoro_anim_idle', true);
              this.snapToGround();
            } else if (this.charId === 'strange') this.sprite.play('strange_anim_idle', true);
            else if (this.charId === 'chunli') {
              this.sprite.setDisplayOrigin(128, 128);
              this.sprite.body.setSize(100, 230);
              this.sprite.body.setOffset(78, 22);
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
      if (this.charId === 'zoro' && this.sprite.anims.currentAnim?.key !== 'zoro_anim_jump') {
        this.sprite.play('zoro_anim_jump', true);
      } else if (this.charId === 'strange' && this.sprite.anims.currentAnim?.key !== 'strange_anim_jump') {
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
    this.load.image('zoro_portrait', '../../assets/characters/zoro/select_avatar.png');
    this.load.image('harpy_portrait', '../../assets/characters/harpy/select_avatar.png');
    this.load.image('strange_portrait', '../../assets/characters/Dr_Strange/select_avatar.png');
    this.load.image('chunli_portrait', '../../assets/characters/ChunLi/select_avatar.png');
    this.load.image('mewtwo_portrait', '../../assets/characters/Mewtwo/select_avatar.png');
    this.load.image('steve_portrait', '../../assets/characters/Steve/select_avatar.png');

    // 2. Doctor Strange 30 FPS Master Sprite Sheet & VFX (256x256 Grid)
    const sBase = '../../assets/characters/Dr_Strange/';
    this.load.spritesheet('strange_sheet_master', sBase + 'doctor_strange_master_combined_30fps_spritesheet.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('strange_vfx_eye', sBase + 'strips_30fps/vfx_eye_of_agamotto_loop_30fps.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('strange_vfx_portal', sBase + 'strips_30fps/vfx_sling_portal_loop_30fps.png', { frameWidth: 256, frameHeight: 256 });

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

    // 5. Mewtwo Sprite Sheets & VFX (Exact Grid Dimensions from orig)
    const mBase = '../../assets/characters/Mewtwo/';
    const mOrig = mBase + 'orig/';
    this.load.spritesheet('mewtwo_sheet_idle', mOrig + '01_Mewtwo_Idle.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_walk', mOrig + '02_Mewtwo_Walk.png', { frameWidth: 256, frameHeight: 272 });
    this.load.spritesheet('mewtwo_sheet_jump', mOrig + '03_Mewtwo_Jump.png', { frameWidth: 230, frameHeight: 232 });
    this.load.spritesheet('mewtwo_sheet_crouch', mOrig + '04_Mewtwo_Crouch.png', { frameWidth: 300, frameHeight: 298 });
    this.load.spritesheet('mewtwo_sheet_hit', mOrig + '05_Mewtwo_HitReaction.png', { frameWidth: 300, frameHeight: 298 });
    this.load.spritesheet('mewtwo_sheet_basic_strike', mOrig + '06_Mewtwo_BasicStrike.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_shadow_ball', mOrig + '07_Mewtwo_ShadowBall.png', { frameWidth: 230, frameHeight: 232 });
    this.load.spritesheet('mewtwo_sheet_psychic_crush', mOrig + '08_Mewtwo_PsychicCrush.png', { frameWidth: 210, frameHeight: 212 });
    this.load.spritesheet('mewtwo_sheet_teleport_strike', mOrig + '09_Mewtwo_TeleportStrike.png', { frameWidth: 210, frameHeight: 212 });
    this.load.spritesheet('mewtwo_sheet_psystrike', mOrig + '10_Mewtwo_Psystrike.png', { frameWidth: 210, frameHeight: 212 });

    // Mewtwo VFX & Projectiles
    this.load.spritesheet('mewtwo_sheet_projectile', mBase + '11_ShadowBall_Projectile.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_impact', mBase + '12_ShadowBall_Impact.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_charge', mBase + '13_Psychic_Charge.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_disappear', mBase + '14_Teleport_Disappear.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_reappear', mBase + '15_Teleport_Reappear.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_forcefield', mBase + '16_PsychicCrush_ForceField.png', { frameWidth: 256, frameHeight: 256 });
    this.load.spritesheet('mewtwo_sheet_vfx_psystrike', mBase + '17_Psystrike_Explosion.png', { frameWidth: 210, frameHeight: 212 });

    // 6. Steve Sprite Sheets & VFX (Exact Grid Dimensions from orig)
    const stBase = '../../assets/characters/Steve/';
    const stOrig = stBase + 'orig/';
    this.load.spritesheet('steve_sheet_idle', stOrig + 'Steve_Idle.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_walk', stOrig + 'Steve_Walk.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_jump', stOrig + 'Steve_Jump.png', { frameWidth: 460, frameHeight: 464 });
    this.load.spritesheet('steve_sheet_crouch', stOrig + 'Steve_Crouch.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_hit', stOrig + 'Steve_HitReaction.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_punch', stOrig + 'Steve_Punch.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('steve_sheet_sword', stOrig + 'Steve_SwordSlash.png', { frameWidth: 460, frameHeight: 464 });
    this.load.spritesheet('steve_sheet_pickaxe', stOrig + 'Steve_PickaxeSmash.png', { frameWidth: 421, frameHeight: 424 });
    this.load.spritesheet('steve_sheet_tnt_throw', stOrig + 'Steve_TNT_Throw.png', { frameWidth: 460, frameHeight: 464 });

    // Steve VFX & Projectiles
    this.load.spritesheet('steve_sheet_tnt_flight', stBase + 'TNT_Flight.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_tnt_fuse', stBase + 'TNT_Fuse.png', { frameWidth: 600, frameHeight: 597 });
    this.load.spritesheet('steve_sheet_tnt_explosion', stBase + 'TNT_Explosion.png', { frameWidth: 421, frameHeight: 424 });

    // 7. Roronoa Zoro Sprite Sheets & VFX (512x512 Grid)
    const zBase = '../../assets/characters/Zoro/';
    this.load.spritesheet('zoro_sheet_idle', zBase + '01_idle/01_idle_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_walk', zBase + '02_walk/02_walk_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_slash', zBase + '03_melee_1_slash/03_melee_1_slash_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_overhead', zBase + '04_melee_2_overhead/04_melee_2_overhead_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_cannon', zBase + '05_special_pound_cannon/05_special_pound_cannon_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_onigiri', zBase + '06_ultimate_onigiri/06_ultimate_onigiri_spritesheet.png', { frameWidth: 512, frameHeight: 512 });
    this.load.spritesheet('zoro_sheet_vfx', zBase + '07_vfx_effects/07_vfx_effects_spritesheet.png', { frameWidth: 512, frameHeight: 512 });


    // 6. Training Dummy Assets
    this.load.image('dummy_sprite', 'assets/characters/dummy/dummy_sprite.png');
    this.load.image('dummy_portrait', 'assets/characters/dummy/select_avatar.png');
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
    this.registerZoroAnimations();

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

    // 6.4. LAN Disconnection & Match Control Guards
    if (window.isLanMatch && window.lanManager) {
      window.lanManager.on('REMATCH', () => {
        this.restartMatch();
      });
      window.lanManager.on('EXIT_TO_MENU', () => {
        if (window.exitArenaToMenu) window.exitArenaToMenu();
      });
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
    // Row 0: frames 0..29 (Idle Stance, 30 FPS looping)
    defineAnim('strange_anim_idle', 'strange_sheet_master', 0, 29, 30, -1);
    // Row 1: frames 30..59 (Walk / Float Glide, 30 FPS looping)
    defineAnim('strange_anim_walk', 'strange_sheet_master', 30, 59, 30, -1);
    // Row 9: frames 270..289 (Sling Ring Portal Teleport Dash, 30 FPS)
    defineAnim('strange_anim_dash', 'strange_sheet_master', 270, 289, 30, 0);
    // Row 2: frames 60..79 (Crouch Stance)
    defineAnim('strange_anim_crouch_down', 'strange_sheet_master', 60, 72, 30, 0);
    defineAnim('strange_anim_crouch_hold', 'strange_sheet_master', 72, 79, 15, -1);
    defineAnim('strange_anim_crouch', 'strange_sheet_master', 60, 79, 30, -1);
    // Row 3: frames 90..113 (Jump Aerial Arc, 30 FPS)
    defineAnim('strange_anim_jump', 'strange_sheet_master', 90, 113, 30, 0);
    // Row 10: frames 300..319 (Hit Stripes Hurt Recoil, 30 FPS)
    defineAnim('strange_anim_hurt', 'strange_sheet_master', 300, 319, 30, 0);
    // Row 11: frames 330..353 (Heavy Knockback, 30 FPS)
    defineAnim('strange_anim_knockback', 'strange_sheet_master', 330, 353, 30, 0);
    // Row 8: frames 240..259 (Tao Shield Barrier, 30 FPS)
    defineAnim('strange_anim_guard', 'strange_sheet_master', 240, 259, 30, -1);

    // Normal Attacks
    // Row 4: frames 120..139 (Eldritch Whip light attack, 30 FPS)
    defineAnim('strange_anim_atk_5a', 'strange_sheet_master', 120, 139, 30, 0);
    // Row 6: frames 180..203 (Astral Crows / Cleave medium attack, 30 FPS)
    defineAnim('strange_anim_atk_5b', 'strange_sheet_master', 180, 203, 30, 0);
    defineAnim('strange_anim_atk_6b', 'strange_sheet_master', 180, 203, 30, 0);
    // Row 5: frames 150..179 (Heavy Mandala Blast, 30 FPS)
    defineAnim('strange_anim_atk_5c', 'strange_sheet_master', 150, 179, 30, 0);

    // Air Attacks
    defineAnim('strange_anim_atk_8a', 'strange_sheet_master', 120, 139, 30, 0);
    defineAnim('strange_anim_atk_8c', 'strange_sheet_master', 150, 179, 30, 0);

    // Special & Super
    // Row 7: frames 210..239 (Eye of Agamotto cast, 30 FPS)
    defineAnim('strange_anim_sp_projectile', 'strange_sheet_master', 210, 239, 30, 0);
    // Super: Eye of Agamotto / Dimension Shatter (Row 7, 30 FPS)
    defineAnim('strange_anim_super', 'strange_sheet_master', 210, 239, 30, 0);
    // VFX Orb: Eye of Agamotto looping projectile (30 FPS)
    defineAnim('strange_anim_orb', 'strange_vfx_eye', 0, 29, 30, -1);
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
    defineAnim('mewtwo_anim_super', 'mewtwo_sheet_psystrike', 0, 23, 16, 0);
    defineAnim('mewtwo_anim_sp_shadow_ball', 'mewtwo_sheet_shadow_ball', 0, 19, 18, 0);
    defineAnim('mewtwo_anim_sp_psystrike', 'mewtwo_sheet_psystrike', 0, 23, 16, 0);

    // VFX & Projectiles
    defineAnim('mewtwo_anim_projectile', 'mewtwo_sheet_projectile', 0, 3, 16, -1);
    defineAnim('mewtwo_anim_impact', 'mewtwo_sheet_impact', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_charge', 'mewtwo_sheet_vfx_charge', 0, 15, 20, 0);
    defineAnim('mewtwo_anim_vfx_disappear', 'mewtwo_sheet_vfx_disappear', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_reappear', 'mewtwo_sheet_vfx_reappear', 0, 14, 20, 0);
    defineAnim('mewtwo_anim_vfx_forcefield', 'mewtwo_sheet_vfx_forcefield', 0, 14, 18, 0);
    defineAnim('mewtwo_anim_vfx_psystrike', 'mewtwo_sheet_vfx_psystrike', 0, 23, 16, 0);
    defineAnim('mewtwo_anim_vfx_psystrike_ball', 'mewtwo_sheet_vfx_psystrike', 0, 2, 12, -1);
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
    defineAnim('steve_anim_super', 'steve_sheet_tnt_throw', 0, 19, 18, 0);
    defineAnim('steve_anim_sp_tnt', 'steve_sheet_tnt_throw', 0, 19, 18, 0);
    defineAnim('steve_anim_sp_punch', 'steve_sheet_punch', 0, 15, 22, 0);

    // Steve VFX & Projectiles
    defineAnim('steve_anim_tnt_flight', 'steve_sheet_tnt_flight', 0, 11, 18, -1);
    defineAnim('steve_anim_tnt_fuse', 'steve_sheet_tnt_fuse', 0, 11, 20, 0);
    defineAnim('steve_anim_tnt_explosion', 'steve_sheet_tnt_explosion', 0, 23, 22, 0);
  }

  registerZoroAnimations() {
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

    // Movement & Stances
    defineAnim('zoro_anim_idle', 'zoro_sheet_idle', 0, 15, 16, -1);
    defineAnim('zoro_anim_walk', 'zoro_sheet_walk', 0, 15, 20, -1);
    defineAnim('zoro_anim_dash', 'zoro_sheet_slash', 4, 12, 24, 0);
    defineAnim('zoro_anim_crouch_down', 'zoro_sheet_onigiri', 0, 3, 16, 0);
    defineAnim('zoro_anim_crouch_hold', 'zoro_sheet_onigiri', 3, 6, 12, -1);
    defineAnim('zoro_anim_crouch', 'zoro_sheet_onigiri', 3, 6, 12, -1);
    defineAnim('zoro_anim_jump', 'zoro_sheet_slash', 8, 14, 18, 0);
    defineAnim('zoro_anim_hurt', 'zoro_sheet_idle', 0, 3, 16, 0);
    defineAnim('zoro_anim_knockback', 'zoro_sheet_slash', 0, 6, 16, 0);

    // Normal Attacks
    defineAnim('zoro_anim_atk_5a', 'zoro_sheet_slash', 0, 23, 28, 0);
    defineAnim('zoro_anim_atk_5b', 'zoro_sheet_overhead', 0, 23, 26, 0);
    defineAnim('zoro_anim_atk_6b', 'zoro_sheet_overhead', 0, 23, 26, 0);
    defineAnim('zoro_anim_atk_5c', 'zoro_sheet_overhead', 0, 23, 26, 0);

    // Air Attacks
    defineAnim('zoro_anim_atk_8a', 'zoro_sheet_slash', 4, 18, 26, 0);
    defineAnim('zoro_anim_atk_8c', 'zoro_sheet_overhead', 4, 20, 24, 0);

    // Special & Super
    defineAnim('zoro_anim_sp_dash', 'zoro_sheet_slash', 4, 12, 24, -1);
    defineAnim('zoro_anim_sp_cannon', 'zoro_sheet_cannon', 0, 23, 24, 0);
    defineAnim('zoro_anim_super', 'zoro_sheet_onigiri', 0, 23, 24, 0);

    // Zoro VFX & Projectiles
    defineAnim('zoro_anim_vfx_slash', 'zoro_sheet_vfx', 0, 5, 24, 0);
    defineAnim('zoro_anim_vfx_cyclone', 'zoro_sheet_vfx', 6, 11, 24, 0);
    defineAnim('zoro_anim_vfx_onigiri', 'zoro_sheet_vfx', 12, 23, 24, 0);
  }

  spawnPoundCannonProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 80 : -80);
    const spawnY = caster.sprite.y - 15;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'zoro_sheet_vfx');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.55);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(160, 160);
    proj.body.setOffset(176, 176);
    proj.play('zoro_anim_vfx_slash');
    proj.caster = caster;
    proj.isPoundCannon = true;
    proj.setFlipX(!facingRight);

    const speed = 680;
    proj.setVelocityX(facingRight ? speed : -speed);
    proj.setVelocityY(0);
    proj.setTint(0x34d399);

    this.time.delayedCall(2000, () => {
      if (proj && proj.active) proj.destroy();
    });
  }

  spawnOniGiriVFX(caster) {
    this.executeZoroUltimate(caster);
  }

  spawnCharacterAfterimage(caster, tint = 0xffffff, duration = 220, alpha = 0.65) {
    if (!caster || !caster.sprite) return;
    const ghost = this.add.sprite(caster.sprite.x, caster.sprite.y, caster.sprite.texture.key, caster.sprite.frame.name);
    ghost.setScale(caster.sprite.scaleX, caster.sprite.scaleY);
    ghost.setOrigin(caster.sprite.originX, caster.sprite.originY);
    ghost.setFlipX(caster.sprite.flipX);
    ghost.setTint(tint);
    ghost.setAlpha(alpha);
    ghost.setDepth(9);
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: duration,
      onComplete: () => {
        if (ghost && ghost.active) ghost.destroy();
      }
    });
  }

  spawnZoroAfterimage(caster) {
    this.spawnCharacterAfterimage(caster, 0x10b981, 220, 0.65);
  }

  executeZoroUltimate(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;

    let facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    if (target && target.sprite) {
      facingDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      caster.setFacingDir(facingDir);
    }
    const facingRight = facingDir === 1;

    // Cinematic Super Freeze & Screen Emerald Flash
    this.cameras.main.flash(220, 16, 185, 129);
    this.cameras.main.shake(180, 0.012);
    if (window.soundFX) window.soundFX.playStartBoom();
    if (window.soundFX && window.soundFX.playSuperWhoosh) window.soundFX.playSuperWhoosh();

    // Demon Stance & Supersonic Flash Step (Shukuchi)
    caster.sprite.play('zoro_anim_super', true);
    caster.sprite.setTint(0x10b981);
    caster.sprite.setVelocityX(facingRight ? 1150 : -1150);

    // Trail emerald afterimages
    const afterimageTimer = this.time.addEvent({
      delay: 35,
      repeat: 4,
      callback: () => {
        this.spawnCharacterAfterimage(caster, 0x10b981, 250, 0.75);
      }
    });

    let hasCrossed = false;
    const triggerDemonCrossSlash = () => {
      if (hasCrossed) return;
      hasCrossed = true;
      afterimageTimer.remove();

      if (!caster || !caster.sprite || caster.hp <= 0) return;
      caster.sprite.setVelocityX(0);

      if (!target || !target.sprite || target.hp <= 0) {
        if (caster && caster.sprite) caster.sprite.clearTint();
        return;
      }

      // 1. Zan-shin Pause: Target frozen in place with demon cross lines
      target.isCaptured = true;
      target.isStunned = true;
      target.isAttacking = false;
      target.isCrouching = false;
      target.currentAttackData = null;
      if (target.attackTimer) { target.attackTimer.remove(); target.attackTimer = null; }
      target.sprite.setVelocity(0, 0);
      if (target.sprite.body) target.sprite.body.setAllowGravity(false);
      target.sprite.setTint(0x34d399);
      target.currentAction = 'DEMON CROSS SLICE LOCKED';

      this.cameras.main.shake(140, 0.007);
      if (window.soundFX && window.soundFX.playHover) window.soundFX.playHover();

      // 2. Delayed Demon Cross-Slash Detonation (at 240ms)
      this.time.delayedCall(240, () => {
        if (!target || !target.sprite || target.hp <= 0) {
          if (caster && caster.sprite) caster.sprite.clearTint();
          return;
        }

        // Spawn massive Oni Giri Cross-Burst VFX (Frames 12 to 23 of zoro_sheet_vfx)
        const vfxX = target.sprite.x;
        const vfxY = target.sprite.y - 15;
                const crossVFX = this.add.sprite(vfxX, vfxY, 'zoro_sheet_vfx');
        crossVFX.setDepth(29);
        crossVFX.setScale(1.55);
        crossVFX.setFlipX(!facingRight);
        crossVFX.setTint(0x10b981);
        crossVFX.play('zoro_anim_vfx_onigiri');
        crossVFX.on('animationcomplete', () => {
          if (crossVFX.active) crossVFX.destroy();
        });
        // Failsafe timer guarantees the slash VFX never lingers on screen
        this.time.delayedCall(380, () => {
          if (crossVFX && crossVFX.active) crossVFX.destroy();
        });

        // 3 razor blade impacts (3 * 45 = 135 damage)
        const sliceDelays = [60, 130, 200];
        sliceDelays.forEach(d => {
          this.time.delayedCall(d, () => {
            if (!target || !target.sprite || target.hp <= 0) return;
            target.takeHit({ damage: 45, isSpecial: false, knockbackX: 0.001 }, caster);
            target.sprite.setVelocity(0, 0);
            target.isCaptured = true;
            target.isStunned = true;

            this.cameras.main.shake(80, 0.009);
            if (window.soundFX && window.soundFX.playSelect) window.soundFX.playSelect();
          });
        });

                // 3. Final Demon Burst Eruption (at 360ms): 160 damage (Total 135 + 160 = 295!)
        this.time.delayedCall(360, () => {
          if (crossVFX && crossVFX.active) crossVFX.destroy();
          if (!target || !target.sprite || target.hp <= 0) {
            if (caster && caster.sprite) caster.sprite.clearTint();
            return;
          }

          // Full screen flash & heavy earthquake shake
          this.cameras.main.flash(320, 52, 211, 153);
          this.cameras.main.shake(480, 0.035);
          if (window.soundFX && window.soundFX.playShatter) window.soundFX.playShatter();
          else if (window.soundFX) window.soundFX.playStartBoom();

          // Release capture & deliver final 160 damage
          target.isCaptured = false;
          target.isStunned = false;
          if (target.sprite && target.sprite.body) target.sprite.body.setAllowGravity(true);
          if (target.sprite) {
            if (target.isMirror) target.sprite.setTint(0xc4b5fd);
            else target.sprite.clearTint();
          }

          target.takeHit({
            damage: 160,
            isSpecial: true,
            knockbackX: facingRight ? 860 : -860,
            knockbackY: -640
          }, caster);

          // Restore Zoro tint
          this.time.delayedCall(400, () => {
            if (caster && caster.sprite) {
              if (caster.isMirror) caster.sprite.setTint(0xc4b5fd);
              else caster.sprite.clearTint();
            }
          });
        });
      });
    };

    // Check if Zoro has crossed the target
    const checkFlashStep = () => {
      if (hasCrossed) return;
      if (!caster || !caster.sprite || caster.hp <= 0) {
        this.events.off('update', checkFlashStep);
        return;
      }
      const hasPassed = facingRight ? (caster.sprite.x >= target.sprite.x + 80) : (caster.sprite.x <= target.sprite.x - 80);
      if (hasPassed || (facingRight && caster.sprite.x >= 1700) || (!facingRight && caster.sprite.x <= 220)) {
        this.events.off('update', checkFlashStep);
        triggerDemonCrossSlash();
      }
    };
    this.events.on('update', checkFlashStep);

    // Failsafe trigger after 160ms
    this.time.delayedCall(160, () => {
      this.events.off('update', checkFlashStep);
      triggerDemonCrossSlash();
    });
  }

  executeStrangeUltimate(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;

    // Face the target
    let facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    if (target && target.sprite) {
      facingDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      caster.setFacingDir(facingDir);
    }
    const facingRight = facingDir === 1;

    // Cinematic Super Freeze & Screen Light
    this.cameras.main.flash(220, 245, 158, 11);
    this.cameras.main.shake(180, 0.012);
    if (window.soundFX) window.soundFX.playStartBoom();

    // Golden mystic aura & levitation pose on Doctor Strange
    caster.sprite.play('strange_anim_super', true);
    caster.sprite.setTint(0xfde047);
    caster.sprite.setVelocity(0, 0);

    // Rotating Sling-Ring Portal behind Strange
    const portalX = caster.sprite.x - (facingRight ? 50 : -50);
    const portalY = caster.sprite.y - 25;
    const portal = this.add.sprite(portalX, portalY, 'strange_vfx_portal');
    portal.setDepth(15);
    portal.setScale(1.25);
    portal.setFlipX(!facingRight);
    portal.play('strange_anim_vfx_portal');
    this.time.delayedCall(1600, () => { if (portal && portal.active) portal.destroy(); });

    if (!target || !target.sprite || target.hp <= 0) return;

    // 1. Trap opponent inside the Mirror Dimension
    target.isCaptured = true;
    target.isStunned = true;
    target.isAttacking = false;
    target.isCrouching = false;
    target.currentAttackData = null;
    if (target.attackTimer) { target.attackTimer.remove(); target.attackTimer = null; }
    target.sprite.setVelocity(0, 0);
    if (target.sprite.body) target.sprite.body.setAllowGravity(false);
    target.sprite.setTint(0xfbbf24);
    target.currentAction = 'MIRROR DIMENSION TRAPPED';

    // 2. Colossal Dimensional Vortex centered directly on opponent
    const vortexX = target.sprite.x;
    const vortexY = target.sprite.y - 20;
    const vortex = this.add.sprite(vortexX, vortexY, 'strange_vfx_vortex');
    vortex.setDepth(28);
    vortex.setScale(1.9);
    vortex.setTint(0xf59e0b);
    vortex.play('strange_anim_vfx_vortex');

    // 3. Multi-Hit Reality Tears (4 shredding hits = 30 * 4 = 120 damage)
    const tearTimes = [120, 240, 360, 480];
    tearTimes.forEach((delay) => {
      this.time.delayedCall(delay, () => {
        if (!target || !target.sprite || target.hp <= 0) return;
        target.takeHit({ damage: 30, isSpecial: false, knockbackX: 0.001 }, caster);
        target.sprite.setVelocity(0, 0);
        target.isCaptured = true;
        target.isStunned = true;

        // Dimensional spark at random offset
        const sparkX = target.sprite.x + Phaser.Math.Between(-30, 30);
        const sparkY = target.sprite.y + Phaser.Math.Between(-35, 15);
        const spark = this.add.sprite(sparkX, sparkY, 'strange_vfx_impact');
        spark.setDepth(29);
        spark.setScale(1.1);
        spark.play('strange_anim_vfx_impact');
        spark.on('animationcomplete', () => spark.destroy());

        this.cameras.main.shake(70, 0.008);
        if (window.soundFX && window.soundFX.playSelect) window.soundFX.playSelect();
      });
    });

    // 4. Catastrophic Reality Shatter Finisher (at 640ms)
    this.time.delayedCall(640, () => {
      if (vortex && vortex.active) vortex.destroy();
      if (!target || !target.sprite || target.hp <= 0) {
        if (caster && caster.sprite) caster.sprite.clearTint();
        return;
      }

      // Blinding white/gold flash & earthquake shake
      this.cameras.main.flash(320, 255, 255, 255);
      this.cameras.main.shake(480, 0.035);
      if (window.soundFX && window.soundFX.playShatter) window.soundFX.playShatter();
      else if (window.soundFX) window.soundFX.playStartBoom();

      // Giant shatter burst impact
      const shatterVFX = this.add.sprite(target.sprite.x, target.sprite.y - 20, 'strange_vfx_impact');
      shatterVFX.setDepth(30);
      shatterVFX.setScale(2.2);
      shatterVFX.play('strange_anim_vfx_impact');
      shatterVFX.on('animationcomplete', () => shatterVFX.destroy());

      // Release capture & deliver final 170 damage (Total 290!)
      target.isCaptured = false;
      target.isStunned = false;
      if (target.sprite && target.sprite.body) target.sprite.body.setAllowGravity(true);
      if (target.sprite) {
        if (target.isMirror) target.sprite.setTint(0xc4b5fd);
        else target.sprite.clearTint();
      }

      target.takeHit({
        damage: 170,
        isSpecial: true,
        knockbackX: facingRight ? 850 : -850,
        knockbackY: -620
      }, caster);

      // Restore Strange tint
      this.time.delayedCall(400, () => {
        if (caster && caster.sprite) {
          if (caster.isMirror) caster.sprite.setTint(0xc4b5fd);
          else caster.sprite.clearTint();
        }
      });
    });
  }

  executeHarpyUltimate(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;

    let facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    if (target && target.sprite) {
      facingDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      caster.setFacingDir(facingDir);
    }
    const facingRight = facingDir === 1;

    // Cinematic Super Freeze & Screen Amethyst Flash
    this.cameras.main.flash(200, 168, 85, 247);
    this.cameras.main.shake(180, 0.014);
    if (window.soundFX) window.soundFX.playStartBoom();
    if (window.soundFX && window.soundFX.playSuperWhoosh) window.soundFX.playSuperWhoosh();

    // Supersonic Tempest Wing Dash across arena
    caster.sprite.play('harpy_anim_super', true);
    caster.sprite.setTint(0xc084fc);
    caster.sprite.setVelocityX(facingRight ? 950 : -950);

    // Trail afterimages
    const afterimageTimer = this.time.addEvent({
      delay: 40,
      repeat: 4,
      callback: () => {
        this.spawnCharacterAfterimage(caster, 0xa855f7, 240, 0.7);
      }
    });

    let hasTriggeredVortex = false;
    const triggerTempestVortex = () => {
      if (hasTriggeredVortex) return;
      hasTriggeredVortex = true;
      afterimageTimer.remove();

      if (!caster || !caster.sprite || caster.hp <= 0) return;
      caster.sprite.setVelocityX(0);

      if (!target || !target.sprite || target.hp <= 0) {
        if (caster && caster.sprite) caster.sprite.clearTint();
        return;
      }

      // 1. Trap opponent inside the Tempest Cyclone
      target.isCaptured = true;
      target.isStunned = true;
      target.isAttacking = false;
      target.isCrouching = false;
      target.currentAttackData = null;
      if (target.attackTimer) { target.attackTimer.remove(); target.attackTimer = null; }
      target.sprite.setVelocity(0, 0);
      if (target.sprite.body) target.sprite.body.setAllowGravity(false);
      target.sprite.setTint(0xd8b4fe);
      target.currentAction = 'TEMPEST TRAPPED';

      // 2. Colossal Rising Wind Cyclone
      const cycloneX = target.sprite.x;
      const cycloneY = target.sprite.y - 35;
      const cyclone = this.add.sprite(cycloneX, cycloneY, 'harpy_sheet_262c');
      cyclone.setDepth(27);
      cyclone.setScale(1.25);
      cyclone.setTint(0xd8b4fe);
      cyclone.play('harpy_anim_vfx_cyclone');

      // 3. Razor Feather Barrage (5 rapid wing strikes = 30 * 5 = 150 damage)
      const flurryTimes = [90, 170, 250, 330, 410];
      flurryTimes.forEach((delay) => {
        this.time.delayedCall(delay, () => {
          if (!target || !target.sprite || target.hp <= 0) return;
          target.takeHit({ damage: 30, isSpecial: false, knockbackX: 0.001 }, caster);
          target.sprite.setVelocity(0, 0);
          target.isCaptured = true;
          target.isStunned = true;

          this.cameras.main.shake(70, 0.008);
          if (window.soundFX && window.soundFX.playHover) window.soundFX.playHover();
        });
      });

      // 4. Cataclysmic Sky Cleave Finisher (at 520ms)
      this.time.delayedCall(520, () => {
        if (cyclone && cyclone.active) cyclone.destroy();
        if (!target || !target.sprite || target.hp <= 0) {
          if (caster && caster.sprite) caster.sprite.clearTint();
          return;
        }

        // Full screen flash & heavy impact shake
        this.cameras.main.flash(260, 216, 180, 254);
        this.cameras.main.shake(450, 0.032);
        if (window.soundFX) window.soundFX.playStartBoom();

        // Release capture & deliver final 140 damage (Total 290!)
        target.isCaptured = false;
        target.isStunned = false;
        if (target.sprite && target.sprite.body) target.sprite.body.setAllowGravity(true);
        if (target.sprite) {
          if (target.isMirror) target.sprite.setTint(0xc4b5fd);
          else target.sprite.clearTint();
        }

        target.takeHit({
          damage: 140,
          isSpecial: true,
          knockbackX: facingRight ? 840 : -840,
          knockbackY: -580
        }, caster);

        // Reset Harpy tint
        this.time.delayedCall(400, () => {
          if (caster && caster.sprite) {
            if (caster.isMirror) caster.sprite.setTint(0xc4b5fd);
            else caster.sprite.clearTint();
          }
        });
      });
    };

    // Check proximity to opponent during dash
    const checkDash = () => {
      if (hasTriggeredVortex) return;
      if (!caster || !caster.sprite || caster.hp <= 0) {
        this.events.off('update', checkDash);
        return;
      }
      const dist = target && target.sprite ? Math.abs(target.sprite.x - caster.sprite.x) : 999;
      if (dist <= 160 || (facingRight && caster.sprite.x >= 1700) || (!facingRight && caster.sprite.x <= 220)) {
        this.events.off('update', checkDash);
        triggerTempestVortex();
      }
    };
    this.events.on('update', checkDash);

    // Failsafe trigger after 160ms
    this.time.delayedCall(160, () => {
      this.events.off('update', checkDash);
      triggerTempestVortex();
    });
  }

  executeChunLiUltimate(caster) {
    if (!caster || !caster.sprite) return;
    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;

    let facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    if (target && target.sprite) {
      facingDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      caster.setFacingDir(facingDir);
    }
    const facingRight = facingDir === 1;

    // Cinematic Super Freeze & Screen Blue Flash
    this.cameras.main.flash(200, 59, 130, 246);
    this.cameras.main.shake(180, 0.012);
    if (window.soundFX) window.soundFX.playStartBoom();

    // Chun-Li advances kicking in Hoyoku-sen stance
    caster.sprite.play('chunli_anim_super', true);
    caster.sprite.setTint(0x60a5fa);
    caster.sprite.setVelocityX(facingRight ? 420 : -420);

    let hasLockedCombo = false;
    const triggerFlurry = () => {
      if (hasLockedCombo) return;
      hasLockedCombo = true;

      if (!caster || !caster.sprite || caster.hp <= 0) return;
      caster.sprite.setVelocityX(facingRight ? 50 : -50);

      if (!target || !target.sprite || target.hp <= 0) {
        if (caster && caster.sprite) caster.sprite.clearTint();
        return;
      }

      // 1. Lock opponent directly at kick range
      target.isCaptured = true;
      target.isStunned = true;
      target.isAttacking = false;
      target.isCrouching = false;
      target.currentAttackData = null;
      if (target.attackTimer) { target.attackTimer.remove(); target.attackTimer = null; }
      target.sprite.setVelocity(0, 0);
      if (target.sprite.body) target.sprite.body.setAllowGravity(false);
      target.sprite.setTint(0xbfdbfe);
      target.currentAction = 'HOYOKU-SEN LOCK';

      // 2. Multi-Kick Flurry (10 kicks total: 10 * 18 = 180 damage)
      // Phase 1 (First Leg: 5 kicks) + Phase 2 (Second Leg: 5 kicks)
      const kickTimes = [60, 130, 200, 270, 340, 420, 490, 560, 630, 700];
      kickTimes.forEach((delay) => {
        this.time.delayedCall(delay, () => {
          if (!target || !target.sprite || target.hp <= 0) return;
          target.takeHit({ damage: 18, isSpecial: false, knockbackX: 0.001 }, caster);
          target.sprite.setVelocity(0, 0);
          target.isCaptured = true;
          target.isStunned = true;

          // Impact hitspark
          const hitX = (caster.sprite.x + target.sprite.x) / 2;
          const hitY = target.sprite.y - 20 + Phaser.Math.Between(-15, 15);
          this.spawnKikokenImpact(hitX, hitY);

          this.cameras.main.shake(50, 0.006);
          if (window.soundFX && window.soundFX.playSelect) window.soundFX.playSelect();
        });
      });

      // 3. Phase 3: Rising Phoenix Finisher (at 820ms)
      this.time.delayedCall(820, () => {
        caster.sprite.setVelocityX(0);
        if (!target || !target.sprite || target.hp <= 0) {
          if (caster && caster.sprite) caster.sprite.clearTint();
          return;
        }

        // Spawn giant Phoenix Finisher blast
        const blastX = target.sprite.x + (facingRight ? 30 : -30);
        const blastY = target.sprite.y - 25;
        const blast = this.add.sprite(blastX, blastY, 'chunli_sheet_vfx_hoyoku');
        blast.setDepth(28);
        blast.setScale(1.45);
        blast.setFlipX(!facingRight);
        blast.play('chunli_anim_vfx_hoyoku');
        blast.on('animationcomplete', () => blast.destroy());

        // Full screen flash & earthquake shake
        this.cameras.main.flash(280, 147, 197, 253);
        this.cameras.main.shake(440, 0.03);
        if (window.soundFX) window.soundFX.playStartBoom();

        // Release capture & deliver final 110 damage (Total 180 + 110 = 290!)
        target.isCaptured = false;
        target.isStunned = false;
        if (target.sprite && target.sprite.body) target.sprite.body.setAllowGravity(true);
        if (target.sprite) {
          if (target.isMirror) target.sprite.setTint(0xc4b5fd);
          else target.sprite.clearTint();
        }

        target.takeHit({
          damage: 110,
          isSpecial: true,
          knockbackX: facingRight ? 850 : -850,
          knockbackY: -620
        }, caster);

        // Reset Chun-Li tint
        this.time.delayedCall(400, () => {
          if (caster && caster.sprite) {
            if (caster.isMirror) caster.sprite.setTint(0xc4b5fd);
            else caster.sprite.clearTint();
          }
        });
      });
    };

    // Check distance to opponent during kick advance
    const checkKicks = () => {
      if (hasLockedCombo) return;
      if (!caster || !caster.sprite || caster.hp <= 0) {
        this.events.off('update', checkKicks);
        return;
      }
      const dist = target && target.sprite ? Math.abs(target.sprite.x - caster.sprite.x) : 999;
      if (dist <= 145 || (facingRight && caster.sprite.x >= 1700) || (!facingRight && caster.sprite.x <= 220)) {
        this.events.off('update', checkKicks);
        triggerFlurry();
      }
    };
    this.events.on('update', checkKicks);

    // Failsafe trigger after 160ms
    this.time.delayedCall(160, () => {
      this.events.off('update', checkKicks);
      triggerFlurry();
    });
  }

  executeZoroHeavyDashCleave(caster) {
    if (!caster || !caster.sprite) return;
    if (caster.zoroDashHandler) {
      this.events.off('update', caster.zoroDashHandler);
      caster.zoroDashHandler = null;
    }

    const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;

    // 1. Immediately turn to face the opponent
    let facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    if (target && target.sprite) {
      facingDir = target.sprite.x >= caster.sprite.x ? 1 : -1;
      caster.setFacingDir(facingDir);
    }
    const facingRight = facingDir === 1;

    // 2. Play dash animation & emerald aura streak
    caster.sprite.play('zoro_anim_sp_dash', true);
    caster.sprite.setTint(0x10b981);
    if (window.soundFX && window.soundFX.playDash) {
      window.soundFX.playDash();
    } else if (window.soundFX && window.soundFX.playHover) {
      window.soundFX.playHover();
    }

    // High velocity forward dash toward opponent
    const dashSpeed = 720;
    caster.sprite.setVelocityX(facingRight ? dashSpeed : -dashSpeed);

    // Spawn green ghost afterimage at dash startup
    this.spawnZoroAfterimage(caster);

    let hasSlashed = false;
    const startTime = this.time.now;
    const maxDashTime = 260;     // Max dash duration in ms
    const targetSlashDist = 135; // Desired distance to opponent to begin slash

    const cleanup = () => {
      if (caster.zoroDashHandler) {
        this.events.off('update', caster.zoroDashHandler);
        caster.zoroDashHandler = null;
      }
    };

    const triggerSlash = () => {
      if (hasSlashed) return;
      hasSlashed = true;
      cleanup();

      if (!caster || !caster.sprite || caster.hp <= 0 || caster.isStunned || caster.isKnockedBack || !caster.isAttacking) {
        return;
      }

      // Decelerate smoothly
      caster.sprite.setVelocityX(facingRight ? 100 : -100);
      this.time.delayedCall(120, () => {
        if (caster && caster.sprite && caster.isAttacking) {
          caster.sprite.setVelocityX(0);
        }
      });

      // Restore tint
      if (caster.isMirror) caster.sprite.setTint(0xc4b5fd);
      else caster.sprite.clearTint();

      // Trigger heavy Santoryu Cleave animation
      caster.currentAction = 'SANTORYU CLEAVE (5C)';
      caster.sprite.play('zoro_anim_atk_5c', true);

      // Arm the attack hitbox & damage!
      caster.hasDealtDamage = false;
      caster.currentAttackData = {
        damage: 135,
        rangeX: 250,
        rangeY: 120,
        knockbackX: 460,
        knockbackY: -320,
        isSpecial: true
      };

      // Reset attack timer for the slash animation duration
      if (caster.attackTimer) {
        caster.attackTimer.remove();
        caster.attackTimer = null;
      }
      caster.attackTimer = this.time.delayedCall(920, () => {
        caster.isAttacking = false;
        caster.currentAttackData = null;
        caster.updateTextureForState();
      });

      // Spawn Emerald Crescent Slash VFX in front of Zoro
      const vfxX = caster.sprite.x + (facingRight ? 70 : -70);
      const vfxY = caster.sprite.y - 10;
      const vfx = this.add.sprite(vfxX, vfxY, 'zoro_sheet_vfx');
      vfx.setDepth(26);
      vfx.setScale(0.85);
      vfx.setFlipX(!facingRight);
      vfx.setTint(0x10b981);
      vfx.play('zoro_anim_vfx_slash');
      vfx.on('animationcomplete', () => { if (vfx.active) vfx.destroy(); });
      this.time.delayedCall(800, () => { if (vfx && vfx.active) vfx.destroy(); });

      // Camera rumble & sound
      this.cameras.main.shake(180, 0.015);
      if (window.soundFX && window.soundFX.playStartBoom) {
        window.soundFX.playStartBoom();
      }
    };

    const onUpdate = () => {
      if (hasSlashed) return;
      if (!caster || !caster.sprite || caster.hp <= 0 || caster.isStunned || caster.isKnockedBack || !caster.isAttacking) {
        cleanup();
        return;
      }

      // Check distance to opponent
      const currentDist = target && target.sprite ? Math.abs(target.sprite.x - caster.sprite.x) : 999;
      const elapsed = this.time.now - startTime;

      // Arena boundary collision clamp
      if ((facingRight && caster.sprite.x >= 1730) || (!facingRight && caster.sprite.x <= 190)) {
        triggerSlash();
        return;
      }

      // If in front and reached striking range (min 60ms dash so the dash is clearly visible and snappy)
      if (elapsed >= 60 && (currentDist <= targetSlashDist || elapsed >= maxDashTime)) {
        triggerSlash();
      }
    };

    caster.zoroDashHandler = onUpdate;
    this.events.on('update', onUpdate);

    // Failsafe timer: after maxDashTime + 20ms, if slash hasn't triggered yet, trigger it
    this.time.delayedCall(maxDashTime + 20, () => {
      if (!hasSlashed) {
        triggerSlash();
      }
    });
  }

  spawnMysticProjectile(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? 1 : -1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 70 : -70);
    const spawnY = caster.sprite.y - 25;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'strange_vfx_eye');
    this.projectiles.add(proj);
    proj.setDepth(20);

    proj.setScale(0.55);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(120, 120);
    proj.body.setOffset(68, 68);
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

  cleanupMewtwoChargeVFX(caster) {
    if (!caster) return;
    if (caster.chargeUpdateHandler) {
      this.events.off('update', caster.chargeUpdateHandler);
      caster.chargeUpdateHandler = null;
    }
    if (caster.activeCoreBallVFX) {
      this.tweens.killTweensOf(caster.activeCoreBallVFX);
      if (caster.activeCoreBallVFX.active) {
        caster.activeCoreBallVFX.destroy();
      }
      caster.activeCoreBallVFX = null;
    }
    if (caster.activeShadowBallChargeVFX) {
      this.tweens.killTweensOf(caster.activeShadowBallChargeVFX);
      if (caster.activeShadowBallChargeVFX.active) {
        caster.activeShadowBallChargeVFX.destroy();
      }
      caster.activeShadowBallChargeVFX = null;
    }
  }

  spawnMewtwoChargeBallSuper(caster) {
    if (!caster || !caster.sprite) return;
    this.cleanupMewtwoChargeVFX(caster);

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : 1;
    const facingRight = facingDir === 1;
    const chargeX = caster.sprite.x + (facingRight ? 52 : -52);
    const chargeY = caster.sprite.y - 18;

    // Outer swirling energy aura
    const chargeAura = this.add.sprite(chargeX, chargeY, 'mewtwo_sheet_vfx_charge');
    chargeAura.setDepth(26);
    chargeAura.setScale(0.80);
    chargeAura.setFlipX(!facingRight);
    chargeAura.play('mewtwo_anim_vfx_charge');

    // Inner growing dark psychic core ball
    const coreBall = this.add.sprite(chargeX, chargeY, 'mewtwo_sheet_projectile');
    coreBall.setDepth(27);
    coreBall.setScale(0.20);
    coreBall.setTint(0x9333ea);
    coreBall.play('mewtwo_anim_projectile');

    this.tweens.add({
      targets: coreBall,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 650,
      ease: 'Cubic.Out'
    });

    caster.activeShadowBallChargeVFX = chargeAura;
    caster.activeCoreBallVFX = coreBall;

    this.cameras.main.shake(350, 0.009);

    const onUpdate = () => {
      if (caster && caster.sprite) {
        const dir = caster.getFacingDir ? caster.getFacingDir() : 1;
        const isRight = dir === 1;
        const curX = caster.sprite.x + (isRight ? 52 : -52);
        const curY = caster.sprite.y - 18;
        if (chargeAura && chargeAura.active) {
          chargeAura.setPosition(curX, curY);
          chargeAura.setFlipX(!isRight);
        }
        if (coreBall && coreBall.active) {
          coreBall.setPosition(curX, curY);
        }
      }
    };
    this.events.on('update', onUpdate);
    caster.chargeUpdateHandler = onUpdate;

    this.time.delayedCall(1600, () => {
      this.cleanupMewtwoChargeVFX(caster);
    });
  }

  spawnMewtwoUltimateChargeBall(caster) {
    if (!caster || !caster.sprite) return;
    this.cleanupMewtwoChargeVFX(caster);

    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? -1 : 1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 90 : -90);
    const spawnY = caster.sprite.y - 20;

    // Fire the massive charged psychic orb!
    const proj = this.physics.add.sprite(spawnX, spawnY, 'mewtwo_sheet_vfx_psystrike');
    this.projectiles.add(proj);
    proj.setDepth(26);
    proj.setScale(1.45);
    proj.setFlipX(!facingRight);
    proj.play('mewtwo_anim_vfx_psystrike_ball');

    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(140, 140);
    proj.body.setOffset(35, 36);

    proj.caster = caster;
    proj.isShadowBall = true;
    proj.isSuper = true;

    const speed = 920;
    proj.setVelocityX(facingRight ? speed : -speed);
    proj.setVelocityY(0);

    this.cameras.main.shake(260, 0.020);
    if (window.soundFX) window.soundFX.playStartBoom();

    this.time.delayedCall(2500, () => {
      if (proj && proj.active) proj.destroy();
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
                             (target.charId === 'zoro' ? 458.60 :
                             (target.charId === 'chunli' ? 477.04 :
                             (target.charId === 'strange' ? 462.68 : 443.00))));

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
    caster.activePsystrikeVFX = charge;
    charge.on('animationcomplete', () => { if (charge.active) charge.destroy(); });

    // 2. Releases powerful ranged blast shot across the stage in the facing direction
    this.time.delayedCall(300, () => {
      if (!caster || !caster.sprite || caster.hp <= 0) return;
      if (caster.activePsystrikeVFX === charge) caster.activePsystrikeVFX = null;
      const spawnX = caster.sprite.x + (facingRight ? 95 : -95);
      const spawnY = caster.sprite.y - 25;

      const proj = this.physics.add.sprite(spawnX, spawnY, 'mewtwo_sheet_vfx_psystrike');
      this.projectiles.add(proj);
      proj.setDepth(26);
      proj.setScale(1.45);
      proj.setFlipX(!facingRight);
      proj.play('mewtwo_anim_vfx_psystrike_ball');

      proj.body.allowGravity = false;
      proj.body.setAllowGravity(false);
      proj.body.gravity.y = 0;
      proj.body.setSize(140, 140);
      proj.body.setOffset(35, 36);

      proj.caster = caster;
      proj.isPsystrike = true;
      proj.isSuper = true;

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

    proj.setScale(0.18);
    proj.body.allowGravity = false;
    proj.body.setAllowGravity(false);
    proj.body.gravity.y = 0;
    proj.body.setSize(380, 380);
    proj.body.setOffset(110, 110);
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

  spawnSteveUltimateTNT(caster) {
    if (!caster || !caster.sprite) return;
    const facingDir = caster.getFacingDir ? caster.getFacingDir() : (caster.sprite.flipX ? -1 : 1);
    const facingRight = facingDir === 1;
    const spawnX = caster.sprite.x + (facingRight ? 70 : -70);
    const spawnY = caster.sprite.y - 25;

    const proj = this.physics.add.sprite(spawnX, spawnY, 'steve_sheet_tnt_flight');
    this.projectiles.add(proj);
    proj.setDepth(26);
    proj.setScale(0.18);
    proj.play('steve_anim_tnt_flight');
    proj.caster = caster;
    proj.isTNT = true;
    proj.isSuper = true;
    proj.setFlipX(!facingRight);

    proj.body.allowGravity = true;
    proj.body.setAllowGravity(true);
    proj.body.gravity.y = 480;
    proj.body.setSize(380, 380);
    proj.body.setOffset(110, 110);

    const speedX = facingRight ? 700 : -700;
    proj.setVelocityX(speedX);
    proj.setVelocityY(-170);

    const startX = spawnX;
    const maxThrowDistance = 480; // Distance to throw before automatically detonating!
    let hasBlownUp = false;

    const detonate = () => {
      if (hasBlownUp) return;
      hasBlownUp = true;
      this.events.off('update', checkFlight);
      const blastX = proj.x;
      const blastY = Math.min(proj.y, 530);
      if (proj && proj.active) proj.destroy();

      // Detonate with massive explosion!
      this.spawnTNTExplosion(blastX, blastY, true);

      // Hit opponent if within blast radius (280px)
      const target = caster.playerNum === 1 ? this.fighterP2 : this.fighterP1;
      if (target && target.sprite && target.hp > 0) {
        const dist = Phaser.Math.Distance.Between(blastX, blastY, target.sprite.x, target.sprite.y);
        if (dist <= 280) {
          target.takeHit({
            damage: 260,
            knockbackX: facingRight ? 780 : -780,
            knockbackY: -580,
            isSpecial: true
          }, caster);
        }
      }
    };

    proj.detonate = detonate;

    const checkFlight = () => {
      if (!proj || !proj.active) {
        this.events.off('update', checkFlight);
        return;
      }
      const dist = Math.abs(proj.x - startX);
      if (dist >= maxThrowDistance || proj.y >= 530 || proj.x <= 70 || proj.x >= 1850) {
        detonate();
      }
    };

    this.events.on('update', checkFlight);

    this.time.delayedCall(2500, () => {
      if (!hasBlownUp) detonate();
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
    tnt.setScale(0.18);
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
    this.time.delayedCall(600, () => {
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
      const floorY = target.charId === 'zoro' ? 458.60 : (target.charId === 'strange' ? 395.80 : (target.charId === 'chunli' ? 477.04 : 476.60));
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
    const isPoundCannon = Boolean(proj.isPoundCannon);
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
      if (proj.isSuper) {
        this.spawnPsystrikeExplosion(target, caster, hitX, hitY);
        return;
      }
      this.spawnShadowBallImpact(hitX, hitY);
    } else if (isTNT) {
      if (proj.isSuper) {
        if (proj.detonate) {
          proj.detonate();
        } else {
          this.spawnTNTExplosion(hitX, hitY, true);
        }
        return;
      }
      this.spawnTNTExplosion(hitX, hitY, false);
    } else if (isMystic) {
      this.spawnShadowBallImpact(hitX, hitY);
    } else if (isPoundCannon) {
      this.spawnShadowBallImpact(hitX, hitY);
    }

    const atkData = {
      damage: isPoundCannon ? 160 : (isShadowBall ? 155 : (isTNT ? 150 : (isKikoken ? 150 : (isMystic ? 155 : 155)))),
      isSpecial: true,
      knockbackX: isPoundCannon ? 520 : (isShadowBall ? 520 : (isTNT ? 540 : (isKikoken ? 500 : (isMystic ? 480 : 500)))),
      knockbackY: isPoundCannon ? -360 : (isShadowBall ? -360 : (isTNT ? -380 : (isKikoken ? -350 : (isMystic ? -340 : -350))))
    };

    target.takeHit(atkData, caster);
    this.cameras.main.shake(250, 0.019);
    if (window.soundFX) window.soundFX.playStartBoom();
  }

  setupInputKeys() {
    // Mobile Virtual Controller Input States
    this.virtualP1 = {
      up: false, upJustDown: false,
      down: false,
      left: false, right: false,
      lightJustDown: false,
      mediumJustDown: false,
      heavyJustDown: false,
      specialJustDown: false,
      superJustDown: false,
      dashJustDown: false,
      tauntJustDown: false
    };
    this.virtualP2 = {
      up: false, upJustDown: false,
      down: false,
      left: false, right: false,
      lightJustDown: false,
      mediumJustDown: false,
      heavyJustDown: false,
      specialJustDown: false,
      superJustDown: false,
      dashJustDown: false,
      tauntJustDown: false
    };

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

    // (ESC key handled by global keydown listener for seamless canvas & DOM overlay support)
  }

  togglePauseMenu() {
    if (this.roundState === 'MATCH_OVER' || this.isGameOver) return;
    if (window.isLanMatch) return; // Disallow pausing during active LAN matches

    // If training settings modal is open, ESC closes it first
    const trainingModal = document.getElementById('trainingSettingsModal');
    if (trainingModal && (trainingModal.style.display === 'flex' || trainingModal.classList.contains('open'))) {
      this.toggleTrainingMenu(false);
      return;
    }

    if (this.isPaused) {
      this.resumeMatch();
    } else {
      this.pauseMatch();
    }
  }

  getVisiblePauseItems() {
    const pauseModal = document.getElementById('modal-pause');
    if (!pauseModal) return [];
    const items = Array.from(pauseModal.querySelectorAll('.pause-menu-item'));
    return items.filter(el => {
      return el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
    });
  }

  setPauseActiveItem(index, playSound = true) {
    const items = this.getVisiblePauseItems();
    if (items.length === 0) return;
    this.pauseActiveIndex = (index + items.length) % items.length;
    items.forEach((item, i) => {
      item.classList.toggle('active', i === this.pauseActiveIndex);
    });
    if (playSound && window.soundFX && window.soundFX.playHover) {
      window.soundFX.playHover();
    }
  }

  navigatePauseMenu(dir) {
    const items = this.getVisiblePauseItems();
    if (items.length === 0) return;
    this.setPauseActiveItem((this.pauseActiveIndex !== undefined ? this.pauseActiveIndex : 0) + dir, true);
  }

  confirmPauseMenuItem() {
    const items = this.getVisiblePauseItems();
    if (items.length === 0) return;
    const activeItem = items[this.pauseActiveIndex || 0];
    if (activeItem) {
      if (window.soundFX && window.soundFX.playSelect) {
        window.soundFX.playSelect();
      }
      activeItem.click();
    }
  }

  handleMobileInput(input) {
    // 1. If match is over, phone Enter triggers Rematch, ESC exits to menu
    if (this.roundState === 'MATCH_OVER') {
      if (!input.isDown) return;
      if (input.key === 'enter' || input.key === 'j') {
        this.restartMatch();
      } else if (input.key === 'esc') {
        if (window.exitArenaToMenu) window.exitArenaToMenu();
      }
      return;
    }

    // 2. If game is paused (ESC menu is active), phone controls the pause menu items!
    if (this.isPaused) {
      if (!input.isDown) return;

      // If Mobile Controller modal is open over pause menu
      const mobileModal = document.getElementById('modal-mobile-controller');
      if (mobileModal && mobileModal.classList.contains('open')) {
        if (input.key === 'esc' || input.key === 'enter') {
          mobileModal.classList.remove('open');
          mobileModal.style.removeProperty('display');
        }
        return;
      }

      // If Training settings modal is open
      const trainingModal = document.getElementById('trainingSettingsModal');
      if (trainingModal && (trainingModal.style.display === 'flex' || trainingModal.classList.contains('open'))) {
        if (input.key === 'esc' || input.key === 'enter') {
          this.toggleTrainingMenu(false);
        }
        return;
      }

      if (input.key === 'up') {
        this.navigatePauseMenu(-1);
      } else if (input.key === 'down') {
        this.navigatePauseMenu(1);
      } else if (input.key === 'enter' || input.key === 'j' || input.key === 'k') {
        this.confirmPauseMenuItem();
      } else if (input.key === 'esc') {
        this.resumeMatch();
      }
      return;
    }

    // 3. During active combat (5 Attacks: Light, Medium, Heavy, Special, Ultimate + Dash/Taunt):
    const v = (input.player === 1) ? this.virtualP1 : this.virtualP2;
    if (!v) return;

    if (input.key === 'esc') {
      if (input.isDown) this.togglePauseMenu();
      return;
    }

    if (input.key === 'up') {
      v.up = input.isDown;
      if (input.isDown) v.upJustDown = true;
    } else if (input.key === 'down') {
      v.down = input.isDown;
    } else if (input.key === 'left') {
      v.left = input.isDown;
    } else if (input.key === 'right') {
      v.right = input.isDown;
    } else if (input.key === 'j' || input.key === 'light' || input.key === 'f') {
      if (input.isDown) v.lightJustDown = true;
    } else if (input.key === 'k' || input.key === 'medium' || input.key === 'g') {
      if (input.isDown) v.mediumJustDown = true;
    } else if (input.key === 'l' || input.key === 'heavy' || input.key === 'h') {
      if (input.isDown) v.heavyJustDown = true;
    } else if (input.key === 'r' || input.key === 'special' || input.key === 'u') {
      if (input.isDown) v.specialJustDown = true;
    } else if (input.key === 'y' || input.key === 'super' || input.key === 'ult' || input.key === 'i') {
      if (input.isDown) v.superJustDown = true;
    } else if (input.key === 'q' || input.key === 'dash' || input.key === 'o') {
      if (input.isDown) v.dashJustDown = true;
    } else if (input.key === 't' || input.key === 'taunt' || input.key === 'p') {
      if (input.isDown) v.tauntJustDown = true;
    }
  }

  pauseMatch() {
    this.isPaused = true;
    this.physics.world.pause();

    const pauseModal = document.getElementById('modal-pause');
    if (pauseModal) {
      pauseModal.style.removeProperty('display');
      const trainingButtons = pauseModal.querySelectorAll('.pause-training-only');
      trainingButtons.forEach(btn => {
        btn.style.display = this.isTrainingMode ? 'flex' : 'none';
      });
      pauseModal.classList.add('open');

      // Set first visible item as active
      this.pauseActiveIndex = 0;
      this.setPauseActiveItem(0, false);
    }
    if (window.soundFX) window.soundFX.playSelect();
  }

  resumeMatch() {
    this.clearPauseUI();
    this.physics.world.resume();
    this.isPaused = false;
    if (window.soundFX) window.soundFX.playSelect();
  }

  clearPauseUI() {
    const pauseModal = document.getElementById('modal-pause');
    if (pauseModal) {
      pauseModal.classList.remove('open');
      pauseModal.style.removeProperty('display');
    }
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
    const p1Color = p1Id === 'dummy' ? 0x64748b : (p1Id === 'zoro' ? 0x10b981 : (p1Id === 'strange' ? 0xf59e0b : (p1Id === 'chunli' ? 0x0284c7 : (p1Id === 'mewtwo' ? 0x9333ea : (p1Id === 'steve' ? 0x0d9488 : 0x06b6d4)))));
    const p1Hex = p1Id === 'dummy' ? '#94a3b8' : (p1Id === 'zoro' ? '#34d399' : (p1Id === 'strange' ? '#f59e0b' : (p1Id === 'chunli' ? '#38bdf8' : (p1Id === 'mewtwo' ? '#c084fc' : (p1Id === 'steve' ? '#2dd4bf' : '#06b6d4')))));
    const p1PortraitKey = p1Id === 'dummy' ? 'dummy_portrait' : (p1Id === 'zoro' ? 'zoro_portrait' : (p1Id === 'strange' ? 'strange_portrait' : (p1Id === 'chunli' ? 'chunli_portrait' : (p1Id === 'mewtwo' ? 'mewtwo_portrait' : (p1Id === 'steve' ? 'steve_portrait' : 'harpy_portrait')))));
    const p1DisplayName = p1Id === 'dummy' ? 'PRACTICE DUMMY' : (p1Id === 'zoro' ? 'ZORO' : (p1Id === 'chunli' ? 'CHUN-LI' : (p1Id === 'strange' ? 'DR. STRANGE' : (p1Id === 'mewtwo' ? 'MEWTWO' : (p1Id === 'steve' ? 'STEVE' : 'HARPY')))));

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

    // --- PLAYER 1 KI METER (3 Distinct Sections, 100 Ki each, y = 104) ---
    this.p1KiText = this.add.text(125, 104, 'KI', {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '15px',
      color: '#38bdf8'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

    // Slot 1 (0..100 Ki)
    this.p1KiBg1 = this.add.rectangle(137, 104, 106, 11, 0x18181b, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p1KiFill1 = this.add.rectangle(138, 104, 0, 9, 0x06b6d4).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Slot 2 (100..200 Ki)
    this.p1KiBg2 = this.add.rectangle(247, 104, 106, 11, 0x18181b, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p1KiFill2 = this.add.rectangle(248, 104, 0, 9, 0xf59e0b).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Slot 3 (200..300 Ki)
    this.p1KiBg3 = this.add.rectangle(357, 104, 106, 11, 0x18181b, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p1KiFill3 = this.add.rectangle(358, 104, 0, 9, 0xd946ef).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // Slot badges / numerals
    this.add.text(190, 104, 'I', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.add.text(300, 104, 'II', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.add.text(410, 104, 'III', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.p1KiStockText = this.add.text(468, 104, '1 / 3', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#e4e4e7',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    // --- PLAYER 2 HUD (Right) ---
    const p2Color = p2Id === 'dummy' ? 0x64748b : (p2Id === 'zoro' ? 0x10b981 : (p2Id === 'strange' ? 0xf59e0b : (p2Id === 'chunli' ? 0x0284c7 : (p2Id === 'mewtwo' ? 0x9333ea : (p2Id === 'steve' ? 0x0d9488 : 0x06b6d4)))));
    const p2Hex = p2Id === 'dummy' ? '#94a3b8' : (p2Id === 'zoro' ? '#34d399' : (p2Id === 'strange' ? '#f59e0b' : (p2Id === 'chunli' ? '#38bdf8' : (p2Id === 'mewtwo' ? '#c084fc' : (p2Id === 'steve' ? '#2dd4bf' : '#06b6d4')))));
    const p2PortraitKey = p2Id === 'dummy' ? 'dummy_portrait' : (p2Id === 'zoro' ? 'zoro_portrait' : (p2Id === 'strange' ? 'strange_portrait' : (p2Id === 'chunli' ? 'chunli_portrait' : (p2Id === 'mewtwo' ? 'mewtwo_portrait' : (p2Id === 'steve' ? 'steve_portrait' : 'harpy_portrait')))));
    const p2DisplayName = p2Id === 'dummy' ? 'PRACTICE DUMMY' : (p2Id === 'zoro' ? 'ZORO' : (p2Id === 'chunli' ? 'CHUN-LI' : (p2Id === 'strange' ? 'DR. STRANGE' : (p2Id === 'mewtwo' ? 'MEWTWO' : (p2Id === 'steve' ? 'STEVE' : 'HARPY')))));

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

    // --- PLAYER 2 KI METER (3 Distinct Sections, 100 Ki each, y = 104) ---
    this.p2KiText = this.add.text(1156, 104, 'KI', {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '14px',
      color: '#38bdf8'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);

    // Slot 1 (0..100 Ki, rightmost)
    this.p2KiBg1 = this.add.rectangle(1143, 104, 106, 11, 0x18181b, 0.9).setOrigin(1, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p2KiFill1 = this.add.rectangle(1142, 104, 0, 9, 0x06b6d4).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // Slot 2 (100..200 Ki)
    this.p2KiBg2 = this.add.rectangle(1033, 104, 106, 11, 0x18181b, 0.9).setOrigin(1, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p2KiFill2 = this.add.rectangle(1032, 104, 0, 9, 0xf59e0b).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // Slot 3 (200..300 Ki, innermost)
    this.p2KiBg3 = this.add.rectangle(923, 104, 106, 11, 0x18181b, 0.9).setOrigin(1, 0.5).setStrokeStyle(1, 0x3f3f46).setScrollFactor(0).setDepth(100);
    this.p2KiFill3 = this.add.rectangle(922, 104, 0, 9, 0xd946ef).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // Slot badges / numerals
    this.add.text(1090, 104, 'I', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.add.text(980, 104, 'II', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);
    this.add.text(870, 104, 'III', { fontFamily: 'Rajdhani', fontSize: '9px', color: '#71717a' }).setOrigin(0.5).setScrollFactor(0).setDepth(102);

    this.p2KiStockText = this.add.text(812, 104, '1 / 3', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '11px',
      color: '#e4e4e7',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(100);

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

    this.add.text(640, 663, 'P1 [WASD/SPACE]: Move/Jump | [F] Light (+Ki) | [G] Med (+Ki) | [H] Heavy Sp. (2 Ki) | [R] Special (1 Ki) | [S+H / Y] Super (3 Ki)', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#a5f3fc',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.add.text(640, 686, 'P2 [ARROWS]: Move/Jump | [J/NUM1] Light (+Ki) | [K/NUM2] Med (+Ki) | [L/NUM3] Heavy Sp. (2 Ki) | [U/NUM4] Special (1 Ki) | [↓+L / I] Super (3 Ki)', {
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
      unlimitedHealth: true,      // Enabled by default so Robo has infinite health!
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

    const p1FillW = Math.max(0, 326 * p1Ratio);
    const p2FillW = Math.max(0, 326 * p2Ratio);
    this.p1BarFill.setVisible(p1Ratio > 0);
    this.p2BarFill.setVisible(p2Ratio > 0);
    if (p1Ratio > 0) this.p1BarFill.setSize(p1FillW, 12);
    if (p2Ratio > 0) this.p2BarFill.setSize(p2FillW, 12);

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

    // --- Update Ki Meter Sections & Stocks ---
    if (this.p1KiFill1 && this.p1KiFill2 && this.p1KiFill3 && this.fighterP1) {
      const p1Ki = this.fighterP1.ki;
      const s1 = Math.min(100, Math.max(0, p1Ki));
      const s2 = Math.min(100, Math.max(0, p1Ki - 100));
      const s3 = Math.min(100, Math.max(0, p1Ki - 200));

      const w1 = (s1 / 100) * 104;
      const w2 = (s2 / 100) * 104;
      const w3 = (s3 / 100) * 104;

      this.p1KiFill1.setVisible(s1 > 0);
      if (s1 > 0) this.p1KiFill1.setSize(w1, 9);

      this.p1KiFill2.setVisible(s2 > 0);
      if (s2 > 0) this.p1KiFill2.setSize(w2, 9);

      this.p1KiFill3.setVisible(s3 > 0);
      if (s3 > 0) this.p1KiFill3.setSize(w3, 9);

      if (this.p1KiBg1) this.p1KiBg1.setStrokeStyle(1, s1 >= 100 ? 0x38bdf8 : 0x3f3f46);
      if (this.p1KiBg2) this.p1KiBg2.setStrokeStyle(1, s2 >= 100 ? 0xfbbf24 : 0x3f3f46);
      if (this.p1KiBg3) this.p1KiBg3.setStrokeStyle(1, s3 >= 100 ? 0xf43f5e : 0x3f3f46);

      const p1Sections = Math.floor(p1Ki / 100);
      if (this.p1KiStockText) {
        if (p1Ki >= 300) {
          this.p1KiStockText.setText('MAX (3/3)');
          this.p1KiStockText.setColor('#f43f5e');
        } else {
          this.p1KiStockText.setText(`${p1Sections} / 3`);
          this.p1KiStockText.setColor('#e4e4e7');
        }
      }
    }

    if (this.p2KiFill1 && this.p2KiFill2 && this.p2KiFill3 && this.fighterP2) {
      const p2Ki = this.fighterP2.ki;
      const s1 = Math.min(100, Math.max(0, p2Ki));
      const s2 = Math.min(100, Math.max(0, p2Ki - 100));
      const s3 = Math.min(100, Math.max(0, p2Ki - 200));

      const w1 = (s1 / 100) * 104;
      const w2 = (s2 / 100) * 104;
      const w3 = (s3 / 100) * 104;

      this.p2KiFill1.setVisible(s1 > 0);
      if (s1 > 0) this.p2KiFill1.setSize(w1, 9);

      this.p2KiFill2.setVisible(s2 > 0);
      if (s2 > 0) this.p2KiFill2.setSize(w2, 9);

      this.p2KiFill3.setVisible(s3 > 0);
      if (s3 > 0) this.p2KiFill3.setSize(w3, 9);

      if (this.p2KiBg1) this.p2KiBg1.setStrokeStyle(1, s1 >= 100 ? 0x38bdf8 : 0x3f3f46);
      if (this.p2KiBg2) this.p2KiBg2.setStrokeStyle(1, s2 >= 100 ? 0xfbbf24 : 0x3f3f46);
      if (this.p2KiBg3) this.p2KiBg3.setStrokeStyle(1, s3 >= 100 ? 0xf43f5e : 0x3f3f46);

      const p2Sections = Math.floor(p2Ki / 100);
      if (this.p2KiStockText) {
        if (p2Ki >= 300) {
          this.p2KiStockText.setText('MAX (3/3)');
          this.p2KiStockText.setColor('#f43f5e');
        } else {
          this.p2KiStockText.setText(`${p2Sections} / 3`);
          this.p2KiStockText.setColor('#e4e4e7');
        }
      }
    }
  }

  showKiDeniedAlert(fighter, sectionsNeeded) {
    if (!fighter || !fighter.sprite) return;
    const isP1 = fighter.playerNum === 1;
    const textX = fighter.sprite.x;
    const textY = fighter.sprite.y - 120;

    const costLabel = sectionsNeeded === 1 ? '1 KI BAR' : (sectionsNeeded === 2 ? '2 KI BARS' : '3 KI BARS (MAX)');
    const alertText = this.add.text(textX, textY, `NEED ${costLabel}!`, {
      fontFamily: 'Bebas Neue, Rajdhani, sans-serif',
      fontSize: '24px',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: alertText,
      y: textY - 50,
      alpha: 0,
      duration: 750,
      ease: 'Power1',
      onComplete: () => alertText.destroy()
    });

    // Flash the player's Ki bar borders red
    const bgs = isP1 ? [this.p1KiBg1, this.p1KiBg2, this.p1KiBg3] : [this.p2KiBg1, this.p2KiBg2, this.p2KiBg3];
    bgs.forEach(bg => {
      if (bg) {
        bg.setStrokeStyle(2, 0xef4444);
        this.time.delayedCall(280, () => {
          if (bg && bg.active) bg.setStrokeStyle(1, 0x3f3f46);
        });
      }
    });

    if (window.soundFX) {
      if (window.soundFX.playDenied) {
        window.soundFX.playDenied();
      } else if (window.soundFX.playSelect) {
        window.soundFX.playSelect();
      }
    }
  }

  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.roundState = 'INTRO';
    this.roundTimer = this.roundDurationSec;
    this.timerRemainingMs = this.roundDurationSec * 1000;
    this.clearBanners();

    // Reset fighters to initial fighting marks in 1920-wide arena (reset Ki on Round 1)
    this.fighterP1.reset(550, 460, roundNumber === 1);
    this.fighterP2.reset(1370, 460, roundNumber === 1);

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

    // Dynamically scale AI difficulty per Arcade Floor
    if (window.arcadeStage === 2) {
      window.cpuDifficulty = 'MEDIUM';
    } else if (window.arcadeStage === 3) {
      window.cpuDifficulty = 'HARD';
    } else {
      window.cpuDifficulty = 'APEX';
    }

    // Pick a fresh random opponent from ROSTER_KEYS that isn't P1 and isn't the previous opponent
    const roster = ['harpy', 'strange', 'chunli', 'mewtwo', 'steve', 'zoro'];
    const p1 = window.selectedFighterP1 || 'harpy';
    const lastOpponent = this.fighterP2 ? this.fighterP2.charId : '';
    const pool = roster.filter(k => k !== p1 && k !== lastOpponent);
    const available = pool.length > 0 ? pool : roster.filter(k => k !== p1);
    const nextOpponent = available[Math.floor(Math.random() * available.length)] || 'strange';
    const nextStage = (Math.random() < 0.5) ? 'sky_temple' : 'japanese_temple';

    window.selectedFighterP2 = nextOpponent;
    window.selectedStage = nextStage;

    if (window.startMatchWithLoadingScreen) {
      window.startMatchWithLoadingScreen({
        p1Char: window.selectedFighterP1,
        p2Char: nextOpponent,
        stage: nextStage,
        isArcade: true,
        isCpu: true,
        difficulty: window.cpuDifficulty
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
    // Broadcast rematch over LAN if Host
    if (window.isLanMatch && window.lanManager && window.lanManager.isConnected) {
      if (window.lanManager.role === 'HOST') {
        window.lanManager.send('REMATCH');
      }
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

        // Training Mode: Robo always has infinite health!
        if (this.fighterP2) {
          this.fighterP2.hp = this.fighterP2.maxHp;
        }
        if (this.trainingSettings && this.trainingSettings.unlimitedHealth && this.fighterP1) {
          this.fighterP1.hp = this.fighterP1.maxHp;
        }

        // Infinite Power: Gamer can use their power any number of times with no cooldown!
        if (this.fighterP1) {
          this.fighterP1.ki = this.fighterP1.maxKi;
          this.fighterP1.superMeter = 100;
        }
        if (this.fighterP2) {
          this.fighterP2.ki = this.fighterP2.maxKi;
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

      // Passive Ki Energy charge over time (~6 Ki / second)
      const kiGain = (delta / 1000) * 6;
      if (this.fighterP1) this.fighterP1.addKi(kiGain);
      if (this.fighterP2) this.fighterP2.addKi(kiGain);
    }

    // --- PLAYER 1 INPUT (WASD / Space / F / G / H / R / Y / Q / T + Mobile Virtual Controller) ---
    const vp1 = this.virtualP1 || {};
    const p1Up = this.p1Keys.w.isDown || this.p1Keys.space.isDown || vp1.up;
    const p1UpJustDown = Phaser.Input.Keyboard.JustDown(this.p1Keys.w) || Phaser.Input.Keyboard.JustDown(this.p1Keys.space) || vp1.upJustDown;
    const p1Left = this.p1Keys.a.isDown || vp1.left;
    const p1Right = this.p1Keys.d.isDown || vp1.right;
    const p1Down = this.p1Keys.s.isDown || vp1.down;

    let p1Input = {
      up: p1Up,
      upJustDown: p1UpJustDown,
      down: p1Down,
      left: p1Left,
      right: p1Right,
      isHoldingForward: this.fighterP1.getFacingDir() === 1 ? p1Right : p1Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.f) || vp1.lightJustDown,
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.g) || vp1.mediumJustDown,
      heavyJustDown: (!p1Down && Phaser.Input.Keyboard.JustDown(this.p1Keys.h)) || vp1.heavyJustDown,
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.r) || vp1.specialJustDown,
      superJustDown: (p1Down && Phaser.Input.Keyboard.JustDown(this.p1Keys.h)) || Phaser.Input.Keyboard.JustDown(this.p1Keys.y) || vp1.superJustDown,
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.q) || vp1.dashJustDown,
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.t) || vp1.tauntJustDown
    };

    // Reset single-frame mobile P1 triggers
    if (this.virtualP1) {
      this.virtualP1.upJustDown = false;
      this.virtualP1.lightJustDown = false;
      this.virtualP1.mediumJustDown = false;
      this.virtualP1.heavyJustDown = false;
      this.virtualP1.specialJustDown = false;
      this.virtualP1.superJustDown = false;
      this.virtualP1.dashJustDown = false;
      this.virtualP1.tauntJustDown = false;
    }

    // --- PLAYER 2 INPUT (Arrows / J / K / L / U / I / O / P / Numpad / Number Row + Mobile Virtual Controller) ---
    const vp2 = this.virtualP2 || {};
    const p2Up = this.p2Keys.up.isDown || vp2.up;
    const p2UpJustDown = Phaser.Input.Keyboard.JustDown(this.p2Keys.up) || vp2.upJustDown;
    const p2Left = this.p2Keys.left.isDown || vp2.left;
    const p2Right = this.p2Keys.right.isDown || vp2.right;
    const p2Down = this.p2Keys.down.isDown || vp2.down;

    let p2Input = {
      up: p2Up,
      upJustDown: p2UpJustDown,
      down: p2Down,
      left: p2Left,
      right: p2Right,
      isHoldingForward: this.fighterP2.getFacingDir() === 1 ? p2Right : p2Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.j) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num1) || (this.p2Keys.one && Phaser.Input.Keyboard.JustDown(this.p2Keys.one)) || vp2.lightJustDown,
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.k) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num2) || (this.p2Keys.two && Phaser.Input.Keyboard.JustDown(this.p2Keys.two)) || vp2.mediumJustDown,
      heavyJustDown: (!p2Down && (Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3) || (this.p2Keys.three && Phaser.Input.Keyboard.JustDown(this.p2Keys.three)))) || vp2.heavyJustDown,
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.u) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num4) || (this.p2Keys.four && Phaser.Input.Keyboard.JustDown(this.p2Keys.four)) || vp2.specialJustDown,
      superJustDown: (p2Down && (Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3) || (this.p2Keys.three && Phaser.Input.Keyboard.JustDown(this.p2Keys.three)))) || Phaser.Input.Keyboard.JustDown(this.p2Keys.i) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num5) || (this.p2Keys.five && Phaser.Input.Keyboard.JustDown(this.p2Keys.five)) || vp2.superJustDown,
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.o) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num0) || (this.p2Keys.zero && Phaser.Input.Keyboard.JustDown(this.p2Keys.zero)) || vp2.dashJustDown,
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.p) || vp2.tauntJustDown
    };

    // Reset single-frame mobile P2 triggers
    if (this.virtualP2) {
      this.virtualP2.upJustDown = false;
      this.virtualP2.lightJustDown = false;
      this.virtualP2.mediumJustDown = false;
      this.virtualP2.heavyJustDown = false;
      this.virtualP2.specialJustDown = false;
      this.virtualP2.superJustDown = false;
      this.virtualP2.dashJustDown = false;
      this.virtualP2.tauntJustDown = false;
    }

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
            p1: { x: this.fighterP1.sprite.x, y: this.fighterP1.sprite.y, hp: this.fighterP1.hp, ki: this.fighterP1.ki },
            p2: { x: this.fighterP2.sprite.x, y: this.fighterP2.sprite.y, hp: this.fighterP2.hp, ki: this.fighterP2.ki },
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
          if (sync.p1 && sync.p1.ki !== undefined) this.fighterP1.ki = sync.p1.ki;
          if (sync.p2 && sync.p2.ki !== undefined) this.fighterP2.ki = sync.p2.ki;
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
  if (arenaUI) arenaUI.style.display = 'none'; // Arena remains clean; all controls in ESC pause overlay
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
  console.log('[Game] Exiting arena to main menu...');
  if (window.hideLoadingScreen) window.hideLoadingScreen();

  // 1. Properly stop and clean up the active Phaser ArenaScene
  if (window.activeArenaScene) {
    try {
      if (window.activeArenaScene.clearPauseUI) {
        window.activeArenaScene.clearPauseUI();
      }
      if (window.activeArenaScene.cleanupMewtwoChargeVFX) {
        window.activeArenaScene.cleanupMewtwoChargeVFX(window.activeArenaScene.fighterP1);
        window.activeArenaScene.cleanupMewtwoChargeVFX(window.activeArenaScene.fighterP2);
      }
      window.activeArenaScene.isPaused = false;
    } catch (e) {
      console.warn('[Exit] Error clearing scene state:', e);
    }
  }

  if (window.phaserGameInstance) {
    try {
      window.phaserGameInstance.scene.stop('ArenaScene');
    } catch (e) {
      console.warn('[Exit] Error stopping ArenaScene:', e);
    }
  }
  window.activeArenaScene = null;

  // 2. Hide Phaser container and battle UI overlays
  const container = document.getElementById('phaser-container');
  if (container) {
    container.style.display = 'none';
  }
  const arenaUI = document.getElementById('arenaControlBar');
  if (arenaUI) {
    arenaUI.style.display = 'none';
  }
  const inputHistory = document.getElementById('trainingInputHistory');
  if (inputHistory) {
    inputHistory.style.display = 'none';
  }
  const attackData = document.getElementById('trainingAttackData');
  if (attackData) {
    attackData.style.display = 'none';
  }

  // 3. Close ALL modals (Pause, Training Settings, Character Select, etc.)
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('open');
    modal.style.removeProperty('display');
  });

  const trainingModal = document.getElementById('trainingSettingsModal');
  if (trainingModal) {
    trainingModal.classList.remove('open');
    trainingModal.style.display = 'none';
  }
  const pauseModal = document.getElementById('modal-pause');
  if (pauseModal) {
    pauseModal.classList.remove('open');
    pauseModal.style.removeProperty('display');
  }

  // 4. Fully restore Main Menu visibility and responsiveness
  const menuWrapper = document.getElementById('menuWrapper');
  if (menuWrapper) {
    menuWrapper.classList.remove('menu-hidden');
    menuWrapper.style.removeProperty('display');
    menuWrapper.style.removeProperty('visibility');
    menuWrapper.style.removeProperty('opacity');
    menuWrapper.style.removeProperty('pointer-events');
  }

  // 5. Reset match flags
  window.isTrainingMode = false;
  window.isTrainingModeSelected = false;
  window.isCpuMatch = false;
  window.isArcadeMode = false;

  // 6. Set cooldown to prevent accidental immediate re-entry from held keys
  window.menuInputCooldown = Date.now() + 400;

  // 7. Reset and highlight main menu selection
  if (typeof window.resetMainMenuSelection === 'function') {
    window.resetMainMenuSelection();
  } else {
    const items = document.querySelectorAll('.temple-menu .menu-item');
    items.forEach((item, i) => item.classList.toggle('active', i === 0));
  }

  // 8. Focus window so main menu keyboard navigation works immediately
  window.focus();
  if (typeof closeAllModals === 'function') {
    closeAllModals();
  }
  if (window.soundFX && window.soundFX.playSelect) {
    window.soundFX.playSelect();
  }
};

window.restartMatch = function () {
  if (window.activeArenaScene) {
    window.activeArenaScene.restartMatch();
  } else if (window.startPhaserArena) {
    window.startPhaserArena();
  }
};

// --------------------------------------------------------------------------
// In-Game ESC Pause Menu Listeners
// --------------------------------------------------------------------------
(function setupPauseModalListeners() {
  const attach = () => {
    const btnResume = document.getElementById('btnResumeMatch');
    const btnRestart = document.getElementById('btnRestartMatch');
    const btnExit = document.getElementById('btnExitToMenu');
    const btnTraining = document.getElementById('btnPauseTrainingSettings');
    const btnResetPos = document.getElementById('btnPauseResetPositions');
    const btnHitboxes = document.getElementById('btnPauseToggleHitboxes');
    const btnMobile = document.getElementById('btnPauseMobileCtrl');
    if (btnMobile) {
      btnMobile.onclick = () => {
        if (window.openMobileControllerModal) {
          window.openMobileControllerModal();
        }
      };
    }

    // Connect mouse hover sync for pause menu items
    document.querySelectorAll('.pause-menu-item').forEach((item) => {
      item.addEventListener('mouseenter', () => {
        if (window.activeArenaScene && window.activeArenaScene.isPaused) {
          const visible = window.activeArenaScene.getVisiblePauseItems();
          const idx = visible.indexOf(item);
          if (idx !== -1) {
            window.activeArenaScene.setPauseActiveItem(idx, true);
          }
        }
      });
    });

    if (btnResume) {
      btnResume.onclick = () => {
        if (window.activeArenaScene) window.activeArenaScene.resumeMatch();
      };
    }
    if (btnRestart) {
      btnRestart.onclick = () => {
        if (window.activeArenaScene) {
          window.activeArenaScene.clearPauseUI();
          window.activeArenaScene.restartMatch();
        } else if (window.restartMatch) {
          window.restartMatch();
        }
      };
    }
    if (btnTraining) {
      btnTraining.onclick = () => {
        if (window.activeArenaScene) {
          window.activeArenaScene.toggleTrainingMenu();
        }
      };
    }
    if (btnResetPos) {
      btnResetPos.onclick = () => {
        if (window.activeArenaScene) {
          window.activeArenaScene.resetPositions('CENTER');
          window.activeArenaScene.resumeMatch();
        }
      };
    }
    if (btnHitboxes) {
      btnHitboxes.onclick = () => {
        if (window.activeArenaScene) {
          window.activeArenaScene.toggleHitboxes();
        }
      };
    }
    if (btnExit) {
      btnExit.onclick = () => {
        if (window.activeArenaScene) window.activeArenaScene.clearPauseUI();
        if (window.exitArenaToMenu) window.exitArenaToMenu();
        else window.location.reload();
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
