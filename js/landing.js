// landing.js — efectos "de laboratorio": circuitos animados, monitor serial, lecturas de sensores
// simuladas, menú móvil, aparición suave y formulario de contacto (abre el correo del visitante).

// Cambia aquí el correo de contacto (también aparece como enlace en la página).
var CONTACTO_EMAIL = 'contacto@holbaph.cl';

// Marca que hay JavaScript lo antes posible, para que las animaciones de aparición funcionen
// (sin JS todo el contenido se ve igual, sin animar).
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', function () {
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Datos simples ----------
  var enlace = document.getElementById('correoDirecto');
  if (enlace) { enlace.href = 'mailto:' + CONTACTO_EMAIL; enlace.textContent = CONTACTO_EMAIL; }
  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();

  // ---------- Menú móvil ----------
  var boton = document.getElementById('menuBoton');
  var menu = document.getElementById('menu');
  function cerrarMenu() {
    menu.classList.remove('abierto');
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
  }
  boton.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', cerrarMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  // ---------- Barra de progreso de lectura ----------
  var progreso = document.getElementById('progreso');
  function actualizarProgreso() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
  }
  window.addEventListener('scroll', actualizarProgreso, { passive: true });
  actualizarProgreso();

  // ---------- Aparición suave al hacer scroll + pipeline que se enciende ----------
  var items = document.querySelectorAll('.reveal');
  var pipeline = document.getElementById('pipeline');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('visible');
        obs.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    items.forEach(function (el, i) { el.style.transitionDelay = ((i % 3) * 80) + 'ms'; obs.observe(el); });
    if (pipeline) {
      var obsPipe = new IntersectionObserver(function (e) {
        if (e[0].isIntersecting) { pipeline.classList.add('encendido'); obsPipe.disconnect(); }
      }, { threshold: 0.35 });
      obsPipe.observe(pipeline);
    }
  } else {
    items.forEach(function (el) { el.classList.add('visible'); });
    if (pipeline) pipeline.classList.add('encendido');
  }

  // ---------- Foco de luz que sigue al mouse en la portada ----------
  var portada = document.getElementById('inicio');
  if (portada && !reducido) {
    portada.addEventListener('pointermove', function (e) {
      var r = portada.getBoundingClientRect();
      portada.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      portada.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  iniciarCircuitos(reducido);
  iniciarConsola(reducido);
  iniciarLecturas(reducido);
  iniciarFormulario();
});

// =====================================================================================
// Circuitos: pistas ortogonales tipo PCB con pulsos de datos que viajan por ellas
// =====================================================================================
function iniciarCircuitos(reducido) {
  var cv = document.getElementById('circuitos');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var CELDA = 46, W = 0, H = 0, caminos = [], visible = true, raf = 0, ultimo = 0;

  function aleatorio(a, b) { return a + Math.random() * (b - a); }

  function generar() {
    caminos = [];
    var cols = Math.floor(W / CELDA), filas = Math.floor(H / CELDA);
    var cantidad = Math.max(8, Math.min(30, Math.round((W * H) / 38000)));
    for (var n = 0; n < cantidad; n++) {
      var gx = Math.floor(aleatorio(0, cols)), gy = Math.floor(aleatorio(0, filas));
      var puntos = [[gx * CELDA, gy * CELDA]];
      var horizontal = Math.random() < 0.5, signo = Math.random() < 0.5 ? 1 : -1;
      var tramos = 3 + Math.floor(Math.random() * 4);
      for (var t = 0; t < tramos; t++) {
        var pasos = 1 + Math.floor(Math.random() * 4);
        if (horizontal) gx = Math.max(0, Math.min(cols, gx + signo * pasos));
        else gy = Math.max(0, Math.min(filas, gy + signo * pasos));
        var p = [gx * CELDA, gy * CELDA], q = puntos[puntos.length - 1];
        if (p[0] !== q[0] || p[1] !== q[1]) puntos.push(p);
        horizontal = !horizontal;
        signo = Math.random() < 0.5 ? 1 : -1;
      }
      if (puntos.length < 3) continue;
      var acum = [0], total = 0;
      for (var i = 1; i < puntos.length; i++) {
        total += Math.abs(puntos[i][0] - puntos[i - 1][0]) + Math.abs(puntos[i][1] - puntos[i - 1][1]);
        acum.push(total);
      }
      caminos.push({
        puntos: puntos, acum: acum, total: total,
        pos: aleatorio(0, total), vel: aleatorio(55, 130),
        color: Math.random() < 0.7 ? '34,211,238' : '167,139,250',
      });
    }
  }

  function puntoEn(c, d) {
    d = ((d % c.total) + c.total) % c.total;
    for (var i = 1; i < c.acum.length; i++) {
      if (d <= c.acum[i]) {
        var k = (d - c.acum[i - 1]) / (c.acum[i] - c.acum[i - 1]);
        var a = c.puntos[i - 1], b = c.puntos[i];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      }
    }
    return c.puntos[0];
  }

  function dibujarBase() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    caminos.forEach(function (c) {
      ctx.beginPath();
      c.puntos.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
      ctx.strokeStyle = 'rgba(' + c.color + ',0.17)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // pads en los extremos
      [c.puntos[0], c.puntos[c.puntos.length - 1]].forEach(function (p) {
        ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, 6.2832);
        ctx.fillStyle = '#070b14'; ctx.fill();
        ctx.strokeStyle = 'rgba(' + c.color + ',0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
      });
    });
  }

  function cuadro(t) {
    raf = 0;
    if (!visible || document.hidden) return;
    var dt = Math.min(0.05, (t - ultimo) / 1000 || 0.016);
    ultimo = t;
    ctx.clearRect(0, 0, W, H);
    dibujarBase();
    caminos.forEach(function (c) {
      c.pos += c.vel * dt;
      // estela del pulso
      for (var s = 0; s < 9; s++) {
        var p = puntoEn(c, c.pos - s * 5);
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.6 - s * 0.22, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + c.color + ',' + (0.9 - s * 0.1).toFixed(2) + ')';
        ctx.fill();
      }
      var cab = puntoEn(c, c.pos);
      ctx.beginPath(); ctx.arc(cab[0], cab[1], 8, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + c.color + ',0.16)'; ctx.fill();
    });
    raf = requestAnimationFrame(cuadro);
  }

  function medir() {
    var r = cv.parentElement.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generar();
    if (reducido) { ctx.clearRect(0, 0, W, H); dibujarBase(); }
  }

  medir();
  var temporizador;
  window.addEventListener('resize', function () { clearTimeout(temporizador); temporizador = setTimeout(medir, 200); });
  if (reducido) return;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      visible = e[0].isIntersecting;
      if (visible && !raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); }
    }).observe(cv.parentElement);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && visible && !raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); }
  });
  raf = requestAnimationFrame(cuadro);
}

