
/*! Foody fix10 — expires presets + photo polish (2025-08-17) */
(function(){
  const VERSION='fix10';
  const onReady=(fn)=>{ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); };
  onReady(apply);
  window.addEventListener('load', apply);

  function apply(){
    try{ enhanceExpires(); }catch(e){ console.warn('fix10 expires', e); }
    try{ enhancePhoto(); }catch(e){ console.warn('fix10 photo', e); }
  }

  /* ----- Срок действия оффера: пресеты + flatpickr ----- */
  function enhanceExpires(){
    const form = document.querySelector('#create #offerForm, #create form');
    if (!form) return;
    const input = form.querySelector('#expires_at,[name="expires_at"]');
    if (!input) return;

    // Переименовать label
    const lbl = input.closest('label') || input.parentElement;
    if (lbl) setLabelText(lbl, 'Срок действия оффера');

    // Создать/расположить контейнер пресетов
    let wrap = form.querySelector('#expirePresets');
    if (!wrap){
      wrap = document.createElement('div'); wrap.id='expirePresets'; wrap.className='work-presets full';
    }
    wrap.innerHTML = '<span class="chip" data-exp="+60">+1 час</span><span class="chip" data-exp="+120">+2 часа</span><span class="chip" data-action="close">К закрытию</span>';
    const placeRef = lbl || input;
    if (placeRef && placeRef.parentElement) placeRef.parentElement.insertBefore(wrap, (lbl||input).nextSibling);

    // flatpickr
    try{
      if (window.flatpickr && !input._fix10Flat){
        input._fix10Flat = flatpickr(input, { enableTime:true, time_24hr:true, dateFormat:'Y-m-d H:i', locale:(window.flatpickr.l10ns&&window.flatpickr.l10ns.ru)||'ru', minDate:'today' });
      }
    }catch(_){}

    // обработчики чипсов (идемпотентно)
    Array.from(wrap.querySelectorAll('.chip')).forEach(ch => {
      if (ch._fix10Bound) return;
      ch._fix10Bound = true;
      ch.addEventListener('click', (e)=>{
        e.preventDefault();
        const action = ch.dataset.action || ch.dataset.exp;
        const now = new Date();
        let t = null;
        if (action === 'close'){
          const c = computeStrictClosingTime();
          if (!c){ flashHint(wrap, 'Заполните «до» в профиле, чтобы использовать «К закрытию».'); return; }
          t = c;
        } else if (/^\+\d+$/.test(action)){
          t = new Date(now.getTime() + parseInt(action,10)*60*1000);
        }
        if (t){
          input.value = fpFormat(t);
          Array.from(wrap.querySelectorAll('.chip')).forEach(x=>x.classList.remove('active'));
          ch.classList.add('active');
          input.dispatchEvent(new Event('change', {bubbles:true}));
        }
      });
    });
  }

  /* ----- Фото: красивый FilePond, без дубля подсказки ----- */
  function enhancePhoto(){
    const field = document.querySelector('#create #offerForm .field, #create form .field');
    const input = document.getElementById('offerImage');
    const hidden = document.getElementById('offerImageUrl');
    if (!input || !hidden) return;

    // используем существующую строку подсказки, если она уже есть
    let hint = field ? field.querySelector('.hint') : null;
    if (!hint && input.parentElement){
      hint = document.createElement('p'); hint.className='hint'; input.parentElement.appendChild(hint);
    }
    const setHint = (msg, kind)=>{
      if (!hint) return;
      hint.textContent = msg || '';
      hint.classList.remove('ok','err');
      if (kind) hint.classList.add(kind);
    };

    // Инициализация только один раз
    if (input._fix10Pond) return;

    // Если уже есть URL, покажем как начальный файл
    let initialFiles = [];
    if (hidden.value) initialFiles.push({ source: hidden.value, options: { type: 'local' } });

    try{
      if (typeof FilePond === 'undefined') { setHint('Поддерживаются JPG/PNG/WebP до 5 МБ'); return; }
      if (typeof FilePondPluginImagePreview !== 'undefined') FilePond.registerPlugin(FilePondPluginImagePreview);
      if (typeof FilePondPluginFileValidateType !== 'undefined') FilePond.registerPlugin(FilePondPluginFileValidateType);
      if (typeof FilePondPluginFileValidateSize !== 'undefined') FilePond.registerPlugin(FilePondPluginFileValidateSize);

      const pond = FilePond.create(input, {
        credits:false,
        allowMultiple:false,
        maxFiles:1,
        files: initialFiles,
        acceptedFileTypes:['image/*'],
        allowImagePreview:true,
        imagePreviewHeight:180,
        stylePanelAspectRatio:'1:1',
        labelIdle:'Перетащите фото сюда или <span class="filepond--label-action">выберите</span>',
        maxFileSize:'5MB'
      });
      input._fix10Pond = pond;

      // начальный текст
      if (hidden.value) setHint('Фото загружено ✓', 'ok'); else setHint('Поддерживаются JPG/PNG/WebP до 5 МБ');

      pond.on('addfile', async (err, item)=>{
        if (err){ setHint('Не удалось загрузить файл', 'err'); return; }
        try{
          setHint('Загружаем…');
          if (typeof window.uploadImage === 'function'){
            const url = await window.uploadImage(item.file);
            hidden.value = url || '';
          } else {
            hidden.value = '';
          }
          if (hidden.value) setHint('Фото загружено ✓', 'ok');
          else setHint('Файл выбран. Загрузка произойдёт при сохранении.', 'ok');
        }catch(e){
          hidden.value = '';
          setHint('Ошибка при загрузке', 'err');
          console.error('uploadImage error', e);
        }
      });

      pond.on('removefile', ()=>{
        hidden.value = '';
        setHint('Фото удалено', 'err');
      });
    }catch(e){
      console.warn('FilePond init error', e);
      setHint('Поддерживаются JPG/PNG/WebP до 5 МБ');
    }
  }

  /* ---------- utils ---------- */
  function computeStrictClosingTime(){
    const to=document.getElementById('profile_work_to');
    const from=document.getElementById('profile_work_from');
    if (!to || !to.value) return null;
    const [toH,toM]=to.value.split(':').map(x=>parseInt(x,10)||0);
    const now=new Date(); const y=now.getFullYear(), M=now.getMonth(), D=now.getDate();
    let candidate=new Date(y,M,D,toH,toM);

    if (from && from.value){
      const [fH,fM]=from.value.split(':').map(x=>parseInt(x,10)||0);
      const fromMin=fH*60+fM, toMin=toH*60+toM, nowMin=now.getHours()*60+now.getMinutes();
      if (fromMin > toMin){ // overnight: e.g. 20:00–04:00
        if (nowMin <= toMin) candidate=new Date(y,M,D,toH,toM);           // после полуночи до закрытия
        else if (nowMin >= fromMin) candidate=new Date(y,M,D+1,toH,toM);  // вечер до полуночи — закрытие завтра
        else { candidate=new Date(y,M,D,toH,toM); if (candidate <= now) candidate=new Date(y,M,D+1,toH,toM); }
        return candidate;
      }
    }
    if (candidate <= now) candidate=new Date(y,M,D+1,toH,toM);
    return candidate;
  }

  function fpFormat(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0'),h=String(d.getHours()).padStart(2,'0'),mi=String(d.getMinutes()).padStart(2,'0');
    return `${y}-${m}-${da} ${h}:${mi}`;
  }

  function setLabelText(labelEl, text){
    if (!labelEl) return;
    const nodes=Array.from(labelEl.childNodes);
    if (!nodes.length){ labelEl.textContent = text; return; }
    if (nodes[0].nodeType===3){ nodes[0].textContent = text + ' '; }
    else { labelEl.insertBefore(document.createTextNode(text+' '), nodes[0]); }
  }

  function flashHint(container, msg){
    let el = container.querySelector('.fix10-hint');
    if (!el){ el = document.createElement('div'); el.className='fix10-hint muted small'; container.appendChild(el); }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(()=>{ el.style.opacity='0.85'; }, 1000);
  }
})();
