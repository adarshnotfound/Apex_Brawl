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
      openModal('modal-battle-prompt');
      break;
    case 'arcade':
      openModal('modal-arcade');
      break;
    case 'training':
      openModal('modal-training');
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
      closeAllModals();
      if (window.startMatchWithLoadingScreen) {
        window.startMatchWithLoadingScreen({
          p1Char: window.selectedFighterP1,
          p2Char: window.selectedFighterP2
        });
      } else if (window.startPhaserArena) {
        window.startPhaserArena();
      }
    });
  }

  // Grimoire Character Tab Switching
  initGrimoireTabs();

  // Character Picker for Player 1 and Player 2
  initCharacterSelection();
}

window.selectedFighterP1 = 'harpy';
window.selectedFighterP2 = 'strange';

function initCharacterSelection() {
  document.querySelectorAll('.char-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const player = btn.dataset.player; // "1" or "2"
      const charId = btn.dataset.char;   // "harpy"
      
      document.querySelectorAll(`.char-picker-btn[data-player="${player}"]`).forEach(b => {
        b.style.opacity = '0.5';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
      });
      btn.style.opacity = '1';
      btn.style.borderColor = '#f59e0b';

      if (player === '1') {
        window.selectedFighterP1 = charId;
      } else {
        window.selectedFighterP2 = charId;
      }

      updatePlayerCardUI(player, charId);
      if (window.soundFX) window.soundFX.playSelect();
    });
  });
}

