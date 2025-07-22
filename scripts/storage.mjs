import { moduleId } from "./constants.mjs";

/** @import { SyrinCollection } from "./api.mjs" */

/**
 * @typedef {object} SoundsetData
 * @property {number} _id         Internal id of the sound set.
 * @property {string} name        Name used by elements.
 * @property {string} fullName    Human-readable label of the sound set.
 * @property {string} url         The url of the sound set.
 * @property {string} uuid        The uuid of the sound set.
 */

export default class SyrinscapeStorage {
  /**
   * Has sound data been initialized?
   * @type {boolean}
   */
  #initialized = false;

  /* -------------------------------------------------- */

  /**
   * Has sound data been initialized?
   * @type {boolean}
   */
  get initialized() {
    return this.#initialized;
  }

  /* -------------------------------------------------- */

  /**
   * Cached collection.
   * @type {SyrinCollection}
   */
  #collection = null;

  /* -------------------------------------------------- */

  /**
   * Perform initialization of sound data.
   * @param {boolean} [reset=false] Whether to re-download the bulk data and reset the available lists.
   * @returns {Promise<boolean|void>}   Whether initialization was successful.
   */
  async initializeSoundData(reset = false) {
    if (!game?.ready) {
      Hooks.once("ready", () => this.initializeSoundData(reset));
      return;
    }
    if (!game.user?.isActiveGM) return;

    if (this.#initialized && !reset) {
      throw new Error("The sound data has already been initialized!");
    }

    // not awaiting so this can run in parallel
    this.loadSoundSets(reset);

    const SETTING = "bulkData";

    /** @type {Record<string, string | null>[]} */
    let data = game.settings.get(moduleId, SETTING);
    if (foundry.utils.isEmpty(data) || reset) {
      data = await syrinscapeControl.sound.bulkData();
      if (data) {
        data = data.reduce((acc, e) => {
          acc[e.id] = e;
          return acc;
        }, {});
        await game.settings.set(moduleId, SETTING, data);

        this.#collection = null;

        ui.notifications.success("SYRINSCAPE.BulkDataRequest.Success", { localize: true });

        return this.#initialized = true;
      }
    } else {
      return this.#initialized = true;
    }

    return false;
  }

  /* -------------------------------------------------- */

