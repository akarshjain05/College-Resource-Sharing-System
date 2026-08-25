(function() {
  try {
    var saved = localStorage.getItem("theme");
    var theme = saved;
    if (!theme) {
      var legacy = localStorage.getItem("share_neighbour_dark_mode");
      if (legacy !== null) {
        theme = legacy === "true" ? "dark" : "light";
      } else {
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
    }
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.write('<style id="fouc-fix">html, body { background-color: #020617 !important; color-scheme: dark; }</style>');
    } else {
      document.documentElement.classList.remove("dark");
      document.write('<style id="fouc-fix">html, body { background-color: #f8fafc !important; color-scheme: light; }</style>');
    }
  } catch (_) {}
})();
