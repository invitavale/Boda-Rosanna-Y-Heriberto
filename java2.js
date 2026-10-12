// Variables globales
let isPlaying = false;
let currentSlide = 0;
const totalSlides = 6;
let enableMusic = false;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeCountdown();
    initializeCarousel();
    initializeModal();
    initializeParallax();
    initializeGuestGreeting();
    initializeLayers(); // después del saludo: depende de si la sección de invitados se muestra
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

// Modal de bienvenida + música de fondo (archivo local musica.mp3).
// El botón "Ingresar con música" es el detonador: play() se llama dentro
// del mismo toque del usuario, que es lo que exigen iOS Safari y Chrome
// para permitir audio.
function initializeModal() {
    const enterWithMusic = document.getElementById('enterWithMusic');
    const enterWithoutMusic = document.getElementById('enterWithoutMusic');
    const modal = document.getElementById('welcomeModal');
    const audio = document.getElementById('bgMusic');
    const playerBox = document.getElementById('musicPlayer');
    const musicToggle = document.getElementById('musicToggle');

    if (audio) {
        audio.volume = 0.7;
        audio.addEventListener('play', () => { isPlaying = true; updateMusicIcon(); });
        audio.addEventListener('pause', () => { isPlaying = false; updateMusicIcon(); });
    }

    // Safari (iPhone/Mac) solo permite sonido si play() se llama en el
    // mismo instante del toque: por eso va PRIMERO, antes de tocar el DOM.
    enterWithMusic.addEventListener('click', function() {
        playMusic();
        enableMusic = true;
        modal.style.display = 'none';
        playerBox.style.display = 'block';
    });

    enterWithoutMusic.addEventListener('click', function() {
        enableMusic = false;
        modal.style.display = 'none';
        // El botón flotante queda disponible por si luego quieren escucharla
        playerBox.style.display = 'block';
        if (audio) audio.pause();
        updateMusicIcon();
    });

    musicToggle.addEventListener('click', toggleMusic);
}

function playMusic() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;
    audio.muted = false;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
        p.catch(() => {
            isPlaying = false;
            updateMusicIcon();
            showToast('Música de fondo', 'Toque el ícono de música, arriba a la derecha, para escucharla.');
        });
    }
}

function toggleMusic() {
    const audio = document.getElementById('bgMusic');
    if (!audio) return;
    if (audio.paused) playMusic(); else audio.pause();
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
   leer nombres ni borrar reservas.

   Mientras estén vacías, la mesa funciona en MODO DE PRUEBA
   (las reservas solo se guardan en el dispositivo).
   ========================================================= */
const SUPABASE_URL = '';        // ej.: 'https://abcdxyz.supabase.co'
const SUPABASE_PUBLIC_KEY = ''; // ej.: 'sb_publishable_...' o 'eyJhbGci...'

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
    const data = await supabaseRpc('get_claimed_gifts');
    return Array.isArray(data) ? data : [];
}

async function claimGiftRequest(id, name) {
    if (GIFT_DEMO) {
        const list = lsGet(LS_DEMO);
        if (list.includes(id)) return { ok: false, reason: 'taken' };
        list.push(id); lsSet(LS_DEMO, list);
        return { ok: true };
    }
    return supabaseRpc('claim_gift', { p_item_id: id, p_guest_name: name });
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
    const sheet = document.getElementById('claimSheet');
    sheet.hidden = false;
    const input = document.getElementById('claimName');
    try { input.value = localStorage.getItem('mesaRegalos.name') || ''; } catch (e) {}
    setTimeout(() => input.focus(), 50);
}

function closeClaim() {
    document.getElementById('claimSheet').hidden = true;
    giftState.pending = null;
}

async function submitClaim(e) {
    e.preventDefault();
    const id = giftState.pending;
    const input = document.getElementById('claimName');
    const err = document.getElementById('claimError');
    const btn = document.getElementById('claimSubmit');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) {
        err.textContent = 'Por favor, escriba su nombre para reservar el regalo.';
        err.hidden = false; input.focus(); return;
    }
    btn.disabled = true; btn.textContent = 'Reservando…'; err.hidden = true;
    try {
        const r = await claimGiftRequest(id, name);
        if (r && r.ok) {
            giftState.claimed.add(id);
            giftState.mine.add(id); lsSet(LS_MINE, Array.from(giftState.mine));
            try { localStorage.setItem('mesaRegalos.name', name); } catch (er) {}
            closeClaim(); renderGifts();
            showToast('¡Muchas gracias!', `${giftName(id)} quedó reservado a nombre de ${name}.`);
        } else if (r && r.reason === 'taken') {
            err.textContent = 'Lo sentimos, este regalo acaba de ser reservado por otro invitado. Por favor, elija otro.';
            err.hidden = false; refreshGifts();
        } else {
            err.textContent = 'No fue posible completar la reserva. Por favor, intente de nuevo.';
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
