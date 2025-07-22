const { SetField, StringField } = foundry.data.fields;

/**
 * A custom data model to store filters being used in the Browser.
 */
export default class SyrinscapeFilterModel extends foundry.abstract.DataModel {
  constructor(data = {}, { application, ...options } = {}) {
    super(data, options);
    this.#application = application;
  }

  /* -------------------------------------------------- */

  /**
   * The browser application.
   * @type {SyrinscapeBrowser}
   */
  #application;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      product: new syrinscapeControl.data.fields.ListSetField(),
      soundset: new syrinscapeControl.data.fields.ListSetField(),
      status: new syrinscapeControl.data.fields.ListSetField(),
      subcategory: new syrinscapeControl.data.fields.ListSetField(),
      subtype: new syrinscapeControl.data.fields.ListSetField(),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["SYRINSCAPE.FILTERS"];

  /* -------------------------------------------------- */

  /**
   * Turn this model into a filtering configuration.
   * @returns {object}    Filtering configuration.
   */
  toConfiguration() {
    const config = {};
    for (const [k, v] of Object.entries(this)) {
      if (!v.size) continue;
      config[k] = [...v];
    }
    return config;
  }

  /* -------------------------------------------------- */

  /**
   * Clear out the filter.
   */
  resetFilter() {
    this.updateSource({
      product: [],
      soundset: [],
      status: [],
      subcategory: [],
      subtype: [],
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Cached options: product.
   * @type {Set<string>}
   */
  #product = new Set();

  /* -------------------------------------------------- */

  /**
   * Cached options: soundset.
   * @type {Set<string>}
   */
  #soundset = new Set();

  /* -------------------------------------------------- */

  /**
   * Cached options: status.
   * @type {Set<string>}
   */
  #status = new Set();

  /* -------------------------------------------------- */

  /**
   * Cached options: subcategory.
   * @type {Set<string>}
   */
  #subcategory = new Set();

  /* -------------------------------------------------- */

  /**
   * Cached options: subtype.
   * @type {Set<string>}
   */
  #subtype = new Set();

  /* -------------------------------------------------- */

  /**
   * Whether caching has been performed.
   * @type {boolean}
   */
  #cached = false;

  /* -------------------------------------------------- */

  /**
   * Cached properties for filtering.
   * @type {Record<string, Set<string>>}
   */
  get cached() {
    /** @type {Record<string, Set<string>>} */
    const data = {
      product: this.#product,
      soundset: this.#soundset,
      status: this.#status,
      subcategory: this.#subcategory,
      subtype: this.#subtype,
    };

    if (!this.#cached) {
      // Clear out any existing caching.
      for (const k in data) data[k].clear();

      // Populate caching.
      for (const entry of this.#application.collection) {
        for (const k of Object.keys(data)) {
          const key = {
            product: "product_or_pack",
            subtype: "sub_type",
          }[k] ?? k;
          const v = entry[key];
          if (v) data[k].add(v);
        }
      }

      this.#cached = true;
    }

    return data;
  }
}
