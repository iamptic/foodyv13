Foody — WEB patch (merchant)
============================
Скопируйте файлы в: web/web/merchant/

1) В web/web/merchant/index.html добавьте ОДИН раз:
   В <head>:
     <script>window.FOODY_API=window.FOODY_API||"https://foodyback-production.up.railway.app";</script>
     <link href="./offer_photo_filepond.css" rel="stylesheet">
     <link href="./offers_actions.css" rel="stylesheet">
   Перед </body>:
     <script defer src="./offer_photo_filepond.js"></script>
     <script defer src="./offers_edit_delete.js"></script>

2) Если нет модалки редактирования — вставьте блок из файла index_modal_snippet.html
   прямо перед </body>.

После деплоя:
- «Создать оффер»: drop-зона FilePond с превью/обрезкой 1:1; скрытое image_url заполняется URLом /upload.
- «Мои офферы»: «Редактировать/Удалить». Удаление пробует: DELETE → POST /delete → PATCH status='deleted'.
