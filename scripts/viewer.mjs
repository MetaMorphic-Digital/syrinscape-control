/**
 * An extension of the core Frame Viewer for use with the Syrinscape iFrame player.
 * @see https://docs.syrinscape.com/iframe-player/
 */
export default class SyrinscapeViewer extends foundry.applications.sidebar.apps.FrameViewer {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "SYRINSCAPE.Viewer.Title",
    },
  };

  /* -------------------------------------------------- */

  /**
   * Helper method to construct the frame viewer with an appropriate URL based on the current user.
   * @param {string} [sessionId]        The session ID, which should be identical for all connected users.
   *                                    Defaults to the one provided by the Auth Manager instance.
   * @param {string} [sessionToken]     The session Token, which should be unique per user.
   *                                    Defaults to the one provided by the Auth Manager instance.
   * @returns {SyrinscapeViewer}        An instance of this class
   */
  static create(sessionId, sessionToken) {
    const parts = [
      `https://app.syrinscape.com/${sessionId ? sessionId : syrinscapeControl.auth.sessionId}`,
      game.user.isGM ? null : "player",
      `?auth_token=${sessionToken ? sessionToken : syrinscapeControl.auth.sessionToken}`,
    ];
    return new this({ url: parts.filterJoin("/") });
  }
}
