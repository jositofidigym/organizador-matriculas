/* PeritoLab — animaciones y detalles de la web. Sin librerías: todo el JavaScript es este. */
(function () {
  "use strict";
  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Barra superior: transparente arriba, con cristal al bajar.
  var nav = document.querySelector(".nav");
  function navegar() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 12); }
  navegar();
  window.addEventListener("scroll", navegar, { passive: true });

  // La ventana de la portada no se ve al entrar: al bajar pasa de borrosa a nítida, sube a su sitio y se
  // endereza, al ritmo del scroll (si se vuelve arriba, se difumina otra vez).
  var escenario = document.querySelector(".hero .stage");
  var ventana = escenario && escenario.querySelector(".window");
  if (escenario && quieto) {
    escenario.style.setProperty("--p", "1");
  } else if (escenario) {
    var pendiente = false;
    var colocar = function () {
      pendiente = false;
      var arriba = escenario.getBoundingClientRect().top;
      var alto = window.innerHeight;
      // 0 cuando la ventana asoma por abajo; 1 (nítida) cuando su borde superior llega a media pantalla.
      var p = Math.min(Math.max((alto - arriba) / (alto * 0.5), 0), 1);
      escenario.style.setProperty("--p", p.toFixed(3));
      if (p > 0.6) escenario.classList.add("play");
      if (ventana) {
        var maximo = window.innerWidth < 820 ? 8 : 14;
        ventana.style.setProperty("--tilt", (maximo * (1 - p)).toFixed(2) + "deg");
      }
    };
    window.addEventListener("scroll", function () {
      if (!pendiente) { pendiente = true; requestAnimationFrame(colocar); }
    }, { passive: true });
    window.addEventListener("resize", colocar);
    colocar();
  }

  // Aparecer al entrar en pantalla (y arrancar las maquetas animadas).
  var mirar = Array.prototype.filter.call(document.querySelectorAll(".reveal, .play-on-view"),
    function (el) { return el !== escenario; });     // la de la portada la lleva «colocar»
  // Lo que ya se ve al abrir la página entra enseguida, sin esperar al observador. Con un
  // temporizador y no con requestAnimationFrame: en una pestaña abierta en segundo plano el
  // navegador no pinta, y la portada se quedaría en blanco hasta mover la página.
  setTimeout(function () {
    mirar.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add("in");
        if (el.classList.contains("play-on-view")) el.classList.add("play");
      }
    });
  }, 30);
  if ("IntersectionObserver" in window && !quieto) {
    var ojo = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains("play-on-view") ? "play" : "in");
        if (e.target.classList.contains("reveal") && e.target.classList.contains("play-on-view")) e.target.classList.add("in");
        ojo.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    mirar.forEach(function (el) { ojo.observe(el); });
  } else {
    mirar.forEach(function (el) { el.classList.add("in", "play"); });
  }

  // Cifras que cuentan hasta su valor.
  var formato = new Intl.NumberFormat("es-ES");
  var cifras = document.querySelectorAll("[data-count]");
  function contar(el) {
    var fin = Number(el.getAttribute("data-count"));
    var antes = el.getAttribute("data-prefix") || "";
    var despues = el.getAttribute("data-suffix") || "";
    if (quieto) { el.textContent = antes + formato.format(fin) + despues; return; }
    var t0 = null;
    var paso = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / 1600, 1);
      var suave = 1 - Math.pow(1 - p, 3);
      el.textContent = antes + formato.format(Math.round(fin * suave)) + despues;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  if ("IntersectionObserver" in window) {
    var ojoCifras = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { contar(e.target); ojoCifras.unobserve(e.target); } });
    }, { threshold: 0.5 });
    cifras.forEach(function (el) { ojoCifras.observe(el); });
  } else {
    cifras.forEach(contar);
  }

  // Precios: mensual / anual.
  var selector = document.querySelector(".toggle");
  if (selector) {
    selector.querySelectorAll("button").forEach(function (boton) {
      boton.addEventListener("click", function () {
        var periodo = boton.getAttribute("data-period");
        if (selector.getAttribute("data-period") === periodo) return;
        selector.setAttribute("data-period", periodo);
        selector.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b === boton)); });
        document.querySelectorAll(".plan").forEach(function (plan) {
          var cifra = plan.querySelector(".price b");
          var unidad = plan.querySelector(".price span");
          var ahorro = plan.querySelector(".saving");
          var poner = function () {
            cifra.textContent = plan.getAttribute(periodo === "ano" ? "data-year" : "data-month");
            unidad.textContent = periodo === "ano" ? "/año" : "/mes";
            ahorro.textContent = periodo === "ano" ? plan.getAttribute("data-saving") : "o " + plan.getAttribute("data-year") + " al año";
            ahorro.classList.toggle("on", periodo === "ano");
            cifra.classList.remove("swap");
          };
          if (quieto) { poner(); return; }
          cifra.classList.add("swap");
          setTimeout(poner, 220);
        });
      });
    });
  }

  // Preguntas: abrir y cerrar con suavidad.
  document.querySelectorAll(".faq details").forEach(function (d) {
    var resumen = d.querySelector("summary");
    var cuerpo = d.querySelector(".answer");
    if (!resumen || !cuerpo || quieto) return;
    var ocupado = false;
    // Termina la animación al acabar la transición o, si el navegador no la avisa, a los 600 ms.
    var alAcabar = function (hecho) {
      var listo = false;
      var fin = function () {
        if (listo) return;
        listo = true; cuerpo.removeEventListener("transitionend", fin);
        hecho(); cuerpo.style.height = ""; ocupado = false;
      };
      cuerpo.addEventListener("transitionend", fin);
      setTimeout(fin, 600);
    };
    resumen.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (ocupado) return;
      ocupado = true;
      if (d.open) {
        cuerpo.style.height = cuerpo.scrollHeight + "px";
        requestAnimationFrame(function () { requestAnimationFrame(function () { cuerpo.style.height = "0px"; }); });
        alAcabar(function () { d.open = false; });
      } else {
        d.open = true;
        cuerpo.style.height = "0px";
        requestAnimationFrame(function () { requestAnimationFrame(function () { cuerpo.style.height = cuerpo.scrollHeight + "px"; }); });
        alAcabar(function () {});
      }
    });
  });

  // Menú del móvil: los enlaces de arriba no caben y se esconden; un botón los despliega.
  var enlaces = nav && nav.querySelector(".nav-links");
  if (enlaces) {
    if (!enlaces.id) enlaces.id = "menu-principal";
    var menu = document.createElement("button");
    menu.type = "button";
    menu.className = "nav-toggle";
    menu.setAttribute("aria-controls", enlaces.id);
    menu.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-label", "Menú");
    menu.innerHTML = "<span></span><span></span>";
    nav.querySelector(".wrap").appendChild(menu);
    var abrir = function (si) {
      nav.classList.toggle("open", si);
      menu.setAttribute("aria-expanded", si ? "true" : "false");
    };
    menu.addEventListener("click", function () { abrir(!nav.classList.contains("open")); });
    enlaces.addEventListener("click", function (ev) { if (ev.target.closest("a")) abrir(false); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") abrir(false); });
  }

  // Descargar desde el móvil: la aplicación es para Windows. En vez de bajar un .exe que el
  // teléfono no puede abrir, se ofrece mandarse el enlace para abrirlo en el ordenador.
  var movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 900);
  if (movil) {
    var aviso = null;
    var cerrarAviso = function () { if (aviso) { aviso.remove(); aviso = null; } };
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href$="-instalador.exe"]');
      if (!a) return;
      ev.preventDefault();
      cerrarAviso();
      var compresor = /PeritoLabCompresor/.test(a.getAttribute("href"));
      var nombre = compresor ? "PeritoLab Compresor" : "PeritoLab Matrículas";
      var aqui = location.origin + location.pathname.replace(/[^/]*$/, "") + (compresor ? "compresor.html" : "matriculas.html");
      aviso = document.createElement("div");
      aviso.className = "toast";
      aviso.setAttribute("role", "dialog");
      aviso.setAttribute("aria-label", "Descargar en el ordenador");
      aviso.innerHTML = "<p><b>" + nombre + " es para Windows.</b> Abre esta página en tu ordenador para descargarlo.</p>" +
        '<div class="toast-actions"><a class="btn btn-primary btn-sm" href="mailto:?subject=' +
        encodeURIComponent(nombre) + "&body=" + encodeURIComponent("Para descargarlo en el ordenador: " + aqui) +
        '">Enviármelo por correo</a><button type="button" class="btn btn-ghost btn-sm">Cerrar</button></div>';
      document.body.appendChild(aviso);
      aviso.querySelector("button").addEventListener("click", cerrarAviso);
    });
  }

  // Cuántos descargan y cuántos pasan del Compresor a Matrículas: un número por botón en el servidor, SIN
  // cookies ni saber quién (no se manda nada de la persona). Si falla, da igual: el enlace va igual.
  var SERVIDOR = "https://script.google.com/macros/s/AKfycbwk8DVIqnZSsnwD-isQgQ47Sm8-2EPF5_GBAOzU3WP5tvVi-AUBBugEx9DnXpnT9kc/exec";
  var contar = function (clave) {
    try {
      fetch(SERVIDOR + "?accion=clic&k=" + encodeURIComponent(clave) + "&n=0",
            {mode: "no-cors", keepalive: true, credentials: "omit"}).catch(function () {});
    } catch (e) { /* navegador antiguo: no se cuenta */ }
  };
  // En el ordenador: se cuenta la descarga y se explica el aviso azul de Windows (programa nuevo sin firma).
  if (!movil) {
    var ayuda = null;
    document.addEventListener("click", function (ev) {
      var a = ev.target.closest && ev.target.closest("a[href]");
      if (!a) return;
      var href = a.getAttribute("href");
      if (/-instalador\.exe$/.test(href)) {
        var compresor = /PeritoLabCompresor/.test(href);
        contar(compresor ? "w:descarga_compresor" : "w:descarga");
        if (ayuda) ayuda.remove();
        var nombre = compresor ? "PeritoLab Compresor" : "PeritoLab Matrículas";
        ayuda = document.createElement("div");
        ayuda.className = "toast toast-ayuda";
        ayuda.setAttribute("role", "dialog");
        ayuda.setAttribute("aria-label", "Cómo instalarlo");
        ayuda.innerHTML = "<p><b>Se está descargando " + nombre + ".</b> Ábrelo al terminar. Si Windows dice " +
          "«Windows protegió su PC», pulsa <b>Más información</b> y después <b>Ejecutar de todas formas</b>: " +
          "sale con los programas nuevos que aún no tienen firma digital.</p>" +
          '<div class="toast-actions"><button type="button" class="btn btn-ghost btn-sm">Entendido</button></div>';
        document.body.appendChild(ayuda);
        ayuda.querySelector("button").addEventListener("click", function () { ayuda.remove(); ayuda = null; });
      } else if (/(^|\/)compresor\.html$/.test(location.pathname) && /^matriculas\.html/.test(href)) {
        contar("w:compresor_web");
      }
    });
  }

  // Calculadora de Matrículas: fotos al día × días × 4 segundos por foto (como la aplicación).
  var calc = document.getElementById("calc-fotos");
  if (calc) {
    var num = function (id) { var v = parseFloat(document.getElementById(id).value); return isFinite(v) && v > 0 ? v : 0; };
    var coma = function (n, d) { return n.toLocaleString("es-ES", {minimumFractionDigits: d, maximumFractionDigits: d}); };
    var pintar = function () {
      var horas = num("calc-fotos") * num("calc-dias") * 4 / 3600;
      var euros = horas * num("calc-hora");
      document.getElementById("calc-horas").textContent = (horas < 10 ? coma(horas, 1) : coma(Math.round(horas), 0)) +
        (Math.abs(horas - 1) < 0.05 ? " hora" : " horas");
      document.getElementById("calc-euros").textContent = euros >= 1 ?
        "Unos " + coma(Math.round(euros), 0) + " € de tu tiempo, frente a 29,95 € del plan Básico." :
        "Pon cuántas fotos haces al día.";
    };
    ["calc-fotos", "calc-dias", "calc-hora"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", pintar);
    });
    pintar();
  }

  var anio = document.querySelector("[data-year-now]");
  if (anio) anio.textContent = String(new Date().getFullYear());
})();
