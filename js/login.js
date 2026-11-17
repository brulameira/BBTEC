// Mostrar / ocultar senha
document.querySelectorAll('.olho').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var campo = document.getElementById(btn.getAttribute('data-alvo'));
    var mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    btn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    btn.setAttribute('aria-pressed', mostrar ? 'true' : 'false');
  });
});
