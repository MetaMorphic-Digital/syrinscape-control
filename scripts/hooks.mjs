import { flagScope, moduleId, soundTypes } from "./constants.mjs";

/**
 * A hook event that fires when some useful data is dropped onto the Canvas.
 * @event dropCanvasData
 * @category Canvas
 * @param {import("@client/canvas/board.mjs").default} canvas The Canvas
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

/** @import PlaylistDirectory from "@client/applications/sidebar/tabs/playlist-directory.mjs" */

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

/* -------------------------------------------------- */

/**
 * Prevent regular hotbar macro creation when dropping a syrinscape sound onto the hotbar.
 * @param {Hotbar} hotbar   The hotbar application.
 * @param {object} drop     The drop data.
 * @param {string} slot     The slot number.
 */
export function hotbarDrop(hotbar, drop, slot) {
  const { soundType, soundId } = foundry.utils.getProperty(drop, "data.flags.syrinscape-control") ?? {};
  if (soundType && soundId) {
    _createHotbarMacro(hotbar, drop, slot);
    return false;
  }
}

/**
 * Create and assign a Syrinscape hotbar macro.
 * @param {Hotbar} hotbar   The hotbar application.
 * @param {object} drop     The drop data.
 * @param {string} slot     The slot number.
 */
async function _createHotbarMacro(hotbar, drop, slot) {
  const { soundType, soundId } = foundry.utils.getProperty(drop, "data.flags.syrinscape-control");

  let command;
  let name;
  switch (soundType) {
    case "mood":
      command = `syrinscapeControl.utils.playMood(${soundId})`;
      name = `Mood: ${drop.data.name}`;
      break;
    default:
      command = `syrinscapeControl.utils.playElement(${soundId})`;
      name = `Element: ${drop.data.name}`;
      break;
  }

  const folder = game.macros.folders.find(folder => {
    return folder.getFlag(moduleId, "macro");
  }) ?? await getDocumentClass("Folder").create({
    name: "Syrinscape",
    type: "Macro",
    "flags.syrinscape-control.macro": true,
  });

  const macro = game.macros.find(macro => {
    return (macro.name === name) && (macro.command === command);
  }) ?? await getDocumentClass("Macro").create({
    name, command,
    img: "icons/svg/sound.svg",
    type: "script",
    "flags.syrinscape-control.macro": soundType,
    folder: folder.id,
  });

  game.user.assignHotbarMacro(macro, slot);
}
