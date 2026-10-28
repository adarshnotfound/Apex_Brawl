// Main Menu Controller for Apex Brawl (Mystic Kombat)
document.addEventListener('DOMContentLoaded', () => {
  initEmbersCanvas();
  initMenuNavigation();
  initModals();
  initGamepadSupport();
});

// ----------------------------------------------------
// 1. Dynamic Rising Embers Background Particle Engine
// ----------------------------------------------------
function initEmbersCanvas() {
  const canvas = document.getElementById('embersCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = [];
  const particleCount = 75;

  class Ember {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.8 + 0.8;
      this.speedY = Math.random() * 1.5 + 0.6;
      this.speedX = (Math.random() - 0.5) * 0.9;
      this.opacity = Math.random() * 0.7 + 0.3;
      this.decay = Math.random() * 0.004 + 0.002;
      this.hue = Math.random() > 0.3 ? (Math.random() * 30 + 10) : 0; // Gold/orange or crimson
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX + Math.sin(this.y * 0.02) * 0.4;
      this.opacity -= this.decay;

      if (this.y < -10 || this.opacity <= 0) {
        this.reset();
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.fillStyle = `hsl(${this.hue}, 100%, 60%)`;
      ctx.shadowBlur = 12;
      ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Ember());
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
}

// ----------------------------------------------------
// 2. Menu Navigation & Sound Interaction
// ----------------------------------------------------
let activeIndex = 0;
let menuItems = [];

function initMenuNavigation() {
  menuItems = Array.from(document.querySelectorAll('.menu-item'));
  if (menuItems.length === 0) return;

  function setActive(index, playSound = true) {
    menuItems.forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });
    activeIndex = index;
    if (playSound && window.soundFX) {
      window.soundFX.playHover();
    }
  }

  menuItems.forEach((item, index) => {
    item.addEventListener('mouseenter', () => {
      setActive(index, true);
    });

    item.addEventListener('click', () => {
      executeMenuItem(item.dataset.action);
    });
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // If arena or loading screen is active, ignore menu key events completely!
    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer && phaserContainer.style.display !== 'none') {
      return;
    }

    const vsLoading = document.getElementById('vs-loading-screen');
    if (vsLoading && vsLoading.classList.contains('active')) {
      return;
    }

    // If a modal is open, don't navigate main menu
    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) {
      if (e.key === 'Escape') {
        closeAllModals();
      }
      return;
    }

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      const next = (activeIndex - 1 + menuItems.length) % menuItems.length;
      setActive(next, true);
      e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      const next = (activeIndex + 1) % menuItems.length;
      setActive(next, true);
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      executeMenuItem(menuItems[activeIndex]?.dataset.action);
      e.preventDefault();
    } else if (e.key === 'F11') {
      toggleFullscreen();
      e.preventDefault();
    }
  });

  // Initial active item
  setActive(0, false);
}

function executeMenuItem(action) {
  if (window.soundFX) {
    window.soundFX.playSelect();
  }

  switch (action) {
    case 'local-1v1':
      openCharacterSelect('VERSUS');
      break;
    case 'arcade':
      openModal('modal-arcade');
      break;
    case 'lan':
      openLANModal();
      break;
    case 'training':
      openCharacterSelect('TRAINING');
      break;
    case 'controls':
      openModal('modal-controls');
      break;
    case 'grimoire':
      openModal('modal-grimoire');
      break;
    case 'settings':
      openModal('modal-settings');
      break;
    case 'exit':
      if (window.electronAPI && window.electronAPI.quit) {
        window.electronAPI.quit();
      } else {
        alert('Closing application...');
      }
      break;
    default:
      console.log('Action:', action);
  }
}

