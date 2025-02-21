/**
 * A class responsible for managing available sounds.
 */
export default class SoundManager {
  /**
   * Fetch available soundsets.
   * @returns {Promise<object[]>}     A promise that resolves to an array of soundset data.
   */
  async listSoundSets() {
    return syrinscapeControl.auth.fetchJson("soundsets/");
  }

  /**
   * List the moods for a soundset.
   * @param {string} uuid     Soundset uuid.
   * @returns {Promise<Array<unknown>|Record<string, unknown>>}
   */
  async moods(uuid) {
    return syrinscapeControl.auth.fetchJson("moods/?soundset_uuid=" + uuid);
  }

  /**
   * List the elements for a soundset.
   * @param {string} uuid     Soundset uuid.
   * @returns {Promise<Array<unknown>|Record<string, unknown>>}
   */
  async elements(uuid) {
    return syrinscapeControl.auth.fetchJson("elements/?soundset__uuid=" + uuid);
  }
}
