// Apex Brawl - Combat Arena Scene
// Controls, Physics, Facing Direction, and Jump System

class FighterEntity {
  constructor(scene, x, y, charId, playerNum, isMirror = false) {
    this.scene = scene;
    this.charId = charId;
    this.playerNum = playerNum;
    this.isMirror = isMirror;

    this.isAttacking = false;
    this.isInAir = false;
    this.currentAction = 'IDLE';
    this.hp = charId === 'harpy' ? 920 : 1000;
    this.maxHp = this.hp;

    // Movement speeds & Jump velocity
    this.walkSpeed = charId === 'harpy' ? 260 : 220;
    this.dashSpeed = charId === 'harpy' ? 480 : 380;
    this.jumpVel = charId === 'harpy' ? -740 : -640;

    // Create sprite
    const initialTexture = charId === 'harpy' ? 'harpy_sheet_idle' : 'kharon_sprite';
    this.sprite = scene.physics.add.sprite(x, y, initialTexture);
    this.sprite.setScale(0.35);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body.setSize(360, 800);
    this.sprite.body.setOffset(360, 240);

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
    if (key.startsWith('harpy_anim_atk_') || key.startsWith('harpy_anim_sp_') || key === 'harpy_anim_taunt' || key === 'harpy_anim_dash' || key === 'harpy_anim_backdash') {
      this.isAttacking = false;
      this.updateTextureForState();
    }
  }

