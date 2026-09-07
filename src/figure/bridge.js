(() => {
  const embedded = window.parent !== window && new URLSearchParams(location.search).get('embedded') === '1';
  if (!embedded) return;

  document.body.classList.add('figure-embedded');
  const send = (type, detail = {}) => {
    window.parent.postMessage({ source: 'figureos', type, ...detail }, location.origin);
  };
  const gameById = id => (typeof G_DATA !== 'undefined' ? G_DATA.find(g => g.id === id) : null);
  const safeGame = g => g ? ({ id:g.id, name:g.n, developer:g.dev, image:g.img, background:g.bg, tags:g.tags || [] }) : null;

  if (typeof trStart === 'function') {
    const original = trStart;
    trStart = function(id) {
      const result = original.apply(this, arguments);
      const game = gameById(id);
      send('figure:game-start', { game: safeGame(game) });
      return result;
    };
  }
  if (typeof clsGm === 'function') {
    const original = clsGm;
    clsGm = function() {
      const game = typeof gmId !== 'undefined' ? gameById(gmId) : null;
      const result = original.apply(this, arguments);
      send('figure:game-close', { game: safeGame(game) });
      return result;
    };
  }
  if (typeof tglV === 'function') {
    const original = tglV;
    tglV = function(view) {
      const result = original.apply(this, arguments);
      if (view === 'g') send('figure:game-focus', { game: safeGame(typeof gmId !== 'undefined' ? gameById(gmId) : cxG) });
      return result;
    };
  }
  if (typeof setTheme === 'function') {
    const original = setTheme;
    setTheme = function(theme) {
      const result = original.apply(this, arguments);
      send('figure:theme-change', { theme });
      return result;
    };
  }
  if (typeof setParticles === 'function') {
    const originalParticles = setParticles;
    setParticles = function(particles) {
      const result = originalParticles.apply(this, arguments);
      send('figure:particles-change', { particles });
      return result;
    };
  }

  const publishLibrary = () => {
    if (typeof G_DATA === 'undefined' || !Array.isArray(G_DATA)) return;
    send('figure:library', { games: G_DATA.map(g => ({
      id:g.id, name:g.n, developer:g.dev, image:g.img, background:g.bg,
      tags:g.tags || [], description:g.desc || '', achievements:g.ach || 0
    })) });
  };

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || !event.data || event.data.source !== 'figureos-parent') return;
    const { type, id, theme, particles } = event.data;
    if (type === 'figure:get-library') publishLibrary();
    if (type === 'figure:set-theme' && typeof setTheme === 'function') setTheme(theme);
    if (type === 'figure:set-particles' && typeof setParticles === 'function') setParticles(particles);
    if (type === 'figure:close-game' && typeof clsGm === 'function') clsGm();
    if (type === 'figure:focus-game' && typeof tglV === 'function') tglV('g');
    if (type === 'figure:open-game') {
      const game = gameById(id);
      if (game && typeof opMdl === 'function') {
        if (typeof chgTab === 'function') chgTab('cine');
        opMdl(id);
      }
    }
  });

  const ready = () => {
    publishLibrary();
    send('figure:ready', {
      theme: localStorage.getItem('figure_theme') || 'dark',
      particles: localStorage.getItem('fig_particles') || 'none'
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ready, 80));
  else setTimeout(ready, 80);
})();
