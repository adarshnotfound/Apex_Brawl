# Mystic Kombat
Offline 2D fighting game built with Electron + Phaser. Softablitz 2026.

## Setup
npm install
npm start   (available once the entry point is added)

## Structure
src/main        Electron main process (window, IPC, file I/O)
src/renderer    Phaser game (scenes, entities, systems, core, services)
grimoire        Fighter move and frame data (JSON)
assets          Sprites, audio, arenas