import { moduleId } from "./constants.mjs";

/** @import { SyrinCollection } from "./api.mjs" */

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
  #collection;

  /* -------------------------------------------------- */

  /**
   * Perform initialization of sound data.
   * @param {boolean} [reset=false] Whether to re-download the bulk data and reset the available lists
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
    if (!details.elementId) {
      console.error(`No element ID for ${type}`, details);
      return;
    }
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
}

/* -------------------------------------------------- */

Hooks.once("init", () => {
  syrinscapeControl.storage = new SyrinscapeStorage();
  syrinscapeControl.storage.initializeSoundData();

  syrinscape.events.startSample.addListener(event => {
    syrinscapeControl.storage._addPlaying("sample", event.detail);
  });
  syrinscape.events.stopSample.addListener(event => {
    syrinscapeControl.storage._removePlaying("sample", event.detail);
  });

  syrinscape.events.startElement.addListener(event => {
    syrinscapeControl.storage._addPlaying("element", event.detail);
  });
  syrinscape.events.stopElement.addListener(event => {
    syrinscapeControl.storage._removePlaying("element", event.detail);
  });

  // Doing it for moods is different.
  syrinscape.player.socketSystem.onMessage.addListener(({ message, params }) => {
    switch (message) {
      case "send_full":
      case "send_partial":
        syrinscapeControl.storage._addPlaying("mood", { ...params, elementId: params.mood_pk });
        break;
      case "stop_all":
        syrinscapeControl.storage._removePlaying("mood", "ALL");
    }
  });
});
