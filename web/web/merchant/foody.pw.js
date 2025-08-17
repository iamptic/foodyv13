
/*! Add eye toggles to ALL password fields (login/registration/reset) */
(function(){
  function ready(fn){ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); }
  function ensure(input){
    if(!input || input.closest('.pw-field')) return;
    var w=document.createElement('div'); w.className='pw-field';
    input.parentNode.insertBefore(w,input); w.appendChild(input);
    var btn=document.createElement('button'); btn.type='button'; btn.className='pw-toggle'; btn.setAttribute('aria-pressed','false');
    btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
    w.appendChild(btn);
    btn.addEventListener('click', function(){ var show = input.type==='password'; input.type = show?'text':'password'; btn.setAttribute('aria-pressed', show?'true':'false'); btn.innerHTML= show?'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.86 20.86 0 0 1 5.08-5.94"/><path d="M1 1l22 22"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'; });
  }
  function apply(){ document.querySelectorAll('input[type="password"]').forEach(ensure); }
  ready(function(){ apply(); try{ new MutationObserver(apply).observe(document.body,{childList:true,subtree:true}); }catch(_){}});
})();
