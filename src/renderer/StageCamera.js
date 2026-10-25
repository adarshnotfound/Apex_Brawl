/**
 * StageCamera.js
 * Multi-layer Parallax Background Renderer and Dynamic 2D Fighting Camera.
 * 
 * Features:
 * - Dynamic midpoint tracking between Player 1 and Player 2
 * - Smooth exponential linear interpolation (lerp) with deadzones & bounds clamping
 * - 4-Layer Parallax Architecture:
 *     Layer 0: Distant Sky / Moon / Clouds (0.15x parallax)
 *     Layer 1: Midground Temple / Statues / Mountains (0.45x parallax)
 *     Layer 2: Combat Playfield / Floor (1.0x baseline)
 *     Layer 3: Foreground Chains / Vignette Pillars (1.30x depth pass)
 * - Strict Render Pipeline Separation (Background -> Characters -> Foreground -> Fixed HUD)
 */

export class StageCamera {
  /**
   * @param {Object} options
   * @param {number} [options.viewportWidth=1280] Visible screen width
   * @param {number} [options.viewportHeight=720] Visible screen height
   * @param {number} [options.stageWidth=2560] Total world/stage width
   * @param {number} [options.lerpFactor=0.08] Camera tracking smoothness
   * @param {number} [options.minPadding=120] Edge padding between fighters and screen edge
   */
  constructor({
    viewportWidth = 1280,
    viewportHeight = 720,
    stageWidth = 2560,
    lerpFactor = 0.08,
    minPadding = 120
  } = {}) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.stageWidth = stageWidth;
    this.lerpFactor = lerpFactor;
    this.minPadding = minPadding;

    // Camera world position (center of viewport)
    this.x = stageWidth / 2;
    this.y = viewportHeight / 2;
    this.targetX = this.x;

    // Screen Shake properties
    this.shakeDuration = 0;
    this.shakeIntensity = 0;

