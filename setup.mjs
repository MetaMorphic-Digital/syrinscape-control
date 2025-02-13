import SyrinScapeSettingsHandler from "./scripts/settings.mjs";

globalThis.syrinscapecontrol = {};

Hooks.once("init", () => {
  SyrinScapeSettingsHandler.registerSettings();
});
