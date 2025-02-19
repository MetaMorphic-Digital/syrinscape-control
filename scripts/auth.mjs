import { moduleId } from "./constants.mjs";

export default class AuthManager {
  /**
   * The session token to be used.
   * @type {string}
   */
  sessionToken;

  /* -------------------------------------------------- */

  /**
   * The session ID.
   * @type {string}
   */
  sessionId;

  /* -------------------------------------------------- */

  /**
   * Did the most recent initialize call successfully authenticate?
   * @type {boolean}
   */
  authenticated = false;

  /* -------------------------------------------------- */

  /**
   * Initialize session token and id.
   * @returns {Promise<void>}
   */
  async initialize() {
    const token = game.settings.get(moduleId, "authToken");

    if (!token) throw new Error("SyrinScape Controller | No auth token!");

    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Authorization", "token " + token);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
    };

    const response = await fetch("https://app.syrinscape.com/config/", requestOptions);

    if (!response.ok) throw new Error("SyrinScape Controller | Response Not OK!", { cause: response });

    const json = await response.json();

    console.warn("Received auth token", json);

    this.sessionToken = json["token"];
    this.sessionId = json["session_id"];
    this.authenticated = json["authenticated"];
  }

  /* -------------------------------------------------- */

  /**
   * Builds out default request options for use with `fetch`.
   * @type {object}
   */
  get requestOptions() {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    if (!this.sessionToken) return null;
    else myHeaders.append("Authorization", "token " + this.sessionToken);

    return {
      method: "GET",
      headers: myHeaders,
      redirect: "follow",
      mode: "no-cors",
    };
  }

  /* -------------------------------------------------- */

  /**
   * Returns the json from a given URL
   * @param {string} url
   * @returns {Promise<Array<unknown> | Record<string, unknown>>}
   */
  async fetchJson(url) {
    const requestOptions = this.requestOptions;
    if (!requestOptions) throw new Error("SyrinScape Controller | You need to successfully initialize the auth manager first.");
    url = `${game.settings.get(moduleId, "address")}/${url}`;
    console.log(url, requestOptions);
    const response = await fetch(url, requestOptions);

    console.warn(response);

    if (!response.ok) throw new Error("SyrinScape Controller | Response Not OK!", { cause: response });

    return response.json();
  }
}