    // Define 4 distinct parallax layers
    this.layers = [
      {
        id: 'sky',
        speed: 0.15,
        render: (ctx, camX, camY) => this.drawSkyLayer(ctx, camX, camY)
      },
      {
        id: 'midground',
        speed: 0.45,
        render: (ctx, camX, camY) => this.drawMidgroundLayer(ctx, camX, camY)
      },
      {
        id: 'playfield',
        speed: 1.0,
        render: (ctx, camX, camY) => this.drawPlayfieldLayer(ctx, camX, camY)
      },
      {
        id: 'foreground',
        speed: 1.30,
        render: (ctx, camX, camY) => this.drawForegroundLayer(ctx, camX, camY)
      }
    ];
  }

  /**
   * Triggers a screen shake impact effect.
   * @param {number} intensity Pixel vibration amplitude
   * @param {number} duration Duration in frames (e.g. 10 frames = ~160ms)
   */
  shake(intensity = 8, duration = 10) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /**
   * Updates camera position by tracking fighter midpoints with smooth lerp.
   * @param {Object} fighter1
   * @param {Object} fighter2
   */
  update(fighter1, fighter2) {
    // 1. Calculate focal midpoint between combatants
    const midX = (fighter1.x + fighter2.x) / 2;

    // 2. Clamp target to ensure camera never pans beyond the stage boundaries
    const halfView = this.viewportWidth / 2;
    const minCameraX = halfView;
    const maxCameraX = this.stageWidth - halfView;

    this.targetX = Math.max(minCameraX, Math.min(maxCameraX, midX));

    // 3. Smooth Exponential Interpolation (Lerp)
    this.x += (this.targetX - this.x) * this.lerpFactor;

    // 4. Update Screen Shake
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
    } else {
      this.shakeIntensity = 0;
    }
  }

  /**
   * Computes the current view offset including camera panning & screen shake.
   * @returns {{offsetX: number, offsetY: number}}
   */
  getViewOffset() {
    let shakeX = 0;
    let shakeY = 0;

    if (this.shakeDuration > 0) {
      shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    }

    const halfView = this.viewportWidth / 2;
    return {
      offsetX: (this.x - halfView) + shakeX,
      offsetY: shakeY
    };
  }

  /**
   * Render Pipeline Phase 1: Background & Playfield (Speeds <= 1.0)
   * Must be called BEFORE rendering characters and projectiles.
   * @param {CanvasRenderingContext2D} ctx
   */
  renderBackground(ctx) {
    const { offsetX, offsetY } = this.getViewOffset();

    // Layer 0: Far Sky / Nebula (0.15x)
    this.layers[0].render(ctx, offsetX * this.layers[0].speed, offsetY);

    // Layer 1: Midground Temple Altar & Pillars (0.45x)
    this.layers[1].render(ctx, offsetX * this.layers[1].speed, offsetY);

    // Layer 2: Main Playfield Floor & Shadows (1.0x)
    this.layers[2].render(ctx, offsetX * this.layers[2].speed, offsetY);
  }

  /**
   * Render Pipeline Phase 2: Foreground Depth (Speed > 1.0)
   * Must be called AFTER rendering characters so it overlays in front.
   * @param {CanvasRenderingContext2D} ctx
   */
  renderForeground(ctx) {
    const { offsetX, offsetY } = this.getViewOffset();

    // Layer 3: Foreground Atmospheric Chains & Pillars (1.30x)
    this.layers[3].render(ctx, offsetX * this.layers[3].speed, offsetY);
  }

  /**
   * Render Pipeline Phase 3: Fixed UI & Combat HUD
   * Renders at screen space (ignores camera panning).
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} fighter1
   * @param {Object} fighter2
   * @param {number} [timer=99]
   */
  renderHUD(ctx, fighter1, fighter2, timer = 99) {
    ctx.save();
    const w = this.viewportWidth;

    // 1. Health Bar P1 (Left to Right)
    const p1HpRatio = Math.max(0, fighter1.hp / (fighter1.maxHp || 1000));
    ctx.fillStyle = '#18181b';
    ctx.fillRect(50, 40, 450, 24);
    ctx.strokeStyle = '#52525b';
    ctx.strokeRect(50, 40, 450, 24);

    ctx.fillStyle = p1HpRatio > 0.3 ? '#06b6d4' : '#ef4444';
    ctx.fillRect(52, 42, 446 * p1HpRatio, 20);

    // 2. Health Bar P2 (Right to Left)
    const p2HpRatio = Math.max(0, fighter2.hp / (fighter2.maxHp || 1000));
    ctx.fillStyle = '#18181b';
    ctx.fillRect(w - 500, 40, 450, 24);
    ctx.strokeStyle = '#52525b';
    ctx.strokeRect(w - 500, 40, 450, 24);

    ctx.fillStyle = p2HpRatio > 0.3 ? '#dc2626' : '#ef4444';
    const p2FillW = 446 * p2HpRatio;
    ctx.fillRect(w - 50 - p2FillW, 42, p2FillW, 20);

    // 3. Center Match Timer
    ctx.fillStyle = '#09090b';
    ctx.fillRect(w / 2 - 40, 30, 80, 44);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(w / 2 - 40, 30, 80, 44);

    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.fillText(`${timer}`, w / 2, 62);

    // 4. Fighter Names
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(fighter1.name || 'PLAYER 1', 50, 32);

    ctx.textAlign = 'right';
    ctx.fillText(fighter2.name || 'PLAYER 2', w - 50, 32);

    ctx.restore();
  }

  // --- Procedural Canvas Parallax Art Generators ---

  drawSkyLayer(ctx, offsetX, offsetY) {
    ctx.save();
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.viewportHeight);
    grad.addColorStop(0, '#090412');
    grad.addColorStop(0.6, '#1e0c2b');
    grad.addColorStop(1, '#050208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    // Giant blood moon
    const moonX = (this.viewportWidth / 2) - (offsetX * 0.2);
    const moonGrad = ctx.createRadialGradient(moonX, 160, 20, moonX, 160, 90);
    moonGrad.addColorStop(0, '#fef08a');
    moonGrad.addColorStop(0.4, '#f97316');
    moonGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, 160, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMidgroundLayer(ctx, offsetX, offsetY) {
    ctx.save();
    ctx.fillStyle = '#120b18';
    // Distant gothic architecture & mountain peaks
    const baseY = 380;
    ctx.beginPath();
    ctx.moveTo(0, this.viewportHeight);

    const step = 140;
    const totalPoints = Math.ceil(this.stageWidth / step) + 4;
    for (let i = 0; i <= totalPoints; i++) {
      const px = (i * step) - offsetX;
      const peakY = baseY - ((i % 3 === 0) ? 90 : (i % 2 === 0 ? 50 : 20));
      ctx.lineTo(px, peakY);
      ctx.lineTo(px + (step / 2), baseY);
    }

    ctx.lineTo(this.viewportWidth, this.viewportHeight);
    ctx.closePath();
    ctx.fill();

    // Midground temple arches
    ctx.strokeStyle = '#271936';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const archX = (i * 320) - offsetX;
      ctx.strokeRect(archX, baseY - 60, 60, 140);
    }
    ctx.restore();
  }

  drawPlayfieldLayer(ctx, offsetX, offsetY) {
    ctx.save();
    const groundY = 600;

    // Floor Platform
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(0, groundY, this.viewportWidth, this.viewportHeight - groundY);

    // Glowing Arena Runes / Altar Line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(this.viewportWidth, groundY);
    ctx.stroke();

    // Floor stone tiles with parallax shift
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const tileW = 160;
    const startTile = Math.floor(offsetX / tileW);
    const endTile = startTile + Math.ceil(this.viewportWidth / tileW) + 1;

    for (let t = startTile; t <= endTile; t++) {
      const tx = (t * tileW) - offsetX;
      ctx.beginPath();
      ctx.moveTo(tx, groundY);
      ctx.lineTo(tx - 60, this.viewportHeight);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawForegroundLayer(ctx, offsetX, offsetY) {
    ctx.save();
    // Chains and broken dark columns sweeping across the near camera
    ctx.fillStyle = '#08050c';
    ctx.strokeStyle = '#050308';
    ctx.lineWidth = 14;

    const columnSpacing = 780;
    const startCol = Math.floor(offsetX / columnSpacing);
    const endCol = startCol + Math.ceil(this.viewportWidth / columnSpacing) + 1;

    for (let c = startCol; c <= endCol; c++) {
      const cx = (c * columnSpacing) - offsetX;
      // High-speed parallax foreground pillar
      ctx.fillRect(cx, 0, 70, this.viewportHeight);

      // Angled hanging dark chains
      ctx.beginPath();
      ctx.moveTo(cx + 35, 0);
      ctx.lineTo(cx + 90, 220);
      ctx.stroke();
    }
    ctx.restore();
  }
}
