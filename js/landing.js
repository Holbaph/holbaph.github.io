// landing.js — fondo elegible (claro / oscuro / automático), animaciones suaves, palabra rotatoria,
// y formulario de agenda (abre el correo del visitante).

// Cambia aquí el correo de contacto (también aparece como enlace en la página).
var CONTACTO_EMAIL = 'contacto@holbaph.cl';

// Se aplica de inmediato (este script va en el <head>) para evitar un destello de otro color.
document.documentElement.classList.add('js');
(function () {
  var t = null;
  try { t = localStorage.getItem('holbaph_tema'); } catch (e) { /* sin almacenamiento: queda en automático */ }
  if (t === 'claro' || t === 'oscuro') document.documentElement.setAttribute('data-tema', t);
})();

document.addEventListener('DOMContentLoaded', function () {
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Selector de fondo ----------
  var botones = document.querySelectorAll('.tema button');
  function temaActual() {
    var t = document.documentElement.getAttribute('data-tema');
    return t === 'claro' || t === 'oscuro' ? t : 'auto';
  }
  function marcar() {
    var actual = temaActual();
    botones.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tema === actual ? 'true' : 'false'); });
  }
  botones.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.tema;
      if (t === 'auto') document.documentElement.removeAttribute('data-tema');
      else document.documentElement.setAttribute('data-tema', t);
      try { if (t === 'auto') localStorage.removeItem('holbaph_tema'); else localStorage.setItem('holbaph_tema', t); } catch (e) { /* ignorar */ }
      marcar();
    });
  });
  marcar();

  // ---------- Datos simples ----------
  var enlace = document.getElementById('correoDirecto');
  if (enlace) { enlace.href = 'mailto:' + CONTACTO_EMAIL; enlace.textContent = CONTACTO_EMAIL; }
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  // ---------- Borde de la cabecera al bajar ----------
  var cab = document.querySelector('.cabecera');
  function borde() { cab.classList.toggle('borde', window.scrollY > 8); }
  window.addEventListener('scroll', borde, { passive: true });
  borde();

  // ---------- Aparición suave al hacer scroll ----------
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('visible');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) { el.style.transitionDelay = ((i % 3) * 70) + 'ms'; obs.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('visible'); });
  }

  // ---------- Palabra rotatoria de la portada ----------
  var rotor = document.getElementById('rotor');
  if (rotor && !reducido) {
    var palabras = ['microapps', 'ESP32 y Arduino', 'sensores y mediciones', 'actuadores y control', 'inteligencia visual', 'autoaprendizaje'];
    var i = 0;
    setInterval(function () {
      if (document.hidden) return;
      rotor.classList.add('sale');
      setTimeout(function () {
        i = (i + 1) % palabras.length;
        rotor.textContent = palabras[i];
        rotor.classList.remove('sale');
      }, 300);
    }, 2600);
  }

  // ---------- Formulario: valida y abre el correo con la solicitud armada ----------
  var form = document.getElementById('formContacto');
  var nota = document.getElementById('formNota');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = form.nombre.value.trim();
    var correo = form.correo.value.trim();
    var mensaje = form.mensaje.value.trim();
    var cuando = form.cuando ? form.cuando.value.trim() : '';
    var valido = true;
    [['nombre', nombre], ['correo', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo) ? correo : ''], ['mensaje', mensaje]].forEach(function (par) {
      var campo = form[par[0]];
      var ok = !!par[1];
      campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) valido = false;
    });
    if (!valido) {
      nota.textContent = 'Completa tu nombre, un correo válido y el mensaje.';
      nota.classList.add('error');
      return;
    }
    nota.classList.remove('error');
    nota.textContent = 'Abriendo tu correo… si no se abre, escríbenos a ' + CONTACTO_EMAIL + '.';
    var asunto = 'Agendar consulta — ' + nombre;
    var cuerpo = mensaje + (cuando ? '\n\nDisponibilidad: ' + cuando : '') + '\n\n—\n' + nombre + '\n' + correo;
    window.location.href = 'mailto:' + CONTACTO_EMAIL + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
  });
});
