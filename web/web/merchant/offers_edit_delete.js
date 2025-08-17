
/*! Offers list — smooth render, fixed grid, optimistic delete */
(function(){
  const apiBase = () => (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.FOODY_API || window.foodyApi || '';
  const rid     = () => { try { return localStorage.getItem('foody_restaurant_id') || ''; } catch(_) { return ''; } };
  const key     = () => { try { return localStorage.getItem('foody_key') || ''; } catch(_) { return ''; } };
  const qs      = (s,r=document)=>r.querySelector(s);
  const qsa     = (s,r=document)=>Array.from(r.querySelectorAll(s));

  let LOAD_LOCK=false, LOAD_SCHEDULED=false;

  function ensureListContainer(){
    if (qs('#offerList')) return qs('#offerList');
    const headers = qsa('h1,h2,h3,h4,h5,h6');
    const h = headers.find(x => /Мои офферы/i.test(x.textContent||''));
    const host = h ? h.parentElement : (qs('#offers') || document.body);
    const div = document.createElement('div'); div.id = 'offerList'; host.appendChild(div);
    return div;
  }

  async function fetchOffers(){
    const base=apiBase(); const rID=rid(); const k=key();
    if(!base||!rID||!k) return [];
    const res = await fetch(base.replace(/\/+$/,'') + '/api/v1/merchant/offers?restaurant_id=' + encodeURIComponent(rID), { headers:{'X-Foody-Key':k} });
    if(!res.ok) return [];
    return await res.json();
  }

  function rowHtml(o){
    const price=o.price_cents!=null?o.price_cents/100:(o.price!=null?Number(o.price):0);
    const old  =o.original_price_cents!=null?o.original_price_cents/100:(o.original_price!=null?Number(o.original_price):0);
    const disc =old>0?Math.round((1-price/old)*100):0;
    const expires = o.expires_at ? new Date(o.expires_at) : null;
    const expiresStr = expires && !isNaN(expires) ? expires.toLocaleString('ru-RU') : '—';
    return `<div class="offers-grid offers-row offers-fadein" data-offer-id="${o.id}">
      <div>${o.title||'—'}</div>
      <div>${(price||0).toFixed(2)}</div>
      <div>${disc?`-${disc}%`:'—'}</div>
      <div>${o.qty_left ?? '—'} / ${o.qty_total ?? '—'}</div>
      <div>${expiresStr}</div>
      <div class="offers-actions">
        <button class="btn btn-ghost" data-action="edit">Редактировать</button>
        <button class="btn btn-danger" data-action="delete">Удалить</button>
      </div>
    </div>`;
  }

  function render(items){
    const root=ensureListContainer();
    if(!Array.isArray(items)||!items.length){
      root.innerHTML = '<div class="offers-hint">Пока нет офферов</div>';
      return;
    }
    const head = `<div class="offers-grid offers-head">
      <div>Название</div><div>Цена</div><div>Скидка</div><div>Остаток</div><div>Истекает</div><div></div>
    </div>`;
    root.innerHTML = head + items.map(rowHtml).join('');
  }

  async function tryDelete(id){
    const base=apiBase(); const k=key(); const url = base.replace(/\/+$/,'') + '/api/v1/merchant/offers/' + id;
    // 1) DELETE
    try{ let r=await fetch(url,{method:'DELETE',headers:{'X-Foody-Key':k}}); if(r.ok) return true; if(r.status!==404) throw 0; }catch(_){}
    // 2) POST /delete
    try{ let r=await fetch(url+'/delete',{method:'POST',headers:{'X-Foody-Key':k}}); if(r.ok) return true; }catch(_){}
    // 3) PATCH status=deleted
    try{ let r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','X-Foody-Key':k},body:JSON.stringify({status:'deleted'})}); if(r.ok) return true; }catch(_){}
    return false;
  }

  function bind(items){
    const root=qs('#offerList'); if(!root) return;

    root.onclick = async (e)=>{
      const btn=e.target.closest('button'); if(!btn) return;
      const row=e.target.closest('.offers-row'); if(!row) return;
      const id=row.getAttribute('data-offer-id');
      const act=btn.getAttribute('data-action');

      if(act==='edit'){
        const o = items.find(x=>String(x.id)===String(id));
        if(!o) return;
        const m=qs('#offerEditModal'); if(!m) return;
        m.style.display='block';
        qs('#editId').value = o.id;
        qs('#editTitle').value = o.title || '';
        qs('#editOld').value = (o.original_price_cents!=null?(o.original_price_cents/100):(o.original_price ?? '')) || '';
        qs('#editPrice').value = (o.price_cents!=null?(o.price_cents/100):(o.price ?? '')) || '';
        qs('#editQty').value = o.qty_total ?? '';
        qs('#editExpires').value = o.expires_at ? o.expires_at.replace('T',' ').slice(0,16) : '';
        qs('#editCategory').value = o.category || 'ready_meal';
        qs('#editDesc').value = o.description || '';
        return;
      }

      if(act==='delete'){
        if(btn._busy) return; btn._busy = true;
        if(!confirm('Удалить оффер?')) { btn._busy=false; return; }
        // optimistic UI
        const prevOpacity = row.style.opacity; row.style.opacity = .5; row.style.pointerEvents='none';
        const ok = await tryDelete(id);
        if(ok){
          row.remove();
        }else{
          row.style.opacity = prevOpacity || '';
          row.style.pointerEvents='';
          alert('Не удалось удалить (эндпоинт на backend отсутствует).');
        }
        btn._busy=false;
      }
    };

    const form=qs('#offerEditForm'), cancel=qs('#offerEditCancel');
    if(cancel) cancel.onclick = (ev)=>{ ev.preventDefault(); const m=qs('#offerEditModal'); if(m) m.style.display='none'; };
    if(form) form.onsubmit = async (ev)=>{
      ev.preventDefault();
      const id=qs('#editId').value;
      const payload={
        title: qs('#editTitle').value || null,
        original_price: qs('#editOld').value ? Number(qs('#editOld').value) : null,
        price: qs('#editPrice').value ? Number(qs('#editPrice').value) : null,
        qty_total: qs('#editQty').value ? Number(qs('#editQty').value) : null,
        expires_at: qs('#editExpires').value || null,
        category: qs('#editCategory').value || null,
        description: qs('#editDesc').value || null
      };
      try{
        const res = await fetch(apiBase().replace(/\/+$/,'') + '/api/v1/merchant/offers/'+id, {
          method:'PATCH', headers:{'Content-Type':'application/json','X-Foody-Key': key()}, body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error('HTTP '+res.status);
        const m=qs('#offerEditModal'); if(m) m.style.display='none';
        scheduleLoad();
      }catch(err){ alert('Не удалось сохранить: ' + err.message); }
    };
  }

  async function load(){
    if(LOAD_LOCK){ LOAD_SCHEDULED = true; return; }
    LOAD_LOCK = true;
    try{
      const items = await fetchOffers();
      render(items);
      bind(items);
    } finally {
      LOAD_LOCK = false;
      if(LOAD_SCHEDULED){ LOAD_SCHEDULED = false; setTimeout(load, 60); }
    }
  }

  function scheduleLoad(){
    if(LOAD_LOCK){ LOAD_SCHEDULED = true; return; }
    setTimeout(load, 20);
  }

  function hookTab(){ document.addEventListener('click', function(e){ if(e.target.closest('[data-tab="offers"]')) setTimeout(scheduleLoad, 20); }, true); }
  function visible(el){ if(!el) return false; const st=window.getComputedStyle(el); return st.display!=='none' && el.offsetParent!==null; }

  document.addEventListener('DOMContentLoaded', function(){
    hookTab();
    const root=document.querySelector('#offerList');
    if(visible(root)) load();
    try {
      new MutationObserver(function(){
        if(visible(document.querySelector('#offerList'))) scheduleLoad();
      }).observe(document.body,{childList:true,subtree:true});
    } catch(_){}
  });
})();
