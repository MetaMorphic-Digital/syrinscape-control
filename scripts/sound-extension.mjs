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

  async _load() {
    // This function is an intentional no-op because Syrinscape already loads everything
  }

  async _play() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/play/");
    if (CONFIG.debug.audio) console.log(response);
  }

  async _pause() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/stop/");
    if (CONFIG.debug.audio) console.log(response);
  }

  async _stop() {
    const response = await syrinscapeControl.sound.fetchJson(this.src + "/stop/");
    if (CONFIG.debug.audio) console.log(response);
  }
}