// ----------------------------------------------------
// 3. Modals & UI Controls
// ----------------------------------------------------
function initModals() {
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Fullscreen button
  const fsBtn = document.getElementById('btnFullscreen');
  if (fsBtn) {
    fsBtn.addEventListener('click', toggleFullscreen);
  }

  // Audio mute/unmute button
  const audioBtn = document.getElementById('btnAudio');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      if (window.soundFX) {
        const isMuted = window.soundFX.toggleMute();
        audioBtn.innerHTML = isMuted ? '🔇 MUTED' : '🔊 AUDIO ON';
        if (!isMuted) window.soundFX.playSelect();
      }
    });
  }

  // Ambient BGM Toggle
  const bgmToggle = document.getElementById('toggleBGM');
  if (bgmToggle) {
    bgmToggle.addEventListener('click', () => {
      if (window.soundFX) {
        const isPlaying = window.soundFX.toggleAmbientDrone();
        bgmToggle.textContent = isPlaying ? 'TEMPLE DRONE: ACTIVE' : 'TEMPLE DRONE: OFF';
      }
    });
  }

  // Volume slider
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      if (window.soundFX) {
        window.soundFX.setVolume(parseFloat(e.target.value));
      }
    });
  }

  // Fight CTA Launch button
  const fightBtn = document.getElementById('btnLaunchFight');
  if (fightBtn) {
    fightBtn.addEventListener('click', () => {
      if (window.isLanMatch && window.lanManager) {
        if (window.lanManager.role !== 'HOST') {
          // Client cannot launch until host triggers it
          return;
        }
        window.lanManager.send('START_MATCH', {
          p1Char: window.selectedFighterP1,
          p2Char: window.selectedFighterP2,
          stage: window.selectedStage || 'japanese_temple'
        });
      }

      closeAllModals();
      const isTraining = window.isTrainingModeSelected === true;
      if (window.startMatchWithLoadingScreen) {
        window.startMatchWithLoadingScreen({
          p1Char: window.selectedFighterP1,
          p2Char: window.selectedFighterP2,
          stage: window.selectedStage || 'japanese_temple',
          isTraining: isTraining,
          isLan: window.isLanMatch
        });
      } else if (window.startPhaserArena) {
        window.isTrainingMode = isTraining;
        window.startPhaserArena();
      }
    });
  }

  // Grimoire Character Tab Switching
  initGrimoireTabs();

  // Character Picker for Player 1 and Player 2
  initCharacterSelection();

  // Battle Arena Selection
  initStageSelection();
  initDojoSetup();
}

window.selectedFighterP1 = 'harpy';
window.selectedFighterP2 = 'strange';
window.selectedStage = 'japanese_temple';

const MK1_ROSTER = {
  harpy: {
    id: 'harpy',
    name: 'HARPY',
    subtitle: 'THE SKY TERROR • WINGED AERIAL STRIKER',
    archetype: 'Rushdown • High Air Mobility & Frame Traps',
    render: 'assets/characters/harpy/action_render.png',
    avatar: 'assets/characters/harpy/select_avatar.png',
    themeColor: '#06b6d4',
    accentColor: '#67e8f9'
  },
  strange: {
    id: 'strange',
    name: 'DR. STRANGE',
    subtitle: 'MASTER OF THE MYSTIC ARTS',
    archetype: 'Zoner • Spellcaster Supreme & Space Control',
    render: 'assets/characters/Dr Strange/action_render.png',
    avatar: 'assets/characters/Dr Strange/select_avatar.png',
    themeColor: '#f59e0b',
    accentColor: '#fde047'
  },
  chunli: {
    id: 'chunli',
    name: 'CHUN-LI',
    subtitle: 'STRONGEST WOMAN IN THE WORLD',
    archetype: 'Rushdown • Lightning Strikes & Hyakuretsukyaku',
    render: 'assets/characters/ChunLi/action_render.png',
    avatar: 'assets/characters/ChunLi/select_avatar.png',
    themeColor: '#0284c7',
    accentColor: '#38bdf8'
  },
  mewtwo: {
    id: 'mewtwo',
    name: 'MEWTWO',
    subtitle: 'GENETIC APEX & PSYCHIC OVERLORD',
    archetype: 'Zoner / Striker • Shadow Ball & Psystrike',
    render: 'assets/characters/Mewtwo/action_render.png',
    avatar: 'assets/characters/Mewtwo/select_avatar.png',
    themeColor: '#9333ea',
    accentColor: '#c084fc'
  },
  steve: {
    id: 'steve',
    name: 'STEVE',
    subtitle: 'THE MASTER CRAFTER & SANDBOX CHAMPION',
    archetype: 'Brawler / Trap • Diamond Blade & TNT Blockade',
    render: 'assets/characters/Steve/action_render.png',
    avatar: 'assets/characters/Steve/select_avatar.png',
    themeColor: '#0d9488',
    accentColor: '#2dd4bf'
  },
  dummy: {
    id: 'dummy',
    name: 'TRAINING DUMMY',
    subtitle: 'COMBAT AUTOMATON • PRACTICE TARGET',
    archetype: 'Practice Target • Telemetry & Combos',
    render: 'assets/characters/dummy/action_render.png',
    avatar: 'assets/characters/dummy/select_avatar.png',
    themeColor: '#64748b',
    accentColor: '#94a3b8'
  },
  zoro: {
    id: 'zoro',
    name: 'RORONOA ZORO',
    subtitle: 'PIRATE HUNTER & SANTORYU SWORDSMAN',
    archetype: 'Striker • Three-Sword Style & Demon Slash',
    render: 'assets/characters/zoro/action_render.png',
    avatar: 'assets/characters/zoro/select_avatar.png',
    themeColor: '#10b981',
    accentColor: '#34d399'
  }
};

