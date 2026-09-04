/**
 * Subclass of `SetField` for simplified creation of an HTMLAutocompleteTagsElement.
 * @extends foundry.data.fields.SetField
 */
export class ListSetField extends foundry.data.fields.SetField {
  constructor(field, options) {
    field ??= new foundry.data.fields.StringField();
    super(field, options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _toInput(config) {
    config.type = "autocomplete";
    return super._toInput(config);
  }
}
