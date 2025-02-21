/**
 * A class responsible for managing available sounds.
 */
export default class SoundManager {
  /**
   * Fetch available soundsets.
   * @returns {Array<object>}      An array of soundset data.
   */
  async listSoundSets() {
    return syrinscapeControl.auth.fetchJson("soundsets/");
  }

  /**
   * List the moods for a soundset
   * @param {string} uuid      Soundset uuid.
   */
  async moods(uuid) {
    return syrinscapeControl.auth.fetchJson("moods/?soundset_uuid=" + uuid);
  }

  /**
   * List the elements for a soundset.
   * @param {string} uuid      Soundset uuid.
   * @returns
   */
  async elements(uuid) {
    return syrinscapeControl.auth.fetchJson("elements/?soundset__uuid=" + uuid);
  }
}
