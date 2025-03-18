import { moduleId } from "./constants.mjs";

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
   * @returns {Promise<boolean|void>}   Whether initialization was successful.
   */
  async initializeSoundData() {
    if (!game?.ready) {
      Hooks.once("ready", () => this.initializeSoundData());
      return;
    }

    if (!game.user?.isActiveGM) return;

    if (this.#initialized) {
      throw new Error("The sound data has already been initialized!");
    }

    const SETTING = "csvData";

    let data = game.settings.get(moduleId, SETTING);
    if (foundry.utils.isEmpty(data)) {
      data = await syrinscapeControl.utils.retrieveLocalCSV({ parse: true });
      if (data) {
        data = Object.fromEntries(Array.from(data.entries()));
        await game.settings.set(moduleId, SETTING, data); // TODO
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
   * TODO: implement way to "refresh" this stored data manually by users.
   * @type {SyrinCollection}
   */
  get soundData() {
    if (!this.#initialized) return null;
    if (this.#collection) return this.#collection;
    const data = game.settings.get(moduleId, "csvData");

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
    this.#playing.set(details.elementId, details);
    switch (type) {
      case "sample":
        this.#playingSamples.add(details.elementId);
        break;
      case "element":
        this.#playingElements.add(details.elementId);
        break;
      case "mood":
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
        syrinscapeControl.storage._addPlaying("mood", { ... params, elementId: params.mood_pk });
        break;
      case "stop_all":
        syrinscapeControl.storage._removePlaying("mood", "ALL");
    }
  });
});
