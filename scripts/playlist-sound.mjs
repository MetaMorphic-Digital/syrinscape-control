import SyrinscapeSound from "./sound-extension.mjs";
import { moduleId } from "./constants.mjs";

/**
 * Extend the current playlistsound document class.
 */
export default function registerSyrinscapePlaylistSound() {
  class SyrinscapePlaylistSound extends CONFIG.PlaylistSound.documentClass {
    /**
     * The syrinscape url.
     * @type {string|null}
     */
    get syrinscapeURL() {
      const soundType = this.getFlag(moduleId, "soundType");
      const soundId = this.getFlag(moduleId, "soundId");
      if (soundType && soundId) return `${soundType}s/${soundId}`;
      else return null;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _preUpdate(changed, options, user) {
      const allowed = await super._preUpdate(changed, options, user);
      if (allowed === false) return false;

      // Syrinscape doesn't allow resuming sounds
      if (this.syrinscapeURL) {
        if (changed.playing === false) changed.pausedTime = null;
      }
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _createSound() {
      if (game.audio.locked) {
        throw new Error("You may not call PlaylistSound#_createSound until after game audio is unlocked.");
      }

      const url = this.syrinscapeURL;

      if (url) {
        const sound = new SyrinscapeSound(url);
        sound.addEventListener("play", this._onStart.bind(this));
        sound.addEventListener("end", this._onEnd.bind(this));
        sound.addEventListener("stop", this._onStop.bind(this));
        return sound;
      }

      return super._createSound();
    }
  }

  /* -------------------------------------------------- */

  CONFIG.PlaylistSound.documentClass = SyrinscapePlaylistSound;
}
