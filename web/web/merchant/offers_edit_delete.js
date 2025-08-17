/*! Offers table rework: single mount, smooth, robust delete */
(function(){
  const apiBase = () => (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.FOODY_API || window.foodyApi || '';
  const rid     = () => { try { return localStorage.getItem('foody_restaurant_id') || ''; } catch(_) { return ''; } };
  const key     = () => { try { return localStorage.getItem('foody_key') || ''; } catch(_) { return ''; } };
  const qs      = (s,r=document)=>r.querySelector(s);
  const qsa     = (s,r=document)=>Array.from(r.querySelectorAll(s));

  let mounted = false;
  let loading = false;

  function ensureShell(){
    let host = qs('#offerList');
    if (!host){
      const headers = qsa('h1,h2,h3,h4,h5,h6');
      const h = headers.find(x=>/Мои офферы/i.test(x.textContent||''));
      host = h ? h.parentElement : (qs('#offers') || document.body);
      const div = document.createElement('div'); div.id='offerList'; host.appendChild(div);
      host = div;
    }
    if (!qs('.foody-offers', host)){
      const html = `
        <div class="foody-offers">
          <table>
            <thead>
              <tr>
                <th class="col-title">Название</th>
                <th class="col-price">Цена</th>
                <th class="col-discount">Скидка</th>
                <th class="col-qty">Остаток</th>
                <th class="col-exp">Истекает</th>
                <th class="col-actions"></th>
              </tr>
            </thead>
            <tbody id="offers-tbody"><tr><td class="hint" colspan="6">Загрузка…</td></tr></tbody>
          </table>
        </div>`;
      host.innerHTML = html;
    }
    return host;
  }

  async function fetchOffers(){
    const base=apiBase(); const rID=rid(); const k=key();
    if(!base||!rID||!k) return [];
    const url = base.replace(/\/+$/,'') + '/api/v1/merchant/offers?restaurant_id=' + encodeURIComponent(rID);
    const res = await fetch(url, { headers:{'X-Foody-Key':k} });
    if(!res.ok) return [];
    return await res.json();
  }

  function row(o){
    const price=o.price_cents!=null?o.price_cents/100:(o.price!=null?Number(o.price):0);
    const old  =o.original_price_cents!=null?o.original_price_cents/100:(o.original_price!=null?Number(o.original_price):0);
    const disc =old>0?Math.round((1-price/old)*100):0;
    const expires = o.expires_at ? new Date(o.expires_at) : null;
    const expStr = expires && !isNaN(expires) ? expires.toLocaleString('ru-RU') : '—';
    return `<tr data-id="${o.id}" class="row-fade">
      <td class="col-title">${o.title||'—'}</td>
      <td class="col-price">${(price||0).toFixed(2)}</td>
      <td class="col-discount">${disc?`-${disc}%`:'—'}</td>
      <td class="col-qty">${o.qty_left ?? '—'} / ${o.qty_total ?? '—'}</td>
      <td class="col-exp">${expStr}</td>
      <td class="col-actions">
        <button class="btn btn-ghost" data-action="edit">Редактировать</button>
        <button class="btn btn-danger" data-action="delete">Удалить</button>
      </td>
    </tr>`;
  }

  function render(items){
    const tbody = qs('#offers-tbody');
    if(!tbody) return;
    if(!Array.isArray(items)||!items.length){
      tbody.innerHTML = '<tr><td class="hint" colspan="6">Пока нет офферов</td></tr>';
      return;
    }
    const html = items.map(row).join('');
    // Replace in one shot to avoid flicker
    requestAnimationFrame(()=>{ tbody.innerHTML = html; });
  }

  async function tryDelete(id){
    const base=apiBase(); const k=key(); const url = base.replace(/\/+$/,'') + '/api/v1/merchant/offers/' + id;
    try{ let r=await fetch(url,{method:'DELETE',headers:{'X-Foody-Key':k}}); if(r.ok) return true; if(r.status!==404) throw 0; }catch(_){}
    try{ let r=await fetch(url+'/delete',{method:'POST',headers:{'X-Foody-Key':k}}); if(r.ok) return true; }catch(_){}
    try{ let r=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json','X-Foody-Key':k},body:JSON.stringify({status:'deleted'})}); if(r.ok) return true; }catch(_){}
    return false;
  }

  function bind(){
    const tbody = qs('#offers-tbody');
    if(!tbody || tbody._bound) return;
    tbody._bound = true;

    tbody.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const tr  = e.target.closest('tr'); if(!tr) return;
      const id  = tr.getAttribute('data-id');
      const act = btn.getAttribute('data-action');

      if(act==='edit'){
        // populate modal
        const cells = [...tr.children];
        const m=qs('#offerEditModal'); if(!m) return;
        const title = cells[0].textContent || '';
        const price = parseFloat((cells[1].textContent||'0').replace(',', '.')) || 0;
        qs('#editId').value = id;
        qs('#editTitle').value = title;
        qs('#editPrice').value = price;
        // остальные поля будет подтягивать по API при сохранении (или можно расширить)
        m.style.display='block';
        return;
      }

      if(act==='delete'){
        if(btn._busy) return;
        btn._busy = true;
        if(!confirm('Удалить оффер?')) { btn._busy=false; return; }
        const prev = tr.style.opacity; tr.style.opacity = .5; tr.style.pointerEvents='none';
        const ok = await tryDelete(id);
        if(ok){
          tr.remove();
          if(!qs('#offers-tbody tr')) qs('#offers-tbody').innerHTML = '<tr><td class="hint" colspan="6">Пока нет офферов</td></tr>';
        }else{
          tr.style.opacity = prev || '';
          tr.style.pointerEvents='';
          alert('Не удалось удалить. Проверь backend: зарегистрированы ли DELETE/PATCH/POST /delete ручки?');
        }
        btn._busy = false;
      }
    });
  }

  async function load(){
    if(loading) return;
    loading = true;
    try{
      ensureShell();
      const data = await fetchOffers();
      render(data);
      bind();
    } finally { loading = false; }
  }

  function mountOnce(){
    if(mounted) return;
    mounted = true;
    // первое получение как только контейнер попадает в viewport
    const el = ensureShell();
    const io = new IntersectionObserver((entries)=>{
      if(entries.some(x=>x.isIntersecting)){
        io.disconnect();
        load();
      }
    }, {root:null, threshold:.1});
    io.observe(el);
    // и на переключение вкладки «Офферы»
    document.addEventListener('click', (e)=>{
      if(e.target.closest('[data-tab="offers"]')) setTimeout(load,20);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', mountOnce);
})();
