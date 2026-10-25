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

    this.hp = charId === 'harpy' ? 920 : 1000;
    this.maxHp = this.hp;

    // Movement speeds & Jump velocity
    this.walkSpeed = charId === 'harpy' ? 260 : 230;
    this.dashSpeed = charId === 'harpy' ? 490 : 400;
    this.jumpVel = charId === 'harpy' ? -760 : -660;

    // Create sprite (scaled to 0.25 for clean 2D fighting game screen proportions)
    const initialTexture = charId === 'harpy' ? 'harpy_sheet_idle' : 'kharon_sprite';
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setScale(0.25);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(340, 800);
    this.sprite.body.setOffset(370, 240);

    // Initial orientation:
    // P1 (Left side) faces RIGHT towards P2 -> setFlipX(true)
    // P2 (Right side) faces LEFT towards P1 -> setFlipX(false)
    if (playerNum === 1) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
      if (isMirror) {
        this.sprite.setTint(0xc4b5fd);
      }
    }

    if (charId === 'harpy') {
      this.sprite.play('harpy_anim_idle');
    }

    // Animation completion listener
    this.sprite.on('animationcomplete', (anim) => {
      this.onAnimationComplete(anim.key);
    });
  }

  onAnimationComplete(key) {
    if (key.startsWith('harpy_anim_atk_') || 
        key.startsWith('harpy_anim_sp_') || 
        key === 'harpy_anim_taunt' || 
        key === 'harpy_anim_dash' || 
        key === 'harpy_anim_backdash') {
      this.isAttacking = false;
      this.currentAttackData = null;
      this.updateTextureForState();
    } else if (key === 'harpy_anim_knockback') {
      this.isKnockedBack = false;
      this.updateTextureForState();
    }
  }

  updateTextureForState() {
    if (this.charId !== 'harpy') return;

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
      this.currentAction = 'IDLE';
      this.sprite.setTexture('harpy_sheet_idle');
      this.sprite.play('harpy_anim_idle', true);
    }
  }

  triggerAttack(actionKey, animKey, attackData) {
    if (this.isAttacking || this.isKnockedBack || this.hp <= 0) return;
    this.isAttacking = true;
    this.hasDealtDamage = false;
    this.currentAttackData = attackData;
    this.currentAction = actionKey;

    if (this.charId === 'harpy') {
      this.sprite.play(animKey, true);
    } else {
      // Kharon flash attack visual
      this.sprite.setTint(0xff8844);
      this.scene.time.delayedCall(220, () => {
        this.isAttacking = false;
        this.currentAttackData = null;
        if (this.isMirror) this.sprite.setTint(0xc4b5fd);
        else this.sprite.clearTint();
        this.currentAction = 'IDLE';
      });
    }

    if (window.soundFX) window.soundFX.playSelect();
  }

  takeHit(attackData, attacker) {
    if (this.hp <= 0) return;

    // Apply Damage
    this.hp = Math.max(0, this.hp - attackData.damage);

    // Spawn floating damage text (adjusted for 0.25 character scale)
    this.scene.spawnDamageNumber(this.sprite.x, this.sprite.y - 95, attackData.damage, attackData.isSpecial);

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
    const pushDir = this.sprite.x >= attacker.sprite.x ? 1 : -1;

    // REQUIREMENT: Use Sheet8C for Harpy as knockback on special attack!
    if (attackData.isSpecial) {
      this.isAttacking = false;
      this.isKnockedBack = true;
      this.isInAir = true;
      this.currentAction = 'KNOCKBACK / LAUNCH';

      this.sprite.setVelocityX(pushDir * (attackData.knockbackX || 560));
      this.sprite.setVelocityY(attackData.knockbackY || -480);

      if (this.charId === 'harpy') {
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
    }
  }

  handleControls(input) {
    if (this.hp <= 0) {
      this.currentAction = 'DEFEATED (K.O.)';
      this.sprite.setVelocityX(0);
      return;
    }

    // Ground Check:
    const onGround = Boolean(
      this.sprite.body.blocked.down || 
      this.sprite.body.touching.down || 
      Math.abs(this.sprite.body.velocity.y) < 15
    );

    // Landing detection
    if (onGround && (this.isInAir || this.isKnockedBack)) {
      this.isInAir = false;
      this.isKnockedBack = false;
      this.isAttacking = false;
      this.currentAttackData = null;
      this.updateTextureForState();
    } else if (!onGround) {
      this.isInAir = true;
    }

    // If knocked back through the air, allow momentum to play out
    if (this.isKnockedBack) return;

    // 1. Attacks (Ground & Air)
    if (input.lightJustDown) {
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
      return;
    }

    if (input.mediumJustDown) {
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
      return;
    }

    if (input.heavyJustDown) {
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
      return;
    }

    // Special Attack -> Triggers Heavy Knockback using Sheet8C!
    if (input.specialJustDown) {
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
      return;
    }

    // Super Move -> Massive Knockback!
    if (input.superJustDown) {
      this.triggerAttack('FEATHER STORM (SUPER)', 'harpy_anim_super', {
        damage: 240,
        rangeX: 290,
        rangeY: 180,
        knockbackX: 680,
        knockbackY: -540,
        isSpecial: true
      });
      return;
    }

    if (input.tauntJustDown && onGround) {
      this.triggerAttack('TAUNT', 'harpy_anim_taunt', null);
      return;
    }

    // 2. Dash & Backdash
    if (input.dashJustDown && onGround && !this.isAttacking) {
      this.triggerAttack('FORWARD DASH', 'harpy_anim_dash', null);
      this.sprite.setVelocityX(this.sprite.flipX ? this.dashSpeed : -this.dashSpeed);
      return;
    }

    if (this.isAttacking) return;

    // 3. Jump Input
    if (input.upJustDown || (input.up && onGround)) {
      if (onGround) {
        this.sprite.setVelocityY(this.jumpVel);
        this.isInAir = true;
        this.currentAction = 'JUMP / ASCENT';
        if (this.charId === 'harpy') {
          this.sprite.setTexture('harpy_sheet_jump');
          this.sprite.play('harpy_anim_jump', true);
        }
        if (window.soundFX) window.soundFX.playHover();
      }
    }

    // 4. Ground & Air Movement
    const airFactor = this.isInAir ? 0.9 : 1.0;

    if (input.left) {
      this.sprite.setVelocityX(-this.walkSpeed * airFactor);
      this.sprite.setFlipX(false); // Faces LEFT
      if (onGround && !input.up) {
        this.currentAction = 'WALK LEFT';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_walk', true);
      }
    } else if (input.right) {
      this.sprite.setVelocityX(this.walkSpeed * airFactor);
      this.sprite.setFlipX(true); // Faces RIGHT
      if (onGround && !input.up) {
        this.currentAction = 'WALK RIGHT';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_walk', true);
      }
    } else {
      if (onGround) {
        this.sprite.setVelocityX(0);
      }
    }

    // 5. Crouch & Idle
    if (onGround) {
      if (input.down) {
        this.sprite.setVelocityX(0);
        this.currentAction = 'CROUCH';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_crouch', true);
      } else if (!input.left && !input.right && !input.up && !this.isInAir) {
        this.currentAction = 'IDLE';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_idle', true);
      }
    } else {
      this.currentAction = this.sprite.body.velocity.y < 0 ? 'JUMP / ASCENT' : 'AIR FALL';
      if (this.charId === 'harpy' && this.sprite.anims.currentAnim?.key !== 'harpy_anim_jump') {
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
  }

  preload() {
    // 1. Doctor Strange Mirror Dimension Background
    this.load.image('arena_bg', 'assets/mirror_dimension.png');
    this.load.image('harpy_portrait', '../../assets/characters/harpy/portrait.png');
    this.load.image('kharon_portrait', '../../assets/characters/kharon/portrait.png');
    this.load.image('kharon_sprite', '../../assets/characters/kharon/portrait.png');

    // 2. Harpy Sprite Sheets
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
  }

  create() {
    this.isGameOver = false;

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

    // 4. Resolve selected fighters
    const p1Char = window.selectedFighterP1 || 'harpy';
    const p2Char = window.selectedFighterP2 || 'kharon';
    const isMirror = p1Char === p2Char;

    // Spawn Player 1 (Left side, faces right)
    this.fighterP1 = new FighterEntity(this, 320, 460, p1Char, 1, false);

    // Spawn Player 2 (Right side, faces left)
    this.fighterP2 = new FighterEntity(this, 960, 460, p2Char, 2, isMirror);

    // Solid pushbox collider between fighters
    this.physics.add.collider(this.fighterP1.sprite, this.fighterP2.sprite);

    // 5. Input Keys
    this.setupInputKeys();

    // 6. Visual HUD
    this.buildDualPlayerHUD(p1Char, p2Char);
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
    defineAnim('harpy_anim_crouch', 'harpy_sheet_crouch', 0, 9, 14, 0);
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

    // PLAYER 2: Arrow Keys / J / K / L / U / I / O / P / Numpad
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
      num0: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ZERO
    });

    this.p1Keys.esc.on('down', () => {
      if (window.exitArenaToMenu) window.exitArenaToMenu();
    });
  }

  buildDualPlayerHUD(p1Id, p2Id) {
    // --- PLAYER 1 HUD (Left) ---
    const p1Color = p1Id === 'harpy' ? 0x06b6d4 : 0xdc2626;
    const p1Hex = p1Id === 'harpy' ? '#06b6d4' : '#ef4444';
    const p1PortraitKey = p1Id === 'harpy' ? 'harpy_portrait' : 'kharon_portrait';

    const p1Card = this.add.rectangle(75, 60, 72, 72, p1Color, 0.4);
    p1Card.setStrokeStyle(2, p1Color);
    const p1Img = this.add.image(75, 60, p1PortraitKey);
    p1Img.setDisplaySize(68, 68);

    this.p1Name = this.add.text(125, 34, `P1: ${p1Id.toUpperCase()}`, {
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
    const p2Color = p2Id === 'harpy' ? 0x06b6d4 : 0xdc2626;
    const p2Hex = p2Id === 'harpy' ? '#06b6d4' : '#ef4444';
    const p2PortraitKey = p2Id === 'harpy' ? 'harpy_portrait' : 'kharon_portrait';

    const p2Card = this.add.rectangle(1205, 60, 72, 72, p2Color, 0.4);
    p2Card.setStrokeStyle(2, p2Color);
    const p2Img = this.add.image(1205, 60, p2PortraitKey);
    p2Img.setDisplaySize(68, 68);

    this.p2Name = this.add.text(1155, 34, `P2: ${p2Id.toUpperCase()}`, {
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
    this.add.text(640, 28, '🔮 MIRROR DIMENSION 🔮', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fde047'
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
    if (!attacker.isAttacking || attacker.hasDealtDamage || !attacker.currentAttackData) {
      return;
    }

    const atkData = attacker.currentAttackData;
    const aSprite = attacker.sprite;
    const dSprite = defender.sprite;

    const dx = dSprite.x - aSprite.x;
    const dy = Math.abs(dSprite.y - aSprite.y);

    // Verify attacker is facing towards defender
    const facingRight = aSprite.flipX === true;
    const isInFront = (facingRight && dx > -20 && dx <= atkData.rangeX) ||
                      (!facingRight && dx < 20 && dx >= -atkData.rangeX);

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
    const p1Ratio = Math.max(0, this.fighterP1.hp / this.fighterP1.maxHp);
    const p2Ratio = Math.max(0, this.fighterP2.hp / this.fighterP2.maxHp);

    this.p1BarFill.width = 326 * p1Ratio;
    this.p2BarFill.width = 326 * p2Ratio;

    this.p1HpText.setText(`${this.fighterP1.hp} / ${this.fighterP1.maxHp}`);
    this.p2HpText.setText(`${this.fighterP2.hp} / ${this.fighterP2.maxHp}`);

    if (p1Ratio < 0.25) this.p1BarFill.fillColor = 0xef4444;
    if (p2Ratio < 0.25) this.p2BarFill.fillColor = 0xef4444;

    this.p1ActionText.setText(`ACTION: ${this.fighterP1.currentAction}`);
    this.p2ActionText.setText(`ACTION: ${this.fighterP2.currentAction}`);

    // Check K.O.
    if (!this.isGameOver) {
      if (this.fighterP1.hp <= 0) {
        this.triggerKO('PLAYER 2');
      } else if (this.fighterP2.hp <= 0) {
        this.triggerKO('PLAYER 1');
      }
    }
  }

  triggerKO(winnerName) {
    this.isGameOver = true;
    if (window.soundFX) window.soundFX.playStartBoom();

    this.cameras.main.shake(500, 0.02);

    const koBanner = this.add.text(640, 260, 'K.O.', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '84px',
      fontStyle: 'bold',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0);

    const winText = this.add.text(640, 350, `${winnerName} VICTORIOUS!`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setAlpha(0);

    const subText = this.add.text(640, 400, 'PRESS [ESC] TO RETURN TO THE ALTAR', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: koBanner,
      scale: 1,
      duration: 600,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({ targets: [winText, subText], alpha: 1, duration: 400 });
      }
    });
  }

  update() {
    if (!this.fighterP1 || !this.fighterP2) return;

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
      isHoldingForward: this.fighterP1.sprite.flipX ? p1Right : p1Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.f),
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.g),
      heavyJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.h),
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.r),
      superJustDown: (p1Down && Phaser.Input.Keyboard.JustDown(this.p1Keys.h)) || Phaser.Input.Keyboard.JustDown(this.p1Keys.y),
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.q),
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.t)
    };

    // --- PLAYER 2 INPUT (Arrows / J / K / L / U / I / O / P / Numpad) ---
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
      isHoldingForward: this.fighterP2.sprite.flipX ? p2Right : p2Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.j) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num1),
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.k) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num2),
      heavyJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3),
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.u) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num4),
      superJustDown: (p2Down && Phaser.Input.Keyboard.JustDown(this.p2Keys.l)) || Phaser.Input.Keyboard.JustDown(this.p2Keys.i) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num5),
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.o) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num0),
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p2Keys.p)
    };

    // Feed controls to entities
    this.fighterP1.handleControls(p1Input);
    this.fighterP2.handleControls(p2Input);

    // Real-Time Hitbox & Combat Interaction Check
    this.checkHit(this.fighterP1, this.fighterP2);
    this.checkHit(this.fighterP2, this.fighterP1);

    // Update Live Action & Health
    this.updateHUD();
  }
}

// Global launchers
window.startPhaserArena = function() {
  const container = document.getElementById('phaser-container');
  const menuWrapper = document.getElementById('menuWrapper');
  const arenaUI = document.getElementById('arenaControlBar');

  if (menuWrapper) menuWrapper.style.display = 'none';
  if (container) container.style.display = 'block';
  if (arenaUI) arenaUI.style.display = 'flex';

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