// =====================================================================================
// Monitor serial: escribe el arranque de una placa y luego sigue "recibiendo" lecturas
// =====================================================================================
function iniciarConsola(reducido) {
  var pre = document.getElementById('consola');
  if (!pre || reducido) return;   // sin animación se queda el texto estático del HTML
  // Cada línea = lista de segmentos [clase, texto]
  var guion = [
    [['c-cmd', '> boot holbaph-esp32 v1.0']],
    [['c-ok', '[ OK ]'], ['', ' wifi conectado  →  holbaph.cl']],
    [['c-ok', '[ OK ]'], ['', ' sensor DHT22   temp=23.4°C hum=48%']],
    [['c-ok', '[ OK ]'], ['', ' relé canal 1   estado=ON']],
    [['c-ok', '[ OK ]'], ['', ' POST /api/lectura  →  200']],
    [['c-cmd', '> sistema listo']],
  ];
  var MAX_LINEAS = 8;
  pre.textContent = '';
  var lineas = [];
  var cursor = document.createElement('span');
  cursor.className = 'cursor-bloque';

  function nuevaLinea() {
    var div = document.createElement('div');
    pre.appendChild(div);
    lineas.push(div);
    while (lineas.length > MAX_LINEAS) pre.removeChild(lineas.shift());
    return div;
  }
  // Escribe los segmentos letra por letra, con el cursor al final de la línea
  function escribir(div, segmentos, fin) {
    div.appendChild(cursor);
    var s = 0, c = 0, span = null;
    function paso() {
      if (s >= segmentos.length) { fin(); return; }
      if (!span) {
        span = document.createElement('span');
        if (segmentos[s][0]) span.className = segmentos[s][0];
        div.insertBefore(span, cursor);
      }
      span.textContent += segmentos[s][1].charAt(c++);
      if (c >= segmentos[s][1].length) { s++; c = 0; span = null; }
      setTimeout(paso, 14 + Math.random() * 18);
    }
    paso();
  }
  function secuencia(k) {
    if (k >= guion.length) { setTimeout(lecturaPeriodica, 1800); return; }
    escribir(nuevaLinea(), guion[k], function () { setTimeout(function () { secuencia(k + 1); }, 220); });
  }
  var temp = 23.4, hum = 48;
  function lecturaPeriodica() {
    var d = new Date();
    var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
    temp += (Math.random() - 0.5) * 0.4; hum += (Math.random() - 0.5) * 1.2;
    var div = nuevaLinea();
    var a = document.createElement('span'); a.className = 'c-dato'; a.textContent = '[' + hh + ']';
    var b = document.createElement('span'); b.textContent = ' temp=' + temp.toFixed(1) + '°C hum=' + Math.round(hum) + '%  → enviado';
    div.appendChild(a); div.appendChild(b); div.appendChild(cursor);
    setTimeout(lecturaPeriodica, 2600);
  }
  setTimeout(function () { secuencia(0); }, 500);
}

