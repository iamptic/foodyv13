/*! Foody Create Offer — photo uploader (only #create) */
(function(){
  function ready(fn){ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); }
  function apiBase(){
    try { return window.FOODY_API || (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.foodyApi || (document.querySelector('meta[name="foody-api"]')||{}).content || ''; }
    catch(_){ return ''; }
  }
  function ensureHidden(input){
    var form = input.closest('form') || document.getElementById('create') || document;
    var h = form.querySelector('input[name="image_url"]');
    if(!h){
      h = document.createElement('input');
      h.type='hidden'; h.name='image_url'; h.id='offerImageUrl';
      input.insertAdjacentElement('afterend', h);
    }
    return h;
  }
  function initOn(input){
    if(!input || input._pond || typeof FilePond==='undefined') return;
    // We init ONLY if input is inside #create
    var createRoot = document.getElementById('create');
    if(createRoot && !createRoot.contains(input)) return;

    var hidden = ensureHidden(input);
    try{
      if (window.FilePondPluginImagePreview) FilePond.registerPlugin(FilePondPluginImagePreview);
      if (window.FilePondPluginFileValidateType) FilePond.registerPlugin(FilePondPluginFileValidateType);
      if (window.FilePondPluginFileValidateSize) FilePond.registerPlugin(FilePondPluginFileValidateSize);
      if (window.FilePondPluginImageCrop) FilePond.registerPlugin(FilePondPluginImageCrop);
    }catch(_){}

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
      const url = apiBase().replace(/\/+$/,'') + '/upload';
      try{
        var fd = new FormData(); fd.append('file', file);
        var res = await fetch(url, { method:'POST', body: fd });
        if(!res.ok) throw new Error('HTTP '+res.status);
        var j = await res.json();
        hidden.value = (j.url || j.location || j.Location || '');
      }catch(err){
        console.warn('[Offer Photo] upload failed', err);
        hidden.value='';
        try{ pond.removeFile(); }catch(_){}
        alert('Не удалось загрузить фото');
      }
    }

    pond.on('addfile', function(err,item){ if(!err && item && item.file) upload(item.file); });
    pond.on('removefile', function(){ hidden.value=''; });
  }

  // CDN bootstrap
  var CDN = {
    css:[
      "https://unpkg.com/filepond@4.30.7/dist/filepond.min.css",
      "https://unpkg.com/filepond-plugin-image-preview@4.6.12/dist/filepond-plugin-image-preview.min.css"
    ],
    js:[
      "https://unpkg.com/filepond@4.30.7/dist/filepond.min.js",
      "https://unpkg.com/filepond-plugin-image-preview@4.6.12/dist/filepond-plugin-image-preview.min.js",
      "https://unpkg.com/filepond-plugin-file-validate-type@1.2.8/dist/filepond-plugin-file-validate-type.min.js",
      "https://unpkg.com/filepond-plugin-file-validate-size@2.2.8/dist/filepond-plugin-file-validate-size.min.js",
      "https://unpkg.com/filepond-plugin-image-crop@2.0.6/dist/filepond-plugin-image-crop.min.js"
    ]
  };
  function addCss(href){ return new Promise(function(res){
    if ([...document.styleSheets].some(s=>s.href && s.href.includes(href))) return res();
    var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; l.onload=res; l.onerror=res; document.head.appendChild(l);
  });}
  function addJs(src){ return new Promise(function(res){
    if ([...document.scripts].some(s=>s.src && s.src.includes(src))) return res();
    var s=document.createElement('script'); s.src=src; s.defer=true; s.async=false; s.onload=res; s.onerror=res; document.head.appendChild(s);
  });}

  function scanAndInit(){
    var createRoot = document.getElementById('create');
    if(!createRoot) return;
    var inputs = createRoot.querySelectorAll('input[type="file"]');
    inputs.forEach(initOn);
  }

  function boot(){
    Promise.all(CDN.css.map(addCss)).then(function(){
      return CDN.js.reduce((p,u)=>p.then(()=>addJs(u)), Promise.resolve());
    }).then(scanAndInit).catch(scanAndInit);

    // When user navigates to the Create tab, scan again
    document.addEventListener('click', function(e){
      if(e.target.closest('[data-tab="create"]')) setTimeout(scanAndInit, 80);
    }, true);

    // Watch only #create for dynamic changes
    var createRoot = document.getElementById('create');
    if(createRoot){
      try{ new MutationObserver(scanAndInit).observe(createRoot, {childList:true, subtree:true}); }catch(_){}
    }
  }

  ready(boot);
})();
