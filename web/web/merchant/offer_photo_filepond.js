
/*! Foody Offer Photo — robust FilePond init with 1:1 crop */
(function(){
  function ready(fn){
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn,0);
    else document.addEventListener('DOMContentLoaded', fn);
    window.addEventListener('load', fn, { once: true });
  }
  function init(){
    var input = document.getElementById('offerImage');
    var hidden = document.getElementById('offerImageUrl');
    if (!input || !hidden) return false;
    if (input._pond) return true; // already
    if (typeof window.FilePond === 'undefined') return false;

    try {
      if (window.FilePondPluginImagePreview) FilePond.registerPlugin(FilePondPluginImagePreview);
      if (window.FilePondPluginFileValidateType) FilePond.registerPlugin(FilePondPluginFileValidateType);
      if (window.FilePondPluginFileValidateSize) FilePond.registerPlugin(FilePondPluginFileValidateSize);
      if (window.FilePondPluginImageCrop) FilePond.registerPlugin(FilePondPluginImageCrop);
    } catch(_) {}

    var files = hidden.value ? [{source:hidden.value, options:{type:'local'}}] : [];
    var pond = FilePond.create(input, {
      credits: false,
      files: files,
      allowMultiple: false, maxFiles: 1,
      acceptedFileTypes: ['image/*'], maxFileSize: '5MB',
      allowImagePreview: true, imagePreviewHeight: 180,
      stylePanelAspectRatio: '1:1', imageCropAspectRatio: '1:1',
      labelIdle: 'Перетащите фото или <span class="filepond--label-action">выберите</span>'
    });
    input._pond = pond;

    async function upload(file){
      try {
        var base = (window.__FOODY__ && window.__FOODY__.FOODY_API) || window.foodyApi || '';
        if (!base) throw new Error('FOODY_API missing');
        var fd = new FormData(); fd.append('file', file);
        var r = await fetch(base.replace(/\/+$/,'') + '/upload', { method:'POST', body: fd });
        if (!r.ok) throw new Error('Upload failed ' + r.status);
        var j = await r.json(); hidden.value = (j && (j.url || j.Location || j.location)) || '';
      } catch (e) {
        console.warn('offer image upload failed', e); hidden.value='';
        try { pond.removeFile(); } catch(_){}
      }
    }
    pond.on('addfile', function(err, item){ if(!err && item && item.file) upload(item.file); });
    pond.on('removefile', function(){ hidden.value=''; });
    return true;
  }
  // Try until ready (max 4s)
  ready(function(){
    var tries = 0, max = 40;
    var t = setInterval(function(){
      if (init()) { clearInterval(t); }
      if (++tries >= max) clearInterval(t);
    }, 100);
  });
})();
