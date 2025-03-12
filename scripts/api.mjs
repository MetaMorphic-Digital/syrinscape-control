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
 * @param {number|string} id        The id of the element to play.
 * @returns {Promise<boolean>}      Whether the request was successful.
 */
export async function playElement(id) {
  id = (typeof id === "string") ? id.replace("m:", "").trim() : String(id);
  try {
    await syrinscape.player.controlSystem.startElements([id]);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  }
}

/* -------------------------------------------------- */

export async function stopElement(id) {
  id = (typeof id === "string") ? id.replace("m:", "").trim() : String(id);
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

/* -------------------------------------------------- */

/**
 * Retrieve a csv file from the module's local storage folder.
 * @param {object} [options]                    Options for the return value and retrieval.
 * @param {string} [options.name]               The name of the file.
 * @param {boolean} [options.parse]             Attempt to parse the file's contents?
 * @returns {Promise<string|SyrinCollection>}   The contents of the file, or an empty string if there was an error.
 */
export async function retrieveLocalCSV({ name = "test-csv", parse = false } = {}) {
  if (parse && syrinscapeControl.storage._collection) return syrinscapeControl.storage._collection;

  let notif;
  try {
    notif = ui.notifications.info("Retrieving Syrinscape Data...", { pct: 0, progress: true });
    const response = await foundry.utils.fetchWithTimeout(`/modules/syrinscape-control/storage/${name}.csv`);
    const text = await response.text();
    notif?.update({ pct: 1 });
    const result = parse ? _parseLocalCSV(text) : text;
    if (parse) syrinscapeControl.storage._collection = result;
    return result;
  } catch (err) {
    notif?.update({ pct: 1 });
    return "";
  }
}

function _parseLocalCSV(text) {
  const contents = parseCSV(text);

  const headers = contents.shift();
  const base = Object.fromEntries(headers.map(h => [h, null]));
  const data = new SyrinCollection();
  for (const c of contents) {
    const object = { ...base };
    for (const [i, s] of c.entries()) {
      object[headers[i]] = s;
    }
    data.set(object.id, object);
  }

  return data;
}

class SyrinCollection extends foundry.utils.Collection {
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

  #moods = [];

  #elements = [];
}

/**
 * https://stackoverflow.com/questions/1293147/
 * @param {string} str    String to parse.
 * @returns {string[][]}
 */
function parseCSV(str) {
  const arr = [];
  let quote = false; // 'true' means we're inside a quoted field

  // Iterate over each character, keep track of current row and column (of the returned array)
  for (let row = 0, col = 0, c = 0; c < str.length; c++) {
    let cc = str[c], nc = str[c + 1]; // Current character, next character
    arr[row] = arr[row] || []; // Create a new row if necessary
    arr[row][col] = arr[row][col] || ""; // Create a new column (start with empty string) if necessary

    // If the current character is a quotation mark, and we're inside a
    // quoted field, and the next character is also a quotation mark,
    // add a quotation mark to the current column and skip the next character
    if ((cc == "\"") && quote && (nc == "\"")) { arr[row][col] += cc; ++c; continue; }

    // If it's just one quotation mark, begin/end quoted field
    if (cc == "\"") { quote = !quote; continue; }

    // If it's a comma and we're not in a quoted field, move on to the next column
    if ((cc == ",") && !quote) { ++col; continue; }

    // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
    // and move on to the next row and move to column 0 of that new row
    if ((cc == "\r") && (nc == "\n") && !quote) { ++row; col = 0; ++c; continue; }

    // If it's a newline (LF or CR) and we're not in a quoted field,
    // move on to the next row and move to column 0 of that new row
    if ((cc == "\n") && !quote) { ++row; col = 0; continue; }
    if ((cc == "\r") && !quote) { ++row; col = 0; continue; }

    // Otherwise, append the current character to the current column
    arr[row][col] += cc;
  }
  return arr;
}
