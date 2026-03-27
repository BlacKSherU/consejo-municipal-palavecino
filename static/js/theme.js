(function () {
  "use strict";

  var STORAGE_KEY = "theme-preference";

  function prefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /** Resolve whether dark mode should be on (handles first visit + legacy "system"). */
  function resolveDark() {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") {
      return true;
    }
    if (stored === "light") {
      return false;
    }
    return prefersDark();
  }

  function applyDark(isDark) {
    var root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  }

  function updateToggleUi(toggle) {
    if (!toggle) {
      return;
    }
    var isDark = document.documentElement.classList.contains("dark");
    var labelLight = toggle.getAttribute("data-aria-light") || "Switch to light theme";
    var labelDark = toggle.getAttribute("data-aria-dark") || "Switch to dark theme";
    toggle.setAttribute("aria-label", isDark ? labelLight : labelDark);
    toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
  }

  function init() {
    var toggle = document.getElementById("theme-toggle");
    var stored = localStorage.getItem(STORAGE_KEY);

    if (stored !== "light" && stored !== "dark") {
      applyDark(resolveDark());
    } else {
      applyDark(stored === "dark");
    }

    updateToggleUi(toggle);

    if (toggle) {
      toggle.addEventListener("click", function () {
        var nextDark = !document.documentElement.classList.contains("dark");
        localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
        applyDark(nextDark);
        updateToggleUi(toggle);
      });
    }

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function () {
        var s = localStorage.getItem(STORAGE_KEY);
        if (s !== "light" && s !== "dark") {
          applyDark(resolveDark());
          updateToggleUi(toggle);
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
