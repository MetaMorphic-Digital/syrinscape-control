import { flagScope, moduleId, soundTypes } from "./constants.mjs";

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

/**
 * Add a button for GMs to open the Syrinscape browser.
 * @param {InstanceType<foundry["applications"]["sidebar"]["tabs"]["PlaylistDirectory"]>} directory
 * @param {HTMLElement} element         The application element.
 */
export function renderPlaylistDirectory(directory, element) {
  if (!game.user.isGM) return;
  element.querySelector(".header-actions").insertAdjacentHTML("beforeend", `
    <button type="button" data-action="syrinscapeBrowser">
      <i class="fa-solid fa-file-audio" inert></i>
      <span>Open Syrinscape Browser</span>
    </button>`,
  );
  const button = element.querySelector("[data-action=syrinscapeBrowser]");
  button.addEventListener("click", () => ui.syrinscapeBrowser.render({ force: true }));
  button.style.flex = "0 0 100%";
}
