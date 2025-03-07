import SyrinscapeSound from "./sound-extension.mjs";

export default function registerSyrinscapeAmbientSound() {
  class SyrinscapeAmbientSound extends CONFIG.AmbientSound.objectClass {
    get syrinscapeURL() {
      const soundType = this.getFlag(moduleId, "soundType");
      const soundId = this.getFlag(moduleId, "soundId");
      if (soundType && soundId) return `${soundType}s/${soundId}`;
      else return null;
    }

    /** @override */
    _createSound() {
      const url = this.syrinscapeURL;

      if (url) {
        console.log(url);
        const sound = new SyrinscapeSound(url);
        return sound;
      }

      return super._createSound();
    }
  }

  CONFIG.AmbientSound.objectClass = SyrinscapeAmbientSound;
}
