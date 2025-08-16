
/*! Foody — Stability Hotfix: tabs rebind (2025-08-17) */
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  };
  onReady(()=>{
    const panes = Array.from(document.querySelectorAll('.pane'));
    const tabButtons = Array.from(document.querySelectorAll('#tabs [data-tab], .bottom-nav [data-tab]'));

    if (!panes.length || !tabButtons.length) return;

    function activate(name){
      panes.forEach(p => p.classList.toggle('active', p.id === name));
      tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      // опционально: обновляем hash
      try { history.replaceState(null, '', '#'+name); } catch(_){}
    }

    // Привязываем клики (не мешаем существующим — добавляем сверху)
    tabButtons.forEach(b => {
      b.addEventListener('click', (e)=>{
        const name = b.dataset.tab;
        if (name && document.getElementById(name)){
          activate(name);
        }
      });
    });

    // Если сейчас активны несколько панелей — оставим одну
    const actives = panes.filter(p => p.classList.contains('active'));
    if (actives.length !== 1){
      const first = (document.querySelector('#tabs .seg-btn.active') || tabButtons[0]);
      activate((first && first.dataset.tab) || 'dashboard');
    }
  });
})();
