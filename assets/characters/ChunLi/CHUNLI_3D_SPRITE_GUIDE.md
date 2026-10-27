# CHUN-LI 3D FIGHTING GAME SPRITE PACK & INTEGRATION GUIDE
## High-Resolution Volumetric 3D Render Style — True 32-Bit Transparent PNGs

This asset pack contains **15 high-resolution 3D-rendered sprite sheets** for **Chun-Li** (10 character body sheets + 5 independent 3D projectile & VFX overlay sheets). Every sheet features strict chronological frame sequencing (left-to-right, top-to-bottom), smooth pose-to-pose interpolation, and clean 32-bit RGBA transparency with zero background residue.

---

## 1. COMPLETE SPRITE SHEET SPECIFICATIONS

All sheets use uniform grid cells and can be sliced automatically using **Grid by Cell Count** in Unity, Godot, GameMaker, or Unreal Paper2D.

| Sheet # | Filename | Grid (Cols × Rows) | Total Frames | Playback Speed | Pivot Point | Chronological Frame Breakdown |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `01_ChunLi_Idle.png` | 4 × 4 | 16 | 24 FPS (Loop) | Bottom-Center | **1–4:** Smooth inhale & chest lift<br>**5–8:** Rear-leg wushu weight shift<br>**9–12:** Bounce apex & ribbon sway<br>**13–16:** Smooth exhale return to Frame 1 |
| **02** | `02_ChunLi_Walk.png` | 4 × 4 | 16 | 24 FPS (Loop) | Bottom-Center | **1–4:** Right heel contact & weight transfer<br>**5–8:** Left leg passing & forward extension<br>**9–12:** Left heel contact & weight transfer<br>**13–16:** Right leg passing & return to Frame 1 |
| **03** | `03_ChunLi_Jump.png` | 4 × 4 | 16 | 24 FPS (One-shot) | Bottom-Center | **1–4:** Crouch compression & upward launch<br>**5–8:** Airborne knee tuck & peak hover apex<br>**9–12:** Descent leg extension & toe touchdown<br>**13–16:** Bent-knee shock absorption & recovery |
| **04** | `04_ChunLi_Crouch.png` | 4 × 3 | 12 | 24 FPS (Hold 5–8) | Bottom-Center | **1–4:** Progressive knee bend into low crouch<br>**5–8:** Compact low defensive crouch hold<br>**9–12:** Progressive upward rise to standing |
| **05** | `05_ChunLi_HitReaction.png` | 4 × 3 | 12 | 24 FPS (One-shot) | Bottom-Center | **1–4:** Impact jolt & backward torso recoil<br>**5–8:** Hit-stun stagger & footing catch<br>**9–12:** Posture recovery into wushu guard |
| **06** | `06_ChunLi_BasicStrike.png` | 4 × 4 | 16 | 30 FPS (One-shot) | Bottom-Center | **1–4:** Shoulder coil & palm chambering<br>**5–8:** Forward acceleration & full contact (Frame 8)<br>**9–12:** Impact hold & initial elbow retraction<br>**13–16:** Torso uncoil & guard recovery |
| **07** | `07_ChunLi_LightningLegs.png` | 4 × 4 | 16 | 30 FPS (Loop/Shot)| Bottom-Center | **1–4:** High kick chamber, extension (3) & retract<br>**5–8:** Mid kick chamber, extension (7) & retract<br>**9–12:** Low/angled kick extension (11) & retract<br>**13–16:** Final snap kick (13) & foot plant recovery |
| **08** | `08_ChunLi_SpinningBirdKick.png`| 4 × 4 | 16 | 30 FPS (One-shot) | Center (0.5, 0.5) | **1–4:** Crouch tuck, inverted flip & 180° split<br>**5–8:** First full 360° horizontal helicopter spin<br>**9–12:** Second full 360° horizontal helicopter spin<br>**13–16:** Upright flip, touchdown & stance recovery |
| **09** | `09_ChunLi_Kikoken.png` | 4 × 4 | 16 | 24 FPS (One-shot) | Bottom-Center | **1–4:** Horse stance & hip qi spark gather<br>**5–8:** Deep cyan charge compression & shoulder coil<br>**9–12:** Dual-palm thrust & empty release (11–12)<br>**13–16:** Arm retraction & stance recovery |
| **10** | `10_ChunLi_HoyokuSen.png` | 4 × 4 | 16 | 30 FPS (One-shot) | Bottom-Center | **1–4:** Super charge & right-leg kick flurry<br>**5–8:** Left-leg kick flurry & deep crouch coil<br>**9–12:** Vertical 180° sky-high split kick finisher<br>**13–16:** Smooth leg descent & stance recovery |
| **11** | `11_Kikoken_Projectile.png` | 4 × 4 | 16 | 30 FPS (Loop) | Center (0.5, 0.5) | **1–16:** Continuous 360° clockwise rotation of 3D cyan plasma sphere (22.5° per frame) |
| **12** | `12_Kikoken_Impact.png` | 4 × 4 | 16 | 30 FPS (One-shot) | Center (0.5, 0.5) | **1–4:** Contact flash & star-burst ignition<br>**5–8:** Shockwave ring peak & shard shatter<br>**9–16:** Outward ribbon expansion & fade to empty (16) |
| **13** | `13_LightningLegs_VFX.png` | 4 × 4 | 16 | 30 FPS (Loop) | Center (0.5, 0.5) | **1–4:** High-angle golden crescent kick trail<br>**5–8:** Mid-level horizontal sonic kick cone<br>**9–12:** Multi-arc overlapping rapid kick flurry<br>**13–16:** Expanding golden shockwave ring & embers |
| **14** | `14_SpinningBird_VFX.png` | 4 × 4 | 16 | 30 FPS (Loop) | Center (0.5, 0.5) | **1–4:** Cyclone wind vortex buildup<br>**5–12:** Two full high-speed horizontal wind disc rotations<br>**13–16:** Outward wind dispersion & fade |
| **15** | `15_HoyokuSen_Finisher_VFX.png`| 4 × 4 | 16 | 30 FPS (One-shot) | Center (0.5, 0.5) | **1–4:** Ignition & vertical rising energy pillar<br>**5–8:** Expanding golden-cyan shockwave rings<br>**9–12:** Supernova starburst & ribbon separation<br>**13–16:** Ember decay & fade to empty (16) |

