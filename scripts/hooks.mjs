import { flagScope, moduleId, soundTypes } from "./constants.mjs";

/**
 * A hook event that fires when some useful data is dropped onto the Canvas.
 * @event dropCanvasData
 * @category Canvas
 * @param {import("../foundry/client/canvas/board.mjs").default} canvas The Canvas
 * @param {object} data   The data that has been dropped onto the Canvas
 */
export function dropCanvasData(canvas, data) {
  if (foundry.utils.getProperty(data, "data.flags.syrinscape-control.soundId")) return false;
}

/**
 * Add Syrinscape-specific inputs to the PlaylistSoundConfig app
 * @param {InstanceType<foundry["applications"]["sheets"]["PlaylistSoundConfig"]>} app
 * @param {HTMLElement} html
 * @param {object} context
 * @param {object} options
 */
export function renderPlaylistSoundConfig(app, html, context, options) {
  /** @type {PlaylistSound} */
  const sound = app.document;

  const fields = foundry.applications.fields;

  const soundTypeInput = fields.createSelectInput({
    name: flagScope + "soundType",
    value: sound.getFlag(moduleId, "soundType"),
    options: soundTypes,
    localize: true,
  });

  const soundTypeGroup = fields.createFormGroup({
    input: soundTypeInput,
    label: "SYRINSCAPE.SoundConfig.SoundTypeLabel",
    localize: true,
  });

  const soundIdInput = fields.createTextInput({
    name: flagScope + "soundId",
    value: sound.getFlag(moduleId, "soundId"),
  });

  const soundIdGroup = fields.createFormGroup({
    input: soundIdInput,
    label: "SYRINSCAPE.SoundConfig.SoundIdLabel",
    hint: "SYRINSCAPE.SoundConfig.SoundIdHint",
    localize: true,
  });

  const syrinscape = document.createElement("fieldset");
  // Not localizing company name
  syrinscape.insertAdjacentHTML("afterbegin", "<legend>Syrinscape<legend>");
  syrinscape.append(soundTypeGroup, soundIdGroup);

  html.querySelector(".form-group:nth-child(2)").after(syrinscape);
}

/* -------------------------------------------------- */

/**
 * Add Syrinscape-specific inputs to the AmbientSoundConfig app
 * @param {InstanceType<foundry["applications"]["sheets"]["AmbientSoundConfig"]>} app
 * @param {HTMLElement} html
 * @param {object} context
 * @param {object} options
 * @remarks Not called in Setup due to limitations in the Syrinscape API with per-player per-sound controls. See #7 for details.
 */
export function renderAmbientSoundConfig(app, html, context, options) {
  /** @type {AmbientSoundDocument} */
  const sound = app.document;

  const fields = foundry.applications.fields;

  const soundTypeInput = fields.createSelectInput({
    name: flagScope + "soundType",
    value: sound.getFlag(moduleId, "soundType"),
    options: soundTypes,
    localize: true,
  });

  const soundTypeGroup = fields.createFormGroup({
    input: soundTypeInput,
    label: "SYRINSCAPE.SoundConfig.SoundTypeLabel",
    localize: true,
  });

  const soundIdInput = fields.createTextInput({
    name: flagScope + "soundId",
    value: sound.getFlag(moduleId, "soundId"),
  });

  const soundIdGroup = fields.createFormGroup({
    input: soundIdInput,
    label: "SYRINSCAPE.SoundConfig.SoundIdLabel",
    hint: "SYRINSCAPE.SoundConfig.SoundIdHint",
    localize: true,
  });

  const syrinscape = document.createElement("fieldset");
  // Not localizing company name
  syrinscape.insertAdjacentHTML("afterbegin", "<legend>Syrinscape<legend>");
  syrinscape.append(soundTypeGroup, soundIdGroup);

  html.querySelector("fieldset").after(syrinscape);
}

/* -------------------------------------------------- */

/** @import PlaylistDirectory from "../foundry/client/applications/sidebar/tabs/playlist-directory.mjs" */

/**
 * Add a button for GMs to open the Syrinscape browser.
 * @param {PlaylistDirectory} directory The playlist directory
 * @param {HTMLElement} element         The application element.
 * @param {object} context              context used to render the directory
 * @param {object} options              Render Options
 */
export function renderPlaylistDirectory(directory, element, context, options) {
  if (!game.user.isGM) return;

  if (options.parts && !options.parts.includes("header")) return;

  element.querySelector(".header-actions").insertAdjacentHTML("beforeend", `
    <button type="button" data-action="syrinscapeBrowser">
      <i class="fa-solid fa-file-audio" inert></i>
      <span>Open Syrinscape Browser</span>
    </button>`,
  );
  const button = element.querySelector("[data-action=syrinscapeBrowser]");
  button.addEventListener("click", async () => {
    if (!syrinscapeControl.storage.soundData) {
      ui.notifications.error("SYRINSCAPE.BROWSER.WARNING.cached", { localize: true });
      return;
    }
    ui.syrinscapeBrowser.render({ force: true });
  });
  button.style.flex = "0 0 100%";
}

/* -------------------------------------------------- */

/**
 * Localize the browser filter data model.
 */
export function localizeDataModels() {
  Localization.localizeDataModel(syrinscapeControl.data.SyrinscapeFilterModel);
}
