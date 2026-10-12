// Variables globales
let isPlaying = false;
let currentSlide = 0;
// Se cuenta solo desde el HTML: basta con agregar o quitar fotos del carrusel
const totalSlides = document.querySelectorAll('.carousel-item').length || 1;
let musicStarted = false;       // la música ya arrancó (segundo 5 del video)
let musicUnlocked = false;      // el audio quedó habilitado con el toque (iOS)

// Segundo del video en el que arranca la música
const MUSIC_START_AT = 5;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    initializeCarousel();
    initializeIntro();
    initializeMusicControls();
    initializeParallax();
    initializeGuestGreeting();
    initializeLayers(); // después del saludo: depende de si la sección de invitados se muestra
    initializeScrollReveal();
    initializeGifts();
    initializeRsvp();
});

// Sección de saludo personalizado por invitado/familia, leída desde la URL.
// Formatos soportados:
//   ?invitados=Juan Arias,Yerianny Arias,Valery Arias
//   ?familia=Arias
// Muestra un badge con el total, título "Invitados", el número de
// acompañantes (si aplica) y cada nombre como fila con colores intercalados
// de la paleta dorada del sitio, ciclando si hay más de 4 nombres.
function initializeGuestGreeting() {
    const params = new URLSearchParams(window.location.search);
    const invitadosParam = params.get('invitados');
    const familiaParam = params.get('familia');

    const section = document.getElementById('guestSection');
    const badge = document.getElementById('guestBadge');
    const subtitle = document.getElementById('guestSubtitle');
    const greeting = document.getElementById('guestGreeting');
    if (!section || !badge || !subtitle || !greeting) return;

    let names = [];

    if (invitadosParam) {
        names = invitadosParam.split(',').map(n => decodeURIComponent(n.trim())).filter(Boolean);
    } else if (familiaParam) {
        names = [`Familia ${familiaParam.trim()}`];
    }

    if (names.length === 0) return;

    // Badge con el total de invitados
    badge.textContent = names.length;

    // Subtítulo de acompañantes: solo tiene sentido cuando hay más de un
    // nombre individual (no aplica al formato "Familia X")
    const companions = invitadosParam ? names.length - 1 : 0;
    if (companions > 0) {
        subtitle.textContent = `(${companions} acompañante${companions > 1 ? 's' : ''})`;
        subtitle.style.display = 'block';
    } else {
        subtitle.style.display = 'none';
    }

    // Limpiar contenido previo
    greeting.innerHTML = '';

    names.forEach((name, index) => {
        const nameSpan = document.createElement('span');
        const colorIndex = (index % 4) + 1;
        nameSpan.className = `guest-name color-${colorIndex}`;
        nameSpan.textContent = name;
        greeting.appendChild(nameSpan);
    });

    section.style.display = 'block';
}

// Capas alternadas: a las secciones visibles (sin contar el footer) les
// asigna arriba / abajo / arriba... La primera siempre va arriba para
// montarse sobre la portada.
function initializeLayers() {
    const layers = Array.from(document.querySelectorAll('.layers > .layer:not(.footer)'))
        .filter(el => getComputedStyle(el).display !== 'none');
    layers.forEach((el, i) => {
        el.classList.remove('layer--up', 'layer--down', 'layer--last');
        el.classList.add(i % 2 === 0 ? 'layer--up' : 'layer--down');
        if (i === layers.length - 1) el.classList.add('layer--last');
    });
    const footer = document.querySelector('.layers > .footer');
    if (footer) {
        const lastIsUp = layers.length % 2 === 1;
        footer.classList.toggle('layer--after-up', lastIsUp);
        // Si la última es hundida, el footer se eleva con ola propia y
        // esa última sección conserva su sombra inferior
        footer.classList.toggle('footer--raised', !lastIsUp);
        if (!lastIsUp && layers.length) layers[layers.length - 1].classList.remove('layer--last');
    }
}

