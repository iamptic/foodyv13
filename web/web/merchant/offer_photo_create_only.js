
/*! Foody — Create tab photo (FilePond) */
(function(){
  function ready(fn){ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); }
  function apiBase(){ try { return window.FOODY_API || (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.foodyApi || (document.querySelector('meta[name="foody-api"]')||{}).content || ''; } catch(_) { return ''; } }

  function ensureHidden(input){
    var form = input.closest('form') || document.getElementById('create') || document;
    var h = form.querySelector('input[name="image_url"]');
    if(!h){ h=document.createElement('input'); h.type='hidden'; h.name='image_url'; h.id='offerImageUrl'; input.insertAdjacentElement('afterend', h); }
    return h;
  }

  function initOn(input){
    if(!input || input._pond || typeof FilePond==='undefined') return;
    var root = document.getElementById('create'); if(root && !root.contains(input)) return;
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
        var j = await res.json(); hidden.value = (j.url || j.location || j.Location || '');
      }catch(err){
        console.warn('[Offer Photo] upload failed', err); hidden.value=''; try{ pond.removeFile(); }catch(_){}
        alert('Не удалось загрузить фото');
      }
    }

    pond.on('addfile', function(err,item){ if(!err && item && item.file) upload(item.file); });
    pond.on('removefile', function(){ hidden.value=''; });
  }

  function scanAndInit(){
    var root = document.getElementById('create'); if(!root) return;
    root.querySelectorAll('input[type="file"]').forEach(initOn);
  }

  function boot(){
    scanAndInit();
    document.addEventListener('click', function(e){
      if(e.target.closest('[data-tab="create"]')) setTimeout(scanAndInit, 80);
    }, true);
    var root=document.getElementById('create');
    if(root){ try{ new MutationObserver(scanAndInit).observe(root,{childList:true,subtree:true}); }catch(_){ } }
  }
  ready(boot);
})();
