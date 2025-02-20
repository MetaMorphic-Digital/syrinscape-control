import SyrinscapeViewer from "./scripts/viewer.mjs";
import AuthManager from "./scripts/auth.mjs";
import SyrinScapeSettingsHandler from "./scripts/settings.mjs";
import SoundManager from "./scripts/sound.mjs";

globalThis.syrinscapeControl = {
  SyrinscapeViewer,
  auth: new AuthManager(),
  sound: new SoundManager(),
  /** @type {SyrinscapeViewer} */
  viewer: null,
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  SyrinScapeSettingsHandler.registerSettings();
});

/* -------------------------------------------------- */

Hooks.once("ready", () => {
  syrinscapeControl.auth.initialize();
});

Hooks.on("getSceneControlButtons", (controls) => {
  console.log(controls);
  controls.sounds.tools.syrinscapePlayer = {
    name: "syrinscapePlayer",
    order: 4,
    title: "SYRINSCAPE.SceneControls.PlayerTitle",
    icon: "fa-solid fa-tree-palm",
    button: true,
    onChange: (event, toggled) => {
      syrinscapeControl.viewer ??= SyrinscapeViewer.create();
      syrinscapeControl.viewer.render({ force: true });
    },
  };
});
