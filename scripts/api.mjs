import { moduleId } from "./constants.mjs";

/**
 * @typedef {object} MoodData
 */

/**
 * @typedef {object} ElementData
 * @property {number} _id             Internal id of the sound element.
 * @property {object} soundset        The parent soundset.
 * @property {string} soundset.name   The parent soundset's human-readable label.
 * @property {string} soundset.url    The parent soundset's url.
 * @property {string} name            Human-readable label of a sound element.
 * @property {string} url             The url of the sound.
 */

/* -------------------------------------------------- */

/**
 * Stop all sounds.
 * @returns {Promise<boolean>}    Whether the request was successful.
 */
export async function stopAll() {
  const { ok } = await syrinscape.player.controlSystem.stopAll();
  return ok;
}

/* -------------------------------------------------- */

/**
 * Set local volume.
 * @param {number} value            The new value, between 0 and 1.5.
 * @param {object} [options]        Options.
 * @param {string} [options.type]   The volume type ("local" or "global").
 * @returns {number}                The new value.
 */
export async function setVolume(value, { type = "local" } = {}) {
  if (isNaN(value)) throw new Error("The value provided is not a number!");
  value = Number(value);
  if (!value.between(0, 1.5)) throw new Error("The value provided is not between 0 and 1.5!");

  switch (type) {
    case "local":
      syrinscape.player.audioSystem.setLocalVolume(value);
      syrinscape.config.lastLocalVolume = value;
      break;
    case "global":
      syrinscape.player.audioSystem.setGlobalVolume(value);
      break;
    default:
      throw new Error(`Volume type '${type}' is not a valid option!`);
  }

  return value;
}

/* -------------------------------------------------- */

/**
 * Play an element by its id (a 7-digit number).
 * @param {number|string} id        The id of the element to play.
 * @returns {Promise<boolean>}      Whether the request was successful.
 */
export async function playElement(id) {
  id = (typeof id === "string") ? id.replace("e:", "").trim() : String(id);
  try {
    await syrinscape.player.controlSystem.startElements([id]);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

/* -------------------------------------------------- */

/**
 * Stop an element.
 * @param {number|string} id      The id of the element to stop.
 * @returns {Promise<boolean>}    Whether the request was successful.
 */
export async function stopElement(id) {
  id = (typeof id === "string") ? id.replace("e:", "").trim() : String(id);
  try {
    await syrinscape.player.controlSystem.stopElements([id]);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

/* -------------------------------------------------- */

/**
 * Play a certain mood.
 * @param {number} id             The id of the mood.
 * @returns {Promise<boolean>}    Whether the request was successful.
 */
export async function playMood(id) {
  id = (typeof id === "string") ? id.replace("m:", "").trim() : String(id);
  try {
    await syrinscape.player.controlSystem.startMood(id);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

/* -------------------------------------------------- */

/**
 * Stop a mood.
 * @param {number|string} id      The id of the mood to stop.
 * @returns {Promise<boolean>}    Whether the request was successful.
 */
export async function stopMood(id) {
  id = (typeof id === "string") ? id.replace("m:", "").trim() : String(id);
  try {
    await syrinscape.player.controlSystem.stopMood(id);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

/* -------------------------------------------------- */

/**
 * Retrieve sounds of a soundset.
 * @param {string} uuid     The uuid of a soundset.
 * @returns {Promise<Collection<number, ElementData>>}    A promise that resolves to a colection of element data.
 */
export async function retrieveElements(uuid) {
  const collection = new foundry.utils.Collection();
  try {
    const elements = await syrinscapeControl.sound.elements(uuid);
    for (const element of elements) {
      collection.set(element.pk, {
        _id: element.pk,
        soundset: {
          name: element.soundset_name,
          url: element.soundset,
        },
        name: element.name,
        url: element.url,
      });
    }
    return collection;
  } catch (err) {
    console.warn(err);
  }
  return collection;
}

/* -------------------------------------------------- */

/**
 * Get all moods currently playing.
 * @param {string} [modelName]    Model name to filter by, e.g. "SFXElement" or "Mood".
 * @returns {Promise<Array<{id: number; label: string; isMood: boolean}>>}   A promise that resolves to an array of objects,
 *                                each with the id and human-readable label.
 */
export async function currentlyPlaying(modelName) {
  const url = "https://syrinscape.com/search/?playing=Playing Now";
  const response = await fetch(url, syrinscapeControl.sound.requestOptions);
  const json = await response.json();

  return json.results.filter(result => {
    if (modelName && (result.model_name !== modelName)) return false;
    else return result.playing_now;
  }).map(result => {
    return { id: result.pk, label: result.title, isMood: result.model_name === "Mood" };
  });
}

/* -------------------------------------------------- */

/**
 * A subclass of `Collection` to handle retrieval and storage of sound data.
 */
export class SyrinCollection extends foundry.utils.Collection {
  /** @inheritdoc */
  set(k, v) {
    switch (v.type) {
      case "mood":
        this.#moods.push(v);
        break;
      case "element":
        this.#elements.push(v);
        break;
    }

    return super.set(k, v);
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve all data of a certain property.
   * @param {Record<string, string|string[]>} configuration   An object whose properties the data must match.
   * @returns {SyrinCollection}                               A new, reduced collection.
   */
  getByProperty(configuration) {
    const data = new SyrinCollection();
    const source = this.getByType(configuration.type) ?? this;

    cycle: for (const d of source) {
      for (let [property, v] of Object.entries(configuration)) {
        switch (property) {
          case "product":
          case "pack":
          case "product_or_pack":
          case "productOrPack":
            property = "product_or_pack";
            break;
          case "set":
          case "soundset":
            property = "soundset";
            break;
          case "status":
            break;
          case "subType":
          case "subtype":
          case "sub_type":
            property = "sub_type";
            break;
          case "subcategory":
          case "subCategory":
            property = "subcategory";
            break;
          case "type":
            break;
        }

        switch (foundry.utils.getType(v)) {
          case "string":
            if (d[property] !== v) continue cycle;
            break;
          case "Array":
            if (!v.length) continue; // Empty arrays are ignored.
            if (!v.includes(d[property])) continue cycle;
            break;
        }
      }
      data.set(d.id, d);
    }
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Entries are split by type for performance.
   * @param {string} type   The type.
   * @returns {object[]|null}
   */
  getByType(type) {
    switch (type) {
      case "mood":
        return this.#moods;
      case "element":
        return this.#elements;
      default:
        return null;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Stored moods.
   * @type {object[]}
   */
  #moods = [];

  /* -------------------------------------------------- */

  /**
   * Stored elements.
   * @type {object[]}
   */
  #elements = [];
}

/* -------------------------------------------------- */

/**
 * Create a macro for a sound. If the folder for the macros does not exist, this is created as well.
 * @param {string} name         The name of the sound.
 * @param {string} soundType    The sound type ("mood", else element).
 * @param {number} soundId      The id of the sound.
 * @returns {Promise<foundry.documents.Macro>}    A promise that resolves to a creatd macro.
 */
export async function createHotbarMacro(name, soundType, soundId) {
  let command;
  let macroName;

  switch (soundType) {
    case "mood":
      command = `syrinscapeControl.utils.playMood(${soundId})`;
      macroName = `M: ${name}`;
      break;
    default:
      command = `syrinscapeControl.utils.playElement(${soundId})`;
      macroName = `E: ${name}`;
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
    command,
    name: macroName,
    img: "icons/svg/sound.svg",
    type: "script",
    "flags.syrinscape-control.macro": soundType,
    folder: folder.id,
  });

  return macro;
}
