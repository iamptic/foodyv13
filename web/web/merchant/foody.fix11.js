
/*! Foody fix11 — enforce order: Title -> Price -> Discount -> New price (2025-08-17) */
(function(){
  const onReady=(fn)=>{ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); };
  onReady(apply);
  window.addEventListener('load', apply);
  window.addEventListener('hashchange', ()=>{ if (location.hash==='#create') apply(); });

  function apply(){
    const form = document.querySelector('#create #offerForm, #create form');
    if (!form) return;

    const title = form.querySelector('[name="title"]');
    const base  = form.querySelector('#offerOldPrice,[name="original_price"]'); // обычная/старая цена
    const final = form.querySelector('#offerPrice,[name="price"]');            // новая/после скидки

    // Ensure containers exist
    let chipsWrap = form.querySelector('#discountPresets');
    if (!chipsWrap){
      chipsWrap = document.createElement('div'); chipsWrap.id='discountPresets'; chipsWrap.className='work-presets full';
      chipsWrap.innerHTML = ['30','40','50','60','70','80','90'].map(d=>`<span class="chip" data-discount="${d}">-${d}%</span>`).join('');
      form.appendChild(chipsWrap);
    }
    let disc = form.querySelector('#discountPercent');
    if (!disc){
      const row = document.createElement('div'); row.className='full'; row.id='foodyDiscountRow';
      row.innerHTML = '<label for="discountPercent">Скидка, %</label> <input id="discountPercent" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="например, 50" style="width:120px">';
      chipsWrap.parentElement.insertBefore(row, chipsWrap.nextSibling);
      disc = row.querySelector('#discountPercent');
    }
    const discRow = disc.closest('.full') || disc.parentElement;

    // Get label containers
    const titleLabel = title ? (title.closest('label') || title.parentElement) : null;
    const baseLabel  = base ? (base.closest('label') || base.parentElement) : null;
    const finalLabel = final ? (final.closest('label') || final.parentElement) : null;

    // Rename labels (UX)
    if (baseLabel){ setLabelText(baseLabel, 'Обычная цена'); ensureSubHint(baseLabel,'Ранее без скидки (старая цена)'); }
    if (finalLabel){ setLabelText(finalLabel, 'Новая цена'); ensureSubHint(finalLabel,'Цена продажи после скидки'); }

    // ----- Enforce order at the very top of the form -----
    const anchor = form.firstElementChild;
    const frag = document.createDocumentFragment();
    if (titleLabel) frag.appendChild(titleLabel);
    if (baseLabel)  frag.appendChild(baseLabel);
    if (chipsWrap)  frag.appendChild(chipsWrap);
    if (discRow)    frag.appendChild(discRow);
    if (finalLabel) frag.appendChild(finalLabel);
    form.insertBefore(frag, anchor);

    // ----- Bind calc (idempotent) -----
    const chips = Array.from(chipsWrap.querySelectorAll('.chip'));
    chips.forEach(ch=> !ch._fix11Bound && (ch._fix11Bound=true, ch.addEventListener('click', (e)=>{
      e.preventDefault(); const d=parseInt(ch.dataset.discount,10); if(!isFinite(d)) return;
      disc.value = String(d); activateChip(chips, ch); recalcFromDiscount();
    })));
    bind(disc, 'input', recalcFromDiscount);
    bind(base, 'input', recalcFromDiscount);
    bind(final,'input', recalcFromFinal);

    // initial calc
    recalcFromDiscount();

    // helpers
    function recalcFromDiscount(){
      const b = money(base && base.value);
      const d = parseInt((disc && disc.value) || '0',10);
      if (isFinite(b) && isFinite(d) && final){
        final.value = String(roundTo(b * (1 - clamp(d,0,99.9)/100), 1));
      }
      markChipByValue(chips, d);
    }
    function recalcFromFinal(){
      const b = money(base && base.value), f = money(final && final.value);
      if (isFinite(b) && isFinite(f) && b>0 && disc){
        disc.value = String(clamp(Math.round((1 - f/b)*100), 0, 99));
        markChipByValue(chips, parseInt(disc.value,10));
      }
    }

    function bind(el, ev, fn){ if(!el) return; if(el._fix11Bound) return; el._fix11Bound = true; el.addEventListener(ev, fn); }
  }

  // utils
  function setLabelText(labelEl, text){
    const nodes=Array.from(labelEl.childNodes);
    if (!nodes.length){ labelEl.textContent = text; return; }
    if (nodes[0].nodeType===3){ nodes[0].textContent = text + ' '; }
    else { labelEl.insertBefore(document.createTextNode(text+' '), nodes[0]); }
  }
  function ensureSubHint(labelEl, text){
    let sub = labelEl.querySelector('.muted.small');
    if (!sub){ sub = document.createElement('div'); sub.className='muted small'; labelEl.appendChild(sub); }
    sub.textContent = text;
  }
  function activateChip(list, el){ list.forEach(x=>x.classList.remove('active')); el.classList.add('active'); }
  function markChipByValue(list, d){ const el=list.find(x=>parseInt(x.dataset.discount,10)===parseInt(d,10)); list.forEach(x=>x.classList.remove('active')); if (el) el.classList.add('active'); }
  function money(v){ if(v==null) return NaN; const s=String(v).replace(/\s+/g,'').replace(',','.').replace(/[^\d.]/g,''); return parseFloat(s); }
  function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
  function roundTo(n, step){ const k=Math.max(1, step||1); return Math.round(n/k)*k; }
})();
