(() => {
  "use strict";

  const localize = chrome.i18n.getMessage;

  const DEFAULT_SETTINGS = {
    enabled: false,
    interval: 30,
  };

  class PeriodicReloadManager {
    constructor() {}

    async loadSettings() {
      try {
        const result = await chrome.storage.sync.get("periodicReloadSettings");
        const settings = result.periodicReloadSettings || {};
        return { ...DEFAULT_SETTINGS, ...settings };
      } catch (error) {
        console.error("Failed to load settings:", error);
        throw new Error(localize("error_load_settings"));
      }
    }

    async saveSettings(settings) {
      try {
        await chrome.storage.sync.set({ periodicReloadSettings: settings });
        chrome.runtime.sendMessage({ action: "settingsChanged" });
        return true;
      } catch (error) {
        console.error("Failed to save settings:", error);
        throw new Error(localize("error_save_settings"));
      }
    }

    getIntervalFromForm() {
      return parseInt(document.getElementById("intervalInput").value, 10);
    }

    applySettingsToForm(settings) {
      document.getElementById("intervalInput").value = settings.interval;
    }

    async toggleReload() {
      const currentSettings = await this.loadSettings();
      const interval = this.getIntervalFromForm();

      const newSettings = {
        enabled: !currentSettings.enabled,
        interval: interval,
      };

      await this.saveSettings(newSettings);
      return newSettings;
    }
  }

  class UIManager {
    constructor(reloadManager) {
      this.reloadManager = reloadManager;
    }

    setupLocalization() {
      document.querySelectorAll("[data-i18n-text]").forEach((element) => {
        const key = element.getAttribute("data-i18n-text");
        const message = localize(key);
        if (message) {
          element.textContent = message;
        }
      });
    }

    setupEventListeners() {
      document.getElementById("toggleButton").addEventListener("click", async () => {
        await this.handleToggle();
      });

      const intervalInput = document.getElementById("intervalInput");
      intervalInput.addEventListener("input", () => {
        const value = parseInt(intervalInput.value, 10);
        if (value < 10) {
          intervalInput.value = 10;
        } else if (value > 300) {
          intervalInput.value = 300;
        }
      });
    }

    async handleToggle() {
      try {
        const newSettings = await this.reloadManager.toggleReload();
        this.updateUI(newSettings);
      } catch (error) {
        this.showErrorMessage(error);
      }
    }

    updateUI(settings) {
      const statusElement = document.getElementById("currentStatus");
      const statusKey = settings.enabled ? "status_running" : "status_stopped";
      statusElement.textContent = localize(statusKey);
      statusElement.className = `status-value ${settings.enabled ? "running" : "stopped"}`;

      const toggleButton = document.getElementById("toggleButton");
      const buttonKey = settings.enabled ? "stop_button" : "start_button";
      toggleButton.textContent = localize(buttonKey);

      const intervalInput = document.getElementById("intervalInput");
      intervalInput.disabled = settings.enabled;
    }

    showErrorMessage(error) {
      const statusElement = document.getElementById("errorMessage");
      statusElement.textContent = error.message;
      statusElement.style.display = "block";
    }
  }

  class Initializer {
    constructor() {
      this.reloadManager = new PeriodicReloadManager();
      this.uiManager = new UIManager(this.reloadManager);
    }

    async setup() {
      try {
        this.uiManager.setupLocalization();
        this.uiManager.setupEventListeners();
        const settings = await this.reloadManager.loadSettings();
        this.reloadManager.applySettingsToForm(settings);
        this.uiManager.updateUI(settings);
      } catch (error) {
        this.uiManager.showErrorMessage(error);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const initializer = new Initializer();
    await initializer.setup();
  });
})();
