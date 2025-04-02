/**
 * Extension of the native Foundry Sound class to re-route key functions to the syrinscape API
 */
export default class SyrinscapeSound extends foundry.audio.Sound {
  /**
   *
   * @param {string} src     A syrinscape URL to feed into the SoundManager
   * @param {object} options
   */
  constructor(src, options = {}) {
    /** The audio context for Syrinscape is *always* the Environment */
    options.context = game.audio.environment;
    super(src, options);
  }

  /* -------------------------------------------------- */

  /**
   * Syrinscape sounds use neither buffers nor elements to decide if they are loaded
   * @inheritdoc
   */
  get loaded() {
    return this._state >= foundry.audio.Sound.STATES.LOADED;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _load() {
    // This function is an intentional no-op because Syrinscape already loads everything
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _play() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/play/");
    if (CONFIG.debug.audio) console.log(response);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _pause() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/stop/");
    if (CONFIG.debug.audio) console.log(response);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _stop() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/stop/");
    if (CONFIG.debug.audio) console.log(response);
  }
}
