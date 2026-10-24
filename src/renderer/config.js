// Phaser 3 Engine Configuration for Apex Brawl (Mystic Kombat)

const GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-container',
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 },
      debug: false
    }
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  backgroundColor: '#07060a'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfig;
}
