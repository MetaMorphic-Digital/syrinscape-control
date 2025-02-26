import { moduleId } from "./constants.mjs";

export default function registerSyrinscapePlaylistSound() {
  class SyrinscapePlaylistSound extends CONFIG.PlaylistSound.documentClass {
    get syrinscapeURL() {
      const soundType = this.getFlag(moduleId, "soundType");
      const soundId = this.getFlag(moduleId, "soundId");
      if (soundType && soundId) return `${soundType}s/${soundId}`;
      else return null;
    }

    /** @override */
    _createSound() {
      if (game.audio.locked) {
        throw new Error("You may not call PlaylistSound#_createSound until after game audio is unlocked.");
      }

      const url = this.syrinscapeURL;

      if (url) {
        console.log(url);
      }

      return super._createSound();
    }
  }

  CONFIG.PlaylistSound.documentClass = SyrinscapePlaylistSound;
}
