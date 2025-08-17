/*! Offers list — edit modal + robust delete (DELETE -> POST /delete -> PATCH status) */
(function(){
  function ready(fn){ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); }
  const apiBase = () => (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.FOODY_API || window.foodyApi || '';
  const rid     = () => { try { return localStorage.getItem('foody_restaurant_id') || ''; } catch(_) { return ''; } };
  const key     = () => { try { return localStorage.getItem('foody_key') || ''; } catch(_) { return ''; } };
  const qs      = (s,r=document)=>r.querySelector(s);
  const qsa     = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const fmtDate = (v)=>{ if(!v) return '—'; try{ const d=new Date(v); return isNaN(d)?'—':d.toLocaleString('ru-RU'); }catch(_){ return '—'; } };

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

  function render(items){
    const root=ensureListContainer();
    if(!Array.isArray(items)||!items.length){ root.innerHTML='<div class="hint">Пока нет офферов</div>'; return; }
    const rows=items.map(o=>{
      const price=o.price_cents!=null?o.price_cents/100:(o.price!=null?Number(o.price):0);
      const old=o.original_price_cents!=null?o.original_price_cents/100:(o.original_price!=null?Number(o.original_price):0);
      const disc=old>0?Math.round((1-price/old)*100):0;
      return `<div class="row" data-offer-id="${o.id}" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.4fr 1fr;gap:8px;align-items:center;margin:8px 0;">
        <div>${o.title||'—'}</div>
        <div>${price.toFixed(2)}</div>
        <div>${disc?`-${disc}%`:'—'}</div>
        <div>${o.qty_left ?? '—'} / ${o.qty_total ?? '—'}</div>
        <div>${fmtDate(o.expires_at)}</div>
        <div class="actions" style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-ghost" data-action="edit">Редактировать</button>
          <button class="btn btn-danger" data-action="delete">Удалить</button>
        </div>
      </div>`;
    }).join('');
    root.innerHTML = `<div class="row head" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1.4fr 1fr;gap:8px;align-items:center;font-weight:600;color:#cbd5e1;margin-top:6px;">
      <div>Название</div><div>Цена</div><div>Скидка</div><div>Остаток</div><div>Истекает</div><div></div>
    </div>` + rows;
  }

  function openEdit(o){
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
  }
  function closeEdit(){ const m=qs('#offerEditModal'); if(m) m.style.display='none'; }

  async function tryDelete(id){
    const base=apiBase(); const k=key(); const url = base.replace(/\/+$/,'') + '/api/v1/merchant/offers/' + id;
    try{ let r=await fetch(url,{method:'DELETE',headers:{'X-Foody-Key':k}}); if(r.ok) return true; if(r.status!==404) throw 0; }catch(_){}
    try{ let r=await fetch(url+'/delete',{method:'POST',headers:{'X-Foody-Key':k}}); if(r.ok) return true; }catch(_){}
    try{ let r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','X-Foody-Key':k},body:JSON.stringify({status:'deleted'})}); if(r.ok) return true; }catch(_){}
    return false;
  }

  function bind(items){
    const root=qs('#offerList'); if(!root) return;
    root.addEventListener('click', async function(e){
      const btn=e.target.closest('button'); if(!btn) return;
      const row=e.target.closest('.row'); if(!row) return;
      const id=row.getAttribute('data-offer-id');
      const act=btn.getAttribute('data-action');
      if(act==='edit'){ openEdit(items.find(x=>String(x.id)===String(id))); return; }
      if(act==='delete'){
        if(btn._busy) return; btn._busy=true;
        if(!confirm('Удалить оффер?')) { btn._busy=false; return; }
        const ok=await tryDelete(id);
        btn._busy=false;
        if(!ok){ alert('Не удалось удалить (эндпоинт на backend отсутствует).'); return; }
        await load();
      }
    });

    const form=qs('#offerEditForm'), cancel=qs('#offerEditCancel');
    if(cancel) cancel.addEventListener('click', function(ev){ ev.preventDefault(); closeEdit(); });
    if(form) form.addEventListener('submit', async function(ev){
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
        closeEdit(); await load();
      }catch(err){ alert('Не удалось сохранить: ' + err.message); }
    });
  }

  async function load(){ const items=await fetchOffers(); render(items); bind(items); }
  function hookTab(){ document.addEventListener('click', function(e){ if(e.target.closest('[data-tab="offers"]')) setTimeout(load,50); }, true); }
  function visible(el){ if(!el) return false; const st=window.getComputedStyle(el); return st.display!=='none' && el.offsetParent!==null; }

  ready(function(){
    hookTab();
    const root=document.querySelector('#offerList');
    if(visible(root)) load();
    try{ new MutationObserver(function(){ if(visible(document.querySelector('#offerList'))) load(); }).observe(document.body,{childList:true,subtree:true}); }catch(_){}
  });
})();
