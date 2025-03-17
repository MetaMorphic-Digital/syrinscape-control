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
      templates: ["modules/syrinscape-control/templates/browser/result.hbs"],
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

  /**
   * The number of pixels from the bottom before loading additional results.
   * @type {number}
   */
  static #BATCH_MARGIN = 50;

  /* -------------------------------------------------- */

  /**
   * The batch size of loaded results.
   * @type {number}
   */
  static #BATCH_SIZE = 50;

  /* -------------------------------------------------- */

  /**
   * Found results segmented into batches of size equal to #BATCH_SIZE.
   * This property is re-assigned each time 'results' is re-rendered.
   * @type {Generator}
   */
  #batches;

  /* -------------------------------------------------- */

  /**
   * Is inserting batched results currently in progress?
   * @type {boolean}
   */
  #renderThrottle = false;

  /* -------------------------------------------------- */

  /**
   * Get the next batch of results.
   * @returns {object[]}
   */
  #getNextBatch() {
    return [...this.#batches.next().value ?? []];
  }

  /* -------------------------------------------------- */

  /**
   * Produce batches of #BATCH_SIZE of the found results.
   * @param {object[]} iter   The found results.
   */
  *#segmentizeResults(iter) {
    iter = Iterator.from(iter);
    while (true) {
      const { value, done } = iter.next();
      if (done) break;
      yield function*() {
        yield value;
        yield* iter.take(SyrinscapeBrowser.#BATCH_SIZE - 1);
      }();
    }
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
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

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#initializeContextMenu();
    this.#initializeDragDrop();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("scroll", SyrinscapeBrowser.#scrollResults.bind(this), {
      capture: true, passive: true,
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!this.#cachedCollection) {
      this.#cachedCollection = syrinscapeControl.storage.soundData;
      if (!this.#cachedCollection) throw new Error("Invalid cached collection.");
    }
    Object.assign(context, { collection: this.#cachedCollection });
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "filters":
        await this.#preparePartFilters(context, options);
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
  async #preparePartFilters(context, options) {
    const filters = [];

    const cached = this.#filterModel.cached;

    for (const [k, v] of Object.entries(cached)) {
      const value = this.#filterModel[k];
      const options = Array.from(v)
        .map(v => ({ value: v, label: v }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const field = this.#filterModel.schema.getField(k);
      filters.push({ value, options, field });
    }

    Object.assign(context, { filters });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for template part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   */
  async #preparePartResults(context, options) {
    const filterData = this.#createFilterData({ moods: "mood", oneshots: "element" }[this.tabGroups.primary]);
    const results = context.collection.getByProperty(filterData).contents
      .sort((a, b) => a.name.localeCompare(b.name))
      .sort((a, b) => a.soundset.localeCompare(b.soundset));

    this.#batches = this.#segmentizeResults(results);
    Object.assign(context, { results: this.#getNextBatch() });
  }

  /* -------------------------------------------------- */

  /**
   * Morph the internal filtering data model into a configuration for filtering the syrin collection.
   * @param {"mood"|"element"} type   The type.
   * @returns {object}                The filtering configuration.
   */
  #createFilterData(type) {
    return Object.assign(this.#filterModel.toConfiguration(), { type: [type] });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
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
    if (this.tabGroups.primary === "moods") {
      syrinscapeControl.utils.playMood(id);
    } else {
      syrinscapeControl.utils.playElement(id);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Insert additional results when scrolling to the bottom.
   * @this {SyrinscapeBrowser}
   * @param {Event} event   The scroll event.
   */
  static async #scrollResults(event) {
    if (this.#renderThrottle || !event.target.matches("[data-application-part='results']")) return;

    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollTop + clientHeight < scrollHeight - SyrinscapeBrowser.#BATCH_MARGIN) return;
    this.#renderThrottle = true;
    const parent = event.target.querySelector(".entries");
    const results = await Promise.all(this.#getNextBatch().map(r => renderTemplate("modules/syrinscape-control/templates/browser/result.hbs", r,
    )));
    parent.insertAdjacentHTML("beforeend", results.join(""));
    this.#renderThrottle = false;
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
