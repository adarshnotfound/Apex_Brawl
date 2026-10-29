# Doctor Strange — Production 30 FPS Game Sprite Sheet & VFX Package (Zero-Defect Spec)

Built specifically for 2D fighting games, action platformers, and beat-'em-ups in **Unity, Godot 4, Unreal Engine (Paper2D), Phaser 3, and custom HTML5 Canvas engines**.

## Quality & Technical Guarantees
1. **True 30 FPS Frame Counts**:
   - Every core loop (`idle_stance`, `walk_float_glide`, `attack_heavy_mandala_blast`, `special_eye_of_agamotto`, `vfx_tao_mandala_loop`, `vfx_eye_of_agamotto_loop`, `vfx_sling_portal_loop`, `vfx_dimensional_vortex`) is a full **30-frame sequence (1.00s @ 30 FPS)**.
   - Combat attacks (`attack_light_whip`, `defend_tao_shield`, `portal_teleport_dash`, `hit_hurt_recoil`) use authentic fighting-game frame data (**Startup, Active Hitbox, and Recovery frames**).
2. **Zero Border Bleeding (8px Safety Margin)**:
   - Every single `256x256` cell enforces a strict transparent border margin (`0` border bleed violations across all 550 frames), preventing texture filtering/mipmapping artifacts in Unity, Godot, and Phaser.
3. **Mathematically Locked Root Pivot**:
   - Every character cell (`256x256`) locks the character's ground root pivot at `X = 128, Y = 240` (`normalized: (0.5, 0.9375)`). Switching between any of the 8 animation states produces **0.0px positional jitter**.
4. **True Unmultiplied RGBA Transparency & Zero Baked Text**:
   - All semi-transparent spell glows (Tao Mandalas, Eldritch Whips, Sling-Ring Portals, Eye of Agamotto emerald runes) have white unmixed from their RGB channels so they render cleanly over dark stages with zero white halo and zero text labels.
5. **Modular + Combined Workflows**:
   - Includes **Combined Sheets** (Character + VFX pre-composited), **Character-Only Sheets** (clean character without spell VFX), and **Dedicated VFX Sheets** (independent spells for projectiles, hit sparks, and additive shaders).

---

## Directory Structure

```
doctor_strange_30fps_game_pack/
├── README_GAME_INTEGRATION.md
├── doctor_strange_30fps_spritesheet.json                  # Full frame rects, pivots, hitboxes & hurtboxes
├── doctor_strange_master_combined_30fps_spritesheet.png   # 7680x2048 RGBA (All 8 Char+VFX states, 256x256 grid)
├── doctor_strange_character_only_30fps_spritesheet.png    # 7680x2048 RGBA (All 8 Char-Only states, 256x256 grid)
├── doctor_strange_vfx_all_30fps_spritesheet.png           # 7680x1536 RGBA (All 6 VFX animations, 256x256 grid)
├── doctor_strange_30fps_master_overview.png               # Visual reference chart
├── strips_30fps/                                          # 22 individual horizontal 30 FPS strips (256px height)
│   ├── idle_stance_combined_30fps.png                     (30 frames, 7680x256)
│   ├── idle_stance_char_only_30fps.png                    (30 frames, 7680x256)
│   ├── walk_float_glide_combined_30fps.png                (30 frames, 7680x256)
│   ├── walk_float_glide_char_only_30fps.png               (30 frames, 7680x256)
│   ├── attack_light_whip_combined_30fps.png               (20 frames, 5120x256)
│   ├── attack_light_whip_char_only_30fps.png              (20 frames, 5120x256)
│   ├── attack_heavy_mandala_blast_combined_30fps.png      (30 frames, 7680x256)
│   ├── attack_heavy_mandala_blast_char_only_30fps.png     (30 frames, 7680x256)
│   ├── special_eye_of_agamotto_combined_30fps.png         (30 frames, 7680x256)
│   ├── special_eye_of_agamotto_char_only_30fps.png        (30 frames, 7680x256)
│   ├── defend_tao_shield_combined_30fps.png               (20 frames, 5120x256)
│   ├── defend_tao_shield_char_only_30fps.png              (20 frames, 5120x256)
│   ├── portal_teleport_dash_combined_30fps.png            (20 frames, 5120x256)
│   ├── portal_teleport_dash_char_only_30fps.png           (20 frames, 5120x256)
│   ├── hit_hurt_recoil_combined_30fps.png                 (15 frames, 3840x256)
│   ├── hit_hurt_recoil_char_only_30fps.png                (15 frames, 3840x256)
│   ├── vfx_tao_mandala_loop_30fps.png                     (30 frames, 7680x256)
│   ├── vfx_eye_of_agamotto_loop_30fps.png                 (30 frames, 7680x256)
│   ├── vfx_sling_portal_loop_30fps.png                    (30 frames, 7680x256)
│   ├── vfx_eldritch_whip_slash_30fps.png                  (20 frames, 5120x256)
│   ├── vfx_mystic_burst_impact_30fps.png                  (20 frames, 5120x256)
│   └── vfx_dimensional_vortex_30fps.png                   (30 frames, 7680x256)
└── high_res_512x512/                                      # High-res 512x512 source keyframes & VFX textures
```

---

## Quick Engine Setup

### 1. Unity (Sprite Editor)
- Import any sheet or strip into `Assets/Sprites/`.
- Set **Texture Type** = `Sprite (2D and UI)`, **Sprite Mode** = `Multiple`, **Alpha Is Transparency** = `Checked`.
- Open **Sprite Editor** -> **Slice** -> **Type: Grid by Cell Size** -> `X: 256, Y: 256`.
- Set **Pivot** = `Custom` -> `X: 0.5, Y: 0.0625` (in Unity bottom-left origin, `1.0 - 0.9375 = 0.0625`).
- Set Animation Clip **Samples** = `30`.

### 2. Godot 4 (`AnimatedSprite2D`)
- Create a `SpriteFrames` resource.
- Click **Add Frames from Sprite Sheet**, select `doctor_strange_master_combined_30fps_spritesheet.png`.
- Set **Horizontal** = `30`, **Vertical** = `8` (or use `strips_30fps/` with **Vertical** = `1`).
- Set **FPS** = `30.0` and `Sprite2D.offset = Vector2(0, -112)` to align the root pivot with the character's feet.

### 3. Phaser 3
```javascript
this.load.spritesheet('strange', 'doctor_strange_master_combined_30fps_spritesheet.png', {
  frameWidth: 256,
  frameHeight: 256
});

this.anims.create({
  key: 'idle_stance',
  frames: this.anims.generateFrameNumbers('strange', { start: 0, end: 29 }),
  frameRate: 30,
  repeat: -1
});
```
