
/*! Foody — Auth Title & Register Width Fix (2025-08-17) */
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  };

  onReady(()=>{
    try { centerAuthTitleExact(); } catch(e){}
    try { makeRegisterSubmitFullWidth(); } catch(e){}
  });

  function normalize(s){ return (s||'').replace(/\s+/g,' ').trim().toLowerCase(); }

  function centerAuthTitleExact(){
    const targetText = normalize('Войдите или зарегистрируйтесь');
    // search h1/h2/h3 and common title wrappers
    const nodes = Array.from(document.querySelectorAll('h1,h2,h3,.title,.section-title,.header,.headline'));
    let found = null;
    for (const n of nodes){
      if (normalize(n.textContent) === targetText){ found = n; break; }
    }
    if (!found) return;
    found.style.textAlign = 'center';
    found.style.marginTop = '8px';
    found.style.marginBottom = '16px';
  }

  function makeRegisterSubmitFullWidth(){
    let form = document.getElementById('registerForm');
    if (!form){
      // fallback: by button text
      const forms = Array.from(document.querySelectorAll('form'));
      for (const f of forms){
        const btn = f.querySelector('button[type="submit"], input[type="submit"]');
        const t = normalize((btn?.textContent || btn?.value || ''));
        if (t.includes('зарегистрироваться')) { form = f; break; }
      }
    }
    if (!form) return;
    const submit = form.querySelector('button[type="submit"], input[type="submit"]');
    if (!submit) return;
    submit.style.width = '100%';
    submit.style.display = 'inline-flex';
    submit.style.justifyContent = 'center';
  }
})();
