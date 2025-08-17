
/*! Foody Bundle JS — 2025-08-17 fix8 (photo polish) */
(function(){
  const VERSION='2025-08-17-fix8';
  try{ document.documentElement.setAttribute('data-foody-photo', VERSION); }catch(_){}
  const onReady=(fn)=>{ if(document.readyState==='complete'||document.readyState==='interactive') setTimeout(fn,0); else document.addEventListener('DOMContentLoaded',fn); };
  onReady(initPhoto);
  window.addEventListener('load', initPhoto);

  function initPhoto(){
    const input = document.getElementById('offerImage');
    const hidden = document.getElementById('offerImageUrl');
    if (!input || !hidden) return;

    // status line
    let status = document.getElementById('foodyPhotoStatus');
    if (!status){
      status = document.createElement('div');
      status.id = 'foodyPhotoStatus';
      status.className = 'foody-photo-status';
      input.parentElement.appendChild(status);
    }
    const setStatus = (msg, kind) => {
      status.textContent = msg || '';
      status.classList.remove('ok','err');
      if (kind) status.classList.add(kind);
    };

    // If already have an URL (edit mode) — show as initial file
    let initialFiles = [];
    if (hidden.value){
      initialFiles.push({ source: hidden.value, options: { type: 'local' } });
      setStatus('Загружено ✓', 'ok');
    } else {
      setStatus('Поддерживаются JPG/PNG/WebP до 5 МБ');
    }

    try{
      if (typeof FilePond === 'undefined') return;

      // Optional plugins if present
      if (typeof FilePondPluginImagePreview !== 'undefined') FilePond.registerPlugin(FilePondPluginImagePreview);
      if (typeof FilePondPluginFileValidateType !== 'undefined') FilePond.registerPlugin(FilePondPluginFileValidateType);
      if (typeof FilePondPluginFileValidateSize !== 'undefined') FilePond.registerPlugin(FilePondPluginFileValidateSize);
      if (typeof FilePondPluginImageCrop !== 'undefined') FilePond.registerPlugin(FilePondPluginImageCrop);
      if (typeof FilePondPluginImageTransform !== 'undefined') FilePond.registerPlugin(FilePondPluginImageTransform);

      // Create pond
      const pond = FilePond.create(input, {
        credits: false,
        allowMultiple: false,
        maxFiles: 1,
        files: initialFiles,
        acceptedFileTypes: ['image/*'],
        allowImagePreview: true,
        imagePreviewHeight: 180,
        stylePanelAspectRatio: '1:1',
        // Optional, only if ImageCrop plugin loaded:
        imageCropAspectRatio: typeof FilePondPluginImageCrop !== 'undefined' ? '1:1' : undefined,
        labelIdle: 'Перетащите фото сюда или <span class="filepond--label-action">выберите</span>',
        maxFileSize: '5MB'
      });

      pond.on('addfile', async (err, item) => {
        if (err) { setStatus('Не удалось загрузить файл', 'err'); return; }
        try{
          setStatus('Загружаем…');
          // Prefer existing global uploadImage(file) if определена
          if (typeof window.uploadImage === 'function'){
            const url = await window.uploadImage(item.file);
            hidden.value = url || '';
          } else {
            // fallback: keep data URL locally (предпросмотр без загрузки)
            hidden.value = '';
          }
          if (hidden.value){
            setStatus('Фото загружено ✓', 'ok');
          } else {
            setStatus('Файл выбран. Загрузка произойдёт при сохранении.', 'ok');
          }
        }catch(e){
          setStatus('Ошибка при загрузке', 'err');
          console.error('Foody photo upload error', e);
          hidden.value = '';
        }
      });

      pond.on('removefile', () => {
        hidden.value = '';
        setStatus('Фото удалено', 'err');
      });

    }catch(e){
      console.warn('FilePond init skipped:', e);
    }
  }
})();
