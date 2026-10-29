// =========================================================
// Apex Brawl: Mystic Kombat - VS Loading Screen Controller
// Directly synchronized with Phaser 3 Preload & Scene Ready
// =========================================================

(function () {
  const FIGHTER_REGISTRY = {
    harpy: {
      id: 'harpy',
      name: 'HARPY',
      subtitle: 'The Sky Terror',
      archetype: 'Rushdown • Aerial Striker',
      portrait: '../../assets/characters/harpy/portrait.png',
      themeColor: '#06b6d4',
      accentColor: '#67e8f9',
      glowColor: 'rgba(6, 182, 212, 0.6)',
      quote: '"The skies belong to the apex predator!"',
      tips: [
        'Harpy can cancel Talon Jab (5A) into Wing Flurry (5B) and Dive Kick (8C) for fast corner combos.',
        'Harpy possesses higher jump velocity than other combatants—use aerial attacks to evade ground spells.',
        'Harpy\'s Dive Kick (8C) has high priority and can punish opponents caught in recovery frames.'
      ]
    },
    strange: {
      id: 'strange',
      name: 'DR. STRANGE',
      subtitle: 'Master of the Mystic Arts',
      archetype: 'Zoner • Spellcaster Supreme',
      portrait: '../../assets/characters/Dr_Strange/portrait.png',
      themeColor: '#f59e0b',
      accentColor: '#fde047',
      glowColor: 'rgba(245, 158, 11, 0.6)',
      quote: '"Dormammu, I have come to bargain."',
      tips: [
        'Doctor Strange\'s Mystic Orb (R / U) zones space and controls opponent jump trajectories.',
        'Use Eldritch Strike (5A) to poke at mid-range and cancel into Astral Punch (5B) on confirmation.',
        'Doctor Strange\'s heavy frame allows him to absorb pressure while waiting for teleport openings.'
      ]
    },
    chunli: {
      id: 'chunli',
      name: 'CHUN-LI',
      subtitle: 'Strongest Woman in the World',
      archetype: 'Rushdown • Lightning Strikes',
      portrait: '../../assets/characters/ChunLi/portrait.png',
      themeColor: '#0284c7',
      accentColor: '#38bdf8',
      glowColor: 'rgba(2, 132, 199, 0.6)',
      quote: '"My lightning kicks never miss their mark!"',
      tips: [
        'Chun-Li\'s Hyakuretsukyaku (Lightning Legs) inflicts rapid multi-hits and heavy block pressure.',
        'Use Kikoken (R / U) to contest zoning and force opponents into jump-in mistakes.',
        'Spinning Bird Kick (8C) provides outstanding anti-air coverage against aerial rushdowns.'
      ]
    },
    mewtwo: {
      id: 'mewtwo',
      name: 'MEWTWO',
      subtitle: 'Genetic Apex & Psychic Overlord',
      archetype: 'Zoner • Telekinetic Striker',
      portrait: '../../assets/characters/Mewtwo/portrait.png',
      themeColor: '#9333ea',
      accentColor: '#c084fc',
      glowColor: 'rgba(147, 51, 234, 0.6)',
      quote: '"The circumstances of one\'s birth are irrelevant. It is what you do with life that determines who you are."',
      tips: [
        'Mewtwo\'s Shadow Ball (R / U) crosses the screen at tremendous speed to dictate neutral space.',
        'Psychic Crush (5B) creates an energy field around foes to shatter defensive blocks.',
        'Teleport Strike (5C) warps through attacks and wallbounces opponents into aerial follow-ups.'
      ]
    },
    steve: {
      id: 'steve',
      name: 'STEVE',
      subtitle: 'Master Crafter & Sandbox Champion',
      archetype: 'Brawler • Trap Specialist',
      portrait: '../../assets/characters/Steve/portrait.png',
      themeColor: '#0d9488',
      accentColor: '#2dd4bf',
      glowColor: 'rgba(13, 148, 136, 0.6)',
      quote: '"Eat, mine, craft, survive."',
      tips: [
        'Steve\'s TNT Toss (R / U) lobs explosive charges that explode on contact with massive impact.',
        'Diamond Sword Slash (5B) has exceptional horizontal priority to swat away incoming rushdowns.',
        'Pickaxe Ground Smash (5C) causes an intense ground bounce, leaving opponents vulnerable.'
      ]
    },
    zoro: {
      id: 'zoro',
      name: 'RORONOA ZORO',
      subtitle: 'Pirate Hunter & Master Swordsman',
      archetype: 'Striker • Three-Sword Style',
      portrait: '../../assets/characters/Zoro/portrait.png',
      themeColor: '#10b981',
      accentColor: '#34d399',
      glowColor: 'rgba(16, 185, 129, 0.6)',
      quote: '"Scars on the back are a swordsman\'s shame."',
      tips: [
        'Zoro\'s 360 Pound Cannon (R / U) fires an emerald blade cyclone across the arena.',
        'Overhead Dual Cleave (5B / 6B) cuts through incoming attacks with tremendous vertical arc.',
        'Oni Giri Demon Slash (Super) dashes forward in a devastating cross-cleave.'
      ]
    }
  };

  const GENERAL_TIPS = [
    'CANCEL CHAINS: Normal attacks chain naturally: Light (5A) → Medium (5B) → Heavy (5C)!',
    'AIR SUPERIORITY: Airborne strikes deal bonus hitstun against crouching combatants.',
    'SUPER ATTACKS: Execute [S + H / Y] (P1) or [↓ + L / I] (P2) to unleash devastating Supers!',
    'TIMEOUT DECISION: If the 120-second clock expires, the fighter with highest HP wins the round.',
    'BEST OF 3: Win 2 rounds to be crowned the ultimate Apex Champion!'
  ];

  let isLoadingActive = false;
  let isArenaReady = false;
  let skipRequested = false;
  let startTime = 0;
  const MIN_DISPLAY_TIME_MS = 1400; // Minimum time to enjoy the VS presentation
  let fallbackTimer = null;
  let simulatedProgressTimer = null;
  let currentVisualProgress = 0;

  function initLoadingScreenUI() {
    window.addEventListener('keydown', (e) => {
      if (!isLoadingActive) return;
      if (e.key === ' ' || e.key === 'Enter') {
        fastForwardLoading();
        e.preventDefault();
      }
    });

    const skipPrompt = document.querySelector('.vs-skip-prompt');
    if (skipPrompt) {
      skipPrompt.addEventListener('click', () => {
        if (isLoadingActive) fastForwardLoading();
      });
    }
  }

  function startMatchWithLoadingScreen(options = {}) {
    const p1Id = options.p1Char || window.selectedFighterP1 || 'harpy';
    const p2Id = options.p2Char || window.selectedFighterP2 || 'strange';
    const selectedStage = options.stage || window.selectedStage || 'japanese_temple';
    window.selectedStage = selectedStage;
    const stageName = options.stageName || (selectedStage === 'sky_temple' ? 'THE ETERNAL SKY TEMPLE • CELESTIAL ABYSS' : 'MOONLIT MOUNTAIN SHRINE • GEKKA NO REIBYŌ');
    const matchType = options.matchType || 'BEST OF 3 ROUNDS • 120s TIMER';

    const p1Data = FIGHTER_REGISTRY[p1Id] || FIGHTER_REGISTRY['harpy'];
    const p2Data = FIGHTER_REGISTRY[p2Id] || FIGHTER_REGISTRY['strange'];

    const screen = document.getElementById('vs-loading-screen');
    if (!screen) {
      if (window.startPhaserArena) window.startPhaserArena();
      return;
    }

    isLoadingActive = true;
    isArenaReady = false;
    skipRequested = false;
    currentVisualProgress = 0;
    startTime = Date.now();

    // 1. Play dramatic launch boom sound
    if (window.soundFX) {
      window.soundFX.playStartBoom();
    }

    // 2. Populate Header
    const stageElem = document.getElementById('vs-stage-name');
    const matchElem = document.getElementById('vs-match-type');
    if (stageElem) stageElem.textContent = stageName;
    if (matchElem) matchElem.innerHTML = `<span class="vs-match-badge">⚔️ 1v1 DUEL</span> ${matchType}`;

    // 3. Populate Player 1 Card
    const p1Card = document.getElementById('vs-card-p1');
    const p1Portrait = document.getElementById('vs-p1-portrait');
    const p1Name = document.getElementById('vs-p1-name');
    const p1Title = document.getElementById('vs-p1-title');
    const p1Quote = document.getElementById('vs-p1-quote');
    const p1Frame = document.getElementById('vs-p1-frame');

    if (p1Card) {
      p1Card.style.setProperty('--fighter-theme-color', p1Data.themeColor);
      p1Card.style.setProperty('--fighter-accent-color', p1Data.accentColor);
      p1Card.style.setProperty('--fighter-glow-color', p1Data.glowColor);
      p1Card.style.setProperty('--p1-color', p1Data.themeColor);
    }
    if (p1Portrait) {
      p1Portrait.src = p1Data.portrait;
      p1Portrait.alt = p1Data.name;
    }
    if (p1Frame) {
      p1Frame.style.boxShadow = `0 0 30px ${p1Data.glowColor}`;
      p1Frame.style.border = `2px solid ${p1Data.accentColor}`;
    }
    if (p1Name) p1Name.textContent = p1Data.name;
    if (p1Title) p1Title.textContent = p1Data.subtitle;
    if (p1Quote) p1Quote.textContent = p1Data.quote;

    // 4. Populate Player 2 Card
    const p2Card = document.getElementById('vs-card-p2');
    const p2Portrait = document.getElementById('vs-p2-portrait');
    const p2Name = document.getElementById('vs-p2-name');
    const p2Title = document.getElementById('vs-p2-title');
    const p2Quote = document.getElementById('vs-p2-quote');
    const p2Frame = document.getElementById('vs-p2-frame');
    const p2Badge = document.getElementById('vs-p2-badge');

    const isMirror = p1Id === p2Id;
    if (p2Badge) {
      p2Badge.innerHTML = isMirror ? '<span>👤 DEFENDER (MIRROR)</span>' : '<span>👤 DEFENDER (2P)</span>';
    }

    if (p2Card) {
      p2Card.style.setProperty('--fighter-theme-color', isMirror ? '#c4b5fd' : p2Data.themeColor);
      p2Card.style.setProperty('--fighter-accent-color', isMirror ? '#e9d5ff' : p2Data.accentColor);
      p2Card.style.setProperty('--fighter-glow-color', isMirror ? 'rgba(196, 181, 253, 0.6)' : p2Data.glowColor);
      p2Card.style.setProperty('--p2-color', isMirror ? '#c4b5fd' : p2Data.themeColor);
    }
    if (p2Portrait) {
      p2Portrait.src = p2Data.portrait;
      p2Portrait.alt = p2Data.name;
      p2Portrait.style.filter = isMirror ? 'hue-rotate(240deg) brightness(1.15)' : 'none';
    }
    if (p2Frame) {
      p2Frame.style.boxShadow = `0 0 30px ${isMirror ? 'rgba(196, 181, 253, 0.6)' : p2Data.glowColor}`;
      p2Frame.style.border = `2px solid ${isMirror ? '#e9d5ff' : p2Data.accentColor}`;
    }
    if (p2Name) p2Name.textContent = isMirror ? `${p2Data.name} (SHADOW)` : p2Data.name;
    if (p2Title) p2Title.textContent = p2Data.subtitle;
    if (p2Quote) p2Quote.textContent = p2Data.quote;

    // 5. Select Pro Tip
    const tipText = document.getElementById('vs-tip-content');
    if (tipText) {
      const candidates = [...p1Data.tips, ...p2Data.tips, ...GENERAL_TIPS];
      const randomTip = candidates[Math.floor(Math.random() * candidates.length)];
      tipText.innerHTML = `<strong>PRO TIP:</strong> ${randomTip}`;
    }

    // 6. Reset visual progress UI
    updateProgressUI(0, 'SYNCHRONIZING COMBATANTS...');

    // 7. Display the loading screen (it sits at z-index 150, fully covering viewport)
    screen.classList.remove('fade-out');
    screen.classList.add('active');

    // Trigger CSS entrance animation replay
    if (p1Card) {
      p1Card.style.animation = 'none';
      p1Card.offsetHeight;
      p1Card.style.animation = null;
    }
    if (p2Card) {
      p2Card.style.animation = 'none';
      p2Card.offsetHeight;
      p2Card.style.animation = null;
    }

    // Smooth initial creep while Phaser initializes
    if (simulatedProgressTimer) clearInterval(simulatedProgressTimer);
    simulatedProgressTimer = setInterval(() => {
      if (!isLoadingActive) {
        clearInterval(simulatedProgressTimer);
        return;
      }
      if (currentVisualProgress < 25) {
        currentVisualProgress += 2;
        updateProgressUI(currentVisualProgress, 'INITIALIZING GAME ENGINE & STAGE...');
      }
    }, 60);

    // 8. IMMEDIATELY start Phaser Arena in the background under the loading screen!
    if (window.startPhaserArena) {
      window.startPhaserArena();
    }

    // Fallback safety timeout (8s max, will never get stuck)
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      if (isLoadingActive) {
        console.warn('Loading screen fallback triggered');
        onPhaserArenaReady();
      }
    }, 8000);
  }

  // Hook called directly by Phaser's preload loader: this.load.on('progress')
  function onPhaserPreloadProgress(ratio) {
    if (!isLoadingActive) return;
    // Map ratio (0 to 1) to progress (25% to 85%)
    const target = 25 + Math.floor(ratio * 60);
    if (target > currentVisualProgress) {
      currentVisualProgress = target;
      updateProgressUI(currentVisualProgress, 'STREAMING SPRITE SHEETS & SOUNDS...');
    }
  }

  // Hook called by Phaser for each loaded asset file: this.load.on('fileprogress')
  function onPhaserPreloadFile(fileKey) {
    if (!isLoadingActive) return;
    if (fileKey) {
      const cleanName = String(fileKey).replace(/_/g, ' ').toUpperCase();
      updateProgressUI(Math.max(currentVisualProgress, 35), `LOADING ${cleanName}...`);
    }
  }

  // Hook called when Phaser finishes downloading all assets: this.load.on('complete')
  function onPhaserPreloadComplete() {
    if (!isLoadingActive) return;
    currentVisualProgress = 90;
    updateProgressUI(90, 'COMPILING ANIMATIONS & HITBOX ENGINES...');
  }

  // Hook called when ArenaScene.create() finishes completely and the arena is ready to render
  function onPhaserArenaReady() {
    if (!isLoadingActive) return;
    isArenaReady = true;

    if (simulatedProgressTimer) {
      clearInterval(simulatedProgressTimer);
      simulatedProgressTimer = null;
    }

    const elapsed = Date.now() - startTime;
    const remainingTime = skipRequested ? 0 : Math.max(0, MIN_DISPLAY_TIME_MS - elapsed);

    setTimeout(() => {
      if (!isLoadingActive) return;
      currentVisualProgress = 100;
      updateProgressUI(100, 'BATTLE READY! COMMENCING MATCH...');

      // Finish and reveal the arena with flash and fade
      revealArena();
    }, remainingTime);
  }

  function revealArena() {
    setTimeout(() => {
      if (!isLoadingActive) return;
      isLoadingActive = false;

      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }

      // 1. Play gong impact sound on launch
      if (window.soundFX) {
        window.soundFX.playSelect();
      }

      // 2. Full-screen flash burst
      const flash = document.getElementById('screen-flash-burst');
      if (flash) {
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 350);
      }

      // 3. Smoothly fade out the loading screen, revealing the already-rendered arena underneath!
      const screen = document.getElementById('vs-loading-screen');
      if (screen) {
        screen.classList.add('fade-out');
        setTimeout(() => {
          screen.classList.remove('active');
          screen.classList.remove('fade-out');
        }, 500);
      }
    }, 250);
  }

  function fastForwardLoading() {
    if (!isLoadingActive) return;
    skipRequested = true;
    if (isArenaReady) {
      onPhaserArenaReady();
    } else {
      updateProgressUI(Math.max(currentVisualProgress, 95), 'FINALIZING REALM SYNCHRONIZATION...');
    }
  }

  function updateProgressUI(pct, msg) {
    const fill = document.getElementById('vs-progress-fill');
    const percentText = document.getElementById('vs-progress-pct');
    const statusText = document.getElementById('vs-status-msg');

    const clampedPct = Math.min(100, Math.max(0, pct));
    if (fill) fill.style.width = `${clampedPct}%`;
    if (percentText) percentText.textContent = `${clampedPct}%`;
    if (statusText) {
      statusText.innerHTML = clampedPct >= 100
        ? `⚡ ${msg}`
        : `<span class="vs-spinner"></span> ${msg}`;
    }
  }

  function hideLoadingScreen() {
    isLoadingActive = false;
    isArenaReady = false;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (simulatedProgressTimer) clearInterval(simulatedProgressTimer);
    const screen = document.getElementById('vs-loading-screen');
    if (screen) {
      screen.classList.remove('active');
      screen.classList.remove('fade-out');
    }
  }

  // Export to window
  window.startMatchWithLoadingScreen = startMatchWithLoadingScreen;
  window.hideLoadingScreen = hideLoadingScreen;
  window.onPhaserPreloadProgress = onPhaserPreloadProgress;
  window.onPhaserPreloadFile = onPhaserPreloadFile;
  window.onPhaserPreloadComplete = onPhaserPreloadComplete;
  window.onPhaserArenaReady = onPhaserArenaReady;
  window.FIGHTER_REGISTRY = FIGHTER_REGISTRY;

  document.addEventListener('DOMContentLoaded', initLoadingScreenUI);
})();
