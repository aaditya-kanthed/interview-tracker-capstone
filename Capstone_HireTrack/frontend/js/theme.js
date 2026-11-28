// Loaded in <head> BEFORE the page paints, so there is no flash of the wrong theme.
// The site is light by default; dark mode is used only if the user switched it on.
(function applySavedTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    // storage blocked (private mode) - stay light
  }
  document.documentElement.classList.toggle('dark', saved === 'dark');
})();
