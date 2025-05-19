# Syrinscape Controller

A spiritual successor to Wojtek Polak's (Frondeus) [SyrinControl](https://foundryvtt.com/packages/fvtt-syrin-control), this module allows you to control and play syrinscape elements within Foundry.

### How to use

To be able to play sounds from Syrinscape, you will need your personal authentication token to allow third party applications like Foundry to fetch them.

You can grab your authentication token at https://syrinscape.com/account/auth-token/. Then paste it into the game settings seen here:

![image](/assets/settings.png)

After this is done, move to the Playlist tab and open the Syrinscape Browser.

![image](/assets/playlist-tab.png)
![image](/assets/syrinscape-browser.png)

Here you will be able to fetch your data from Syrinscape directly. It is recommended you only do this once there is a new update on the website or when you have created new moods you wish to make available in Foundry.

You may need to refresh (F5) your browser after fetching the data such that it is stored correctly.

Afterwards, you should be able to see all your available, owned moods and one-shots and be able to play them at will.

### Playlists

The Syrinscape browser acccessed through the Playlist tab allows you to create custom playlists. Simply click the "Create Playlist" button in the browser (not in the Playlist tab), select the sounds you want, then finalize.

### Macros

To the left of each mood or one-shot in the browser is a draggable element. You can drag this onto your hotbar to create a utility macro for playing this single sound. Good for on-demand sound effects!

To reduce clutter, all macros created this way are stored in an automatically generated folder named "Syrinscape" in your macro directory to the right.

### Website

A tool is added to the AmbientSound canvas layer in left-side controls. This takes you to the Syrinscape website for direct customization.

![image](/assets/website.png)