// =========================================================
// Intro: sobre animado
// - Se toca para abrir (el toque es el gesto que permite sonido en iOS/Android)
// - En el segundo 5 del video arranca la música
// - Al terminar el video entra directo a la invitación con una transición
// =========================================================
function initializeIntro() {
    const intro = document.getElementById('intro');
    const video = document.getElementById('introVideo');
    if (!intro || !video) return;

    let started = false;
    let finished = false;

    const start = () => {
        if (started) return;
        started = true;
        intro.classList.add('is-playing');
        intro.setAttribute('aria-label', 'Abriendo la invitación');

        // Habilitar la música DENTRO del toque (requisito de iOS Safari)
        unlockMusic();

        video.muted = false;
        const p = video.play();
        if (p && p.catch) {
            p.catch(() => {
                // Si el video no se puede reproducir con sonido, se intenta en silencio;
                // si tampoco, se entra directo a la invitación con la música.
                video.muted = true;
                video.play().catch(() => { startMusic(); finish(); });
            });
        }
    };

    const finish = () => {
        if (finished) return;
        finished = true;
        startMusic(); // por si el video duró menos de 5 s o falló
        revealInvitation();
    };

    intro.addEventListener('click', start);
    intro.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
    });

    video.addEventListener('timeupdate', () => {
        if (!musicStarted && video.currentTime >= MUSIC_START_AT) startMusic();
    });
    video.addEventListener('ended', finish);
    video.addEventListener('error', () => { if (started) finish(); });

    // Seguro: si el video se queda trabado, entrar igual
    video.addEventListener('playing', () => {
        const ms = ((video.duration || 8) - video.currentTime + 2.5) * 1000;
        clearTimeout(video._safety);
        video._safety = setTimeout(finish, ms);
    });
}

// Transición elegante: el destello final del video se convierte en un velo de
// luz cálida con destellos dorados, y la portada "se revela" desde la luz.
function revealInvitation() {
    const body = document.body;
    window.scrollTo(0, 0);
    body.classList.remove('intro-active');
    // forzar reflow para que la animación arranque limpia
    void body.offsetWidth;
    body.classList.add('is-revealing');
    playSparkles(3200);

    const musicPlayer = document.getElementById('musicPlayer');
    setTimeout(() => {
        musicPlayer.style.display = 'block';
        musicPlayer.classList.add('is-visible');
    }, 2400);

    setTimeout(() => {
        body.classList.add('intro-done');
        const video = document.getElementById('introVideo');
        if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    }, 3600);
}

// Destellos dorados que flotan durante la transición (canvas liviano)
function playSparkles(duration) {
    const canvas = document.getElementById('introSparkles');
    if (!canvas || !canvas.getContext) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const count = Math.round(Math.min(70, Math.max(35, (w * h) / 12000)));
    const parts = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 1.1;
        return {
            x: w / 2 + (Math.random() - 0.5) * w * 0.35,
            y: h * 0.46 + (Math.random() - 0.5) * h * 0.25,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,
            r: 0.8 + Math.random() * 2.2,
            delay: Math.random() * 600,
            life: 1400 + Math.random() * 1600,
            hue: 38 + Math.random() * 10
        };
    });

    const t0 = performance.now();
    const frame = (now) => {
        const t = now - t0;
        ctx.clearRect(0, 0, w, h);
        parts.forEach(p => {
            const age = t - p.delay;
            if (age < 0 || age > p.life) return;
            const k = age / p.life;
            const alpha = Math.sin(Math.PI * k) * 0.9;
            const x = p.x + p.vx * age * 0.06;
            const y = p.y + p.vy * age * 0.06;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, p.r * 4);
            glow.addColorStop(0, `hsla(${p.hue}, 80%, 85%, ${alpha})`);
            glow.addColorStop(0.4, `hsla(${p.hue}, 70%, 60%, ${alpha * 0.45})`);
            glow.addColorStop(1, `hsla(${p.hue}, 70%, 55%, 0)`);
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, p.r * 4, 0, Math.PI * 2);
            ctx.fill();
        });
        if (t < duration) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, w, h);
    };
    requestAnimationFrame(frame);
}

