/*! Foody Offer Photo (CREATE TAB ONLY)
 *  - FilePond drop-in ONLY inside #create tab
 *  - Preview + 1:1 crop + auto-upload to /upload
 *  - No scanning outside the Create Offer section
 */
(function(){
  function ready(fn){ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); }
  function baseUrl(){ try { return window.FOODY_API || (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.foodyApi || (document.querySelector('meta[name="foody-api"]')||{}).content || ''; } catch(_) { return ''; } }

  function ensureHidden(input){
    var root = document.getElementById('create') || document;
    var form = input.closest('form') || root;
    var h = form.querySelector('input[name="image_url"]') || root.querySelector('#offerImageUrl');
    if(!h){
      h=document.createElement('input');
      h.type='hidden'; h.name='image_url'; h.id='offerImageUrl';
      input.insertAdjacentElement('afterend', h);
    }
    return h;
  }

  function initOn(input){
    if(!input || input._pond || typeof FilePond==='undefined') return;
    var hidden = ensureHidden(input);

    try {
      if (window.FilePondPluginImagePreview) FilePond.registerPlugin(FilePondPluginImagePreview);
      if (window.FilePondPluginFileValidateType) FilePond.registerPlugin(FilePondPluginFileValidateType);
      if (window.FilePondPluginFileValidateSize) FilePond.registerPlugin(FilePondPluginFileValidateSize);
      if (window.FilePondPluginImageCrop) FilePond.registerPlugin(FilePondPluginImageCrop);
    } catch(_){}

    var files = hidden.value ? [{source:hidden.value, options:{type:'local'}}] : [];
    var pond = FilePond.create(input, {
      credits:false, files,
      allowMultiple:false, maxFiles:1,
      acceptedFileTypes:['image/*'], maxFileSize:'5MB',
      allowImagePreview:true, imagePreviewHeight:180,
      stylePanelAspectRatio:'1:1', imageCropAspectRatio:'1:1',
      labelIdle:'Перетащите фото или <span class="filepond--label-action">выберите</span>'
    });
    input._pond = pond;

    async function upload(file){
      const api = baseUrl();
      const url = (api ? api.replace(/\/+$/,'') : '') + '/upload';
      try{
        var fd = new FormData(); fd.append('file', file);
        var res = await fetch(url, { method:'POST', body: fd });
        if(!res.ok) throw new Error('HTTP '+res.status);
        var j = await res.json(); hidden.value = (j.url || j.location || j.Location || '');
      }catch(err){
        console.warn('upload failed', err);
        hidden.value = '';
        try { pond.removeFile(); } catch(_){}
        try { alert('Не удалось загрузить фото'); } catch(_){}
      }
    }
    pond.on('addfile', function(err, item){ if(!err && item && item.file) upload(item.file); });
    pond.on('removefile', function(){ hidden.value=''; });
  }

  // CDN loader (safe if already loaded)
  var CDNS = {
    css: [
      "https://unpkg.com/filepond@4.30.7/dist/filepond.min.css",
      "https://unpkg.com/filepond-plugin-image-preview@4.6.12/dist/filepond-plugin-image-preview.min.css"
    ],
    js: [
      "https://unpkg.com/filepond@4.30.7/dist/filepond.min.js",
      "https://unpkg.com/filepond-plugin-image-preview@4.6.12/dist/filepond-plugin-image-preview.min.js",
      "https://unpkg.com/filepond-plugin-file-validate-type@1.2.8/dist/filepond-plugin-file-validate-type.min.js",
      "https://unpkg.com/filepond-plugin-file-validate-size@2.2.8/dist/filepond-plugin-file-validate-size.min.js",
      "https://unpkg.com/filepond-plugin-image-crop@2.0.6/dist/filepond-plugin-image-crop.min.js"
    ]
  };
  function addCss(href){ return new Promise(function(res){ if ([...document.styleSheets].some(s=>s.href && s.href.indexOf(href)>=0)) return res(); var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=res; l.onerror=res; document.head.appendChild(l); });}
  function addJs(src){ return new Promise(function(res){ if ([...document.scripts].some(s=>s.src && s.src.indexOf(src)>=0)) return res(); var s=document.createElement('script'); s.src=src; s.defer=true; s.async=false; s.onload=res; s.onerror=res; document.head.appendChild(s); });}

  function scanAndInit(){
    var cont = document.getElementById('create');
    if(!cont) return;
    var inputs = cont.querySelectorAll('input[type="file"]');
    inputs.forEach(initOn);
  }

  function boot(){
    Promise.all(CDNS.css.map(addCss))
      .then(function(){ return CDNS.js.reduce((p,u)=>p.then(()=>addJs(u)), Promise.resolve()); })
      .then(scanAndInit).catch(scanAndInit);

    // Re-init when человек переходит на вкладку «Создать оффер»
    document.addEventListener('click', function(e){
      if(e.target.closest('[data-tab="create"]')) setTimeout(scanAndInit, 80);
    }, true);

    // Следим только за контейнером #create, чтобы не лезть в другие вкладки
    var cont = document.getElementById('create');
    if(cont){
      try { new MutationObserver(scanAndInit).observe(cont, {childList:true, subtree:true}); } catch(_){}
    }
  }

  if(document.readyState==='complete'||document.readyState==='interactive') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
