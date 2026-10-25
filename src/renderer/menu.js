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
    // If arena is active, ignore menu key events completely!
    const phaserContainer = document.getElementById('phaser-container');
    if (phaserContainer && phaserContainer.style.display !== 'none') {
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
      if (window.soundFX) window.soundFX.playStartBoom();
      fightBtn.textContent = 'ENTERING THE ARENA...';
      setTimeout(() => {
        closeAllModals();
        fightBtn.textContent = 'ENTER ARENA & KOMBAT';
        if (window.startPhaserArena) {
          window.startPhaserArena();
        }
      }, 500);
    });
  }

  // Grimoire Character Tab Switching
  initGrimoireTabs();

  // Character Picker for Player 1 and Player 2
  initCharacterSelection();
}

window.selectedFighterP1 = 'harpy';
window.selectedFighterP2 = 'kharon';

function initCharacterSelection() {
  document.querySelectorAll('.char-picker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const player = btn.dataset.player; // "1" or "2"
      const charId = btn.dataset.char;   // "harpy" or "kharon"
      
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

  if (charId === 'harpy') {
    card.style.background = 'rgba(6, 182, 212, 0.15)';
    card.style.borderColor = '#06b6d4';
    if (portrait) portrait.src = '../../assets/characters/harpy/portrait.png';
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
  } else {
    card.style.background = 'rgba(220, 38, 38, 0.15)';
    card.style.borderColor = '#dc2626';
    if (portrait) portrait.src = '../../assets/characters/kharon/portrait.png';
    if (title) title.textContent = 'KHARON';
    if (archetype) {
      archetype.textContent = 'Pyromancer Ninja • Rushdown';
      archetype.style.color = '#f87171';
    }
    if (keys) {
      keys.innerHTML = player === '1'
        ? `Move: <span class="command-key">WASD</span> | Jump: <span class="command-key">SPACE</span><br>Attacks: <span class="command-key">F</span> (Light) <span class="command-key">G</span> (Med) <span class="command-key">H</span> (Heavy)<br>Special: <span class="command-key">R</span> | Super: <span class="command-key">S+H / Y</span> | Dash: <span class="command-key">Q</span>`
        : `Move: <span class="command-key">ARROWS ↑ ← ↓ →</span><br>Attacks: <span class="command-key">J / NUM1</span> (Light) <span class="command-key">K / NUM2</span> (Med) <span class="command-key">L / NUM3</span> (Heavy)<br>Special: <span class="command-key">U / NUM4</span> | Super: <span class="command-key">↓+L / I</span> | Dash: <span class="command-key">O</span>`;
    }
  }
}

function initGrimoireTabs() {
  const tabs = document.querySelectorAll('.grimoire-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const charId = tab.dataset.char;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchGrimoireCharacter(charId);
      if (window.soundFX) window.soundFX.playHover();
    });
  });
}

function switchGrimoireCharacter(charId) {
  const tbody = document.getElementById('grimoire-tbody');
  const title = document.getElementById('grimoire-char-title');
  if (!tbody) return;

  if (charId === 'harpy') {
    if (title) title.textContent = '🦅 HARPY THE SKY TERROR (RUSHDOWN / AERIAL)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Talon Jab (5A)</strong></td>
        <td><span class="command-key">F</span></td>
        <td>5f</td><td>3f</td><td>8f</td>
        <td><span style="color: #4ade80;">+3f</span></td>
        <td>40 HP</td>
      </tr>
      <tr>
        <td><strong>Wing Flurry (5B)</strong></td>
        <td><span class="command-key">G</span></td>
        <td>8f</td><td>4f</td><td>12f</td>
        <td><span style="color: #fde047;">0f</span></td>
        <td>75 HP</td>
      </tr>
      <tr>
        <td><strong>Gale Strike (5C)</strong></td>
        <td><span class="command-key">S + G</span></td>
        <td>11f</td><td>5f</td><td>17f</td>
        <td><span style="color: #f87171;">-3f</span></td>
        <td>120 HP (Wallbounce)</td>
      </tr>
      <tr>
        <td><strong>Tempest Feather Storm</strong></td>
        <td><span class="command-key">S ➔ D + H</span></td>
        <td>12f</td><td>10f</td><td>20f</td>
        <td><span style="color: #f87171;">-6f</span></td>
        <td>220 HP (Super)</td>
      </tr>
    `;
  } else {
    if (title) title.textContent = '🔥 KHARON THE PYROMANCER (RUSHDOWN)';
    tbody.innerHTML = `
      <tr>
        <td><strong>Jab</strong></td>
        <td><span class="command-key">F</span></td>
        <td>6f</td><td>3f</td><td>10f</td>
        <td><span style="color: #4ade80;">+2f</span></td>
        <td>45 HP</td>
      </tr>
      <tr>
        <td><strong>Heavy Slash</strong></td>
        <td><span class="command-key">G</span></td>
        <td>12f</td><td>4f</td><td>18f</td>
        <td><span style="color: #f87171;">-4f</span></td>
        <td>110 HP</td>
      </tr>
      <tr>
        <td><strong>Crouch Sweep</strong></td>
        <td><span class="command-key">S + F</span></td>
        <td>9f</td><td>4f</td><td>15f</td>
        <td><span style="color: #f87171;">-7f</span></td>
        <td>85 HP (Trip)</td>
      </tr>
      <tr>
        <td><strong>Hellfire Surge</strong></td>
        <td><span class="command-key">S ➔ D + H</span></td>
        <td>14f</td><td>8f</td><td>22f</td>
        <td><span style="color: #f87171;">-9f</span></td>
        <td>180 HP (Burn)</td>
      </tr>
      <tr>
        <td><strong>Shadow Teleport</strong></td>
        <td><span class="command-key">S ➔ A + H</span></td>
        <td>10f</td><td>-</td><td>12f</td>
        <td>Neutral</td>
        <td>0 HP (Evasion)</td>
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
