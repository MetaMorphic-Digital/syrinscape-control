import { moduleId } from "./constants.mjs";

const { StringField } = foundry.data.fields;

export default class SyrinScapeSettingsHandler {
  static get moduleSettings() {
    const fields = foundry.data.fields;

    return {
      authToken: {
        name: "SYRINSCAPE.SETTINGS.AUTH.name",
        hint: "SYRINSCAPE.SETTINGS.AUTH.hint",
        type: new StringField({ blank: false }),
        scope: "client",
        config: true,
        onChange: () => syrinscapeControl.auth.initialize(),
      },
    };
  }

  /* -------------------------------------------------- */

  static registerSettings() {
    for (const [key, value] of Object.entries(this.moduleSettings)) {
      game.settings.register(moduleId, key, value);
    }
  }
}