  /**
   * Stored collection.
   * @type {SyrinCollection}
   */
  get soundData() {
    if (!this.#initialized) return null;
    if (this.#collection) return this.#collection;
    const data = game.settings.get(moduleId, "bulkData");

    const collection = new syrinscapeControl.utils.SyrinCollection();
    for (const [id, object] of Object.entries(data)) {
      collection.set(id, object);
    }
    return this.#collection = collection;
  }

  /* -------------------------------------------------- */

  /**
   * Loads up soundset data.
   * @param {boolean} [reset=false]   Whether to reload the list of soundsets.
   */
  async loadSoundSets(reset = false) {
    if (!game?.ready) {
      Hooks.once("ready", () => this.loadSoundSets(reset));
      return;
    }
    if (!game.user?.isActiveGM) return;

    if (this.#soundsets && !reset) {
      throw new Error("The soundsets have already been initialized!");
    }

    await syrinscape.config.init();

    const SETTING = "soundsetInfo";

    let data = game.settings.get(moduleId, SETTING);
    if (foundry.utils.isEmpty(data) || reset) {
      data = await syrinscapeControl.sound.listSoundSets();
      game.settings.set(moduleId, SETTING, data);

      this.#soundsets = null;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Private collection.
   * @type {foundry.utils.Collection<number, SoundsetData> | null}
   */
  #soundsets = null;

  /* -------------------------------------------------- */

  /**
   * A reference to the soundsets information.
   * @type {foundry.utils.Collection<number, SoundsetData>}
   */
  get soundSets() {
    if (this.#soundsets) return this.#soundsets;
    const data = game.settings.get(moduleId, "soundsetInfo");
    const collection = new foundry.utils.Collection();
    for (const soundset of data) {
      collection.set(soundset.id, {
        _id: soundset.id,
        name: soundset.name,
        fullName: soundset.full_name,
        url: soundset.url,
        uuid: soundset.uuid,
      });
    }
    return this.#soundsets = collection;
  }

  /* -------------------------------------------------- */
  /*   Tracked playing sounds                           */
  /* -------------------------------------------------- */

  /**
   * All playing sounds.
   * @type {Map<number, object>}
   */
  #playing = new Map();

  /* -------------------------------------------------- */

  /**
   * Ids of all playing elements.
   * @type {Set<number>}
   */
  #playingElements = new Set();

  /* -------------------------------------------------- */

  /**
   * Ids of all playing samples.
   * @type {Set<number>}
   */
  #playingSamples = new Set();

  /* -------------------------------------------------- */

  /**
   * Ids of all playing moods.
   * @remark Not currently used.
   * @type {Set<number>}
   */
  #playingMoods = new Set();

  /* -------------------------------------------------- */

  /**
   * Track a new sound as being actively playing.
   * @param {string} type       The sound type (element, sample, mood).
   * @param {object} details    Sound data.
   */
  _addPlaying(type, details) {
    // Partial updates may not include a primary element ID
    if (!details.elementId) return;
    this.#playing.set(details.elementId, details);
    switch (type) {
      case "sample":
        this.#playingSamples.add(details.elementId);
        break;
      case "element":
        this.#playingElements.add(details.elementId);
        break;
      case "mood":
        // Only one mood at a time
        this.#playing.delete(this.#playingMoods.first());
        this.#playingMoods.clear();
        this.#playingMoods.add(details.elementId);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Remove a playing sound from the tracking once it is stopped.
   * @param {string} type             The sound type (element, sample, mood).
   * @param {object|"ALL"} details    Sound data.
   */
  _removePlaying(type, details) {
    this.#playing.delete(details.elementId);
    switch (type) {
      case "sample":
        this.#playingSamples.delete(details.elementId);
        // Cancel one shots after they expire
        if (this.soundData.get(`e:${details.elementId}`)?.sub_type === "oneshot") {
          for (const list of game.playlists) {
            // Using == because Syrinscape passes back strings
            const matches = list.sounds.filter(s => s.getFlag(moduleId, "soundId") == details.elementId);
            if (matches.length) list.updateEmbeddedDocuments("PlaylistSound", matches.map(s => ({ _id: s.id, playing: false })));
          }
        }
        break;
      case "element":
        this.#playingElements.delete(details.elementId);
        break;
      case "mood":
        if (details === "ALL") {
          this.#playingMoods.clear();
        } else {
          this.#playingMoods.delete(details.elementId);
        }
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Is this mood, sample, element currently playing?
   * @param {string|number} elementId   The id of the sound.
   * @returns {boolean}                 Whether the sound is playing.
   */
  isPlaying(elementId) {
    const id = (typeof elementId === "number") ? elementId : parseInt(elementId.split(":").at(-1));
    return this.#playing.has(id);
  }

  /* -------------------------------------------------- */

  /**
   * Toggle icon on an element when it starts or stops playing.
   * @param {number} id               The id of the element.
   * @param {boolean} [state=true]    Whether the element is playing.
   */
  _togglePlayIcons(id, state = true) {
    const element = document.getElementById(`syrinscape-element-${id}`);
    if (!element) return;
    element.classList.toggle("fa-volume-high", !state);
    element.classList.toggle("fa-stop", state);
  }
}

/* -------------------------------------------------- */

Hooks.once("init", () => {
  const stg = syrinscapeControl.storage = new SyrinscapeStorage();
  stg.initializeSoundData();

  syrinscape.events.startSample.addListener(event => {
    stg._addPlaying("sample", event.detail);
    stg._togglePlayIcons(event.detail.elementId);
  });
  syrinscape.events.stopSample.addListener(event => {
    stg._removePlaying("sample", event.detail);
    stg._togglePlayIcons(event.detail.elementId, false);
  });

  syrinscape.events.startElement.addListener(event => {
    stg._addPlaying("element", event.detail);
    stg._togglePlayIcons(event.detail.elementId);
  });
  syrinscape.events.stopElement.addListener(event => {
    stg._removePlaying("element", event.detail);
    stg._togglePlayIcons(event.detail.elementId, false);
  });

  // Doing it for moods is different.
  syrinscape.player.socketSystem.onMessage.addListener(({ message, params }) => {
    if (CONFIG.debug.audio) console.debug(message, params);
    switch (message) {
      case "send_full":
      case "send_partial":
        stg._addPlaying("mood", { ...params, elementId: params.mood_pk });
        break;
      case "stop_all":
        stg._removePlaying("mood", "ALL");
    }
  });
});