const ROSTER_KEYS = ['harpy', 'strange', 'chunli', 'mewtwo', 'steve', 'zoro'];

function initStageSelection() {
  const pill = document.getElementById('mk1StageSelector');
  if (pill) {
    pill.addEventListener('click', () => {
      window.selectedStage = (window.selectedStage === 'sky_temple') ? 'japanese_temple' : 'sky_temple';
      updateStagePillUI();
      if (window.isLanMatch && window.lanManager) {
        window.lanManager.send('STAGE_SELECT', { stage: window.selectedStage });
      }
      if (window.soundFX) window.soundFX.playSelect();
    });
  }

  // Also support any legacy stage cards if opened in sub-modals
  document.querySelectorAll('.stage-card').forEach(card => {
    card.addEventListener('click', () => {
      window.selectedStage = card.dataset.stage;
      updateStagePillUI();
      if (window.soundFX) window.soundFX.playSelect();
    });
  });

  updateStagePillUI();
}

function updateStagePillUI() {
  const isSky = window.selectedStage === 'sky_temple';
  const nameEl = document.getElementById('mk1-stage-name');
  const thumbEl = document.getElementById('mk1-stage-thumb');
  if (nameEl) {
    nameEl.textContent = isSky ? 'SKY TEMPLE' : 'SHRINE';
    nameEl.style.color = isSky ? '#67e8f9' : '#fef08a';
  }
  if (thumbEl) {
    thumbEl.src = isSky
      ? 'assets/backgrounds/sky_temple/sky_temple_thumb.png'
      : 'assets/backgrounds/japanese_temple/japanese_temple_thumb.png';
  }
}

function initCharacterSelection() {
  // Roster cards click handling
  document.querySelectorAll('.roster-card').forEach(card => {
    if (card.classList.contains('locked')) return;

    // Left click: Select character
    card.addEventListener('click', (e) => {
      const charId = card.dataset.char;
      if (!charId || !MK1_ROSTER[charId]) return;

      if (window.isTrainingModeSelected) {
        // Training Mode: Only select Player 1! Opponent is always Dummy.
        setFighterSelection('1', charId);
      } else if (window.isLanMatch && window.lanManager) {
        // LAN Mode: Host selects P1, Client selects P2
        const myPlayer = (window.lanManager.role === 'HOST') ? '1' : '2';
        setFighterSelection(myPlayer, charId);
        window.lanManager.send('CHAR_SELECT', { player: Number(myPlayer), charId });
      } else {
        if (e.shiftKey || e.altKey) {
          setFighterSelection('2', charId);
        } else {
          setFighterSelection('1', charId);
        }
      }
      if (window.soundFX) window.soundFX.playSelect();
    });

    // Right click: Select Player 2
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const charId = card.dataset.char;
      if (!charId || !MK1_ROSTER[charId]) return;
      setFighterSelection('2', charId);
      if (window.soundFX) window.soundFX.playSelect();
    });
  });

  // Keyboard navigation for MK1 character select
  window.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('modal-battle-prompt');
    if (!overlay || !overlay.classList.contains('open')) return;

    // Player 1 navigation: A / D
    if (e.key === 'a' || e.key === 'A') {
      cycleFighter('1', -1);
    } else if (e.key === 'd' || e.key === 'D') {
      cycleFighter('1', 1);
    }

    // Player 2 navigation: Left / Right arrows
    if (e.key === 'ArrowLeft') {
      cycleFighter('2', -1);
    } else if (e.key === 'ArrowRight') {
      cycleFighter('2', 1);
    }

    // Space / Enter launches fight
    if (e.key === 'Enter' || (e.key === ' ' && e.target === document.body)) {
      const fightBtn = document.getElementById('btnLaunchFight');
      if (fightBtn) fightBtn.click();
    }
  });

  // Initial UI refresh
  setFighterSelection('1', window.selectedFighterP1 || 'harpy', false);
  setFighterSelection('2', window.selectedFighterP2 || 'strange', false);
}

