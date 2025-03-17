import { moduleId } from "./constants.mjs";
import SyrinscapeSound from "./sound-extension.mjs";

/** @import SoundManager from "./sound-manager.mjs" */

/**
 * Register the Syrinscape Ambient Sound document & object classes
 * @remarks Not called in Setup due to limitations in the Syrinscape API with per-player per-sound controls.
 */
export default function registerSyrinscapeAmbientSound() {

  class SyrinscapeAmbientSoundDocument extends CONFIG.AmbientSound.documentClass {
    /**
     * URL for use with the {@link SoundManager}
     */
    get syrinscapeURL() {
      const soundType = this.getFlag(moduleId, "soundType");
      const soundId = this.getFlag(moduleId, "soundId");
      if (soundType && soundId) return `${soundType}s/${soundId}`;
      else return null;
    }

    /** @inheritdoc */
    prepareDerivedData() {
      super.prepareDerivedData();

      /**
       * Mildly dangerous because this isn't a valid path for normal sounds {@link CONST.AUDIO_FILE_EXTENSIONS}
       * BUT necessary for simplest SoundLayer handling so it knows there's something to play.
       */
      const url = this.syrinscapeURL;
      if (url) this.path = url;
    }

  }

  class SyrinscapeAmbientSound extends CONFIG.AmbientSound.objectClass {
    /** @inheritdoc */
    _createSound() {
      const url = this.document.syrinscapeURL;

      if (url) {
        const sound = new SyrinscapeSound(url);
        return sound;
      }

      return super._createSound();
    }
  }

  CONFIG.AmbientSound.documentClass = SyrinscapeAmbientSoundDocument;
  CONFIG.AmbientSound.objectClass = SyrinscapeAmbientSound;
}
