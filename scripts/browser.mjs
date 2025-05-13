import { moduleId } from "./constants.mjs";
import SyrinscapeFilterModel from "./browser-filter-model.mjs";
import { currentlyPlaying, stopElement, stopMood } from "./api.mjs";

/** @import { SyrinCollection } from "./api.mjs" */

const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class SyrinscapeBrowser extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "syrinscape-browser",
    classes: ["syrinscape", "browser"],
    tab: "moods",
    tag: "form",
    position: {
      width: 1000,
      height: 800,
    },
    window: {
      title: "SYRINSCAPE.BROWSER.WINDOW.title",
      resizable: true,
      contentClasses: ["standard-form"],
    },
    actions: {
      burger: SyrinscapeBrowser.#onClickBurger,
      toggle: SyrinscapeBrowser.#onClickPlay,
      bulkDataRefresh: SyrinscapeBrowser.#bulkDataRefresh,
      stopSounds: SyrinscapeBrowser.#stopAllSounds,
      createPlaylist: SyrinscapeBrowser.#createPlaylist,
      cancelPlaylist: SyrinscapeBrowser.#cancelPlaylistCreation,
      confirmPlaylist: SyrinscapeBrowser.#confirmPlaylistCreation,
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
      scrollable: [".results.scrollable"],
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
    return [...this.#batches.next().value ?? []].map(result => {
      result.numericId = Number(result.id.split(":").at(-1));
      result.playing = syrinscapeControl.storage.isPlaying(result.id);
      return result;
    });
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
   * The cached data from a setting or bulk data import.
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
  #filterModel = new SyrinscapeFilterModel({}, { application: this });

  /* -------------------------------------------------- */

  /**
   * Tracks whether the results tab is drag and drop or checkboxes
   * @type {boolean}
   */
  #creatingPlaylist = false;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._createContextMenu(this.#getSyrinscapeContextOptions, ".entry", {
      container: this.element,
      fixed: true,
      hookName: "getSyrinscapeContextOptions",
      parentClassHooks: false,
    });
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
        context.makingPlaylist = this.#creatingPlaylist;
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
   * @param {import("@client/applications/ux/form-data-extended.mjs").default} formData   The form data.
   */
  static #onChangeFilters(event, form, formData) {
    // Don't refresh & resubmit if this is from the checkboxes to create a playlist
    if (event.target.name === "playlistSounds") return;
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
   * Start or stop a sound.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #onClickPlay(event, target) {
    const id = target.closest(".entry").dataset.id;
    const isPlaying = syrinscapeControl.storage.isPlaying(id);
    if (this.tabGroups.primary === "moods") {
      if (isPlaying) await syrinscapeControl.utils.stopMood(id);
      else await syrinscapeControl.utils.playMood(id);
    } else {
      if (isPlaying) await syrinscapeControl.utils.stopElement(id);
      else await syrinscapeControl.utils.playElement(id);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Open a dialog to refresh the available sounds
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #bulkDataRefresh(event, target) {
    const refresh = await foundry.applications.api.Dialog.confirm({
      window: { title: "SYRINSCAPE.BROWSER.REFRESHDATA.title" },
      content: `<p>${game.i18n.localize("SYRINSCAPE.BROWSER.REFRESHDATA.content")}</p>`,
      position: { width: 400 },
    });

    if (refresh) syrinscapeControl.storage.initializeSoundData(true);
  }

  /* -------------------------------------------------- */

  /**
   * Stop all sounds being played directly from the browser.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #stopAllSounds(event, target) {
    /** @type {import("@client/documents/playlist-sound.mjs").default[]} */
    const syrinscapePlaylistSounds = ui.playlists._playing.sounds.filter(s => s.getFlag(moduleId, "soundId"));
    const ids = new Set(syrinscapePlaylistSounds.map(s => Number(s.getFlag(moduleId, "soundId"))));

    const candidateSounds = await currentlyPlaying();
    for (const sound of candidateSounds) {
      if (ids.has(Number(sound.id))) continue;
      else if (sound.isMood) stopMood(sound.id);
      else stopElement(sound.id);
    }
    await this.render({ parts: ["results"] });
  }

  /* -------------------------------------------------- */

  /**
   * Switches results display to checkboxes to create playlist.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #createPlaylist(event, target) {
    this.#creatingPlaylist = true;
    await this.render({ parts: ["results"] });
  }

  /* -------------------------------------------------- */

  /**
   * Returns controls to drag and drop mode.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #cancelPlaylistCreation(event, target) {
    this.#creatingPlaylist = false;
    await this.render({ parts: ["results"] });
  }

  /* -------------------------------------------------- */

  /**
   * Creates a playlist from the selected mood or one shot elements.
   * @this {SyrinscapeBrowser}
   * @param {PointerEvent} event    Initiating click event.
   * @param {HTMLElement} target    The element that defined the [data-action].
   */
  static async #confirmPlaylistCreation(event, target) {
    target.disabled = true;
    const fd = new foundry.applications.ux.FormDataExtended(this.form);
    const soundValues = fd.object.playlistSounds.filter(e => e);
    const sounds = soundValues.map(v => {
      const [entryId, name] = v.split("-");
      return this.#entryToPlaylistSound(name, entryId);
    });
    await foundry.documents.Playlist.create({
      sounds,
      name: game.i18n.localize("SYRINSCAPE.BROWSER.HINTS.playlist.new"),
      channel: "environment",
      mode: (this.tabGroups.primary === "moods")
        ? CONST.PLAYLIST_MODES.SIMULTANEOUS
        : CONST.PLAYLIST_MODES.DISABLED,
    });
    this.#creatingPlaylist = false;
    await this.render({ parts: ["results"] });
  }

  /* -------------------------------------------------- */

  /**
   * Insert additional results when scrolling to the bottom.
   * @this {SyrinscapeBrowser}
   * @param {Event} event   The scroll event.
   */
  static async #scrollResults(event) {
    if (this.#renderThrottle || !event.target.matches(".results.scrollable")) return;

    const { scrollTop, scrollHeight, clientHeight } = event.target;
    if (scrollTop + clientHeight < scrollHeight - SyrinscapeBrowser.#BATCH_MARGIN) return;
    this.#renderThrottle = true;
    /** @type {HTMLElement} */
    const parent = event.target.querySelector(".entries");
    const results = await Promise.all(this.#getNextBatch().map(r => {
      return foundry.applications.handlebars.renderTemplate("modules/syrinscape-control/templates/browser/result.hbs", r);
    }));
    const template = document.createElement("UL");
    template.innerHTML = results.join("");
    this.#dragdrop.bind(template);
    for (const c of template.childNodes) {
      parent.insertAdjacentElement("beforeend", c);
    }
    this.#renderThrottle = false;
  }

  /* -------------------------------------------------- */
  /*   Context menu                                     */
  /* -------------------------------------------------- */

  /**
   * Prepare context menu options for the moods and oneshots lists.
   * @returns {object[]}    Context menu options.
   */
  #getSyrinscapeContextOptions() {
    const isMoods = () => this.tabGroups.primary === "moods";
    const getEntry = li => this.#cachedCollection.get(li.dataset.id);
    const isPlaying = li => syrinscapeControl.storage.isPlaying(li.dataset.id);

    return [
      {
        name: "SYRINSCAPE.BROWSER.CONTEXTMENU.play",
        condition: li => !isPlaying(li),
        icon: "<i class='fa-solid fa-fw fa-circle-play'></i>",
        callback: li => {
          const id = li.dataset.id;
          if (isMoods()) syrinscapeControl.utils.playMood(id);
          else syrinscapeControl.utils.playElement(id);
        },
      },
      {
        name: "SYRINSCAPE.BROWSER.CONTEXTMENU.stop",
        condition: li => isPlaying(li),
        icon: "<i class='fa-solid fa-fw fa-stop'></i>",
        callback: li => {
          const id = li.dataset.id;
          if (isMoods()) syrinscapeControl.utils.stopMood(id);
          else syrinscapeControl.utils.stopElement(id);
        },
      },
      {
        name: "SYRINSCAPE.BROWSER.CONTEXTMENU.macro",
        condition: li => false && game.user.can("MACRO_SCRIPT"), // TODO
        icon: "<i class='fa-solid fa-fw fa-code'></i>",
        callback: li => {
          // TODO
        },
      },
      {
        name: "SYRINSCAPE.BROWSER.CONTEXTMENU.playlist",
        condition: li => false && game.user.can("PLAYLIST_CREATE") && isMoods(), // TODO
        icon: "<i class='fa-solid fa-fw fa-music'></i>",
        callback: li => {
          // TODO
        },
      },
    ];
  }

  /* -------------------------------------------------- */
  /*   Drag Drop                                        */
  /* -------------------------------------------------- */

  /**
   * Reference to this application's drag-drop instance.
   * @type {DragDrop}
   */
  #dragdrop;

  /* -------------------------------------------------- */

  /**
   * Initialize the drag-drop handler.
   */
  #initializeDragDrop() {
    const drag = new foundry.applications.ux.DragDrop({
      dragSelector: "[draggable]",
      callbacks: { dragstart: SyrinscapeBrowser.#dragStart.bind(this) },
    });
    this.#dragdrop = drag.bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Initiate a drag-start event.
   * @this {SyrinscapeBrowser}
   * @param {DragEvent} event   The drag event.
   */
  static #dragStart(event) {
    const entry = event.target.closest("[data-id]");
    const entryId = entry.dataset.id;

    // With AmbientSound creation blocked, this is a fairly clean way to handle the playlist creation
    const dragData = {
      type: "PlaylistSound",
      data: this.#entryToPlaylistSound(entry.dataset.name, entryId),
    };

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------------- */

  /**
   * Maps an entry's data to the create data for a PlaylistSound
   * @param {string} name       The name of the sound.
   * @param {string} entryId    The entry ID, in the format of `m:number` or `e:number`.
   * @returns {import("@common/documents/_types.mjs").PlaylistSoundData}
   */
  #entryToPlaylistSound(name, entryId) {
    const [typeAbbrev, soundId] = entryId.split(":");
    return {
      name,
      flags: {
        [moduleId]: {
          soundType: typeAbbrev === "e" ? "element" : "mood",
          soundId,
        },
      },
    };
  }
}
