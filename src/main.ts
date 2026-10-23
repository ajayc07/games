import Phaser from 'phaser';
import { config } from './config';
import { loadUniverse } from './universes/registry';
import { installBrowserGuards } from './shell/browserGuards';
import { keepScreenAwake } from './shell/wakeLock';
import { registerServiceWorker } from './shell/pwa';

installBrowserGuards();
keepScreenAwake();
registerServiceWorker();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: config.width,
  height: config.height,
  backgroundColor: config.skyColor,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: config.activePointers,
  },
  disableContextMenu: true,
  banner: false,
});

game.events.once(Phaser.Core.Events.READY, () => {
  void loadUniverse(config.defaultUniverse).then((universe) => universe.start(game));
});
