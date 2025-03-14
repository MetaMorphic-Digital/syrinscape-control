import { moduleId } from "./constants.mjs";

export default class SyrinscapeStorage {
  /**
   * Has sound data been initialized?
   * @type {boolean}
   */
  #initialized = false;
  get initialized() {
    return this.#initialized;
  }

  /* -------------------------------------------------- */

  #collection;

  /* -------------------------------------------------- */

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

  #playing = new Map();

  /* -------------------------------------------------- */

  _addPlaying({ elementId, playlistEntryId, timeToStop, timeToStopOrNextSample }) {
    this.#playing.set(elementId, { elementId, playlistEntryId, timeToStop, timeToStopOrNextSample });
  }

  /* -------------------------------------------------- */

  _removePlaying({ elementId, playlistEntryId, sampleId, timeToStop }) {
    this.#playing.delete(elementId);
  }
}

Hooks.once("init", () => {
  syrinscapeControl.storage = new SyrinscapeStorage();
  syrinscapeControl.storage.initializeSoundData();

  syrinscape.events.startSample.addListener(event => {
    console.warn(event);
    syrinscapeControl.storage._addPlaying(event.detail);
  });

  syrinscape.events.stopSample.addListener(event => {
    console.warn(event);
    syrinscapeControl.storage._removePlaying(event.detail);
  });

  // TODO: add more event listeners, add way to get all currently playing elements/moods(/samples?)
});
