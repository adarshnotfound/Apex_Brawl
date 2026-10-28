// =========================================================
// Apex Brawl: Mystic Kombat - VS Loading Screen Controller
// =========================================================

(function() {
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
      portrait: '../../assets/characters/Dr Strange/portrait.png',
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
    }
  };

  const GENERAL_TIPS = [
    'CANCEL CHAINS: Normal attacks chain naturally: Light (5A) → Medium (5B) → Heavy (5C)!',
    'AIR SUPERIORITY: Airborne strikes deal bonus hitstun against crouching combatants.',
    'SUPER ATTACKS: Execute [S + H / Y] (P1) or [↓ + L / I] (P2) to unleash devastating Supers!',
    'TIMEOUT DECISION: If the 120-second clock expires, the fighter with highest HP wins the round.',
    'BEST OF 3: Win 2 rounds to be crowned the ultimate Apex Champion!'
  ];

  let currentLoadingTimer = null;
  let isLoadingActive = false;

  function initLoadingScreenUI() {
    // Listen for space / enter key to fast-forward loading screen
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
    const stageName = options.stageName || 'MIRROR DIMENSION • SACRED SANCTUM';
    const matchType = options.matchType || 'BEST OF 3 ROUNDS • 120s TIMER';

    const p1Data = FIGHTER_REGISTRY[p1Id] || FIGHTER_REGISTRY['harpy'];
    const p2Data = FIGHTER_REGISTRY[p2Id] || FIGHTER_REGISTRY['strange'];

    const screen = document.getElementById('vs-loading-screen');
    const flash = document.getElementById('screen-flash-burst');
    if (!screen) {
      if (window.startPhaserArena) window.startPhaserArena();
      return;
    }

    isLoadingActive = true;

    // 1. Play dramatic launch boom
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
      if (isMirror) {
        p2Portrait.style.filter = 'hue-rotate(240deg) brightness(1.15)';
      } else {
        p2Portrait.style.filter = 'none';
      }
    }
    if (p2Frame) {
      p2Frame.style.boxShadow = `0 0 30px ${isMirror ? 'rgba(196, 181, 253, 0.6)' : p2Data.glowColor}`;
      p2Frame.style.border = `2px solid ${isMirror ? '#e9d5ff' : p2Data.accentColor}`;
    }
    if (p2Name) p2Name.textContent = isMirror ? `${p2Data.name} (SHADOW)` : p2Data.name;
    if (p2Title) p2Title.textContent = p2Data.subtitle;
    if (p2Quote) p2Quote.textContent = p2Data.quote;

    // 5. Select Pro Tip (matchup specific or general)
    const tipText = document.getElementById('vs-tip-content');
    if (tipText) {
      const candidates = [...p1Data.tips, ...p2Data.tips, ...GENERAL_TIPS];
      const randomTip = candidates[Math.floor(Math.random() * candidates.length)];
      tipText.innerHTML = `<strong>PRO TIP:</strong> ${randomTip}`;
    }

    // 6. Reset progress bar
    const fill = document.getElementById('vs-progress-fill');
    const percentText = document.getElementById('vs-progress-pct');
    const statusText = document.getElementById('vs-status-msg');

    if (fill) fill.style.width = '0%';
    if (percentText) percentText.textContent = '0%';
    if (statusText) statusText.innerHTML = '<span class="vs-spinner"></span> SYNCHRONIZING FIGHTERS...';

    // 7. Show screen with animation
    screen.classList.remove('fade-out');
    screen.classList.add('active');

    // Trigger restart of CSS animations on fighter cards
    if (p1Card) {
      p1Card.style.animation = 'none';
      p1Card.offsetHeight; /* trigger reflow */
      p1Card.style.animation = null;
    }
    if (p2Card) {
      p2Card.style.animation = 'none';
      p2Card.offsetHeight; /* trigger reflow */
      p2Card.style.animation = null;
    }

    // 8. Progress Simulation (Total duration ~ 2.4s)
    let progress = 0;
    const stages = [
      { at: 20, msg: 'WARPING INTO MIRROR DIMENSION...' },
      { at: 50, msg: 'LOADING SPRITE ATLASES & COMBAT FRAMES...' },
      { at: 80, msg: 'ENGAGING DETERMINISTIC HITBOX ENGINE...' },
      { at: 96, msg: 'FINALIZING REALM SYNCHRONIZATION...' },
      { at: 100, msg: 'BATTLE READY! COMMENCING MATCH...' }
    ];

    if (currentLoadingTimer) clearInterval(currentLoadingTimer);

    const stepIntervalMs = 40;
    const increment = 100 / (2200 / stepIntervalMs); // reaches 100% in ~2.2 seconds

    currentLoadingTimer = setInterval(() => {
      progress += increment + (Math.random() * 0.4);
      if (progress >= 100) {
        progress = 100;
        clearInterval(currentLoadingTimer);
        currentLoadingTimer = null;
        updateProgressUI(100, 'BATTLE READY! COMMENCING MATCH...');
        finishLoadingAndStartMatch();
      } else {
        const curStage = stages.find(s => progress <= s.at) || stages[stages.length - 1];
        updateProgressUI(Math.floor(progress), curStage.msg);
      }
    }, stepIntervalMs);
  }

  function updateProgressUI(pct, msg) {
    const fill = document.getElementById('vs-progress-fill');
    const percentText = document.getElementById('vs-progress-pct');
    const statusText = document.getElementById('vs-status-msg');

    if (fill) fill.style.width = `${pct}%`;
    if (percentText) percentText.textContent = `${pct}%`;
    if (statusText) {
      statusText.innerHTML = pct >= 100 
        ? `⚡ ${msg}` 
        : `<span class="vs-spinner"></span> ${msg}`;
    }
  }

  function fastForwardLoading() {
    if (!isLoadingActive) return;
    if (currentLoadingTimer) {
      clearInterval(currentLoadingTimer);
      currentLoadingTimer = null;
    }
    updateProgressUI(100, 'BATTLE READY! COMMENCING MATCH...');
    finishLoadingAndStartMatch(100);
  }

  function finishLoadingAndStartMatch(delayMs = 300) {
    setTimeout(() => {
      if (!isLoadingActive) return;
      isLoadingActive = false;

      // 1. Play gong impact sound on launch
      if (window.soundFX) {
        window.soundFX.playSelect();
      }

      // 2. Screen Flash Burst effect
      const flash = document.getElementById('screen-flash-burst');
      if (flash) {
        flash.classList.add('flash');
        setTimeout(() => flash.classList.remove('flash'), 350);
      }

      // 3. Launch Phaser Arena
      if (window.startPhaserArena) {
        window.startPhaserArena();
      }

      // 4. Fade out loading screen smoothly
      const screen = document.getElementById('vs-loading-screen');
      if (screen) {
        screen.classList.add('fade-out');
        setTimeout(() => {
          screen.classList.remove('active');
          screen.classList.remove('fade-out');
        }, 500);
      }
    }, delayMs);
  }

  function hideLoadingScreen() {
    isLoadingActive = false;
    if (currentLoadingTimer) {
      clearInterval(currentLoadingTimer);
      currentLoadingTimer = null;
    }
    const screen = document.getElementById('vs-loading-screen');
    if (screen) {
      screen.classList.remove('active');
      screen.classList.remove('fade-out');
    }
  }

  // Export to window
  window.startMatchWithLoadingScreen = startMatchWithLoadingScreen;
  window.hideLoadingScreen = hideLoadingScreen;
  window.FIGHTER_REGISTRY = FIGHTER_REGISTRY;

  document.addEventListener('DOMContentLoaded', initLoadingScreenUI);
})();
