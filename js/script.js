(function(){
  var links = document.querySelectorAll('.links a');
  function marcar(id){ links.forEach(function(a){ a.classList.toggle('ativo', a.getAttribute('href') === '#' + id); }); }
  marcar('inicio');
  function fimDaPagina(){ if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) marcar('contatos'); }
  window.addEventListener('scroll', fimDaPagina, { passive: true });
  links.forEach(function(a){ a.addEventListener('click', function(){ marcar(a.getAttribute('href').slice(1)); }); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) marcar(e.target.id); });
    }, { rootMargin: '-40% 0px -50% 0px' });
    ['inicio','sobre','contatos'].forEach(function(id){ var el = document.getElementById(id); if (el) io.observe(el); });
  }
})();
