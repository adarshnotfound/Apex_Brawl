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
        // Redirect or mount Phaser game scene
        window.location.hash = '#fight';
        closeAllModals();
        alert('Entering Kombat Arena! Next step: Initializing Phaser Battle Arena.');
      }, 700);
    });
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
