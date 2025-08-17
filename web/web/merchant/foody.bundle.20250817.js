
/*! Foody Bundle JS — 2025-08-17 fix7 */
(function(){
  const VERSION='2025-08-17-fix7';
  try{ document.documentElement.setAttribute('data-foody-bundle', VERSION); console.log('%cFoody bundle', 'color:#00C27A', VERSION); }catch(_){}
  const onReady=(fn)=>{ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); };
  onReady(()=>{ bindTabs(); dedupeAuth(); enhanceCreate(); });
  window.addEventListener('load', ()=>{ try{ enhanceCreate(true); }catch(_){} });

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
      if(!opts||!opts.silentHash){ try{ history.replaceState(null,'','#'+name);}catch(_){}};
      try{ localStorage.setItem('foody:lastTab', name);}catch(_){}
      applying=false;
    }
    tabs.forEach(b=> b.addEventListener('click',()=> activate(b.dataset.tab)));
    const fromHash=(location.hash||'').replace('#','');
    const saved=(function(){ try{ return localStorage.getItem('foody:lastTab'); }catch(_){ return null; } })();
    if(fromHash && document.getElementById(fromHash)) activate(fromHash,{silentHash:true});
    else if(saved && document.getElementById(saved)) activate(saved,{silentHash:true});
    else { const first=(document.querySelector('#tabs .seg-btn.active')||tabs[0]); activate((first&&first.dataset.tab)||'dashboard',{silentHash:true}); }
    setTimeout(()=> current && activate(current,{silentHash:true}),0);
    setTimeout(()=> current && activate(current,{silentHash:true}),200);
    window.addEventListener('hashchange',()=>{ if(applying) return; const name=(location.hash||'').replace('#',''); if(name&&document.getElementById(name)) activate(name,{silentHash:true}); });
    window.addEventListener('beforeunload',()=>{ try{ localStorage.setItem('foody:lastTab', current||'dashboard'); }catch(_){}});
  }

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

  function enhanceCreate(reassert){
    const pane=document.getElementById('create'); if(!pane) return;
    const form=pane.querySelector('#offerForm')||pane.querySelector('form'); if(!form) return;

    const base = form.querySelector('#offerOldPrice,[name="original_price"]'); // обычная / старая
    const final = form.querySelector('#offerPrice,[name="price"]');            // новая / продажная
    const qty   = form.querySelector('[name="qty_total"]');
    const title = form.querySelector('[name="title"]');
    const expires = form.querySelector('#expires_at,[name="expires_at"]');
    const category = form.querySelector('select[name="category"]');
    let chipsWrap = form.querySelector('#discountPresets');
    let expireWrap = form.querySelector('#expirePresets');
    const errorBox = form.querySelector('#offerError');

    // --- UI polish
    if (category && !category.classList.contains('nice-select')) category.classList.add('nice-select');

    // Discount chips container ensure & move under base
    if (!chipsWrap){
      chipsWrap = document.createElement('div'); chipsWrap.id='discountPresets'; chipsWrap.className='work-presets full';
      chipsWrap.innerHTML = ['30','40','50','60','70','80','90'].map(d=>`<span class="chip" data-discount="${d}">-${d}%</span>`).join('');
      form.insertBefore(chipsWrap, form.firstChild);
    }
    if (base){
      const baseLabel=base.closest('label')||base.parentElement;
      if (baseLabel && baseLabel.parentElement){ baseLabel.parentElement.insertBefore(chipsWrap, baseLabel.nextSibling); }
    }

    // Discount percent input right after chips
    let disc = form.querySelector('#discountPercent');
    if (!disc){
      const row = document.createElement('div'); row.className='full'; row.id='foodyDiscountRow';
      row.innerHTML = '<label for="discountPercent">Скидка, %</label> <input id="discountPercent" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="например, 50" style="width:120px">';
      chipsWrap.parentElement.insertBefore(row, chipsWrap.nextSibling);
      disc = row.querySelector('#discountPercent');
    }
    const discountChips = Array.from(chipsWrap.querySelectorAll('.chip'));

    // Rename labels
    if (base){ const lbl=base.closest('label'); if (lbl){ setLabelText(lbl, 'Обычная цена'); ensureSubHint(lbl, 'Ранее без скидки (старая цена)'); } }
    if (final){ const lbl=final.closest('label'); if (lbl){ setLabelText(lbl, 'Новая цена'); ensureSubHint(lbl, 'Цена продажи после скидки'); } }

    // --- Ensure expire presets block under expires
    if (!expireWrap){
      expireWrap = document.createElement('div'); expireWrap.id='expirePresets'; expireWrap.className='work-presets full';
      form.appendChild(expireWrap);
    }
    if (expires){
      const expLabel = expires.closest('label') || expires.parentElement;
      if (expLabel && expLabel.parentElement){ expLabel.parentElement.insertBefore(expireWrap, expLabel.nextSibling); }
      setLabelText(expLabel, 'Срок действия оффера');
    }
    if (!expireWrap.querySelector('[data-action="close"]')){
      expireWrap.innerHTML = '<span class="chip" data-exp="+60">+1 час</span><span class="chip" data-exp="+120">+2 часа</span><span class="chip" data-action="close">К закрытию</span>';
    }

    // --- bestBefore right above expires
    let bestBefore=form.querySelector('#bestBefore');
    if (!bestBefore && expires){
      const label=document.createElement('label'); label.className='full';
      label.innerHTML='Срок годности продукта <input id="bestBefore" type="datetime-local" placeholder="до какого времени продукт ок"><div class="muted small">Поле не отправляется на сервер — только контроль.</div>';
      const expLabel=expires.closest('label')||expires.parentElement;
      if (expLabel && expLabel.parentElement) expLabel.parentElement.insertBefore(label, expLabel);
      bestBefore=label.querySelector('#bestBefore');
    }

    // --- Flatpickr (if available) for nice picker
    try{
      if (window.flatpickr){
        if (expires && !expires._foodyFlat){ expires._foodyFlat = flatpickr(expires, {enableTime:true, time_24hr:true, locale:(window.flatpickr.l10ns && window.flatpickr.l10ns.ru)||'ru', dateFormat:'Y-m-d H:i', minDate:'today'}); }
        if (bestBefore && !bestBefore._foodyFlat){ bestBefore._foodyFlat = flatpickr(bestBefore, {enableTime:true, time_24hr:true, locale:(window.flatpickr.l10ns && window.flatpickr.l10ns.ru)||'ru', dateFormat:'Y-m-d H:i', minDate:'today'}); }
      }
    }catch(_){}

    // --- Strict default "to closing" if profile has work_to
    if (expires && !expires.value){
      const close = computeStrictClosingTime();
      if (close) expires.value = fpFormat(close);
    }

    // --- Summary single
    [...form.querySelectorAll('#foodySummary,#offerSummary')].slice(1).forEach(n=> n.remove());
    let summary=form.querySelector('#foodySummary') || form.querySelector('#offerSummary');
    if (!summary){ summary=document.createElement('div'); summary.id='foodySummary'; summary.className='foody-summary full'; (form.querySelector('.form-footer')||form).before(summary); }

    // --- Bind events (idempotent)
    const bind=(el,ev,fn)=> el && !el._foodyBound && (el._foodyBound=true, el.addEventListener(ev, fn));
    discountChips.forEach(ch=> !ch._foodyBound && (ch._foodyBound=true, ch.addEventListener('click', (e)=>{ e.preventDefault(); const d=parseInt(ch.dataset.discount,10); if(!isFinite(d)) return; disc.value=String(d); activateChip(discountChips, ch); recalcFromDiscount(); })));
    bind(disc,'input', recalcFromDiscount);
    bind(base,'input', recalcFromDiscount);
    bind(final,'input', recalcFromFinal);
    bind(qty, 'input', updateSummary);
    bind(expires,'change', guardDates);
    bind(bestBefore,'change', guardDates);

    // Expire chips
    const expChips = Array.from(expireWrap.querySelectorAll('.chip'));
    expChips.forEach(ch=> !ch._foodyBound && (ch._foodyBound=true, ch.addEventListener('click', (e)=>{
      e.preventDefault();
      const action = ch.dataset.action || ch.dataset.exp;
      const now = new Date(); let t = null;
      if (action==='close'){ const c=computeStrictClosingTime(); if(!c){ flashHint(expireWrap, 'Заполните «до» в профиле, чтобы использовать «К закрытию».'); return; } t=c; }
      else if (/^\+\d+$/.test(action)){ t=new Date(now.getTime() + parseInt(action,10)*60*1000); }
      if (t && expires){ expires.value = fpFormat(t); activateChip(expChips, ch); guardDates(); }
    })));

    // --- Initial compute
    recalcFromDiscount(); updateSummary(); guardDates();

    // ===== Helpers =====
    function recalcFromDiscount(){
      const b = money(base?.value);
      const d = parseInt((disc && disc.value) || '0',10);
      if (isFinite(b) && isFinite(d) && final){
        const f = roundTo(b * (1 - clamp(d,0,99.9)/100), 1);
        final.value = String(f);
      }
      markChipByValue(discountChips, d);
      updateSummary();
    }
    function recalcFromFinal(){
      const b = money(base?.value), f = money(final?.value);
      if (isFinite(b) && isFinite(f) && b>0 && disc){
        const d = Math.round((1 - f/b) * 100);
        disc.value = String(clamp(d,0,99));
        markChipByValue(discountChips, parseInt(disc.value,10));
      }
      updateSummary();
    }
    function updateSummary(){
      const b=money(base?.value), f=money(final?.value), q=parseInt(qty?.value||'0',10)||0;
      const d=(isFinite(b)&&isFinite(f)&&b>0)? Math.round((1 - f/b)*100) : null;
      if (isFinite(f)&&q>0){
        const total=Math.round(f)*q;
        const dtxt=d!=null?` (скидка ${d}%)`:'';
        summary.textContent = `Итог: ${Math.round(f)} ₽ × ${q} шт = ${total} ₽${dtxt}`;
      } else summary.textContent='';
    }
    function guardDates(){
      if (!expires) return true;
      const ea=parseDate(expires.value), now=new Date();
      if (!ea || ea.getTime()<=now.getTime()) return false;
      if (bestBefore && bestBefore.value){
        const bb=parseDate(bestBefore.value);
        if (bb && ea.getTime()>bb.getTime()){
          expires.value = fpFormat(bb);
        }
      }
      return true;
    }

    // minor helpers
    function activateChip(list, el){ list.forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
    function markChipByValue(list, d){ const el=list.find(x=>parseInt(x.dataset.discount,10)===parseInt(d,10)); list.forEach(x=>x.classList.remove('active')); if (el) el.classList.add('active'); }
    function money(v){ if(v==null) return NaN; const s=String(v).replace(/\s+/g,'').replace(',','.').replace(/[^\d.]/g,''); return parseFloat(s); }
    function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
    function roundTo(n, step){ const k=Math.max(1, step||1); return Math.round(n/k)*k; }
    function parseDate(val){ if(!val) return null; if(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(val)) return new Date(val.replace(' ','T')); if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return new Date(val); const d=new Date(val); return isNaN(d)?null:d; }
    function fpFormat(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0'),h=String(d.getHours()).padStart(2,'0'),mi=String(d.getMinutes()).padStart(2,'0'); return `${y}-${m}-${da} ${h}:${mi}`; }
  }

  function computeStrictClosingTime(){
    const to=document.getElementById('profile_work_to');
    const from=document.getElementById('profile_work_from');
    if (!to || !to.value) return null;
    const [toH,toM]=to.value.split(':').map(x=>parseInt(x,10)||0);
    const now=new Date(); const y=now.getFullYear(), m=now.getMonth(), d=now.getDate();
    let candidate=new Date(y,m,d,toH,toM);
    if (from && from.value){
      const [fH,fM]=from.value.split(':').map(x=>parseInt(x,10)||0);
      const fromMin=fH*60+fM, toMin=toH*60+toM, nowMin=now.getHours()*60+now.getMinutes();
      if (fromMin>toMin){ // overnight
        if (nowMin<=toMin){ candidate=new Date(y,m,d,toH,toM); }
        else if (nowMin>=fromMin){ candidate=new Date(y,m,d+1,toH,toM); }
        else { candidate=new Date(y,m,d,toH,toM); if (candidate.getTime()<=now.getTime()) candidate=new Date(y,m,d+1,toH,toM); }
        return candidate;
      }
    }
    if (candidate.getTime()<=now.getTime()) candidate=new Date(y,m,d+1,toH,toM);
    return candidate;
  }

  // utils outside
  function setLabelText(labelEl, text){
    if (!labelEl) return;
    const nodes=Array.from(labelEl.childNodes);
    if (!nodes.length) { labelEl.textContent=text; return; }
    if (nodes[0].nodeType===3) nodes[0].textContent=text+' ';
    else labelEl.insertBefore(document.createTextNode(text+' '), nodes[0]);
  }
  function ensureSubHint(labelEl, text){
    if (!labelEl) return;
    let sub = labelEl.querySelector('.muted.small');
    if (!sub){ sub=document.createElement('div'); sub.className='muted small'; labelEl.appendChild(sub); }
    sub.textContent = text;
  }
})();
