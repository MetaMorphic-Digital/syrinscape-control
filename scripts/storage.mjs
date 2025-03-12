export default class SyrinscapeStorage {
  #playing = new Map();

  _addPlaying({ elementId, playlistEntryId, timeToStop, timeToStopOrNextSample }) {
    this.#playing.set(elementId, { elementId, playlistEntryId, timeToStop, timeToStopOrNextSample });
  }

  _removePlaying({ elementId, playlistEntryId, sampleId, timeToStop }) {
    this.#playing.delete(elementId);
  }
}

Hooks.once("init", () => {
  syrinscapeControl.storage = new SyrinscapeStorage();

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