function cycleFighter(player, dir) {
  const current = (player === '1') ? window.selectedFighterP1 : window.selectedFighterP2;
  const idx = ROSTER_KEYS.indexOf(current);
  const nextIdx = (idx + dir + ROSTER_KEYS.length) % ROSTER_KEYS.length;
  setFighterSelection(player, ROSTER_KEYS[nextIdx]);
  if (window.soundFX) window.soundFX.playSelect();
}

function setFighterSelection(player, charId, animate = true) {
  if (window.isTrainingModeSelected && player === '2') {
    // Opponent in Training Mode is locked to Dummy
    return;
  }

  if (player === '1') {
    window.selectedFighterP1 = charId;
  } else {
    window.selectedFighterP2 = charId;
  }

  // Update card cursor borders
  document.querySelectorAll('.roster-card').forEach(card => {
    const c = card.dataset.char;
    card.classList.toggle('p1-selected', c === window.selectedFighterP1);
    if (!window.isTrainingModeSelected) {
      card.classList.toggle('p2-selected', c === window.selectedFighterP2);
    } else {
      card.classList.remove('p2-selected');
    }
  });

  // Update fighter presentation display
  updateFighterDisplay(player, charId, animate);
}

function updateFighterDisplay(player, charId, animate = true) {
  const data = MK1_ROSTER[charId] || MK1_ROSTER['harpy'];
  const nameEl = document.getElementById(`p${player}-name`);
  const subtitleEl = document.getElementById(`p${player}-subtitle`);
  const archetypeEl = document.getElementById(`p${player}-archetype`);
  const renderImg = document.getElementById(`p${player}-render-img`);

  if (nameEl) {
    if (player === '2' && window.isTrainingModeSelected) {
      nameEl.textContent = `DUMMY: ${data.name}`;
    } else {
      nameEl.textContent = data.name;
    }
  }
  if (subtitleEl) subtitleEl.textContent = data.subtitle;
  if (archetypeEl) archetypeEl.textContent = data.archetype;

  if (renderImg) {
    if (animate) {
      renderImg.classList.add('fade-enter');
      setTimeout(() => {
        renderImg.src = data.render;
        renderImg.classList.remove('fade-enter');
      }, 100);
    } else {
      renderImg.src = data.render;
    }
  }
}

function initGrimoireTabs() {
  const tabs = document.querySelectorAll('.grimoire-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const charId = tab.dataset.char;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.style.opacity = '0.65';
        t.style.borderColor = 'rgba(255,255,255,0.2)';
      });
      tab.classList.add('active');
      tab.style.opacity = '1';
      tab.style.borderColor = '#f59e0b';
      switchGrimoireCharacter(charId);
      if (window.soundFX) window.soundFX.playHover();
    });
  });
  switchGrimoireCharacter('harpy');
}