// =========================================================
// Música (archivo propio, ya no YouTube)
// =========================================================
function getMusic() { return document.getElementById('bgMusic'); }

// Se llama dentro del toque: deja el audio "autorizado" para que luego,
// en el segundo 5, pueda sonar sin otro toque (iOS lo exige).
function unlockMusic() {
    const music = getMusic();
    if (!music || musicUnlocked) return;
    musicUnlocked = true;
    // Safari solo da permiso de SONIDO si play() se llama CON sonido dentro
    // del toque. Un play() en silencio (muted) no cuenta: por eso antes la
    // música no sonaba en el segundo 5. Se da play con sonido y se pausa al
    // instante; el elemento queda autorizado para sonar después sin otro toque.
    music.muted = false;
    try {
        const p = music.play();
        music.pause();
        if (p && p.catch) p.catch(() => {});
    } catch (e) { /* sin audio */ }
    try { music.currentTime = 0; } catch (e) {}
}

function startMusic() {
    const music = getMusic();
    if (!music || musicStarted) return;
    musicStarted = true;
    try { music.currentTime = 0; } catch (e) {}
    music.muted = false;
    fadeInVolume(music, 1800);
    const p = music.play();
    isPlaying = true;
    updateMusicIcon();
    if (p && p.catch) {
        p.catch(() => {
            // El navegador no dejó sonar: se muestra el botón de música
            // de inmediato para que el invitado la active con un toque.
            isPlaying = false;
            updateMusicIcon();
            showMusicHint();
        });
    }
}

function showMusicHint() {
    const box = document.getElementById('musicPlayer');
    if (!box) return;
    // Mientras corre el video del sobre el aviso quedaría tapado: esperar
    // a que la invitación esté a la vista.
    if (!document.body.classList.contains('intro-done')) {
        setTimeout(showMusicHint, 400);
        return;
    }
    box.style.display = 'block';
    box.classList.add('is-visible', 'needs-tap');
    showToast('Música de fondo', 'Toque el ícono de música, arriba a la derecha, para escuchar la canción.');
}

// Subida de volumen suave (en iPhone el volumen lo maneja el sistema y se ignora)
function fadeInVolume(el, ms) {
    try {
        el.volume = 0;
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min(1, (now - t0) / ms);
            el.volume = k;
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    } catch (e) { /* sin control de volumen */ }
}

function initializeMusicControls() {
    const music = getMusic();
    const toggle = document.getElementById('musicToggle');
    if (!music || !toggle) return;

    toggle.addEventListener('click', toggleMusic);
    music.addEventListener('play', () => { if (!music.muted) { isPlaying = true; updateMusicIcon(); } });
    music.addEventListener('pause', () => { isPlaying = false; updateMusicIcon(); });

    // Pausar si el invitado sale de la página y retomar al volver
    let resumeOnReturn = false;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            resumeOnReturn = isPlaying;
            if (isPlaying) music.pause();
        } else if (resumeOnReturn) {
            music.play().catch(() => {});
        }
    });
}

function toggleMusic() {
    const music = getMusic();
    if (!music) return;
    const box = document.getElementById('musicPlayer');
    if (box) box.classList.remove('needs-tap');
    if (isPlaying) {
        music.pause();
    } else {
        musicStarted = true;
        music.muted = false;
        music.volume = 1;
        music.play().catch(() => {});
    }
}