// =====================================================================================
// Lecturas de sensores simuladas, con gráfico en vivo
// =====================================================================================
function iniciarLecturas(reducido) {
  var tiles = document.querySelectorAll('.lectura');
  if (!tiles.length) return;
  var N = 28;
  var estados = [].map.call(tiles, function (el) {
    var base = parseFloat(el.dataset.base), v = parseFloat(el.dataset.var);
    var serie = [];
    for (var i = 0; i < N; i++) serie.push(base + (Math.random() - 0.5) * v * 2);
    return { el: el, base: base, v: v, dec: parseInt(el.dataset.dec, 10) || 0, serie: serie,
             valor: el.querySelector('b'), linea: el.querySelector('polyline') };
  });
  function pintar() {
    estados.forEach(function (e) {
      var min = Math.min.apply(null, e.serie), max = Math.max.apply(null, e.serie);
      var rango = Math.max(max - min, e.v);
      var pts = e.serie.map(function (y, i) {
        return (i / (N - 1) * 120).toFixed(1) + ',' + (32 - ((y - min) / rango) * 28).toFixed(1);
      }).join(' ');
      e.linea.setAttribute('points', pts);
      e.valor.textContent = e.serie[N - 1].toFixed(e.dec);
    });
  }
  pintar();
  if (reducido) return;
  setInterval(function () {
    if (document.hidden) return;
    estados.forEach(function (e) {
      var ultimo = e.serie[N - 1];
      var siguiente = ultimo + (Math.random() - 0.5) * e.v * 0.9 + (e.base - ultimo) * 0.12;
      e.serie.push(siguiente); e.serie.shift();
    });
    pintar();
  }, 1000);
}

// =====================================================================================
// Formulario: valida y abre el correo con el mensaje armado
// =====================================================================================
function iniciarFormulario() {
  var form = document.getElementById('formContacto');
  var nota = document.getElementById('formNota');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nombre = form.nombre.value.trim();
    var correo = form.correo.value.trim();
    var mensaje = form.mensaje.value.trim();
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
    var asunto = 'Consulta desde holbaph.cl — ' + nombre;
    var cuerpo = mensaje + '\n\n—\n' + nombre + '\n' + correo;
    window.location.href = 'mailto:' + CONTACTO_EMAIL + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
  });
}
