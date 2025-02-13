import AuthManager from "./scripts/auth.mjs";
import SyrinScapeSettingsHandler from "./scripts/settings.mjs";

globalThis.syrinscapeControl = {
  auth: new AuthManager(),
};

/* -------------------------------------------------- */

Hooks.once("init", () => {
  SyrinScapeSettingsHandler.registerSettings();
});

/* -------------------------------------------------- */

Hooks.once("ready", () => {
  syrinscapeControl.auth.initialize();
});
