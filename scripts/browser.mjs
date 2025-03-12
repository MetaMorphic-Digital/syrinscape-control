const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class SyrinscapeBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "syrinscape-browser",
    classes: ["syrinscape", "browser"],
    tab: "moods",
    tag: "form",
    position: {
      width: 800,
      height: 800,
    },
    window: {
      title: "SYRINSCAPE.BROWSER.WINDOW.title",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    actions: {
      burger: SyrinscapeBrowser.#onClickBurger,
      play: SyrinscapeBrowser.#onClickPlay,
    },
    form: {
      handler: foundry.utils.debounce(SyrinscapeBrowser.#onChangeFilters, 200),
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "modules/syrinscape-control/templates/browser/header.hbs",
    },
    navigation: {
      template: "templates/generic/tab-navigation.hbs",
    },
    filters: {
      template: "modules/syrinscape-control/templates/browser/filters.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    results: {
      template: "modules/syrinscape-control/templates/browser/results.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "moods" },
        { id: "oneshots" },
      ],
      initial: "moods",
      labelPrefix: "SYRINSCAPE.BROWSER.TABS",
    },
  };

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /**
   * The singleton instance of this application.
   * @type {SyrinscapeBrowser|null}
   */
  static #instance = null;

  /* -------------------------------------------------- */

  /**
   * The cached data from a setting or csv.
   * @type {SyrinCollection|null}
   */
  #cachedCollection = null;
  get collection() {
    return this.#cachedCollection;
  }

  /* -------------------------------------------------- */

  /**
   * The internal model for holding onto the filter configuration.
   * @type {SyrinscapeFilterModel}
   */
  #filterModel = new syrinscapeControl.data.SyrinscapeFilterModel({}, { application: this });

  /* -------------------------------------------------- */

  /**
   * Factory method to prevent instantiating multiple instances of this browser.
   * @param {object} [options]    Rendering options.
   * @returns {Promise<SyrinscapeBrowser>}
   */
  static create(options) {
    if (!SyrinscapeBrowser.#instance) {
      const application = new this(options);
      SyrinscapeBrowser.#instance = application;
    }
    return SyrinscapeBrowser.#instance.render({ force: true });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#initializeContextMenu();
    this.#initializeDragDrop();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    SyrinscapeBrowser.#instance = null;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!this.#cachedCollection) {
      const notif = ui.notifications.info("Retrieving Syrinscape Data...", { pct: 0, progress: true });
      this.#cachedCollection = await syrinscapeControl.utils.retrieveLocalCSV({ parse: true });
      notif.update({ pct: 1 });
    }
    Object.assign(context, { collection: this.#cachedCollection });
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "header":
        await this.#preparePartHeader(context, options);
        break;
      case "filters":
        await this.#preparePartFilters(context, options);
        break;
      case "navigation":
        await this.#preparePartNavigation(context, options);
        break;
      case "results":
        await this.#preparePartResults(context, options);
        break;
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for template part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   */
  async #preparePartHeader(context, options) {}

  /* -------------------------------------------------- */

  /**
   * Prepare context for template part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   */
  async #preparePartFilters(context, options) {
    const filters = [];

    const cached = this.#filterModel.cached;

    for (const [k, v] of Object.entries(cached)) {
      const value = this.#filterModel[k];
      const options = Array.from(v).map(v => ({ value: v, label: v }));
      const field = this.#filterModel.schema.getField(k);
      const label = k;
      filters.push({ value, options, field, label });
    }

    Object.assign(context, { filters });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for template part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   */
  async #preparePartNavigation(context, options) {}

  /* -------------------------------------------------- */

  /**
   * Prepare context for template part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   */
  async #preparePartResults(context, options) {
    const filterData = this.#createFilterData({ moods: "mood", elements: "element" }[this.options.tab]);
    const results = context.collection.getByProperty(filterData);
    Object.assign(context, { results });
  }

  /* -------------------------------------------------- */

  /**
   * Morph the internal filtering data model into a configuration for filtering the syrin collection.
   * @param {"mood"|"element"} type   The type.
   * @returns {object}                The filtering configuration.
   */
  #createFilterData(type) {
    return Object.assign(this.#filterModel.toConfiguration(), { type });
  }

  /* -------------------------------------------------- */

  /** @override */
  changeTab(tab, group, { event, navElement, force = false, updatePosition = true } = {}) {
    super.changeTab(tab, group, { event, navElement, force, updatePosition });
    this.#filterModel.resetFilter(),
    this.render({
      tab,
      parts: ["filters", "results"],
    });
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle change events on the filters.
   * @this {SyrinscapeBrowser}
   * @param {Event} event             Triggering change event.
   * @param {HTMLFormElement} form    The element of this application.
   * @param {FormDataExtended} formData   The form data.
   */
  static #onChangeFilters(event, form, formData) {
    this.#filterModel.updateSource(formData.object);
    this.render({ parts: ["results"] });
  }

  /* -------------------------------------------------- */

  /**
   * Open the context menu when clicking the ellipse icon.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #onClickBurger(event, target) {
    const { clientX, clientY } = event;
    event.preventDefault();
    event.stopPropagation();
    target.closest(".entry").dispatchEvent(new PointerEvent("contextmenu", {
      bubbles: true, clientX: clientX - 1, clientY: clientY - 1,
    }));
  }

  /* -------------------------------------------------- */

  /**
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static #onClickPlay(event, target) {
    const id = target.closest(".entry").dataset.id;
    // TODO: the play button should change if the mood/element is currently playing
    // TODO: use utils.playElement depending
    syrinscapeControl.utils.playMood(id);
  }

  /* -------------------------------------------------- */
  /*   Context menu                                     */
  /* -------------------------------------------------- */

  /**
   * Initialize the context menu handler.
   */
  #initializeContextMenu() {
    // TODO: ContextMenu.create is deprecated: https://github.com/foundryvtt/foundryvtt/issues/12335
    foundry.applications.ui.ContextMenu.create(this, this.element, ".entry", {
      hookName: "SyrinscapeContext",
      jQuery: false,
      fixed: true,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context menu options for the moods and oneshots lists.
   * @returns {object[]}    Context menu options.
   */
  _getSyrinscapeContextOptions() {
    // TODO: play, stop, create macro, create playlist(?), create ambient sound
    return [{
      name: "HELLO1",
    }, {
      name: "HELLO2",
    }];
  }

  /* -------------------------------------------------- */
  /*   Drag Drop                                        */
  /* -------------------------------------------------- */

  /**
   * Initialize the drag-drop handler.
   */
  #initializeDragDrop() {
    const drag = new DragDrop({
      dragSelector: "[draggable]",
      callbacks: { dragstart: SyrinscapeBrowser.#dragStart.bind(this) },
    });
    drag.bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Initiate a drag-start event.
   * @this {SyrinscapeBrowser}
   * @param {DragEvent} event   The drag event.
   */
  static #dragStart(event) {
    console.warn(event.target, event.currentTarget);
    // TODO: this should be used for dropping a sound onto the canvas (ambient sound) or onto the hotbar (toggle macro)
    // event.dataTransfer.setData("text/plain", event.target.dataset.uuid);
  }
}
