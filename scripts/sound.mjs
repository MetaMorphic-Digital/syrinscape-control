/**
 * Manage available sounds
 */
export class SoundManager {
  async listSoundSets() {
    const json = await syrinscapeControl.auth.fetchJson("soundsets/");
    console.log("Sound Sets", json);
  }
}
