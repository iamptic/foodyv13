/*! Foody Bundle JS — 2025-08-17 fix5
 * - Tabs persistence (from fix4)
 * - Auth dedupe guard
 * - Create Offer UX:
 *   · reorder fields: Title -> Qty -> Original Price -> Discount controls -> Final Price
 *   · label tweaks: "Обычная цена" (hint стар.цена), "Новая цена (после скидки)"
 *   · discount after base, % input, strict closing by profile, bestBefore, summary (deduped), nice select, FilePond hook
 */
(function(){
  const onReady=(fn)=>{ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); };
  onReady(()=>{ bindTabs(); dedupeAuth(); enhanceCreateOffer(); });

  /* ---------- Tabs with persistence ---------- */
  function bindTabs(){
    const panes=[...document.querySelectorAll('.pane')];
    const tabs=[...document.querySelectorAll('#tabs [data-tab], .bottom-nav [data-tab]')];
    if(!panes.length||!tabs.length) return;

    let current=null, applying=false;
    function activate(name, opts){
      if(!name||!document.getElementById(name)) return;
      current=name; applying=true;
      panes.forEach(p=>p.classList.toggle('active', p.id===name));
      tabs.forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
      if(!opts||!opts.silentHash){ try{ history.replaceState(null,'','#'+name);}catch(_){ } }
      try{ localStorage.setItem('foody:lastTab', name);}catch(_){ }
      applying=false;
    }
    tabs.forEach(b=> b.addEventListener('click',()=> activate(b.dataset.tab)));

    const fromHash=(location.hash||'').replace('#','');
    const saved=(function(){ try{ return localStorage.getItem('foody:lastTab'); }catch(_){ return null; } })();
    if (fromHash && document.getElementById(fromHash)) activate(fromHash,{silentHash:true});
    else if (saved && document.getElementById(saved)) activate(saved,{silentHash:true});
    else { const first=(document.querySelector('#tabs .seg-btn.active')||tabs[0]); activate((first&&first.dataset.tab)||'dashboard',{silentHash:true}); }
    setTimeout(()=> current && activate(current,{silentHash:true}),0);
    setTimeout(()=> current && activate(current,{silentHash:true}),200);
    window.addEventListener('hashchange',()=>{ if(applying) return; const name=(location.hash||'').replace('#',''); if(name&&document.getElementById(name)) activate(name,{silentHash:true}); });
    window.addEventListener('beforeunload',()=>{ try{ localStorage.setItem('foody:lastTab', current||'dashboard'); }catch(_){ } });
  }

  /* ---------- Remove auth duplicates ---------- */
  function dedupeAuth(){
    const auth=document.getElementById('auth'); if(!auth) return;
    const isAuth=el=> el&&el.querySelector && !!(el.querySelector('#loginForm,#registerForm,.auth-switch'));
    function cleanup(scope){ const root=scope||document;
      root.querySelectorAll('.card').forEach(c=>{ if(isAuth(c)&&!auth.contains(c)) c.remove(); });
      root.querySelectorAll('#loginForm,#registerForm,.auth-switch').forEach(n=>{ if(!auth.contains(n)){ const c=n.closest('.card'); (c||n).remove(); } });
    }
    cleanup(document);
    const mo=new MutationObserver(m=> m.forEach(x=> x.addedNodes && x.addedNodes.forEach(n=>{ if(n.nodeType===1) cleanup(n); })));
    mo.observe(document.body,{childList:true,subtree:true});
  }

  /* ---------- Create Offer UX ---------- */
  function enhanceCreateOffer(){
    const pane=document.getElementById('create'); if(!pane) return;
    const form=pane.querySelector('#offerForm')||pane.querySelector('form'); if(!form) return;

    const base = form.querySelector('#offerOldPrice,[name="original_price"]'); // обычная/старая цена
    const final = form.querySelector('#offerPrice,[name="price"]');            // новая цена (после скидки)
    const qty   = form.querySelector('[name="qty_total"]');
    const title = form.querySelector('[name="title"]');
    const expires = form.querySelector('#expires_at,[name="expires_at"]');
    const chipsWrap = form.querySelector('#discountPresets');
    const expireWrap = form.querySelector('#expirePresets');
    const category = form.querySelector('select[name="category"]');
    const errorBox = form.querySelector('#offerError');

    // --- nice select
    if (category && !category.classList.contains('nice-select')) category.classList.add('nice-select');

    // --- make sure discount% exists right after chips
    let disc = form.querySelector('#discountPercent');
    if (!disc){
      const row = document.createElement('div');
      row.className='full'; row.id='foodyDiscountRow';
      row.innerHTML='<label for="discountPercent">Скидка, %</label> <input id="discountPercent" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="например, 50" style="width:120px">';
      // if chips exist, append right after; else insert near top
      if (chipsWrap && chipsWrap.parentElement) chipsWrap.parentElement.insertBefore(row, chipsWrap.nextSibling);
      else form.insertBefore(row, form.firstChild);
      disc=row.querySelector('#discountPercent');
    }
    const discRow = disc ? (disc.closest('.full') || disc.parentElement) : null;

    // --- move DISCOUNT CHIPS under base price (we'll reorder whole group below)
    // ensure chips container reference (prefer .full wrapper if exists)
    const chipsBlock = chipsWrap ? (chipsWrap.closest('.full') || chipsWrap) : null;

    // --- rename labels
    if (base){ const lbl=base.closest('label'); if (lbl){ setLabelText(lbl,'Обычная цена'); ensureSubHint(lbl,'Ранее без скидки (старая цена)'); } }
    if (final){ const lbl=final.closest('label'); if (lbl){ setLabelText(lbl,'Новая цена'); ensureSubHint(lbl,'Цена продажи после скидки'); } }
    if (expires){ const lbl=expires.closest('label'); if (lbl){ setLabelText(lbl,'Срок действия оффера'); } }

    // --- ensure bestBefore above expires
    let bestBefore=form.querySelector('#bestBefore');
    if (!bestBefore && expires){
      const label=document.createElement('label'); label.className='full';
      label.innerHTML='Срок годности продукта <input id="bestBefore" type="datetime-local" placeholder="до какого времени продукт ок"><div class="muted small">Поле не отправляется на сервер — только контроль.</div>';
      const expLabel=expires.closest('label')||expires.parentElement;
      if (expLabel && expLabel.parentElement) expLabel.parentElement.insertBefore(label, expLabel);
      bestBefore=label.querySelector('#bestBefore');
    }

    // --- REORDER: Title -> Qty -> Base -> Chips -> Disc% -> Final
    try{
      const titleLabel = title ? (title.closest('label') || title.parentElement) : null;
      const qtyLabel   = qty ? (qty.closest('label') || qty.parentElement) : null;
      const baseLabel  = base ? (base.closest('label') || base.parentElement) : null;
      const finalLabel = final ? (final.closest('label') || final.parentElement) : null;

      // anchor = first label in form
      const anchor = form.querySelector('label') || form.firstElementChild;

      function placeAfter(ref, el){ if (!ref || !el) return; ref.parentElement.insertBefore(el, ref.nextSibling); return el; }

      if (titleLabel) form.insertBefore(titleLabel, anchor);
      const after1 = titleLabel || anchor;
      if (qtyLabel) placeAfter(after1, qtyLabel);
      const after2 = qtyLabel || after1;
      if (baseLabel) placeAfter(after2, baseLabel);
      const after3 = baseLabel || after2;
      if (chipsBlock) placeAfter(after3, chipsBlock);
      const after4 = chipsBlock || after3;
      if (discRow) placeAfter(after4, discRow);
      const after5 = discRow || after4;
      if (finalLabel) placeAfter(after5, finalLabel);
    }catch(_){}

    // --- default strictly by profile
    // (no auto if profile "до" is empty)
    if (expires && !expires.value){
      const close = computeStrictClosingTime();
      if (close) expires.value = toLocalInputValue(close);
    }

    // --- clean up duplicate summaries, then ensure one exists
    [...form.querySelectorAll('#offerSummary,#foodySummary')].slice(1).forEach(n=> n.remove());
    let summary=form.querySelector('#foodySummary') || form.querySelector('#offerSummary');
    if (!summary){
      summary=document.createElement('div'); summary.id='foodySummary'; summary.className='foody-summary full';
      (form.querySelector('.form-footer')||form).before(summary);
    }

    // --- events
    const discountChips = Array.from(form.querySelectorAll('#discountPresets .chip'));
    discountChips.forEach(ch=> ch.addEventListener('click', e=>{
      e.preventDefault(); const d=parseInt(ch.dataset.discount,10);
      if (!isFinite(d)) return; disc && (disc.value=String(d)); activateChip(discountChips, ch); recalcFromDiscount();
    }));
    const expireChips = Array.from(expireWrap ? expireWrap.querySelectorAll('.chip') : []);
    expireChips.forEach(ch=> ch.addEventListener('click', e=>{
      e.preventDefault();
      const action = ch.dataset.action || ch.dataset.exp;
      const now = new Date(); let t=null;
      if (action==='close'){ const c=computeStrictClosingTime(); if(!c){ showError('Укажите время закрытия в профиле (Профиль → Время работы: «до»).'); return; } t=c; }
      else if (/^\+\d+$/.test(action)){ t=new Date(now.getTime()+parseInt(action,10)*60*1000); }
      if (t && expires){ expires.value=toLocalInputValue(t); activateChip(expireChips, ch); clearError(); guardDates(); }
    }));

    // --- sync + validate
    let lock=false, lastChanged='discount';
    disc && ['input','change'].forEach(ev=> disc.addEventListener(ev, ()=>{ lastChanged='discount'; recalcFromDiscount(); }));
    final && ['input','change'].forEach(ev=> final.addEventListener(ev, ()=>{ lastChanged='final'; recalcFromFinal(); }));
    base && ['input','change'].forEach(ev=> base.addEventListener(ev, ()=>{ lastChanged==='final'? recalcFromFinal():recalcFromDiscount(); }));
    qty && ['input','change'].forEach(ev=> qty.addEventListener(ev, updateSummary));
    bestBefore && ['change','blur'].forEach(ev=> bestBefore.addEventListener(ev, guardDates));
    expires && ['change','blur'].forEach(ev=> expires.addEventListener(ev, guardDates));

    form.addEventListener('submit', e=>{ clearError(); if(!validate()){ e.preventDefault(); return false; } });

    recalcFromDiscount(); updateSummary(); guardDates();

    // ---- helpers ----
    function recalcFromDiscount(){
      if (lock) return; if (!base || !final) return; lock=true;
      const b=money(base.value); const d=disc?parseInt(disc.value,10):NaN;
      if (isFinite(b) && isFinite(d)){ final.value = moneyFmt(b*(1 - clamp(d,0,99.9)/100), 1); markChipByValue(discountChips, d); }
      lock=false; updateSummary();
    }
    function recalcFromFinal(){
      if (lock) return; if (!base || !final || !disc) return; lock=true;
      const b=money(base.value), f=money(final.value);
      if (isFinite(b) && isFinite(f) && b>0){ const d=(1 - f/b)*100; disc.value=String(Math.round(clamp(d,0,99.9))); markChipByValue(discountChips, parseInt(disc.value,10)); }
      lock=false; updateSummary();
    }
    function updateSummary(){
      if (!summary) return;
      const b=money(base?.value), f=money(final?.value); const q=parseInt(qty?.value||'0',10)||0;
      const d=(isFinite(b)&&isFinite(f)&&b>0)? Math.round((1 - f/b)*100) : null;
      if (isFinite(f) && q>0){ const total=Math.round(f)*q; const dtxt=d!=null?` (скидка ${d}%)`:''; summary.textContent=`Итог: ${Math.round(f)} ₽ × ${q} шт = ${total} ₽${dtxt}`; }
      else summary.textContent='';
    }
    function guardDates(){
      if (!expires) return true;
      const ea=getDate(expires.value), now=new Date();
      if (!ea || ea.getTime()<=now.getTime()){ showError('«Срок действия оффера» должен быть в будущем.'); return false; }
      const bbVal = form.querySelector('#bestBefore')?.value;
      if (bbVal){
        const bb=getDate(bbVal);
        if (bb && ea.getTime()>bb.getTime()){
          expires.value=toLocalInputValue(bb);
          showError('«Срок действия оффера» не может быть позже срока годности — поправили автоматически.');
          return false;
        }
      }
      clearError(); return true;
    }
    function validate(){
      const b=money(base?.value), f=money(final?.value), q=parseInt(qty?.value||'0',10)||0;
      if (!isFinite(b)||b<=0) return showError('Проверьте обычную цену (старую).');
      if (!isFinite(f)||f<=0) return showError('Проверьте новую цену (после скидки).');
      if (f>=b) return showError('Новая цена должна быть меньше обычной.');
      if (!(q>0)) return showError('Количество должно быть больше нуля.');
      if (!guardDates()) return false;
      return true;
    }

    function computeStrictClosingTime(){
      const to=document.getElementById('profile_work_to');
      const from=document.getElementById('profile_work_from');
      if (!to || !to.value) return null;
      const [toH,toM] = to.value.split(':').map(x=>parseInt(x,10)||0);
      const now=new Date(); const y=now.getFullYear(), m=now.getMonth(), d=now.getDate();
      let candidate=new Date(y,m,d,toH,toM);
      if (from && from.value){
        const [fH,fM]=from.value.split(':').map(x=>parseInt(x,10)||0);
        const fromMin=fH*60+fM, toMin=toH*60+toM, nowMin=now.getHours()*60+now.getMinutes();
        if (fromMin > toMin){ // overnight
          if (nowMin <= toMin){ candidate = new Date(y,m,d,toH,toM); }
          else if (nowMin >= fromMin){ candidate = new Date(y,m,d+1,toH,toM); }
          else { candidate = new Date(y,m,d,toH,toM); if (candidate.getTime()<=now.getTime()) candidate=new Date(y,m,d+1,toH,toM); }
          return candidate;
        }
      }
      if (candidate.getTime()<=now.getTime()) candidate=new Date(y,m,d+1,toH,toM);
      return candidate;
    }

    function setLabelText(labelEl, text){
      const nodes = Array.from(labelEl.childNodes);
      if (!nodes.length) { labelEl.textContent = text; return; }
      if (nodes[0].nodeType === 3) { nodes[0].textContent = text + ' '; }
      else { labelEl.insertBefore(document.createTextNode(text + ' '), nodes[0]); }
    }
    function ensureSubHint(labelEl, text){
      let sub = labelEl.querySelector('.muted.small');
      if (!sub){ sub = document.createElement('div'); sub.className='muted small'; labelEl.appendChild(sub); }
      sub.textContent = text;
    }

    // utils
    function activateChip(list, el){ list.forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
    function markChipByValue(list, d){ const el=list.find(x=>parseInt(x.dataset.discount,10)===parseInt(d,10)); if(!el) return list.forEach(x=>x.classList.remove('active')); activateChip(list, el); }
    function money(v){ if(v==null) return NaN; const s=String(v).replace(/\s+/g,'').replace(',','.').replace(/[^\d.]/g,''); return parseFloat(s); }
    function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
    function getDate(val){ if(!val) return null; if(/^\d{4}-\d{2}-\d{2}$/.test(val)) return new Date(val+'T23:59:00'); const d=new Date(val); return isNaN(d)?null:d; }
    function toLocalInputValue(d){ const y=d.getFullYear(),M=String(d.getMonth()+1).padStart(2,'0'),D=String(d.getDate()).padStart(2,'0'),h=String(d.getHours()).padStart(2,'0'),mi=String(d.getMinutes()).padStart(2,'0'); return `${y}-${M}-${D}T${h}:${mi}`; }
    function showError(msg){ if(!errorBox) return false; errorBox.textContent=msg; errorBox.classList.remove('hidden'); return false; }
    function clearError(){ if(!errorBox) return; errorBox.textContent=''; errorBox.classList.add('hidden'); }
  }
})();
