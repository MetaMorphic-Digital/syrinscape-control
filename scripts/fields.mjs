/**
 * Subclass of `HTMLStringTagsElement` that allows for use of `datalist`.
 */
export class HTMLStringTagsListElement extends foundry.applications.elements.HTMLStringTagsElement {
  /** @inheritdoc */
  static tagName = "string-tags-list";

  /* -------------------------------------------------- */

  /**
   * The data list options.
   * @type {{value: string, label: string}[]}
   */
  #listOptions;

  /* -------------------------------------------------- */

  /**
   * Unique id for datalist.
   * @type {string}
   */
  #listId = foundry.utils.randomID();

  /* -------------------------------------------------- */

  /**
   * The list element.
   * @type {HTMLDataListElement}
   */
  #list;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _buildElements() {
    const [tags, input, button] = super._buildElements();
    input.setAttribute("list", this.#listId);

    this.#listOptions = JSON.parse(this.getAttribute("listOptions"));
    this.removeAttribute("listOptions");

    const list = this.#list = document.createElement("DATALIST");
    list.setAttribute("id", this.#listId);
    for (const { value, label } of this.#listOptions) {
      list.insertAdjacentHTML("beforeend", `<option value="${value}">${label}</option>`);
    }

    return [tags, input, button, this.#list];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _activateListeners() {
    this._primaryInput.addEventListener("keydown", this.#keyDown.bind(this));
    super._activateListeners();
  }

  /* -------------------------------------------------- */

  /**
   * Additional keyboard event listener attached prior to the super
   * keyboard event, to make modifications to the input before submission.
   * @param {KeyboardEvent} event
   */
  #keyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    event.stopPropagation();
    const input = event.currentTarget.value?.slugify();
    if (!input) return;
    const option = this.#listOptions.find(option => {
      return option.value.slugify() === input;
    });
    if (option) event.currentTarget.value = option.value;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _validateTag(tag) {
    super._validateTag(tag);

    const option = this.#listOptions.find(option => {
      return option.value === tag;
    });
    if (!option) throw new Error(game.i18n.format("SYRINSCAPE.FILTERS.ERRORS.invalidValue", { value: tag }));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static create(config) {
    const { slug, value, list } = config;
    const tags = new this({ slug, values: value, list });
    tags.name = config.name;
    tags.toggleAttribute("slug", !!slug);
    tags.setAttribute("value", Array.from(value || []).join(","));

    tags.setAttribute("listOptions", JSON.stringify(Array.from(list || [])));

    foundry.applications.fields.setInputAttributes(tags, config);
    return tags;
  }
}

/* -------------------------------------------------- */

/**
 * Subclass of `SetField` that defaults to hold a `StringField` and supports rendering as an `HTMLStringTagsListElement`.
 */
export class ListSetField extends foundry.data.fields.SetField {
  constructor(field, options) {
    field ??= new foundry.data.fields.StringField();
    super(field, options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _toInput(config) {
    if (!config.list) return super._toInput(config);
    return HTMLStringTagsListElement.create(config);
  }
}
