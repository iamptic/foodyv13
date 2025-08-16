
/*! Foody — Offer Photo (FilePond) Init — 2025-08-17 */
(function(){
  const onReady = (fn)=>{
    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
    else document.addEventListener('DOMContentLoaded', fn);
  };

  onReady(()=>{
    // ensure FilePond exists
    if (typeof FilePond === 'undefined') return;

    // Register plugins if present
    try {
      if (window.FilePondPluginImagePreview) FilePond.registerPlugin(window.FilePondPluginImagePreview);
      if (window.FilePondPluginFileValidateType) FilePond.registerPlugin(window.FilePondPluginFileValidateType);
      if (window.FilePondPluginFileValidateSize) FilePond.registerPlugin(window.FilePondPluginFileValidateSize);
    } catch (e) { console.warn('filepond plugins', e); }

    const input = document.getElementById('offerImage');
    const hiddenUrl = document.getElementById('offerImageUrl');
    if (!input || !hiddenUrl) return; // нет поля — выходим тихо

    // Build API base
    const api = (window.foodyApi || (window.__FOODY__ && window.__FOODY__.FOODY_API) || '').replace(/\/+$/, '');
    const token = (localStorage.getItem('merchant_token') || localStorage.getItem('token') || '').trim();

    const pond = FilePond.create(input, {
      credits: false,
      allowMultiple: false,
      maxFiles: 1,
      acceptedFileTypes: ['image/*'],
      maxFileSize: '5MB',
      labelIdle: 'Перетащите фото или <span class="filepond--label-action">выберите</span>',
      imagePreviewHeight: 160,
      stylePanelAspectRatio: '16:9',
    });

    // Upload handler
    async function uploadFile(file){
      if (!api) throw new Error('FOODY_API is empty');
      const fd = new FormData();
      fd.append('file', file);
      const headers = {}; // добавим auth, если есть
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const resp = await fetch(api + '/upload', { method:'POST', body: fd, headers });
      if (!resp.ok) throw new Error('Upload failed: ' + resp.status);
      const data = await resp.json().catch(()=> ({}));
      // пробуем вытащить url из разных полей
      const url = data.url || data.location || (data.file && data.file.url) || (data.result && data.result.url);
      if (!url) throw new Error('No URL in response');
      return url;
    }

    // When file added -> upload immediately
    pond.on('addfile', async (error, item) => {
      if (error) return;
      try {
        // show "processing" state
        pond.setOptions({ labelFileProcessing: 'Загрузка…' });
        const url = await uploadFile(item.file);
        hiddenUrl.value = url;
        pond.setOptions({ labelFileProcessingComplete: 'Загружено' });
      } catch (e) {
        console.warn('offer image upload error', e);
        hiddenUrl.value = ''; // fallback
        // Optional: show toast/alert
        try { alert('Не удалось загрузить фото. Можно указать ссылку вручную.'); } catch(_){}
        // remove the file to avoid confusion
        try { pond.removeFile(item.id); } catch(_){}
      }
    });

    // If cleared -> drop hidden
    pond.on('removefile', () => { if (hiddenUrl) hiddenUrl.value = ''; });
  });
})();
