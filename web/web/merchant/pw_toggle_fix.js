
// Generic password show/hide for all .pw-toggle buttons
document.addEventListener('DOMContentLoaded', function(){
  document.body.addEventListener('click', function(e){
    const btn = e.target.closest('.pw-toggle'); if(!btn) return;
    const wrap = btn.closest('.pw-field');
    const input = wrap ? wrap.querySelector('input') : null;
    if(!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.setAttribute('aria-pressed', String(!isText));
  });
});
