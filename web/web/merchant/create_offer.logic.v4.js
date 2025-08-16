
/*! Foody — Create Offer Logic v4 (2025-08-17) */
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  };
  onReady(init);

  function init(){
    const form = document.getElementById('offerForm');
    if (!form) return;
    const title = form.querySelector('#offerTitle');
    const base = form.querySelector('#originalPrice');     // базовая до скидки
    const disc = form.querySelector('#discountPercent');   // число %
    const final = form.querySelector('#finalPrice');       // итоговая цена (продажа)
    const qty = form.querySelector('#offerQty');
    const bestBefore = form.querySelector('#bestBefore');
    const expiresAt = form.querySelector('#expiresAt');
    const desc = form.querySelector('#offerDesc');
    const descCounter = form.querySelector('#descCounter');
    const errorBox = form.querySelector('#offerError');
    const summary = form.querySelector('#offerSummary');

    // chips
    const discountChips = Array.from(form.querySelectorAll('#discountChips .chip'));
    const expireChips = Array.from(form.querySelectorAll('#expireChips .chip'));

    // rounding
    let roundStep = 1;
    form.querySelectorAll('input[name="round"]').forEach(r => r.addEventListener('change', () => {
      roundStep = parseInt(r.value,10) || 1;
      // reapply based on last edit
      lastChanged === 'final' ? recalcFromFinal() : recalcFromDiscount();
    }));

    // counters
    desc?.addEventListener('input', () => {
      const len = (desc.value || '').length;
      if (descCounter) descCounter.textContent = len + ' / 160';
    });

    // default expiry: +2h
    if (expiresAt && !expiresAt.value){
      const d = new Date(Date.now() + 2*60*60*1000);
      expiresAt.value = toLocalInputValue(d);
    }

    // hook FilePond if present, but don't require
    try{
      if (typeof FilePond !== 'undefined'){
        const input = document.getElementById('offerImage');
        const hidden = document.getElementById('offerImageUrl');
        if (input && hidden){
          const pond = FilePond.create(input, { credits:false, allowMultiple:false, maxFiles:1, acceptedFileTypes:['image/*'], maxFileSize:'5MB' });
          pond.on('addfile', async (err, item) => {
            if (err) return;
            try{
              const url = await uploadImage(item.file);
              hidden.value = url || '';
            }catch(_){ hidden.value=''; }
          });
          pond.on('removefile', ()=> hidden.value='');
        }
      }
    }catch(_){}

    // disc↔final sync
    let lock = false;
    let lastChanged = 'discount'; // or 'final'

    discountChips.forEach(ch => ch.addEventListener('click', e => {
      e.preventDefault();
      const d = parseInt(ch.dataset.discount,10);
      if (!isFiniteVal(d) || !base) return;
      activateChip(discountChips, ch);
      disc && (disc.value = String(d));
      recalcFromDiscount();
    }));

    disc && ['input','change'].forEach(ev => disc.addEventListener(ev, () => { lastChanged='discount'; recalcFromDiscount(); }));
    final && ['input','change'].forEach(ev => final.addEventListener(ev, () => { lastChanged='final'; recalcFromFinal(); }));
    base && ['input','change'].forEach(ev => base.addEventListener(ev, () => {
      lastChanged === 'final' ? recalcFromFinal() : recalcFromDiscount();
    }));

    expireChips.forEach(ch => ch.addEventListener('click', e => {
      e.preventDefault();
      const action = ch.dataset.exp;
      const now = new Date();
      let t = null;
      if (action === 'close'){
        t = computeClosingTime() || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0);
      } else if (/^\+\d+$/.test(action)){
        t = new Date(now.getTime() + parseInt(action,10)*60*1000);
      }
      if (t && expiresAt){
        expiresAt.value = toLocalInputValue(t);
        activateChip(expireChips, ch);
      }
    }));

    qty && ['input','change'].forEach(ev => qty.addEventListener(ev, updateSummary));
    base && ['input','change'].forEach(ev => base.addEventListener(ev, updateSummary));
    final && ['input','change'].forEach(ev => final.addEventListener(ev, updateSummary));

    bestBefore && ['change','blur'].forEach(ev => bestBefore.addEventListener(ev, guardDates));
    expiresAt && ['change','blur'].forEach(ev => expiresAt.addEventListener(ev, guardDates));

    form.addEventListener('submit', (e) => {
      clearError();
      const ok = validate();
      if (!ok){
        e.preventDefault();
        return false;
      }
    });

    // initial
    recalcFromDiscount();
    updateSummary();

    // --- functions ---
    function recalcFromDiscount(){
      if (lock) return;
      if (!base || !final) return;
      lock = true;
      const b = money(base.value);
      const d = disc ? parseInt(disc.value,10) : NaN;
      if (isFiniteVal(b) && isFiniteVal(d)){
        final.value = moneyFmt(b * (1 - clamp(d,0,99.9)/100), roundStep);
        markChipByValue(discountChips, d);
      }
      lock = false;
      updateSummary();
    }
    function recalcFromFinal(){
      if (lock) return;
      if (!base || !final || !disc) return;
      lock = true;
      const b = money(base.value);
      const f = money(final.value);
      if (isFiniteVal(b) && isFiniteVal(f) && b>0){
        const d = (1 - f/b) * 100;
        disc.value = String(Math.round(clamp(d,0,99.9)));
        markChipByValue(discountChips, parseInt(disc.value,10));
      }
      lock = false;
      updateSummary();
    }

    function updateSummary(){
      if (!summary) return;
      const b = money(base?.value);
      const f = money(final?.value);
      const q = parseInt(qty?.value||'0',10)||0;
      const d = (isFiniteVal(b) && isFiniteVal(f) && b>0) ? Math.round((1 - f/b)*100) : null;
      if (isFiniteVal(f) && q>0){
        const total = Math.round(f) * q;
        const dtxt = d!=null ? ` (скидка ${d}%)` : '';
        summary.textContent = `Итог: ${Math.round(f)} ₽ × ${q} шт = ${total} ₽${dtxt}`;
      }else{
        summary.textContent='';
      }
    }

    function guardDates(){
      if (!expiresAt) return;
      const ea = getDate(expiresAt.value);
      const now = new Date();
      // must be in future
      if (!ea || ea.getTime() <= now.getTime()){
        showError('«Срок действия оффера» должен быть в будущем.');
        return false;
      }
      // must be <= bestBefore
      if (bestBefore && bestBefore.value){
        const bb = getDate(bestBefore.value);
        if (bb && ea.getTime() > bb.getTime()){
          // auto clamp
          expiresAt.value = toLocalInputValue(bb);
          showError('«Срок действия оффера» не может быть позже срока годности — поправили автоматически.');
          return false;
        }
      }
      clearError();
      return true;
    }

    function validate(){
      const t = (title?.value||'').trim();
      if (!t){ return showError('Введите название продукта.'); }
      const b = money(base?.value);
      const f = money(final?.value);
      const q = parseInt(qty?.value||'0',10)||0;
      if (!isFiniteVal(b) || b<=0){ return showError('Проверьте базовую цену.'); }
      if (!isFiniteVal(f) || f<=0){ return showError('Проверьте итоговую цену.'); }
      if (f >= b){ return showError('Итоговая цена должна быть меньше базовой.'); }
      if (!(q>0)){ return showError('Количество должно быть больше нуля.'); }
      if (!guardDates()) return false;
      // description length checked by maxlength; counter is visual
      return true;
    }

    function uploadImage(file){
      return new Promise(async (resolve,reject)=>{
        try{
          const api = (window.foodyApi || (window.__FOODY__ && window.__FOODY__.FOODY_API) || '').replace(/\/+$/,'');
          if (!api) return resolve(null);
          const fd = new FormData(); fd.append('file', file);
          const headers = {}; const tok = (localStorage.getItem('merchant_token')||localStorage.getItem('token')||'').trim();
          if (tok) headers['Authorization'] = 'Bearer '+tok;
          const resp = await fetch(api + '/upload', { method:'POST', body: fd, headers });
          if (!resp.ok) return resolve(null);
          const data = await resp.json().catch(()=> ({}));
          const url = data.url || data.location || (data.file&&data.file.url) || (data.result&&data.result.url) || null;
          resolve(url);
        }catch(e){ resolve(null); }
      });
    }

    function computeClosingTime(){
      // Try profile hours if present on page
      const to = document.getElementById('profile_work_to');
      if (to && to.value){
        const [hh, mm] = (to.value||'').split(':').map(x=>parseInt(x,10)||0);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
      }
      // fallback 22:00
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0);
    }

    // utils
    function activateChip(list, active){ list.forEach(x=>x.classList.remove('active')); active.classList.add('active'); }
    function markChipByValue(list, d){ const el = list.find(x => parseInt(x.dataset.discount,10) === parseInt(d,10)); if (!el) return list.forEach(x=>x.classList.remove('active')); activateChip(list, el); }
    function money(v){ if (v==null) return NaN; const s=String(v).replace(/\s+/g,'').replace(',','.').replace(/[^\d.]/g,''); return parseFloat(s); }
    function moneyFmt(n, step){ if (!isFinite(n)) return ''; const k = Math.max(1, step||1); return String(Math.round(n/k)*k); }
    function isFiniteVal(x){ return typeof x==='number' && isFinite(x); }
    function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
    function getDate(val){ if (!val) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val+'T23:59:00'); const d = new Date(val); return isNaN(d)?null:d; }
    function toLocalInputValue(d){ const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const da=String(d.getDate()).padStart(2,'0'); const h=String(d.getHours()).padStart(2,'0'); const mi=String(d.getMinutes()).padStart(2,'0'); return `${y}-${m}-${da}T${h}:${mi}`; }
    function showError(msg){ if (!errorBox) return false; errorBox.textContent = msg; errorBox.classList.remove('hidden'); return false; }
    function clearError(){ if (!errorBox) return; errorBox.textContent=''; errorBox.classList.add('hidden'); }
  }
})();