function switchGrimoireCharacter(charId) {
  const tbody = document.getElementById('grimoire-tbody');
  const title = document.getElementById('grimoire-char-title');
  if (!tbody) return;

  if (charId === 'strange') {
    if (title) title.textContent = '🔮 DOCTOR STRANGE (ZONER / MYSTIC ARTS)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Eldritch Strike (5A)</strong></td>
        <td><span class="command-key">F / J</span></td>
        <td>6f</td><td>3f</td><td>7f</td>
        <td><span style="color: #4ade80;">+2f</span></td>
        <td>45 HP</td>
      </tr>
      <tr>
        <td><strong>Astral Punch (5B)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>8f</td><td>4f</td><td>11f</td>
        <td><span style="color: #4ade80;">+1f</span></td>
        <td>80 HP</td>
      </tr>
      <tr>
        <td><strong>Flames of the Faltine (5C)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>12f</td><td>6f</td><td>18f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>125 HP (Wallbounce)</td>
      </tr>
      <tr>
        <td><strong>Crimson Bands (Special Projectile)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>11f</td><td>8f</td><td>19f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>155 HP (Orb Missile)</td>
      </tr>
      <tr>
        <td><strong>Mirror Dimension Shatter</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>10f</td><td>12f</td><td>22f</td>
        <td><span style="color: #f87171;">-5f</span></td>
        <td>245 HP (Super)</td>
      </tr>
    `;
  } else if (charId === 'chunli') {
    if (title) title.textContent = '⚡ CHUN-LI (RUSHDOWN / KIKOKEN & LIGHTNING LEGS)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Basic Strike (5A)</strong></td>
        <td><span class="command-key">F / J</span></td>
        <td>5f</td><td>3f</td><td>7f</td>
        <td><span style="color: #4ade80;">+3f</span></td>
        <td>42 HP</td>
      </tr>
      <tr>
        <td><strong>Hyakuretsukyaku (5B / 6B Lightning Legs)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>7f</td><td>5f</td><td>11f</td>
        <td><span style="color: #4ade80;">+1f</span></td>
        <td>85 HP</td>
      </tr>
      <tr>
        <td><strong>Spinning Bird Kick (5C Heavy)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>9f</td><td>6f</td><td>14f</td>
        <td><span style="color: #fde047;">-1f</span></td>
        <td>125 HP (Air Cleave)</td>
      </tr>
      <tr>
        <td><strong>Kikoken (Special Projectile)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>10f</td><td>8f</td><td>18f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>150 HP (3D Cyan Plasma)</td>
      </tr>

      <tr>
        <td><strong>Hoyoku-sen (Super Art Finisher)</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>9f</td><td>12f</td><td>22f</td>
        <td><span style="color: #f87171;">-5f</span></td>
        <td>250 HP (Super)</td>
      </tr>
    `;
  } else if (charId === 'mewtwo') {
    if (title) title.textContent = '👁️ MEWTWO (ZONER / TELEKINETIC OVERLORD)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Psychic Palm (5A)</strong></td>
        <td><span class="command-key">F / J</span></td>
        <td>5f</td><td>3f</td><td>7f</td>
        <td><span style="color: #4ade80;">+3f</span></td>
        <td>45 HP</td>
      </tr>
      <tr>
        <td><strong>Psychic Crush (5B)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>7f</td><td>5f</td><td>11f</td>
        <td><span style="color: #4ade80;">+1f</span></td>
        <td>85 HP</td>
      </tr>
      <tr>
        <td><strong>Teleport Strike (5C Heavy)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>9f</td><td>6f</td><td>14f</td>
        <td><span style="color: #fde047;">-1f</span></td>
        <td>125 HP (Wallbounce)</td>
      </tr>
      <tr>
        <td><strong>Shadow Ball (Special Projectile)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>10f</td><td>8f</td><td>18f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>155 HP (Dark Plasma)</td>
      </tr>
      <tr>
        <td><strong>Psystrike (Super Art Finisher)</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>9f</td><td>12f</td><td>22f</td>
        <td><span style="color: #f87171;">-5f</span></td>
        <td>260 HP (Super Explosion)</td>
      </tr>
    `;
  } else if (charId === 'steve') {
    if (title) title.textContent = '⛏️ STEVE (BRAWLER / TRAP SPECIALIST)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Blocky Punch (5A)</strong></td>
        <td><span class="command-key">F / J</span></td>
        <td>5f</td><td>3f</td><td>7f</td>
        <td><span style="color: #4ade80;">+3f</span></td>
        <td>42 HP</td>
      </tr>
      <tr>
        <td><strong>Diamond Sword Slash (5B)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>7f</td><td>5f</td><td>11f</td>
        <td><span style="color: #4ade80;">+1f</span></td>
        <td>84 HP</td>
      </tr>
      <tr>
        <td><strong>Pickaxe Ground Smash (5C Heavy)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>10f</td><td>6f</td><td>15f</td>
        <td><span style="color: #fde047;">-2f</span></td>
        <td>128 HP (Ground Bounce)</td>
      </tr>
      <tr>
        <td><strong>TNT Toss (Special Projectile)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>10f</td><td>8f</td><td>18f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>150 HP (Live Explosive)</td>
      </tr>
      <tr>
        <td><strong>Megaton Detonation (Super Art Finisher)</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>9f</td><td>12f</td><td>22f</td>
        <td><span style="color: #f87171;">-5f</span></td>
        <td>255 HP (Voxel Cataclysm)</td>
      </tr>
    `;
  } else {
    if (title) title.textContent = '🦅 HARPY THE SKY TERROR (RUSHDOWN / AERIAL)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Talon Jab (5A)</strong></td>
        <td><span class="command-key">F / J</span></td>
        <td>5f</td><td>3f</td><td>8f</td>
        <td><span style="color: #4ade80;">+3f</span></td>
        <td>40 HP</td>
      </tr>
      <tr>
        <td><strong>Wing Flurry (5B)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>8f</td><td>4f</td><td>12f</td>
        <td><span style="color: #fde047;">0f</span></td>
        <td>75 HP</td>
      </tr>
      <tr>
        <td><strong>Gale Strike (5C)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>11f</td><td>5f</td><td>17f</td>
        <td><span style="color: #f87171;">-3f</span></td>
        <td>120 HP (Wallbounce)</td>
      </tr>
      <tr>
        <td><strong>Tempest Cyclone (Special)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>10f</td><td>6f</td><td>16f</td>
        <td><span style="color: #f87171;">-4f</span></td>
        <td>150 HP</td>
      </tr>
      <tr>
        <td><strong>Tempest Feather Storm</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>12f</td><td>10f</td><td>20f</td>
        <td><span style="color: #f87171;">-6f</span></td>
        <td>220 HP (Super)</td>
      </tr>
    `;
  }
}


function openCharacterSelect(mode = 'VERSUS') {
  window.isTrainingModeSelected = (mode === 'TRAINING');
  window.isLanMatch = (mode === 'LAN');
  const fightBtn = document.getElementById('btnLaunchFight');
  const fightBtnText = document.querySelector('#btnLaunchFight .mk1-fight-btn-text');
  
  if (fightBtnText) {
    if (mode === 'TRAINING') {
      fightBtnText.textContent = 'ENTER DOJO';
    } else if (mode === 'LAN') {
      const isHost = (window.lanManager && window.lanManager.role === 'HOST');
      fightBtnText.textContent = isHost ? 'START LAN KOMBAT' : 'WAITING FOR HOST...';
      if (fightBtn) fightBtn.style.opacity = isHost ? '1' : '0.5';
    } else {
      fightBtnText.textContent = 'FIGHT';
      if (fightBtn) fightBtn.style.opacity = '1';
    }
  }

  if (window.isTrainingModeSelected) {
    // In Training mode, Opponent is ALWAYS the Dummy! Only Player 1 is chosen by the player.
    window.selectedFighterP2 = 'dummy';
    updateFighterDisplay('1', window.selectedFighterP1 || 'harpy', false);
    updateFighterDisplay('2', 'dummy', false);
    // Remove P2 selection indicator from all roster cards
    document.querySelectorAll('.roster-card').forEach(card => card.classList.remove('p2-selected'));
  } else {
    if (window.selectedFighterP2 === 'dummy') {
      window.selectedFighterP2 = 'strange';
    }
    updateFighterDisplay('1', window.selectedFighterP1 || 'harpy', false);
    updateFighterDisplay('2', window.selectedFighterP2 || 'strange', false);
  }

  openModal('modal-battle-prompt');
}

function openModal(id) {
  closeAllModals();
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('open');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
}

function toggleFullscreen() {
  if (window.electronAPI && window.electronAPI.toggleFullscreen) {
    window.electronAPI.toggleFullscreen();
  } else {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }
}

// ----------------------------------------------------
// 4. Gamepad Polling (P1 Controller Support)
// ----------------------------------------------------
function initGamepadSupport() {
  let prevDpadUp = false;
  let prevDpadDown = false;
  let prevButtonA = false;

  function pollGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];

    if (gp) {
      const dpadUp = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
      const dpadDown = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
      const buttonA = gp.buttons[0]?.pressed; // A / Cross
      const buttonB = gp.buttons[1]?.pressed; // B / Circle

      const openModal = document.querySelector('.modal-overlay.open');

      if (openModal) {
        if (buttonB) closeAllModals();
      } else {
        if (dpadUp && !prevDpadUp) {
          activeIndex = (activeIndex - 1 + menuItems.length) % menuItems.length;
          menuItems.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
          if (window.soundFX) window.soundFX.playHover();
        } else if (dpadDown && !prevDpadDown) {
          activeIndex = (activeIndex + 1) % menuItems.length;
          menuItems.forEach((item, i) => item.classList.toggle('active', i === activeIndex));
          if (window.soundFX) window.soundFX.playHover();
        } else if (buttonA && !prevButtonA) {
          executeMenuItem(menuItems[activeIndex]?.dataset.action);
        }
      }

      prevDpadUp = dpadUp;
      prevDpadDown = dpadDown;
      prevButtonA = buttonA;
    }

    requestAnimationFrame(pollGamepads);
  }

  window.addEventListener('gamepadconnected', (e) => {
    console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}`);
  });

  requestAnimationFrame(pollGamepads);
}