function updateMusicIcon() {
    const volumeIcon = document.getElementById('volumeIcon');
    
    if (isPlaying) {
        volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path>
        `;
    } else {
        volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
    }
}

// Countdown
function initializeCountdown() {
    const targetDate = new Date('2026-12-13T14:00:00-04:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const difference = targetDate - now;
        
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        } else {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Carrusel
function initializeCarousel() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentSlideElement = document.getElementById('currentSlide');
    const totalSlidesElement = document.getElementById('totalSlides');
    
    totalSlidesElement.textContent = totalSlides;
    updateSlideCounter();
    
    prevBtn.addEventListener('click', () => {
        if (currentSlide > 0) {
            currentSlide--;
        } else {
            currentSlide = totalSlides - 1;
        }
        updateCarousel();
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
        } else {
            currentSlide = 0;
        }
        updateCarousel();
    });
    
    // Auto-play del carrusel
    setInterval(() => {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
        } else {
            currentSlide = 0;
        }
        updateCarousel();
    }, 4000);
}

function updateCarousel() {
    const track = document.getElementById('carouselTrack');
    const translateX = -currentSlide * 100;
    track.style.transform = `translateX(${translateX}%)`;
    updateSlideCounter();
}

function updateSlideCounter() {
    const currentSlideElement = document.getElementById('currentSlide');
    currentSlideElement.textContent = currentSlide + 1;
}

// Parallax en la portada (mueve la capa de fondo al hacer scroll)
function initializeParallax() {
    const heroLayer = document.querySelector('.hero .hero-bg');
    if (!heroLayer) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let lastScrollY = window.scrollY || window.pageYOffset;
    let ticking = false;

    const computeSpeed = () => (window.innerWidth <= 768 ? 0.65 : 0.5);

    const render = () => {
        if (prefersReducedMotion.matches) {
            heroLayer.style.transform = 'translate3d(0,0,0)';
        } else {
            const speed = computeSpeed();
            // Tope: nunca desplazar más que el colchón real de la capa (60px fijos,
            // igual al valor definido en CSS), para que no se despegue del contenedor
            // y deje un hueco vacío, sin necesidad de sobredimensionar la imagen.
            const BUFFER_PX = 60;
            let translateY = lastScrollY * speed;
            translateY = Math.max(0, Math.min(BUFFER_PX, translateY));
            heroLayer.style.transform = `translate3d(0, ${Math.round(translateY)}px, 0)`;
        }
        ticking = false;
    };

    const onScroll = () => {
        lastScrollY = window.scrollY || window.pageYOffset;
        if (!ticking) {
            window.requestAnimationFrame(render);
            ticking = true;
        }
    };

    render();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', render);
}

// Funciones de los botones
// Nota: esta es una plantilla de ejemplo. Los botones de "¿Cómo llegar?",
// "Subir foto", "Ver más" (regalo) y "Confirmar asistencia" se dejaron sin
// enlace a propósito (sin onclick en el HTML); cuando se use con datos
// reales, cada uno debe apuntar a su Google Maps, carpeta de Drive,
// método de regalo y Google Form correspondientes.

function showDressCode() {
    showToast("Código de vestimenta", "Formal. Con cariño les pedimos reservar el color blanco para la novia.");
}


// Sistema de Toast
function showToast(title, message) {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toastContent');
    
    // textContent: el mensaje puede incluir el nombre que escribe el invitado
    toastContent.innerHTML = '';
    const h = document.createElement('h4');
    h.style.cssText = 'color: hsl(var(--brown)); margin-bottom: 0.35rem;';
    h.textContent = title;
    const pEl = document.createElement('p');
    pEl.style.cssText = 'color: hsl(var(--foreground) / 0.7);';
    pEl.textContent = message;
    toastContent.append(h, pEl);
    clearTimeout(toast._t);

    toast.classList.add('show');
    
    toast._t = setTimeout(() => {
        toast.classList.remove('show');
    }, 4500);
}

/* =========================================================
   MESA DE REGALOS
   ---------------------------------------------------------
   Conexión con Supabase: pega aquí la URL del proyecto y la
   llave pública (Project Settings → API Keys → "Publishable
   key", o la "anon key" en proyectos antiguos). Ambas son
   públicas por diseño; la seguridad está en el SQL
   (supabase-mesa-de-regalos.sql): los invitados solo pueden
   ver qué regalos están tomados y reservar uno libre, nunca
   borrar ni cambiar reservas.

   Mientras estén vacías, la mesa funciona en MODO DE PRUEBA
   (las reservas solo se guardan en el dispositivo).
   ========================================================= */
const SUPABASE_URL = 'https://nsujtmfmyoeibbvwkzez.supabase.co'; // proyecto "Invitavale"
const SUPABASE_PUBLIC_KEY = 'sb_publishable_vngm39TRXt50jchjL2_gGQ_kZIl_n_P';
// Nombre de este evento dentro del proyecto (el mismo proyecto sirve para otras invitaciones)
const GIFT_EVENT = 'boda-rosanna-heriberto';

// Lista de regalos. Los "id" deben coincidir con los del archivo SQL.
const GIFT_CATALOG = [
    { key: 'sala', label: 'Sala / Salón', items: [
        ['sala-alfombra', 'Alfombra decorativa'],
        ['sala-cortinas', 'Cortinas (blackout o livianas)'],
        ['sala-lampara', 'Lámpara de pie o de mesa'],
        ['sala-cuadros', 'Cuadros o decoración de pared'],
        ['sala-almohadas', 'Almohadas decorativas'],
        ['sala-reloj', 'Reloj de pared'],
    ]},
    { key: 'cocina', label: 'Cocina / Comedor', items: [
        ['cocina-vajilla', 'Juego de vajilla'],
        ['cocina-cubiertos', 'Cubiertos'],
        ['cocina-vasos', 'Vasos'],
        ['cocina-ollas', 'Ollas y sartenes'],
        ['cocina-tabla', 'Tabla de picar'],
        ['cocina-utensilios', 'Coladores y utensilios'],
        ['cocina-tuppers', 'Tuppers'],
        ['cocina-mantel', 'Mantel o individuales'],
    ]},
    { key: 'dormitorio', label: 'Dormitorio', items: [
        ['dorm-sabanas', 'Juego de sábanas'],
        ['dorm-edredon', 'Acolchado / edredón'],
        ['dorm-almohadas', 'Almohadas'],
        ['dorm-mantas', 'Mantas'],
        ['dorm-veladores', 'Veladores / lámparas de noche'],
        ['dorm-perchero', 'Perchero u organizador de ropa'],
    ]},
    { key: 'bano', label: 'Baño', items: [
        ['bano-toallas', 'Juegos de toallas'],
        ['bano-alfombra', 'Alfombra de baño'],
        ['bano-cortina', 'Cortina de ducha'],
        ['bano-accesorios', 'Accesorios de baño'],
        ['bano-espejo', 'Espejo decorativo'],
        ['bano-canasto', 'Canasto de ropa'],
    ]},
    { key: 'deco', label: 'Decoración y detalles', items: [
        ['deco-plantas', 'Plantas naturales o artificiales'],
        ['deco-jarrones', 'Jarrones'],
        ['deco-marcos', 'Marcos de fotos'],
        ['deco-velas', 'Velas aromáticas'],
        ['deco-difusores', 'Difusores de aroma'],
        ['deco-cuadros', 'Cuadros personalizados'],
    ]},
    { key: 'electro', label: 'Electrodomésticos', items: [
        ['electro-microondas', 'Microondas'],
        ['electro-horno', 'Horno eléctrico'],
        ['electro-tostadora', 'Tostadora'],
        ['electro-licuadora', 'Licuadora'],
        ['electro-jarra', 'Jarra eléctrica'],
        ['electro-batidora', 'Batidora'],
        ['electro-cafetera', 'Cafetera'],
        ['electro-aire', 'Aire acondicionado o ventilador'],
    ]},
];

const giftState = {
    claimed: new Set(),   // ids reservados por cualquiera
    mine: new Set(),      // ids reservados desde este dispositivo
    filter: 'todos',
    pending: null,        // id que se está por reservar
    timer: null,
};

const GIFT_DEMO = !SUPABASE_URL || !SUPABASE_PUBLIC_KEY;
const LS_MINE = 'mesaRegalos.mine';
const LS_DEMO = 'mesaRegalos.demoClaims';

function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

async function supabaseRpc(fn, body) {
    const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLIC_KEY };
    // Las llaves "anon" antiguas son JWT y también van en Authorization
    if (SUPABASE_PUBLIC_KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + SUPABASE_PUBLIC_KEY;
    const res = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
        method: 'POST', headers, body: JSON.stringify(body || {}),
    });
    if (!res.ok) throw new Error('Supabase ' + res.status);
    return res.json();
}

async function fetchClaimedGifts() {
    if (GIFT_DEMO) return lsGet(LS_DEMO);
    const data = await supabaseRpc('get_claimed_gifts', { p_event: GIFT_EVENT });
    return Array.isArray(data) ? data : [];
}

async function claimGiftRequest(id) {
    if (GIFT_DEMO) {
        const list = lsGet(LS_DEMO);
        if (list.includes(id)) return { ok: false, reason: 'taken' };
        list.push(id); lsSet(LS_DEMO, list);
        return { ok: true };
    }
    return supabaseRpc('claim_gift', { p_event: GIFT_EVENT, p_item_id: id });
}

function giftName(id) {
    for (const c of GIFT_CATALOG) for (const [gid, n] of c.items) if (gid === id) return n;
    return '';
}

function initializeGifts() {
    const modal = document.getElementById('giftsModal');
    const openBtn = document.getElementById('openGifts');
    if (!modal || !openBtn) return;

    giftState.mine = new Set(lsGet(LS_MINE));
    document.getElementById('giftsDemo').hidden = !GIFT_DEMO;

    openBtn.addEventListener('click', openGifts);
    document.getElementById('giftsClose').addEventListener('click', closeGifts);
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || modal.hidden) return;
        if (!document.getElementById('claimSheet').hidden) closeClaim(); else closeGifts();
    });

    // Paso 1 → paso 2: el invitado elige la forma de obsequio
    modal.querySelectorAll('.gift-option').forEach(btn => {
        btn.addEventListener('click', () => selectGiftTab(btn.dataset.tab));
    });
    document.getElementById('giftsBack').addEventListener('click', () => selectGiftTab(null));

    // Filtros por categoría
    const filter = document.getElementById('giftsFilter');
    const chips = [{ key: 'todos', label: 'Todos' }].concat(GIFT_CATALOG.map(c => ({ key: c.key, label: c.label })));
    chips.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gift-chip' + (c.key === 'todos' ? ' is-active' : '');
        b.dataset.key = c.key;
        b.textContent = c.label;
        b.addEventListener('click', () => {
            giftState.filter = c.key;
            filter.querySelectorAll('.gift-chip').forEach(x => x.classList.toggle('is-active', x === b));
            renderGifts();
        });
        filter.appendChild(b);
    });

    // Copiar número de cuenta (una por cada tarjeta)
    modal.querySelectorAll('.copy-account').forEach(btn => {
        btn.addEventListener('click', async () => {
            const num = btn.dataset.number;
            let ok = false;
            try { await navigator.clipboard.writeText(num); ok = true; } catch (e) {
                const t = document.createElement('textarea'); t.value = num; document.body.appendChild(t);
                t.select(); try { ok = document.execCommand('copy'); } catch (er) {} t.remove();
            }
            showToast(ok ? 'Número copiado' : 'Número de cuenta', `Banreservas · ${btn.dataset.holder}: ${num}`);
        });
    });

    // Confirmación
    document.getElementById('claimCancel').addEventListener('click', closeClaim);
    document.getElementById('claimSheet').addEventListener('click', (e) => { if (e.target.id === 'claimSheet') closeClaim(); });
    document.getElementById('claimForm').addEventListener('submit', submitClaim);
    document.getElementById('claimOk').addEventListener('click', closeClaim);

    renderGifts();
}

// tab = 'regalo' | 'efectivo' muestra esa opción; null vuelve a la pregunta
function selectGiftTab(tab) {
    document.getElementById('giftsChoose').hidden = !!tab;
    document.getElementById('giftsBack').hidden = !tab;
    document.getElementById('panelRegalo').hidden = tab !== 'regalo';
    document.getElementById('panelEfectivo').hidden = tab !== 'efectivo';
    document.querySelector('#giftsModal .gifts-sheet').scrollTo({ top: 0 });
    const focusEl = tab ? document.getElementById('giftsBack') : document.querySelector('#giftsModal .gift-option');
    if (focusEl) focusEl.focus({ preventScroll: true });
}

function openGifts() {
    const modal = document.getElementById('giftsModal');
    modal.hidden = false;
    document.body.classList.add('gifts-open');
    requestAnimationFrame(() => modal.classList.add('is-open'));
    selectGiftTab(null); // siempre empieza en la pregunta
    refreshGifts();
    clearInterval(giftState.timer);
    giftState.timer = setInterval(refreshGifts, 20000); // ver reservas de otros invitados
}

function closeGifts() {
    const modal = document.getElementById('giftsModal');
    closeClaim();
    modal.classList.remove('is-open');
    document.body.classList.remove('gifts-open');
    clearInterval(giftState.timer);
    setTimeout(() => { modal.hidden = true; }, 250);
    document.getElementById('openGifts').focus({ preventScroll: true });
}

async function refreshGifts() {
    const count = document.getElementById('giftsCount');
    try {
        giftState.claimed = new Set(await fetchClaimedGifts());
        renderGifts();
    } catch (e) {
        count.textContent = 'No pudimos actualizar la lista. Revise su conexión e intente de nuevo.';
    }
}

function renderGifts() {
    const list = document.getElementById('giftsList');
    const count = document.getElementById('giftsCount');
    list.innerHTML = '';
    let total = 0, free = 0;

    GIFT_CATALOG.forEach(cat => {
        cat.items.forEach(([id]) => { total++; if (!giftState.claimed.has(id)) free++; });
        if (giftState.filter !== 'todos' && giftState.filter !== cat.key) return;

        const group = document.createElement('div');
        group.className = 'gift-group';
        const h = document.createElement('h3');
        h.className = 'gift-group-title';
        h.textContent = cat.label;
        group.appendChild(h);

        const ul = document.createElement('ul');
        ul.className = 'gift-items';
        cat.items.forEach(([id, name]) => {
            const taken = giftState.claimed.has(id);
            const mine = giftState.mine.has(id);
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'gift-item' + (taken ? ' is-taken' : '') + (mine ? ' is-mine' : '');
            b.disabled = taken;
            const n = document.createElement('span'); n.className = 'gift-item-name'; n.textContent = name;
            const s = document.createElement('span'); s.className = 'gift-item-status';
            s.textContent = mine ? 'Reservado por usted' : (taken ? 'Reservado' : 'Elegir');
            b.append(n, s);
            b.setAttribute('aria-label', name + (taken ? ' — ya reservado' : ' — disponible'));
            if (!taken) b.addEventListener('click', () => openClaim(id));
            li.appendChild(b);
            ul.appendChild(li);
        });
        group.appendChild(ul);
        list.appendChild(group);
    });

    count.textContent = free === 0
        ? 'Todos los regalos ya fueron reservados. ¡Muchas gracias!'
        : `${free} de ${total} regalos disponibles`;
}

function openClaim(id) {
    giftState.pending = id;
    document.getElementById('claimItem').textContent = giftName(id);
    const err = document.getElementById('claimError'); err.hidden = true; err.textContent = '';
    document.getElementById('claimAsk').hidden = false;
    document.getElementById('claimDone').hidden = true;
    document.getElementById('claimSubmit').hidden = false;
    document.getElementById('claimCancel').textContent = 'Cancelar';
    document.getElementById('claimSheet').hidden = false;
    setTimeout(() => document.getElementById('claimSubmit').focus(), 50);
}

function closeClaim() {
    document.getElementById('claimSheet').hidden = true;
    giftState.pending = null;
}

async function submitClaim(e) {
    e.preventDefault();
    const id = giftState.pending;
    if (!id) return;
    const err = document.getElementById('claimError');
    const btn = document.getElementById('claimSubmit');
    btn.disabled = true; btn.textContent = 'Confirmando…'; err.hidden = true;
    try {
        const r = await claimGiftRequest(id);
        if (r && r.ok) {
            giftState.claimed.add(id);
            giftState.mine.add(id); lsSet(LS_MINE, Array.from(giftState.mine));
            renderGifts();
            document.getElementById('claimDoneItem').textContent = giftName(id).toLowerCase();
            document.getElementById('claimAsk').hidden = true;
            document.getElementById('claimDone').hidden = false;
            document.getElementById('claimOk').focus();
        } else if (r && r.reason === 'taken') {
            err.textContent = 'Lo sentimos, este regalo acaba de ser elegido por otro invitado. Por favor, elija otro.';
            err.hidden = false; refreshGifts();
            btn.hidden = true;
            const cancel = document.getElementById('claimCancel');
            cancel.textContent = 'Elegir otro'; cancel.focus();
        } else {
            err.textContent = 'No fue posible confirmar el regalo. Por favor, intente de nuevo.';
            err.hidden = false;
        }
    } catch (ex) {
        err.textContent = 'No fue posible conectar. Revise su conexión a internet e intente de nuevo.';
        err.hidden = false;
    } finally {
        btn.disabled = false; btn.textContent = 'Confirmar regalo';
    }
}

/* =========================================================
   Confirmación de asistencia por WhatsApp (809-229-6781)
   Si el enlace trae ?invitados= o ?familia=, el mensaje
   incluye esos nombres para que los novios sepan quién confirma.
   ========================================================= */
const RSVP_WHATSAPP = '18092296781';

function initializeRsvp() {
    const link = document.getElementById('rsvpWhatsapp');
    if (!link) return;
    const params = new URLSearchParams(window.location.search);
    const invitados = (params.get('invitados') || '').split(',').map(s => s.trim()).filter(Boolean);
    const familia = (params.get('familia') || '').trim();

    let msg = 'Confirmo mi asistencia a la boda de Rosanna y Heriberto.';
    if (invitados.length) msg = `Confirmamos nuestra asistencia a la boda de Rosanna y Heriberto. Invitados: ${invitados.join(', ')}.`;
    else if (familia) msg = `Confirmamos nuestra asistencia a la boda de Rosanna y Heriberto. Familia ${familia}.`;
    if (invitados.length === 1) msg = `Confirmo mi asistencia a la boda de Rosanna y Heriberto. ${invitados[0]}.`;

    link.href = `https://wa.me/${RSVP_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/* =========================================================
   Aparición suave al hacer scroll
   Cada bloque sube unos píxeles y aparece al entrar en pantalla;
   los elementos hermanos (p. ej. las partes de una tarjeta) entran
   uno tras otro con un pequeño desfase. Solo ocurre una vez.
   ========================================================= */
function initializeScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const selectors = [
        '.layers .section-title',
        '.layers .section-subtitle',
        '.layers .flor-top',
        '.countdown-container',
        '.event-card > *',
        '.gallery-container > .icon-art',
        '.carousel-container',
        '.carousel-counter',
        '.party-card',
        '.gifts-container > .icon-art',
        '.gifts-container > .btn-wedding',
        '.rsvp-deadline',
        '.icon-whatsapp',
        '.btn-rsvp',
        '.layers .flor-garland',
        '.layers .flor-corner',
        '.guest-section .layer-inner > *',
        '.footer-content > *'
    ];
    const items = Array.from(document.querySelectorAll(selectors.join(',')));
    if (!items.length) return;

    // Desfase entre hermanos: 0, 120, 240... (máx. 5 pasos)
    const counters = new Map();
    items.forEach(el => {
        const parent = el.parentElement;
        const n = counters.get(parent) || 0;
        counters.set(parent, n + 1);
        el.style.setProperty('--reveal-delay', Math.min(n, 5) * 120 + 'ms');
        el.classList.add('reveal');
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    items.forEach(el => io.observe(el));
}
