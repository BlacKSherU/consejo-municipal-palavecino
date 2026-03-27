(function () {
  "use strict";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function revealElements() {
    var nodes = document.querySelectorAll("[data-reveal]");
    if (!nodes.length) {
      return;
    }

    if (prefersReducedMotion()) {
      nodes.forEach(function (el) {
        el.classList.remove("reveal-hidden");
        el.classList.add("reveal-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.remove("reveal-hidden");
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );

    nodes.forEach(function (el) {
      el.classList.add("reveal-hidden");
      observer.observe(el);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealElements);
  } else {
    revealElements();
  }
})();
