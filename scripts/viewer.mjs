export default class SyrinscapeViewer extends foundry.applications.sidebar.apps.FrameViewer {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "SYRINSCAPE.Viewer.Title",
    },
  };
  
  /* -------------------------------------------------- */

  static create(sessionId, sessionToken) {
    sessionId ||= syrinscapeControl.auth.sessionId;
    sessionToken ||= syrinscapeControl.auth.sessionToken;
    if (game.user.isGM) return new this({ url: `https://app.syrinscape.com/${sessionId}/?auth_token=${sessionToken}` });
    else return new this({ url: `https://app.syrinscape.com/${sessionId}/player/?auth_token=${sessionToken}` });
  }
}
