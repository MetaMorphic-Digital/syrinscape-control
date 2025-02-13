import { moduleId } from "./constants.mjs";

export default class SyrinScapeSettingsHandler {
  static get moduleSettings() {
    const fields = foundry.data.fields;

    return {
      authToken: {
        name: "SYRINSCAPE.Settings.auth.name",
        hint: "SYRINSCAPE.Settings.auth.hint",
        type: new fields.StringField({ blank: false }),
        scope: "client",
        config: true,
      },
    };
  }

  static registerSettings() {
    for (const [key, value] of Object.entries(this.moduleSettings)) {
      game.settings.register(moduleId, key, value);
    }
  }
}
