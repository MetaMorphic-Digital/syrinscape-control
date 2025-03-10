/**
 * @typedef {object} SoundsetData
 * @property {number} _id     Internal id of the sound set.
 * @property {string} name    Human-readable label of the sound set.
 * @property {string} url     The url of the sound set.
 * @property {string} uuid    The uuid of the sound set.
 */

/**
 * @typedef {object} MoodData
 */

/**
 * @typedef {object} ElementData
 * @property {number} _id             Internal id of the sound element.
 * @property {object} soundset        The parent soundset.
 * @property {string} soundset.name   The parent soundset's human-readable label.
 * @property {string} soundset.url    The parent soundset's url.
 * @property {string} name            Human-readable label of a sound element. *
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
 * @param {number} id               The id of the element to play.
 * @returns {Promise<boolean>}      Whether the request was successful.
 */
export async function playElement(id) {
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
 * Play a certain mood.
 * @param {number} id             The id of the mood.
 * @returns {Promise<boolean>}    Whether the request was successful.
 */
export async function playMood(id) {
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
 * Retrieve all soundsets.
 * @returns {Promise<Collection<number, SoundsetData>>}   A promise that resolves to a collection of soundset data.
 */
export async function retrieveSoundSets() {
  const sets = await syrinscapeControl.sound.listSoundSets();
  const collection = new foundry.utils.Collection();
  for (const set of sets) {
    collection.set(set.id, {
      _id: set.id,
      name: set.name,
      url: set.url,
      uuid: set.uuid,
    });
  }
  return collection;
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

// export async function TEST() {
//   const url = "https://syrinscape.com/account/remote-control-links-csv/";

//   try {
//     const response = await fetch(url, {
//       ...syrinscapeControl.sound.requestOptions,
//       mode: "cors",
//       method: "HEAD",
//     });
//     console.warn(response);
//     const contentDisposition = response.headers.get("Content-Disposition");
//     console.warn(contentDisposition);
//     const text = await response.text();
//     console.warn(text);
//     return text;
//   } catch (err) {
//     console.error(err);
//   }
// }
