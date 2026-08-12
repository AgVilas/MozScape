/* ==========================================================================
   MozScape · Portfólio — interacções
   ========================================================================== */
(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------------------------------------------------------------
       Header, barra de progresso e botão "voltar ao topo"
       --------------------------------------------------------------- */
    var header = document.getElementById('siteHeader');
    var progressBar = document.getElementById('progressBar');
    var toTop = document.getElementById('toTop');
    var ticking = false;

    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        var max = document.documentElement.scrollHeight - window.innerHeight;

        header.classList.toggle('is-stuck', y > 24);
        progressBar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
        toTop.classList.toggle('is-visible', y > 600);
        sweepReveals();
        sweepShots();
        ticking = false;
    }

    window.addEventListener('scroll', function () {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(onScroll);
        }
    }, { passive: true });
    onScroll();

    toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });

    /* ---------------------------------------------------------------
       Menu móvel
       --------------------------------------------------------------- */
    var navToggle = document.getElementById('navToggle');
    var nav = document.getElementById('primaryNav');

    navToggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });

    nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
            nav.classList.remove('is-open');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });

    /* ---------------------------------------------------------------
       Nome do hero — animação letra a letra
       --------------------------------------------------------------- */
    var index = 0;
    Array.prototype.forEach.call(document.querySelectorAll('[data-split]'), function (line) {
        var text = line.textContent.trim();
        line.textContent = '';
        Array.prototype.forEach.call(text, function (char) {
            var span = document.createElement('span');
            span.className = 'ch';
            span.textContent = char;
            span.style.setProperty('--i', index++);
            span.setAttribute('aria-hidden', 'true');
            line.appendChild(span);
        });
    });

    /* ---------------------------------------------------------------
       Slideshow do hero
       --------------------------------------------------------------- */
    var slides = document.querySelectorAll('.hero__slide');
    if (slides.length > 1 && !reduced) {
        var current = 0;
        setInterval(function () {
            slides[current].classList.remove('is-active');
            current = (current + 1) % slides.length;
            slides[current].classList.add('is-active');
        }, 7000);
    }

    /* ---------------------------------------------------------------
       Halo que segue o ponteiro no hero
       --------------------------------------------------------------- */
    var hero = document.getElementById('hero');
    var heroGlow = document.getElementById('heroGlow');
    if (hero && heroGlow && !reduced && window.matchMedia('(pointer: fine)').matches) {
        var pending = false;
        var px = 0, py = 0;
        hero.addEventListener('pointermove', function (e) {
            var rect = hero.getBoundingClientRect();
            px = e.clientX - rect.left;
            py = e.clientY - rect.top;
            if (!pending) {
                pending = true;
                window.requestAnimationFrame(function () {
                    heroGlow.style.setProperty('--mx', px + 'px');
                    heroGlow.style.setProperty('--my', py + 'px');
                    pending = false;
                });
            }
        });
    }

    /* ---------------------------------------------------------------
       Revelação ao scroll
       --------------------------------------------------------------- */
    var pendingReveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    var revealObserver = null;

    function reveal(el) {
        el.style.setProperty('--d', (el.dataset.delay || 0) + 'ms');
        el.classList.add('is-in');
        if (revealObserver) revealObserver.unobserve(el);
    }

    // Um salto de âncora (#galeria) ou um arrasto rápido da barra de scroll pode
    // levar um elemento de baixo da janela para cima dela sem nunca a atravessar:
    // o observador não dispara e o elemento ficaria invisível para sempre.
    // Esta varredura, presa ao scroll, garante que isso não acontece.
    function sweepReveals() {
        // onScroll corre uma vez ainda antes desta secção do ficheiro
        if (!pendingReveals || !pendingReveals.length) return;
        var limit = window.innerHeight * 0.9;
        pendingReveals = pendingReveals.filter(function (el) {
            if (el.getBoundingClientRect().top >= limit) return true;
            reveal(el);
            return false;
        });
    }

    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var i = pendingReveals.indexOf(entry.target);
                if (i > -1) pendingReveals.splice(i, 1);
                reveal(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

        pendingReveals.forEach(function (el) { revealObserver.observe(el); });
    } else {
        pendingReveals.forEach(function (el) { el.classList.add('is-in'); });
        pendingReveals = [];
    }

    /* ---------------------------------------------------------------
       Contadores animados
       --------------------------------------------------------------- */
    function runCounter(el) {
        var target = parseInt(el.dataset.count, 10) || 0;
        var suffix = el.dataset.suffix || '';
        var duration = 1600;
        var start = null;

        if (reduced) {
            el.textContent = target + suffix;
            return;
        }

        function step(now) {
            if (start === null) start = now;
            var p = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    var counters = document.querySelectorAll('[data-count]');
    if ('IntersectionObserver' in window) {
        var countObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                runCounter(entry.target);
                countObserver.unobserve(entry.target);
            });
        }, { threshold: 0.5 });
        Array.prototype.forEach.call(counters, function (el) { countObserver.observe(el); });
    } else {
        Array.prototype.forEach.call(counters, runCounter);
    }

    /* ---------------------------------------------------------------
       Galeria — entrada escalonada e filtros
       --------------------------------------------------------------- */
    var gallery = document.getElementById('gallery');
    var shots = Array.prototype.slice.call(gallery.querySelectorAll('.shot'));
    var emptyMsg = document.getElementById('galleryEmpty');

    // Marca cada fotografia como carregada para trocar o esqueleto pela imagem
    shots.forEach(function (shot) {
        var img = shot.querySelector('.shot__img');
        if (img.complete && img.naturalWidth > 0) {
            shot.classList.add('is-loaded');
        } else {
            img.addEventListener('load', function () { shot.classList.add('is-loaded'); });
            img.addEventListener('error', function () { shot.classList.add('is-loaded'); });
        }
    });

    function showShot(shot, order) {
        shot.style.transitionDelay = (reduced ? 0 : Math.min(order, 8) * 70) + 'ms';
        shot.classList.add('is-in');
    }

    var pendingShots = shots.slice();
    var shotObserver = null;

    function enterShot(shot) {
        var i = pendingShots.indexOf(shot);
        if (i > -1) pendingShots.splice(i, 1);
        if (shotObserver) shotObserver.unobserve(shot);
        var visible = shots.filter(function (s) { return !s.classList.contains('is-hidden'); });
        showShot(shot, visible.indexOf(shot));
    }

    // mesma rede de segurança das restantes revelações
    function sweepShots() {
        if (!pendingShots || !pendingShots.length) return;
        var limit = window.innerHeight * 0.92;
        pendingShots.slice().forEach(function (shot) {
            if (shot.getBoundingClientRect().top < limit) enterShot(shot);
        });
    }

    if ('IntersectionObserver' in window) {
        shotObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) enterShot(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        pendingShots.forEach(function (s) { shotObserver.observe(s); });
    } else {
        shots.forEach(function (s) { s.classList.add('is-in'); });
        pendingShots = [];
    }

    var chips = document.querySelectorAll('.chip');
    Array.prototype.forEach.call(chips, function (chip) {
        chip.addEventListener('click', function () {
            var filter = chip.dataset.filter;

            Array.prototype.forEach.call(chips, function (c) {
                var on = c === chip;
                c.classList.toggle('is-active', on);
                c.setAttribute('aria-selected', String(on));
            });

            var shown = 0;
            shots.forEach(function (shot) {
                var match = filter === 'all' || shot.dataset.cat === filter;
                shot.classList.toggle('is-hidden', !match);
                if (match) {
                    showShot(shot, shown);
                    shown++;
                }
            });

            emptyMsg.hidden = shown > 0;
        });
    });

    /* ---------------------------------------------------------------
       Lightbox
       --------------------------------------------------------------- */
    var lightbox = document.getElementById('lightbox');
    var lbImage = document.getElementById('lbImage');
    var lbTitle = document.getElementById('lbTitle');
    var lbPlace = document.getElementById('lbPlace');
    var lbMeta = document.getElementById('lbMeta');
    var lbCounter = document.getElementById('lbCounter');
    var lbDownload = document.getElementById('lbDownload');
    var lbClose = document.getElementById('lbClose');
    var lbPrev = document.getElementById('lbPrev');
    var lbNext = document.getElementById('lbNext');

    var active = [];      // fotografias visíveis no momento da abertura
    var pointer = 0;      // índice actual
    var lastFocused = null;

    function render() {
        var shot = active[pointer];
        if (!shot) return;
        var src = shot.dataset.src;

        lbImage.style.opacity = '0';
        var loader = new Image();
        loader.onload = function () {
            lbImage.src = src;
            lbImage.alt = shot.dataset.title + ' — ' + shot.dataset.place;
            lbImage.style.opacity = '1';
        };
        loader.src = src;

        lbTitle.textContent = shot.dataset.title;
        lbPlace.textContent = shot.dataset.place;
        lbMeta.textContent = shot.dataset.meta || '';
        lbCounter.textContent = (pointer + 1) + ' / ' + active.length;
        lbDownload.href = src;
        lbDownload.setAttribute('download', src.split('/').pop());
    }

    function open(shot) {
        active = shots.filter(function (s) { return !s.classList.contains('is-hidden'); });
        pointer = active.indexOf(shot);
        if (pointer < 0) pointer = 0;

        lastFocused = document.activeElement;
        lightbox.hidden = false;
        document.body.style.overflow = 'hidden';
        render();
        window.requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
        lbClose.focus();
    }

    function close() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
        window.setTimeout(function () {
            lightbox.hidden = true;
            lbImage.removeAttribute('src');
        }, reduced ? 0 : 380);
        if (lastFocused) lastFocused.focus();
    }

    function step(delta) {
        if (!active.length) return;
        pointer = (pointer + delta + active.length) % active.length;
        render();
    }

    shots.forEach(function (shot) {
        var btn = shot.querySelector('.shot__btn');
        btn.addEventListener('click', function () { open(shot); });
        // espelha o estado de foco na moldura, já que o botão é uma camada sobreposta
        btn.addEventListener('focus', function () { shot.classList.add('is-focus'); });
        btn.addEventListener('blur', function () { shot.classList.remove('is-focus'); });
    });

    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', function () { step(-1); });
    lbNext.addEventListener('click', function () { step(1); });

    lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox || e.target.classList.contains('lightbox__stage')) close();
    });

    document.addEventListener('keydown', function (e) {
        if (lightbox.hidden) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') step(-1);
        else if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'Tab') {
            // mantém o foco dentro do visualizador
            var focusables = lightbox.querySelectorAll('button, a[href]');
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // Navegação por gesto (toque)
    var touchX = null;
    lightbox.addEventListener('touchstart', function (e) {
        touchX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', function (e) {
        if (touchX === null) return;
        var delta = e.changedTouches[0].clientX - touchX;
        if (Math.abs(delta) > 55) step(delta < 0 ? 1 : -1);
        touchX = null;
    }, { passive: true });

    /* ---------------------------------------------------------------
       Retrato com inclinação 3D
       --------------------------------------------------------------- */
    var tilt = document.querySelector('[data-tilt]');
    if (tilt && !reduced && window.matchMedia('(pointer: fine)').matches) {
        tilt.addEventListener('pointermove', function (e) {
            var r = tilt.getBoundingClientRect();
            var rx = ((e.clientY - r.top) / r.height - 0.5) * -9;
            var ry = ((e.clientX - r.left) / r.width - 0.5) * 9;
            tilt.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
        });
        tilt.addEventListener('pointerleave', function () {
            tilt.style.transform = '';
        });
    }
})();