function updatePlayerCardUI(player, charId) {
  const card = document.getElementById(`p${player}-card`);
  const portrait = document.getElementById(`p${player}-portrait`);
  const title = document.getElementById(`p${player}-title`);
  const archetype = document.getElementById(`p${player}-archetype`);
  const keys = document.getElementById(`p${player}-keys`);

  if (!card) return;

  if (charId === 'strange') {
    card.style.background = 'rgba(245, 158, 11, 0.15)';
    card.style.borderColor = '#f59e0b';
    if (portrait) portrait.src = '../../assets/characters/Dr Strange/portrait.png';
    if (portrait) portrait.style.borderColor = '#f59e0b';
    if (title) title.textContent = 'DR. STRANGE';
    if (archetype) {
      archetype.textContent = 'Sorcerer Supreme • Mystic Arts (Zoner / Spells)';
      archetype.style.color = '#fde047';
    }
    if (keys) {
      keys.innerHTML = player === '1' 
        ? `Move: <span class="command-key">WASD</span> | Jump: <span class="command-key">SPACE</span><br>Attacks: <span class="command-key">F</span> (5A) <span class="command-key">G</span> (5B) <span class="command-key">H</span> (5C)<br>Special: <span class="command-key">R</span> (Mystic Orb) | Super: <span class="command-key">S+H / Y</span> | Dash: <span class="command-key">Q</span>`
        : `Move: <span class="command-key">ARROWS ↑ ← ↓ →</span><br>Attacks: <span class="command-key">J / NUM1</span> (5A) <span class="command-key">K / NUM2</span> (5B) <span class="command-key">L / NUM3</span> (5C)<br>Special: <span class="command-key">U / NUM4</span> (Mystic Orb) | Super: <span class="command-key">↓+L / I</span> | Dash: <span class="command-key">O</span>`;
    }
  } else if (charId === 'chunli') {
    card.style.background = 'rgba(2, 132, 199, 0.15)';
    card.style.borderColor = '#0284c7';
    if (portrait) portrait.src = '../../assets/characters/ChunLi/portrait.png';
    if (portrait) portrait.style.borderColor = '#0284c7';
    if (title) title.textContent = 'CHUN-LI';
    if (archetype) {
      archetype.textContent = 'Strongest Woman in the World • Lightning Strikes (Rushdown)';
      archetype.style.color = '#38bdf8';
    }
    if (keys) {
      keys.innerHTML = player === '1' 
        ? `Move: <span class="command-key">WASD</span> | Jump: <span class="command-key">SPACE</span><br>Attacks: <span class="command-key">F</span> (5A) <span class="command-key">G</span> (5B) <span class="command-key">H</span> (5C)<br>Special: <span class="command-key">R</span> (Kikoken) | Super: <span class="command-key">S+H / Y</span> | Dash: <span class="command-key">Q</span>`
        : `Move: <span class="command-key">ARROWS ↑ ← ↓ →</span><br>Attacks: <span class="command-key">J / NUM1</span> (5A) <span class="command-key">K / NUM2</span> (5B) <span class="command-key">L / NUM3</span> (5C)<br>Special: <span class="command-key">U / NUM4</span> (Kikoken) | Super: <span class="command-key">↓+L / I</span> | Dash: <span class="command-key">O</span>`;
    }
  } else {
    card.style.background = 'rgba(6, 182, 212, 0.15)';
    card.style.borderColor = '#06b6d4';
    if (portrait) portrait.src = '../../assets/characters/harpy/portrait.png';
    if (portrait) portrait.style.borderColor = '#06b6d4';
    if (title) title.textContent = 'HARPY';
    if (archetype) {
      archetype.textContent = 'Sky Terror • Aerial Striker (Rushdown)';
      archetype.style.color = '#67e8f9';
    }
    if (keys) {
      keys.innerHTML = player === '1' 
        ? `Move: <span class="command-key">WASD</span> | Jump: <span class="command-key">SPACE</span><br>Attacks: <span class="command-key">F</span> (5A) <span class="command-key">G</span> (5B) <span class="command-key">H</span> (5C)<br>Special: <span class="command-key">R</span> | Super: <span class="command-key">S+H / Y</span> | Dash: <span class="command-key">Q</span>`
        : `Move: <span class="command-key">ARROWS ↑ ← ↓ →</span><br>Attacks: <span class="command-key">J / NUM1</span> (5A) <span class="command-key">K / NUM2</span> (5B) <span class="command-key">L / NUM3</span> (5C)<br>Special: <span class="command-key">U / NUM4</span> | Super: <span class="command-key">↓+L / I</span> | Dash: <span class="command-key">O</span>`;
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
        <td><strong>Hyakuretsukyaku (5B / Lightning Legs)</strong></td>
        <td><span class="command-key">G / K</span></td>
        <td>7f</td><td>5f</td><td>11f</td>
        <td><span style="color: #4ade80;">+1f</span></td>
        <td>82 HP</td>
      </tr>
      <tr>
        <td><strong>Spinning Bird Kick (6B)</strong></td>
        <td><span class="command-key">D+G / →+K</span></td>
        <td>8f</td><td>6f</td><td>13f</td>
        <td><span style="color: #fde047;">-1f</span></td>
        <td>95 HP</td>
      </tr>
      <tr>
        <td><strong>Fierce Qi Strike (5C)</strong></td>
        <td><span class="command-key">H / L</span></td>
        <td>10f</td><td>5f</td><td>16f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>120 HP (Wallbounce)</td>
      </tr>
      <tr>
        <td><strong>Kikoken (Special Projectile)</strong></td>
        <td><span class="command-key">R / U</span></td>
        <td>10f</td><td>8f</td><td>18f</td>
        <td><span style="color: #f87171;">-2f</span></td>
        <td>150 HP (3D Cyan Plasma)</td>
      </tr>
      <tr>
        <td><strong>Spinning Bird Kick (Anti-Air Special)</strong></td>
        <td><span class="command-key">W+R / ↑+U</span></td>
        <td>7f</td><td>8f</td><td>19f</td>
        <td><span style="color: #f87171;">-6f</span></td>
        <td>165 HP (Whirlwind)</td>
      </tr>
      <tr>
        <td><strong>Hoyoku-sen (Super Art Finisher)</strong></td>
        <td><span class="command-key">S+H / Y / ↓+L / I</span></td>
        <td>9f</td><td>12f</td><td>22f</td>
        <td><span style="color: #f87171;">-5f</span></td>
        <td>250 HP (Super)</td>
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
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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