---

## 2. HOW TO MATCH & COMBINE SPRITES WITH SPECIAL POWERS

### A. Kikoken (3D Plasma Projectile)
- **Character Sheet:** `09_ChunLi_Kikoken.png` (16 frames)
- **Projectile Sheet:** `11_Kikoken_Projectile.png` (16 frames)
- **Impact Sheet:** `12_Kikoken_Impact.png` (16 frames)
- **Frame-by-Frame Sync:**
  1. **Charge (Character Frames 1–8):** Chun-Li steps into a wide horse stance and gathers a glowing 3D cyan spark between her cupped hands at her hip.
  2. **Thrust & Spawn (Character Frames 9–11):** Her palms drive forward. On **Frame 11** (full dual-palm extension with empty hands), trigger an engine animation event to spawn `11_Kikoken_Projectile.png` at hand socket offset `Vector2(1.15f * facingDir, 0.35f)`.
  3. **Projectile Flight:** Move the projectile horizontally (`velocity = Vector2(9.0f * facingDir, 0)`) while looping `11_Kikoken_Projectile.png` at 30 FPS. Meanwhile, Chun-Li completes her follow-through and recovery on Frames 12–16.
  4. **Collision & Impact:** When the projectile hits the opponent or blocks, destroy the projectile actor and instantiate `12_Kikoken_Impact.png` at the contact point. Play Frames 1–16 once at 30 FPS and destroy on Frame 16.

