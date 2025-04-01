import { moduleId } from "./constants.mjs";

/**
 * A class responsible for managing available sounds.
 */
export default class SoundManager {
  /**
   * Builds out default request options for use with `fetch`.
   * @type {{method: string, headers: Headers, redirect: string}}
   */
  get requestOptions() {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    if (!syrinscape.config.token) return null;
    else myHeaders.append("authorization", "token " + syrinscape.config.token);

    return {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };
  }

  /* -------------------------------------------------- */

  /**
   * Returns the json from a given URL.
   * @param {string} url      The url from which to fetch.
   * @returns {Promise<Array<unknown>|Record<string, unknown>>}
   */
  async fetchJson(url) {
    const requestOptions = this.requestOptions;
    if (!requestOptions) throw new Error("Syrinscape Controller | You need to successfully initialize syrinscape.config first.");
    url = `${game.settings.get(moduleId, "address")}/${url}`;
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      console.error(response, await response.json());
      throw new Error("Syrinscape Controller | Response Not OK!", { cause: response });
    }

    return response.json();
  }

  /* -------------------------------------------------- */

  /**
   * Fetches all available sound data from Syrinscape
   * @returns {Promise<Record<string, string | null>[]>}
   */
  async bulkData() {

    console.warn("Requesting bulk data after syrinscape config initialization...");
    await syrinscape.config.init();
    console.warn("Syrinscape config initialized, resuming bulk data request");

    const requestOptions = this.requestOptions;

    requestOptions.mode = "cors";

    if (!requestOptions) throw new Error("Syrinscape Controller | You need to successfully initialize syrinscape.config first.");

    const url = "https://syrinscape.com/account/remote-control-links/";
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      console.error(response, await response.json());
      throw new Error("Syrinscape Controller | Response Not OK!", { cause: response });
    }

    return response.json();
  }

  /* -------------------------------------------------- */

  /**
   * Fetch available soundsets.
   * @returns {Promise<object[]>}     A promise that resolves to an array of soundset data.
   */
  async listSoundSets() {
    return this.fetchJson("soundsets/");
  }

  /* -------------------------------------------------- */

  /**
   * List the moods for a soundset.
   * @param {string} uuid     Soundset uuid.
   * @returns {Promise<Array<unknown>|Record<string, unknown>>}
   */
  async moods(uuid) {
    return this.fetchJson("moods/?soundset_uuid=" + uuid);
  }

  /* -------------------------------------------------- */

  /**
   * List the elements for a soundset.
   * @param {string} uuid     Soundset uuid.
   * @returns {Promise<Array<unknown>|Record<string, unknown>>}
   */
  async elements(uuid) {
    return this.fetchJson("elements/?soundset__uuid=" + uuid);
  }
}
