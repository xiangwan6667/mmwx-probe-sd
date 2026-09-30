// Restore the canvas before either document loads its application modules.
(() => {
  const root = document.documentElement;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  let cached;
  try { cached = JSON.parse(read('mmwx-probe-appearance') || 'null'); } catch { /* Ignore stale storage. */ }
  const preferences = ['flat', 'pixel', 'anime', 'premium', 'nezha', 'emerald', 'lumina'];
  const preference = read('mmwx-probe-theme');
  const selected = preference === 'nezhadash' ? 'nezha' : preference;
  const serverTheme = typeof cached?.theme === 'string' ? cached.theme.trim() : '';
  const theme = preferences.includes(selected) ? selected : serverTheme === 'nezhadash' ? 'nezha' : /^[A-Za-z0-9_-]{1,64}$/.test(serverTheme) ? serverTheme : 'pixel';
  const mode = read('mmwx-probe-color-mode');
  let dark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  try {
    if (window.parent !== window) {
      const parent = window.parent.document.documentElement.classList;
      if (parent.contains('dark') || parent.contains('light')) dark = parent.contains('dark');
    }
  } catch { /* A standalone or cross-origin page uses its own preference. */ }
  root.classList.add(`theme-${theme}`, dark ? 'dark' : 'light');
  root.style.colorScheme = dark ? 'dark' : 'light';
  const canvases = {
    nezha: ['hsl(0 0% 98%)', 'hsl(30 15% 8%)'],
    emerald: ['#fff', 'oklch(0.141 0.005 285.823)'],
    lumina: ['#f4f4f5', '#000'],
  };
  root.style.backgroundColor = (Object.hasOwn(canvases, theme) ? canvases[theme] : ['#f5f7fb', '#0f172a'])[dark ? 1 : 0];
  root.dataset.appearanceBoot = 'true';
})();