### B. Hyakuretsukyaku (Lightning Legs)
- **Character Sheet:** `07_ChunLi_LightningLegs.png` (16 frames)
- **VFX Overlay Sheet:** `13_LightningLegs_VFX.png` (16 frames)
- **Frame-by-Frame Sync:**
  1. **Kick Flurry (Character Frames 1–13):** Chun-Li balances on her left leg while executing a high kick (Frames 1–4), mid kick (Frames 5–8), angled low kick (Frames 9–12), and final snap kick (Frame 13).
  2. **Overlay Attachment:** Spawn `13_LightningLegs_VFX.png` as a child sprite at socket offset `Vector2(0.95f * facingDir, 0.25f)` in front of her kicking leg using an **Additive** or **Alpha Blend** material.
  3. **Synchronized Playback:**
     - Character Frames 1–4 sync directly with VFX Frames 1–4 (high crescent slash trail).
     - Character Frames 5–8 sync directly with VFX Frames 5–8 (mid horizontal sonic cone).
     - Character Frames 9–12 sync directly with VFX Frames 9–12 (overlapping multi-arc flurry).
     - Character Frames 13–16 (final snap kick and leg plant) sync with VFX Frames 13–16 (radial shockwave ring dispersion).
  4. **Looping Hold:** If the player continues mashing the kick button, loop both sheets between **Frames 1 and 12**, then play **Frames 13–16** as the finisher/recovery when released.

### C. Spinning Bird Kick
- **Character Sheet:** `08_ChunLi_SpinningBirdKick.png` (16 frames)
- **VFX Overlay Sheet:** `14_SpinningBird_VFX.png` (16 frames)
- **Frame-by-Frame Sync:**
  1. **Tuck & Flip (Frames 1–4):** Chun-Li crouches, flips upside-down, and snaps into a 180° inverted split on Frame 4, while `14_SpinningBird_VFX.png` builds the spiraling wind cone (Frames 1–4).
  2. **Helicopter Spin (Frames 5–12):** Lock Chun-Li's vertical gravity and move her horizontally (`velocity = Vector2(4.5f * facingDir, 0)`). Character Frames 5–12 and VFX Frames 5–12 play in 1:1 lockstep through two full 360° revolutions, with the 3D cyan wind vortex positioned directly around her waist/legs.
  3. **Landing Recovery (Frames 13–16):** Chun-Li flips upright and lands on Frame 15–16 while the wind vortex expands and dissipates on VFX Frames 13–16.

### D. Hoyoku-sen (Super Art Finisher)
- **Character Sheet:** `10_ChunLi_HoyokuSen.png` (16 frames)
- **Barrage VFX:** `13_LightningLegs_VFX.png` (Frames 9–12)
- **Finisher VFX:** `15_HoyokuSen_Finisher_VFX.png` (16 frames)
- **Frame-by-Frame Sync:**
  1. **First & Second Flurries (Character Frames 1–7):** Chun-Li lunges forward with a right-leg barrage (Frames 2–4) and left-leg barrage (Frames 5–7). Overlay `13_LightningLegs_VFX.png` (Frames 9–12) in front of her kicks.
  2. **Deep Coil (Character Frame 8–9):** Chun-Li drops into a low coiled stance preparing for the launcher.
  3. **Sky-High Split Finisher (Character Frames 10–12):** On **Frame 10**, instantiate `15_HoyokuSen_Finisher_VFX.png` at her kicking foot position. As she hits the vertical 180° split on **Frames 11–12**, the VFX erupts into a rising golden-cyan energy pillar (VFX Frames 2–4) and expanding supernova shockwave rings (VFX Frames 5–10), launching the opponent into the air.
  4. **Recovery (Character Frames 13–16):** Chun-Li lowers her leg back to her fighting stance while the golden embers fade out (VFX Frames 11–16).
