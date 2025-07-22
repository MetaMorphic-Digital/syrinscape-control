import { moduleId } from "./constants.mjs";

const { ArrayField, ObjectField, StringField, TypedObjectField } = foundry.data.fields;

export default class SyrinscapeSettingsHandler {
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
        scope: "world",
        config: true,
        requiresReload: true,
      },

      sessionId: {
        name: "SYRINSCAPE.SETTINGS.SessionId.name",
        type: new StringField(),
        scope: "world",
        config: false,
        onChange: (value) => syrinscape.config.sessionid = value,
      },

      bulkData: {
        type: new TypedObjectField(new ObjectField()),
        scope: "world",
        config: false,
        onChange: () => ui.syrinscapeBrowser.render(),
      },

      soundsetInfo: {
        type: new ArrayField(new ObjectField()),
        scope: "world",
        config: false,
        onChange: () => ui.syrinscapeBrowser.render(),
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
