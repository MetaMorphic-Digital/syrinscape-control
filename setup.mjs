import SyrinscapeBrowser from "./scripts/browser.mjs";
import SyrinscapeFilterModel from "./scripts/browser-filter-model.mjs";
import SyrinscapeSettingsHandler from "./scripts/settings.mjs";
import SyrinscapeStorage from "./scripts/storage.mjs";
import SoundManager from "./scripts/sound-manager.mjs";
import registerSyrinscapePlaylistSound from "./scripts/playlist-sound.mjs";
import { moduleId } from "./scripts/constants.mjs";
import * as hooks from "./scripts/hooks.mjs";
import * as utils from "./scripts/api.mjs";
import * as fields from "./scripts/fields.mjs";

window.customElements.define(fields.HTMLStringTagsListElement.tagName, fields.HTMLStringTagsListElement);

globalThis.syrinscapeControl = {
  applications: {
    SyrinscapeBrowser,
  },
  data: {
    fields,
    SyrinscapeFilterModel,
    SyrinscapeStorage,
  },
  sound: new SoundManager(),
  /** @type {SyrinscapeStorage} */
  storage: null,
  utils: utils,
};

/* -------------------------------------------------- */

CONFIG.ui.syrinscapeBrowser = SyrinscapeBrowser;

/* -------------------------------------------------- */

Hooks.once("init", () => {
  SyrinscapeSettingsHandler.registerSettings();

  registerSyrinscapePlaylistSound();
});

/* -------------------------------------------------- */

Hooks.once("i18nInit", () => {
  hooks.localizeDataModels();
});

/* -------------------------------------------------- */

Hooks.once("ready", () => {
  game.audio.unlock.then(() => {
    syrinscape.player.init({
      async configure() {
        // It's possible we want to create this in its own context rather than defer to Environment
        syrinscape.config.audioContext = game.audio.environment;

        const authToken = game.settings.get(moduleId, "authToken");

        if (!authToken) ui.notifications.error("SYRINSCAPE.Errors.Auth", { localize: true, permanent: true });

        syrinscape.config.token = authToken ?? "";

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
      },
    };
  }
});

/* -------------------------------------------------- */

Hooks.on("globalAmbientVolumeChanged", (volume) => {
  syrinscape.player.audioSystem.setLocalVolume(volume);
});

/* -------------------------------------------------- */

// Prevent creating ambient sounds from the Syrinscape Browser
Hooks.on("dropCanvasData", hooks.dropCanvasData);

/* -------------------------------------------------- */

// Create syrinscape macros on hotbar drops.
Hooks.on("hotbarDrop", hooks.hotbarDrop);

/* -------------------------------------------------- */
/*   App rendering hooks                              */
/* -------------------------------------------------- */

Hooks.on("renderPlaylistSoundConfig", hooks.renderPlaylistSoundConfig);

/* -------------------------------------------------- */

// Hooks.on("renderAmbientSoundConfig", hooks.renderAmbientSoundConfig);

/* -------------------------------------------------- */

Hooks.on("renderPlaylistDirectory", hooks.renderPlaylistDirectory);
