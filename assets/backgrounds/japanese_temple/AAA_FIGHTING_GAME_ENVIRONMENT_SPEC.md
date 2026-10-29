# AAA Dynamic Japanese Dark-Fantasy Fighting Game Environment Specification
**Project:** Moonlit Mountain Shrine Courtyard (*Gekka no Reibyō*)  
**Format:** 16:9 Widescreen (1920×1080 / 3840×2160 Target)  
**Perspective:** 2.5D Side-View Orthographic-Offset Fighting Game Camera  
**Aesthetic:** Photorealistic AAA Dark-Fantasy (Unreal Engine 5 / PBR Standard)  
**Characters:** NONE (Strict Environment-Only Master Deliverable)

---

## 1. Environment Architecture & Visual Design

### Palette & Color Grading
* **Primary Structural:** Charcoal Grey Weathered Basalt (`#1E2024`), Deep Vermilion Lacquer (`#822019`).
* **Secondary Organic:** Ancient Weathered Hinoki Cypress (`#3D3126`), Deep Moso Bamboo Emerald (`#1C2E24`).
* **Atmospheric Accents:** Moonlit Indigo Mist (`#232B3E`), Luminous Spectral Silver (`#D6E3F8`), Pale Cherry Blossom Pink (`#F3C7D3`), Warm Lantern Amber (`#F58C28`).
* **Tone Mapping:** ACES Filmic Curve with calibrated midtone contrast and deep shadowed blacks (preserving readability without crushing dark details).

### Spatial Distribution & Combat Readability
* **Combat Walk Plane:** Lower 30% of the screen (Y: 720 to 1080) features a perfectly flat, horizontal stone courtyard with zero slopes, bumps, or camera tilt distortions.
* **Fighter Silhouette Clearance:** The central 60% of the combat plane is completely free of vertical posts, rope barricades, or props, maintaining an unobstructed 4:1 silhouette luminance contrast ratio for player characters.
* **Perimeter Framing:** Symmetrical stone staircases, raised pavilions, and weeping sakura trees anchor the left and right stage boundaries, serving as natural wall-bounce indicators.

---

## 2. Five-Layer Parallax Depth Architecture

| Layer | Depth (Z-Plane) | Scroll Speed Factor | Asset / Visual Elements | Animation Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1: Distant Celestial** | Z: -1200 | `0.02x` | Large full moon, night sky dome, distant star clusters, towering alpine cliff silhouettes. | Slow cloud drift, moon illumination pulse. |
| **Layer 2: Mountain Architecture** | Z: -750 | `0.15x` | Multi-tier pagoda silhouettes, distant ridge treelines, rolling valley fog. | Volumetric mist flow across mountain gaps. |
| **Layer 3: Midground Temple** | Z: -250 | `0.55x` | Grand vermilion Torii gate, left/right temple pavilions, stone staircases, lanterns, weeping cherry trees, bamboo grove. | Lantern flame flicker, branch wind sway. |
| **Layer 4: Combat Platform** | Z: 0.0 | `1.00x` | Cracked charcoal stone flagstones, puddles with realtime reflections, low curb boundary, ground mist. | Puddle surface ripple, creeping ground fog. |
| **Layer 5: Foreground Occluders** | Z: +250 | `1.35x` | Out-of-focus close-up sakura petals, subtle overhanging corner branches. | Fast camera-relative drift with soft Gaussian blur. |

---

## 3. Dynamic Environmental Motion Systems

### A. Cherry Blossom (Sakura) Particle Simulation
* **Particle Mechanics:** Dual-layer Niagara / GPU Particle emitter.
  * *Near Field (Foreground):* 15–25 active large particles, depth of field blur, high tumbling velocity (`dx = -120px/s, dy = 60px/s`, sine angular velocity `omega = 2.4 rad/s`).
  * *Mid Field (Arena Ambient):* 150–250 small delicate petals drifting along sinusoidal wind trajectories with localized micro-vortex turbulence.
* **Looping Trajectory Formula:**
  $$\vec{x}(t) = \vec{x}_0 + \vec{v}_{\text{wind}} \cdot t + \begin{bmatrix} A_x \sin(\omega_x t + \phi_x) \\ A_y \cos(\omega_y t + \phi_y) \end{bmatrix}$$

### B. Foliage & Bamboo Wind Sway Shaders
* **Vertex Displacement:** World-position-offset vertex shader applied to bamboo canes and sakura foliage.
* **Frequency Modulation:** High-frequency, low-amplitude vibration for leaves ($f = 3.2\text{ Hz}, A = 2\text{px}$); low-frequency, natural pendulum sway for trunk/branches ($f = 0.45\text{ Hz}, A = 8\text{px}$).

### C. Lantern Illumination & Volumetric Light
* **Point Light Fluctuation:** Perlin-noise-driven light intensity oscillation:
  $$I(t) = I_{\text{base}} \cdot (1.0 + 0.12 \cdot \text{Noise}_{1D}(4.5 \cdot t))$$
* **Specular Wet Stone Highlights:** Dynamic point lights project onto wet stone PBR roughness maps ($R_{\text{puddle}} = 0.05, R_{\text{stone}} = 0.65$), creating shimmering caustic highlights that track fighter movement.

### D. Ground Mist & Atmospheric Fog
* **Ground Layer:** Smooth creeping volumetric fog flowing along the stone courtyard floor ($h = 40\text{px}$, opacity $25\%$).
* **Depth Fog:** Exponential height fog blending Layer 2 pagodas and mountains into moonlit indigo haze.

---

## 4. Production Asset Manifest

1. `aaa_japanese_temple_arena_1080p.png` — Full 1920×1080 AAA photorealistic master visual reference.
2. `layer4_fighting_arena_floor_transparent.png` — Isolated flat horizontal stone combat floor with transparent alpha upper boundary.
3. `layer1_2_sky_mountains_backdrop.png` — Upper skybox, moon, mountains, and pagodas backdrop.
4. `sakura_petals_spritesheet_transparent.png` — High-fidelity 6-cluster tumbling sakura petal particle sprite sheet.
5. `sakura_petals_animated_loop.gif` — 8 FPS seamless looping particle animation preview.
6. `hanging_lantern_spritesheet_transparent.png` — 4-frame uniform hanging lantern sway loop.
7. `kagaribi_fire_brazier_spritesheet_transparent.png` — 4-frame uniform ceremonial fire brazier flame loop.