  updateTextureForState() {
    if (this.charId !== 'harpy') return;

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

  triggerAttack(actionKey, animKey) {
    if (this.isAttacking) return;
    this.isAttacking = true;
    this.currentAction = actionKey;

    if (this.charId === 'harpy') {
      this.sprite.play(animKey, true);
    }

    if (window.soundFX) window.soundFX.playSelect();
  }

  handleControls(input) {
    // Definitive Ground Check:
    // When resting on the floor, vertical velocity is 0 or blocked at bottom world bound
    const canJump = Boolean(
      this.sprite.body.blocked.down || 
      this.sprite.body.touching.down || 
      Math.abs(this.sprite.body.velocity.y) < 15
    );

    const onGround = canJump;

    // Landing detection
    if (onGround && this.isInAir) {
      this.isInAir = false;
      this.isAttacking = false;
      if (this.charId === 'harpy') {
        this.sprite.setTexture('harpy_sheet_idle');
        this.sprite.play('harpy_anim_idle', true);
      }
    } else if (!onGround) {
      this.isInAir = true;
    }

    // 1. Attacks (Ground & Air)
    if (input.lightJustDown) {
      if (this.isInAir) {
        this.triggerAttack('AIR TALON (8A)', 'harpy_anim_atk_8a');
      } else {
        this.triggerAttack('TALON JAB (5A)', 'harpy_anim_atk_5a');
      }
      return;
    }

    if (input.mediumJustDown) {
      if (this.isInAir) {
        this.triggerAttack('AIR CLEAVE (8C)', 'harpy_anim_atk_8c');
      } else if (input.isHoldingForward) {
        this.triggerAttack('WING BLADE (6B)', 'harpy_anim_atk_6b');
      } else {
        this.triggerAttack('WING FLURRY (5B)', 'harpy_anim_atk_5b');
      }
      return;
    }

    if (input.heavyJustDown) {
      if (this.isInAir) {
        this.triggerAttack('AIR DIVE (8D)', 'harpy_anim_atk_8d');
      } else {
        this.triggerAttack('GALE STRIKE (5C)', 'harpy_anim_atk_5c');
      }
      return;
    }

    if (input.specialJustDown) {
      if (input.up) {
        this.triggerAttack('SKY DRAGON DP (262C)', 'harpy_anim_sp_262c');
      } else {
        this.triggerAttack('TEMPEST CYCLONE (235B)', 'harpy_anim_sp_235b');
      }
      return;
    }

    if (input.superJustDown) {
      this.triggerAttack('FEATHER STORM (SUPER)', 'harpy_anim_super');
      return;
    }

    if (input.tauntJustDown && onGround) {
      this.triggerAttack('TAUNT', 'harpy_anim_taunt');
      return;
    }

    // 2. Dash & Backdash
    if (input.dashJustDown && onGround && !this.isAttacking) {
      this.triggerAttack('FORWARD DASH', 'harpy_anim_dash');
      this.sprite.setVelocityX(this.sprite.flipX ? this.dashSpeed : -this.dashSpeed);
      return;
    }

    // If locked in an attack animation, maintain momentum but do not override with walk
    if (this.isAttacking) return;

    // 3. Jump Input: Responds to W, Space, or Up Arrow
    if (input.upJustDown || (input.up && canJump)) {
      if (canJump) {
        this.sprite.setVelocityY(this.jumpVel); // -740 impulse
        this.isInAir = true;
        this.currentAction = 'JUMP / ASCENT';
        if (this.charId === 'harpy') {
          this.sprite.setTexture('harpy_sheet_jump');
          this.sprite.play('harpy_anim_jump', true);
        }
        if (window.soundFX) window.soundFX.playHover();
      }
    }

    // 4. Movement on Ground & In Air (Air Steering & Facing Direction)
    // Harpy source frames face LEFT:
    // setFlipX(false) -> Faces LEFT
    // setFlipX(true)  -> Faces RIGHT
    const airFactor = this.isInAir ? 0.9 : 1.0;

    if (input.left) {
      this.sprite.setVelocityX(-this.walkSpeed * airFactor);
      this.sprite.setFlipX(false); // Native = faces LEFT!
      if (onGround && !input.up) {
        this.currentAction = 'WALK LEFT';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_walk', true);
      }
    } else if (input.right) {
      this.sprite.setVelocityX(this.walkSpeed * airFactor);
      this.sprite.setFlipX(true); // Flipped = faces RIGHT!
      if (onGround && !input.up) {
        this.currentAction = 'WALK RIGHT';
        if (this.charId === 'harpy') this.sprite.play('harpy_anim_walk', true);
      }
    } else {
      if (onGround) {
        this.sprite.setVelocityX(0);
      }
    }

    // 5. Crouch, Idle & Airborne States
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
      // In air without attacking
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
    this.cursors = null;
    this.wasd = null;
    this.p1Keys = {};
    this.p2Keys = {};
  }

  preload() {
    // 1. Arena & Assets
    this.load.image('arena_bg', 'assets/menu-bg.png');
    this.load.image('harpy_portrait', '../../assets/characters/harpy/portrait.png');
    this.load.image('kharon_portrait', '../../assets/characters/kharon/portrait.png');
    this.load.image('kharon_sprite', '../../assets/characters/kharon/portrait.png');

    // 2. All Harpy Sprite Sheets
    const hBase = '../../assets/characters/harpy/';

    // Movement & Stances
    this.load.spritesheet('harpy_sheet_idle', hBase + 'SheetIdle.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_walk', hBase + 'SheetWalk.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_dash', hBase + 'SheetDash.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_backdash', hBase + 'SheetBackdash.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_crouch', hBase + 'SheetCrouch.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_jump', hBase + 'SheetJumpFall1.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_taunt', hBase + 'SheetTaunt.png', { frameWidth: 1080, frameHeight: 1080 });

    // Ground Attacks
    this.load.spritesheet('harpy_sheet_5a', hBase + 'Sheet5A.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5b', hBase + 'Sheet5B1.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5b2', hBase + 'Sheet5B2.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5b3', hBase + 'Sheet5B3.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_5c', hBase + 'Sheet5C.png', { frameWidth: 1200, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_6b', hBase + 'Sheet6B.png', { frameWidth: 1080, frameHeight: 1080 });

    // Aerial Attacks
    this.load.spritesheet('harpy_sheet_8a', hBase + 'Sheet8A.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_8c', hBase + 'Sheet8C.png', { frameWidth: 1080, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_8d', hBase + 'Sheet8D1.png', { frameWidth: 1200, frameHeight: 1080 });

    // Specials & Super
    this.load.spritesheet('harpy_sheet_235b', hBase + 'Sheet235B.png', { frameWidth: 1200, frameHeight: 1080 });
    this.load.spritesheet('harpy_sheet_262c', hBase + 'Sheet262C.png', { frameWidth: 1080, frameHeight: 1190 });
    this.load.spritesheet('harpy_sheet_super', hBase + 'Sheet236236C.png', { frameWidth: 1200, frameHeight: 1080 });
  }

  create() {
    // 1. World Bounds Floor at y = 600
    // Sprites with setCollideWorldBounds(true) natively collide with the bottom floor!
    this.physics.world.setBounds(0, 0, 1280, 600);

    // 2. Arena Scenery
    const bg = this.add.image(640, 360, 'arena_bg');
    bg.setDisplaySize(1280, 720);
    bg.setAlpha(0.65);
    this.add.rectangle(640, 360, 1280, 720, 0x07060a, 0.4);

    // Visual floor guide
    this.add.rectangle(640, 615, 1280, 30, 0x18181b, 0.5);

    // 3. Register all Harpy animations
    this.registerHarpyAnimations();

    // 4. Resolve selected fighters for P1 and P2
    const p1Char = window.selectedFighterP1 || 'harpy';
    const p2Char = window.selectedFighterP2 || 'kharon';
    const isMirror = p1Char === p2Char;

    // Spawn Player 1 (Left side, faces right)
    this.fighterP1 = new FighterEntity(this, 350, 480, p1Char, 1, false);

    // Spawn Player 2 (Right side, faces left)
    this.fighterP2 = new FighterEntity(this, 930, 480, p2Char, 2, isMirror);

    // Collision between fighters
    this.physics.add.collider(this.fighterP1.sprite, this.fighterP2.sprite);

    // 5. Setup Key Listeners
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
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    this.p1Keys = this.input.keyboard.addKeys({
      f: Phaser.Input.Keyboard.KeyCodes.F,     // Light (5A)
      g: Phaser.Input.Keyboard.KeyCodes.G,     // Medium (5B)
      h: Phaser.Input.Keyboard.KeyCodes.H,     // Heavy (5C)
      r: Phaser.Input.Keyboard.KeyCodes.R,     // Special
      t: Phaser.Input.Keyboard.KeyCodes.T,     // Taunt
      q: Phaser.Input.Keyboard.KeyCodes.Q,     // Dash
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.p2Keys = this.input.keyboard.addKeys({
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      u: Phaser.Input.Keyboard.KeyCodes.U,
      p: Phaser.Input.Keyboard.KeyCodes.P,
      num1: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      num2: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      num3: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE
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

    const p1Card = this.add.rectangle(75, 65, 74, 74, p1Color, 0.4);
    p1Card.setStrokeStyle(2, p1Color);
    const p1Img = this.add.image(75, 65, p1PortraitKey);
    p1Img.setDisplaySize(70, 70);

    this.p1Name = this.add.text(125, 38, `P1: ${p1Id.toUpperCase()}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fef08a'
    });

    const p1BarBg = this.add.rectangle(300, 75, 330, 16, 0x18181b, 0.85);
    p1BarBg.setStrokeStyle(1, 0x52525b);
    this.p1BarFill = this.add.rectangle(300, 75, 326, 12, p1Color);

    this.p1ActionText = this.add.text(125, 90, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p1Hex,
      fontStyle: 'bold'
    });

    // --- PLAYER 2 HUD (Right) ---
    const p2Color = p2Id === 'harpy' ? 0x06b6d4 : 0xdc2626;
    const p2Hex = p2Id === 'harpy' ? '#06b6d4' : '#ef4444';
    const p2PortraitKey = p2Id === 'harpy' ? 'harpy_portrait' : 'kharon_portrait';

    const p2Card = this.add.rectangle(1205, 65, 74, 74, p2Color, 0.4);
    p2Card.setStrokeStyle(2, p2Color);
    const p2Img = this.add.image(1205, 65, p2PortraitKey);
    p2Img.setDisplaySize(70, 70);

    this.p2Name = this.add.text(1155, 38, `P2: ${p2Id.toUpperCase()}`, {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fef08a'
    }).setOrigin(1, 0);

    const p2BarBg = this.add.rectangle(980, 75, 330, 16, 0x18181b, 0.85);
    p2BarBg.setStrokeStyle(1, 0x52525b);
    this.p2BarFill = this.add.rectangle(980, 75, 326, 12, p2Color);

    this.p2ActionText = this.add.text(1155, 90, 'ACTION: IDLE', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: p2Hex,
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // --- Bottom Controls Guide ---
    const guideBox = this.add.rectangle(640, 680, 840, 42, 0x09090b, 0.75);
    guideBox.setStrokeStyle(1, 0xf59e0b, 0.5);
    this.add.text(640, 680, 'P1: WASD / SPACE / ARROWS Jump & Move | [F] 5A [G] 5B [H] 5C [R] Special | P2: J/K/L', {
      fontFamily: 'Rajdhani, sans-serif',
      fontSize: '13px',
      color: '#fef3c7'
    }).setOrigin(0.5);
  }

  update() {
    if (!this.fighterP1 || !this.fighterP2) return;

    // Both WASD and Arrow Keys control Player 1 (allowing seamless keyboard play!)
    const p1Up = this.wasd.w.isDown || this.wasd.space.isDown || this.cursors.up.isDown;
    const p1UpJustDown = Phaser.Input.Keyboard.JustDown(this.wasd.w) || 
                         Phaser.Input.Keyboard.JustDown(this.wasd.space) || 
                         Phaser.Input.Keyboard.JustDown(this.cursors.up);

    const p1Left = this.wasd.a.isDown || this.cursors.left.isDown;
    const p1Right = this.wasd.d.isDown || this.cursors.right.isDown;
    const p1Down = this.wasd.s.isDown || this.cursors.down.isDown;

    const p1Input = {
      up: p1Up,
      upJustDown: p1UpJustDown,
      down: p1Down,
      left: p1Left,
      right: p1Right,
      isHoldingForward: this.fighterP1.sprite.flipX ? p1Right : p1Left,
      lightJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.f) || Phaser.Input.Keyboard.JustDown(this.p2Keys.j) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num1),
      mediumJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.g) || Phaser.Input.Keyboard.JustDown(this.p2Keys.k) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num2),
      heavyJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.h) || Phaser.Input.Keyboard.JustDown(this.p2Keys.l) || Phaser.Input.Keyboard.JustDown(this.p2Keys.num3),
      specialJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.r) || Phaser.Input.Keyboard.JustDown(this.p2Keys.u),
      tauntJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.t) || Phaser.Input.Keyboard.JustDown(this.p2Keys.p),
      dashJustDown: Phaser.Input.Keyboard.JustDown(this.p1Keys.q),
      superJustDown: (p1Down && Phaser.Input.Keyboard.JustDown(this.p1Keys.h))
    };

    // Player 2 Dummy / Sparring Input
    const p2Input = {
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
      tauntJustDown: false,
      dashJustDown: false,
      superJustDown: false
    };

    // Feed controls to entities
    this.fighterP1.handleControls(p1Input);
    this.fighterP2.handleControls(p2Input);

    // Update Live Action Text in HUD
    if (this.p1ActionText) {
      this.p1ActionText.setText(`ACTION: ${this.fighterP1.currentAction}`);
    }
    if (this.p2ActionText) {
      this.p2ActionText.setText(`ACTION: ${this.fighterP2.currentAction}`);
    }
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
