import { moduleId } from "./constants.mjs";

const { StringField } = foundry.data.fields;

export default class SyrinScapeSettingsHandler {
  /**
   * The settings to register.
   * @type {Record<string, object>}
   */
  static get moduleSettings() {
    return {
      authToken: {
        name: "SYRINSCAPE.SETTINGS.AUTH.name",
        hint: "SYRINSCAPE.SETTINGS.AUTH.hint",
        type: new StringField({ blank: false }),
        scope: "client",
        config: true,
        onChange: (value) => syrinscape.config.token = value,
      },

      sessionId: {
        name: "SYRINSCAPE.SETTINGS.SessionId.name",
        type: new StringField({ blank: false }),
        scope: "world",
        onChange: (value) => syrinscape.config.sessionid = value,
      },

      address: {
        scope: "world",
        config: false,
        type: new StringField({ blank: false }),
        default: "https://syrinscape.com/online/frontend-api",
      },
    };
  }

  /* -------------------------------------------------- */

  /**
   * Register all the settings.
   */
  static registerSettings() {
    for (const [key, value] of Object.entries(this.moduleSettings)) {
      game.settings.register(moduleId, key, value);
    }
  }
}