// ----------------------------------------------------
// 2.5. Dojo Training Mode Setup & In-Game Controls
// ----------------------------------------------------
window.dojoP1 = 'harpy';
window.dojoP2 = 'strange';
window.dojoStage = 'japanese_temple';

function initDojoSetup() {
  // P1 Fighter Selection Pills
  document.querySelectorAll('#dojoP1Picker .dojo-char-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#dojoP1Picker .dojo-char-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      window.dojoP1 = pill.dataset.char;
      if (window.soundFX) window.soundFX.playSelect();
    });
  });

  // Dummy P2 Selection Pills
  document.querySelectorAll('#dojoP2Picker .dojo-char-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#dojoP2Picker .dojo-char-pill').forEach(p => p.classList.remove('dummy-selected'));
      pill.classList.add('dummy-selected');
      window.dojoP2 = pill.dataset.char;
      if (window.soundFX) window.soundFX.playSelect();
    });
  });

  // Stage Selection Pills
  document.querySelectorAll('#dojoStagePicker .dojo-char-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#dojoStagePicker .dojo-char-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
      window.dojoStage = pill.dataset.stage;
      if (window.soundFX) window.soundFX.playSelect();
    });
  });

  // Launch Training Mode CTA
  const btnLaunch = document.getElementById('btnLaunchTraining');
  if (btnLaunch) {
    btnLaunch.addEventListener('click', () => {
      closeAllModals();
      if (window.startMatchWithLoadingScreen) {
        window.startMatchWithLoadingScreen({
          p1Char: window.dojoP1 || 'harpy',
          p2Char: window.dojoP2 || 'strange',
          stage: window.dojoStage || 'japanese_temple',
          isTraining: true
        });
      }
    });
  }

  // In-Game Training Settings Modal: Tabs
  document.querySelectorAll('.training-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.training-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.training-tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = 'ttab-' + btn.dataset.tab;
      const content = document.getElementById(tabId);
      if (content) content.classList.add('active');
      if (window.soundFX) window.soundFX.playHover();
    });
  });

  // In-Game Training Settings Modal: Segmented Controls
  document.querySelectorAll('.segmented-control').forEach(seg => {
    const settingKey = seg.dataset.setting;
    seg.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset.val;
        if (window.activeArenaScene) {
          window.activeArenaScene.setTrainingSetting(settingKey, isNaN(Number(val)) ? val : Number(val));
        }
        if (window.soundFX) window.soundFX.playSelect();
      });
    });
  });
}
