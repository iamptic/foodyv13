
/*! Foody Merchant Patch Pack — 2025‑08‑16
   Safe enhancer: adds recovery, eye icon, layout tweaks without breaking existing logic.
*/
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(fn, 0);
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  };

  onReady(()=>{
    try { injectStyles(); } catch(e){ console.warn('foody pack: styles fail', e); }
    try { centerAuthTitle(); } catch(e){ console.warn('foody pack: title fail', e); }
    try { makeRegisterFullWidth(); } catch(e){ console.warn('foody pack: register width fail', e); }
    try { enhancePasswordFields(); } catch(e){ console.warn('foody pack: password eye fail', e); }
    try { addForgotRecovery(); } catch(e){ console.warn('foody pack: recovery fail', e); }
    try { alignProfileButtons(); } catch(e){ console.warn('foody pack: profile actions fail', e); }
    try { ensurePhoneMaskFallback(); } catch(e){ console.warn('foody pack: phone mask fail', e); }
    try { prepareOfferDatetimeISO(); } catch(e){ console.warn('foody pack: offer datetime helper fail', e); }
  });

  function injectStyles(){
    const css = `
    .auth-title { text-align:center; margin: 8px 0 16px; }
    .btn-full { width:100%; display:inline-flex; justify-content:center; }

    .auth-help { margin: 8px 0 0; font-size: 14px; }
    .auth-help a { text-decoration: underline; cursor:pointer; }

    .foody-modal[hidden] { display:none; }
    .foody-modal { position: fixed; inset:0; background: rgba(0,0,0,.4);
      display:flex; align-items:center; justify-content:center; z-index: 10000; }
    .foody-modal .card { background:#fff; border-radius:12px; padding:16px;
      width:min(420px, 92vw); box-shadow:0 10px 30px rgba(0,0,0,.15); }
    .foody-modal .actions { display:flex; gap:12px; justify-content:flex-end; margin-top:12px; }
    .foody-modal input[type="tel"], .foody-modal input[type="text"] { width:100%; padding:10px 12px; border:1px solid #ddd; border-radius:8px; }

    /* Password eye */
    .pwd-field { position: relative; }
    .pwd-field input[type="password"], .pwd-field input[type="text"] { padding-right: 40px !important; }
    .pwd-toggle { position:absolute; right:10px; top:50%; transform:translateY(-50%);
      border:0; background:transparent; cursor:pointer; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; }
    .pwd-toggle svg { width:22px; height:22px; }

    /* Profile actions alignment */
    .profile-actions { display:grid; grid-template-columns: 1fr auto; gap:12px; align-items:center; }
    @media (max-width: 520px) {
      .profile-actions { grid-template-columns: 1fr; }
      .profile-actions .btn, .profile-actions button { width:100%; }
    }
    `;
    const style = document.createElement('style');
    style.setAttribute('data-foody-pack', '20250816');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function centerAuthTitle(){
    // Try to find h2/h3 with text about login/register
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'));
    const target = headings.find(h => /войдите|регист/i.test(h.textContent || ''));
    if (target) target.classList.add('auth-title');
  }

  function makeRegisterFullWidth(){
    // Find registration submit button
    // Heuristic: a button with text 'Зарегистрироваться' or inside a visible registration form
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const regBtn = buttons.find(b => /зарегистр/i.test((b.value||b.textContent||'').trim()));
    if (regBtn) {
      regBtn.classList.add('btn-full');
    }
  }

  function enhancePasswordFields(){
    // Replace emoji toggles with a proper eye icon and add toggles where missing.
    const pwds = Array.from(document.querySelectorAll('input[type="password"]'));
    pwds.forEach(inp => {
      // Wrap if not wrapped
      if (!inp.closest('.pwd-field')) {
        const wrap = document.createElement('div');
        wrap.className = 'pwd-field';
        inp.parentNode.insertBefore(wrap, inp);
        wrap.appendChild(inp);
      }
      // Remove emoji-based toggles next to input (basic heuristic)
      const sibs = Array.from(inp.parentNode.querySelectorAll('button,span'));
      sibs.forEach(el => {
        const txt = (el.textContent || '').trim();
        if (/[👁🙈🙉🙊]/.test(txt)) { el.remove(); }
      });
      // Add our toggle if missing
      if (!inp.parentNode.querySelector('.pwd-toggle')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pwd-toggle';
        btn.setAttribute('aria-label', 'Показать/скрыть пароль');
        btn.innerHTML = eyeSvg(true);
        btn.addEventListener('click', () => {
          const isPwd = inp.type === 'password';
          inp.type = isPwd ? 'text' : 'password';
          btn.innerHTML = eyeSvg(!isPwd);
        });
        inp.parentNode.appendChild(btn);
      }
    });
  }

  function eyeSvg(closed){
    // closed=true -> eye (password hidden); closed=false -> eye-off (password shown)
    return closed ? (
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
      '<circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
      '</svg>'
    ) : (
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
      '<path d="M3 3l18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
      '<path d="M10.58 10.58A3 3 0 0012 15a3 3 0 002.42-4.42M9.88 4.26A10.94 10.94 0 0112 5c6.5 0 10 7 10 7a18.74 18.74 0 01-4.26 5.32M6.1 6.1A18.59 18.59 0 002 12s3.5 7 10 7a10.94 10.94 0 005.74-1.62" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'+
      '</svg>'
    );
  }

  function addForgotRecovery(){
    // Find login form (button text 'Войти')
    const forms = Array.from(document.querySelectorAll('form'));
    let loginForm = forms.find(f => {
      const btn = f.querySelector('button[type="submit"], input[type="submit"]');
      const t = (btn?.value || btn?.textContent || '').trim();
      return /войти$/i.test(t) || /^вход$/i.test(t);
    });
    // find password input inside login form
    const pwd = loginForm ? loginForm.querySelector('input[type="password"]') : null;
    if (!pwd) return;

    // Add link under password
    if (!loginForm.querySelector('.auth-help')) {
      const p = document.createElement('p');
      p.className = 'auth-help';
      p.innerHTML = '<a id="foody-forgot-open">Забыли пароль?</a>';
      pwd.closest('.pwd-field') ? pwd.closest('.pwd-field').after(p) : pwd.after(p);
    }

    // Build modal
    if (!document.getElementById('foody-forgot-modal')) {
      const modal = document.createElement('div');
      modal.className = 'foody-modal';
      modal.id = 'foody-forgot-modal';
      modal.setAttribute('hidden','');
      modal.innerHTML = `
        <div class="card">
          <h3 style="margin:0 0 12px;">Восстановление доступа</h3>
          <p style="margin:0 0 10px;">Укажите телефон, к которому привязан аккаунт.</p>
          <input type="tel" id="foody-forgot-phone" placeholder="+7 (___) ___-__-__" inputmode="tel" />
          <div class="actions">
            <button id="foody-forgot-cancel" class="btn">Отмена</button>
            <button id="foody-forgot-submit" class="btn btn-primary">Отправить</button>
          </div>
        </div>`;
      document.body.appendChild(modal);

      const open = document.getElementById('foody-forgot-open');
      const cancel = document.getElementById('foody-forgot-cancel');
      const submit = document.getElementById('foody-forgot-submit');
      const phone = document.getElementById('foody-forgot-phone');

      if (open) open.addEventListener('click', (e)=>{
        e.preventDefault();
        modal.hidden = false;
        phone && phone.focus();
      });
      if (cancel) cancel.addEventListener('click', ()=> modal.hidden = true);
      if (submit) submit.addEventListener('click', async ()=>{
        const normalized = normalizePhoneE164(phone?.value || '');
        if (!/^\+7\d{10}$/.test(normalized)) {
          alert('Введите корректный телефон в формате +7XXXXXXXXXX');
          return;
        }
        const api = (window.foodyApi || '').replace(/\/+$/, '');
        const candidates = [
          `${api}/api/v1/auth/recovery`,
          `${api}/api/v1/merchant/recovery`,
          `${api}/api/v1/recovery/start`,
        ].filter(Boolean);
        let ok = false, lastErr = '';
        for (const url of candidates) {
          try {
            const resp = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: normalized }),
            });
            if (resp.ok) { ok = true; break; }
            lastErr = await resp.text().catch(()=>'');
          } catch (e) { lastErr = String(e); }
        }
        if (ok) {
          alert('Если аккаунт найден, мы отправили инструкцию для восстановления.');
          modal.hidden = true;
        } else {
          alert('Восстановление пока недоступно. Напишите в поддержку или попробуйте позже.');
          console.debug('foody recovery failed:', lastErr);
        }
      });
    }
  }

  function alignProfileButtons(){
    // Find two buttons: "Сохранить" and "Сменить пароль"
    const btns = Array.from(document.querySelectorAll('button, .btn'));
    const save = btns.find(b => /сохранить$/i.test((b.textContent||b.value||'').trim()));
    const change = btns.find(b => /сменить пароль/i.test((b.textContent||b.value||'').trim()));
    if (!save || !change) return;
    const parent = (save.closest('.profile-actions') || change.closest('.profile-actions') ||
                    commonAncestor(save, change) || save.parentElement);
    if (!parent) return;

    // Create wrapper if not exists
    if (!parent.classList.contains('profile-actions')) {
      const wrap = document.createElement('div');
      wrap.className = 'profile-actions';
      parent.insertBefore(wrap, save);
      wrap.appendChild(save);
      // if change is not next sibling, move it as well
      if (change.parentElement !== wrap) wrap.appendChild(change);
    }
  }

  function commonAncestor(a, b){
    const as = new Set();
    for (let n=a; n; n=n.parentElement) as.add(n);
    for (let m=b; m; m=m.parentElement) if (as.has(m)) return m;
    return null;
  }

  // Phone helpers
  function normalizePhoneE164(raw){
    const digits = String(raw||'').replace(/\D+/g,'');
    if (!digits) return '';
    let num = digits;
    if (num.startsWith('8')) num = '7' + num.slice(1);
    if (!num.startsWith('7')) num = '7' + num;
    return '+' + num.slice(0,11);
  }

  function ensurePhoneMaskFallback(){
    const inputs = Array.from(document.querySelectorAll('input[type="tel"]'));
    if (!inputs.length) return;
    inputs.forEach(inp => {
      let lock = false;
      inp.addEventListener('input', ()=>{
        if (lock) return;
        lock = true;
        const digits = (inp.value||'').replace(/\D+/g,'');
        let num = digits;
        if (num.startsWith('8')) num = '7' + num.slice(1);
        if (!num.startsWith('7')) num = '7' + num;
        let out = '+' + num.slice(0,1);
        if (num.length>1) out += ' (' + num.slice(1,4);
        if (num.length>=4) out += ') ' + num.slice(4,7);
        if (num.length>=7) out += '-' + num.slice(7,9);
        if (num.length>=9) out += '-' + num.slice(9,11);
        inp.value = out.replace(/\s+\-+$/,'').replace(/\(\)$/,'');
        lock = false;
      });
    });
  }

  function prepareOfferDatetimeISO(){
    // Non-invasive helper: set step and data-iso on datetime-local input
    const dt = document.querySelector('input[type="datetime-local"][id*="expires"], input[type="datetime-local"][name*="expires"]');
    if (!dt) return;
    dt.setAttribute('step', '60'); // minute granularity
    const toISO = () => {
      if (!dt.value) return;
      const local = new Date(dt.value);
      if (!isNaN(local)) {
        const iso = new Date(local.getTime() - local.getTimezoneOffset()*60000).toISOString().slice(0,19) + 'Z';
        dt.dataset.isoUtc = iso; // consumers may read dt.dataset.isoUtc if needed
      }
    };
    dt.addEventListener('change', toISO);
    toISO();
  }

})();
