import SyrinscapeViewer from "./scripts/viewer.mjs";
import SyrinScapeSettingsHandler from "./scripts/settings.mjs";
import SoundManager from "./scripts/sound.mjs";
import registerSyrinscapeAmbientSound from "./scripts/ambient-sound.mjs";
import registerSyrinscapePlaylistSound from "./scripts/playlist-sound.mjs";
import { moduleId } from "./scripts/constants.mjs";
import * as hooks from "./scripts/hooks.mjs";

globalThis.syrinscapeControl = {
  applications: {
    SyrinscapeViewer,
  },
  sound: new SoundManager(),
  /** @type {SyrinscapeViewer} */
  viewer: null,
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  SyrinScapeSettingsHandler.registerSettings();

  registerSyrinscapePlaylistSound();
});

/* -------------------------------------------------- */

Hooks.once("ready", () => {
  game.audio.unlock.then(() => {
    syrinscape.player.init({
      async configure() {
        // It's possible we want to create this in its own context rather than defer to Environment
        syrinscape.config.audioContext = game.audio.environment;

        syrinscape.config.token = game.settings.get(moduleId, "authToken") ?? "";

        await syrinscape.config.sync();

        if (game.user.isActiveGM) await game.settings.set(moduleId, "sessionId", syrinscape.config.sessionId);
        else syrinscape.config.sessionId = game.settings.get(moduleId, "sessionId");
      },
      onActive() {
        console.debug("Activating Syrinscape Player");
        const initialVolume = game.settings.get("core", "globalAmbientVolume");
        syrinscape.player.audioSystem.setLocalVolume(initialVolume);
      },
      onInactive() {
        console.debug("Deactivating Syrinscape Player");
      },
    });
  });
});

/* -------------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  // players do not have access to the sounds layer
  if (controls.sounds) {
    controls.sounds.tools.syrinscapePlayer = {
      name: "syrinscapePlayer",
      order: 4,
      title: "SYRINSCAPE.SceneControls.PlayerTitle",
      icon: "fa-solid fa-tree-palm",
      button: true,
      onChange: (event, toggled) => {
        syrinscape.integration.launchAsGameMaster();
        // syrinscapeControl.viewer ??= SyrinscapeViewer.create();
        // syrinscapeControl.viewer.render({ force: true });
      },
    };
  }
});

Hooks.on("globalAmbientVolumeChanged", (volume) => {
  syrinscape.player.audioSystem.setLocalVolume(volume);
});

/**
 * App Rendering Hooks
 */

Hooks.on("renderPlaylistSoundConfig", hooks.renderPlaylistSoundConfig);
Hooks.on("renderAmbientSoundConfig", hooks.renderAmbientSoundConfig);
