
/*! Foody — Auth Dedupe Guard (2025-08-17)
    Убирает карточку «Войдите или зарегистрируйтесь» со всех вкладок, кроме #auth.
    Безопасно: ничего не ломает, просто чистит дубли. Работает и при динамических вставках. */
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  };

  onReady(()=>{
    const authSection = document.getElementById('auth');
    if (!authSection) return;

    const isAuthCard = (el)=>{
      if (!el || !el.querySelector) return false;
      return !!(el.querySelector('#loginForm, #registerForm, .auth-switch'));
    };

    function cleanup(scope){
      const root = scope || document;
      // Удаляем саму карточку, если она не внутри #auth
      root.querySelectorAll('.card').forEach(card=>{
        if (isAuthCard(card) && !authSection.contains(card)){
          card.remove();
        }
      });
      // На случай если формы вставлены без .card
      root.querySelectorAll('#loginForm, #registerForm, .auth-switch').forEach(node=>{
        if (!authSection.contains(node)){
          const card = node.closest('.card');
          (card || node).remove();
        }
      });
    }

    // Первичная чистка
    cleanup(document);

    // Наблюдатель за динамическими вставками
    const mo = new MutationObserver((mutations)=>{
      for (const m of mutations){
        m.addedNodes && m.addedNodes.forEach(n=>{
          if (n.nodeType !== 1) return;
          cleanup(n);
        });
      }
    });
    mo.observe(document.body, { childList:true, subtree:true });
  });
})();
