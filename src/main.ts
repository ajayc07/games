import Phaser from 'phaser';
import { config } from './config';
import { loadUniverse } from './universes/registry';
import { installBrowserGuards } from './shell/browserGuards';
import { keepScreenAwake } from './shell/wakeLock';
import { registerServiceWorker } from './shell/pwa';
import { audio } from './core/audio/AudioManager';
import { initLayout, LOGICAL_HEIGHT, logicalWidthFor } from './core/ui/layout';

installBrowserGuards();
keepScreenAwake();
registerServiceWorker();
audio.installUnlock();

const parent = document.getElementById('game')!;

// Height-locked, width-flexible (D-013): layout.ts keeps the game size matched to the screen.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: logicalWidthFor(window.innerWidth, window.innerHeight),
  height: LOGICAL_HEIGHT,
  backgroundColor: config.skyColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: config.activePointers,
  },
  audio: { noAudio: true }, // all sound goes through core/audio
  disableContextMenu: true,
  banner: false,
});

game.events.once(Phaser.Core.Events.READY, () => {
  initLayout(game, parent);
  void loadUniverse(config.defaultUniverse).then((universe) => universe.start(game));
});
