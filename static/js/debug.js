/**
 * Debug logging gated by window.__CMP_BROWSER_LOG__ (set from Django / .env).
 * Use cmpDebug.log / warn / info instead of raw console.* in project scripts.
 */
(function (w) {
  "use strict";

  function on() {
    return !!w.__CMP_BROWSER_LOG__;
  }

  w.cmpDebug = {
    log: function () {
      if (on() && w.console && w.console.log) {
        w.console.log.apply(w.console, arguments);
      }
    },
    info: function () {
      if (on() && w.console && w.console.info) {
        w.console.info.apply(w.console, arguments);
      }
    },
    warn: function () {
      if (on() && w.console && w.console.warn) {
        w.console.warn.apply(w.console, arguments);
      }
    },
  };
})(window);
