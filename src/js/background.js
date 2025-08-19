(() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    enabled: false,
    interval: 30,
  };

  let reloadTimer = null;

  const loadSettings = async () => {
    const result = await chrome.storage.sync.get("periodicReloadSettings");
    return { ...DEFAULT_SETTINGS, ...result.periodicReloadSettings };
  };

  const reloadActiveTab = async () => {
    try {
      const windows = await chrome.windows.getAll();
      const focusedWindow = windows.find((w) => w.focused);

      if (!focusedWindow) {
        console.log("No focused window found, skipping reload");
        return;
      }

      const [activeTab] = await chrome.tabs.query({
        active: true,
        windowId: focusedWindow.id,
      });

      if (activeTab && activeTab.id) {
        // 設定ページを除外
        const optionsPageUrl = chrome.runtime.getURL("option.html");
        if (activeTab.url === optionsPageUrl) {
          console.log("Skipping reload: Options page is active");
          return;
        }

        await chrome.tabs.reload(activeTab.id);
        console.log(`Tab reloaded: ${activeTab.url} (Window: ${focusedWindow.id})`);
      }
    } catch (error) {
      console.error("Failed to reload active tab:", error);
    }
  };

  const startTimer = (interval) => {
    if (reloadTimer) {
      clearInterval(reloadTimer);
    }

    if (interval > 0) {
      reloadTimer = setInterval(reloadActiveTab, interval * 1000);
      console.log(`Periodic reload started: ${interval} seconds`);
    }
  };

  const stopTimer = () => {
    if (reloadTimer) {
      clearInterval(reloadTimer);
      reloadTimer = null;
      console.log("Periodic reload stopped");
    }
  };

  const setup = async () => {
    try {
      const settings = await loadSettings();
      if (settings.enabled) {
        startTimer(settings.interval);
      } else {
        stopTimer();
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  chrome.runtime.onStartup.addListener(async () => {
    await setup();
  });

  chrome.runtime.onInstalled.addListener(async () => {
    await setup();
  });

  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "settingsChanged") {
      await setup();
    }
  });
})();
