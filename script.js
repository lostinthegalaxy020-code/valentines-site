// Aktualisierte Logik für:
// - zuverlässige, große Sprünge des NO-Knopfs (bleibt aber mit Mindestabstand zum Viewportrand)
// - NO vermeidet Überlappung mit YES (Mindestabstand wird eingehalten)
// - verhindert, dass die Buttons übereinander landen
// - robustes Verhalten auch nach erstem Klick (keine kleinen Sprünge mehr)
// - sicheres Laden eines Katzenbildes (FALLBACK: eingebettetes SVG als data:URL)
// Nur diese Datei muss ersetzt werden.

document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn  = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const catImg = document.getElementById('catImg');
  const heartsContainer = document.getElementById('hearts');

  // Einstellungen
  const minMargin = 28;    // Abstand von NO zu Viewport-Rand (px)
  const minGap = 20;       // visuelle Mindestdistanz zwischen YES und NO (px)
  const attempts = 80;     // Versuche um eine gültige Position zu finden
  const minJump = 160;     // minimale Distanz (px) die NO bei einem Sprung von vorheriger Position entfernt sein soll
  const autoCloseMs = 8000;

  let lastNoPos = null;    // {left, top} zuletzt gesetzte NO-Position (viewport-Koordinaten)
  let yesRelPos = null;    // YES-Position relativ zum Container (px)
  let yesRect = null;
  let noRect = null;
  let autoCloseTimer = null;

  // eingebettetes SVG-Fallback (kleine, niedliche Katze) -> sehr zuverlässig
  const catSVG = `
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 420'>
    <defs>
      <linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ffd7ea"/><stop offset="1" stop-color="#ffb3d6"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g transform="translate(80,40)" stroke="#ab2a6a" stroke-width="4" fill="#fff">
      <ellipse cx="220" cy="210" rx="110" ry="110" fill="#fff"/>
      <path d="M150 80 C170 10, 90 10, 120 80 Z" fill="#fff"/>
      <path d="M290 80 C310 10, 370 10, 340 80 Z" fill="#fff"/>
      <circle cx="190" cy="200" r="10" fill="#333"/>
      <circle cx="250" cy="200" r="10" fill="#333"/>
      <path d="M210 235 Q230 255 250 235" stroke="#e85c9b" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M170 260 Q220 310 270 260" fill="#ffd6e8" stroke="none" opacity="0.9"/>
    </g>
    <text x="50%" y="95%" font-family="Helvetica, Arial, sans-serif" font-size="24" text-anchor="middle" fill="#6b2a57">Du machst mich so glücklich! 🥰</text>
  </svg>`.trim();

  function setCatFallback(){
    try {
      // URL-encode the svg, set as data URL
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(catSVG);
      if (catImg) catImg.src = dataUrl;
    } catch (err) {
      // Silently ignore - im schlimmsten Fall bleibt das img leer
      console.warn('Fehler beim Setzen des eingebetteten Katzen-SVGs:', err);
    }
  }

  // Berechne und setze initiale Positionen: YES absolut innerhalb des .buttons Containers,
  // NO als fixed (damit über gesamten Viewport springen kann).
  function initPositions(){
    // YES: absolut relativ zum buttonsWrap
    yesBtn.style.position = 'absolute';
    noBtn.style.position = 'fixed';

    // Stelle sicher, dass YES mindestens padding vom linken Rand hat und vertikal zentriert in Buttons-Container
    const parentRect = buttonsWrap.getBoundingClientRect();

    // set temporary left/top to measure YES natural size correctly
    yesBtn.style.left = '';
    yesBtn.style.top = '';

    // kleine Verzögerung nicht nötig — DOM ist ready; messen
    const yesSize = yesBtn.getBoundingClientRect();
    const yesLeft = Math.max(8, Math.floor(parentRect.width * 0.12));
    const yesTop = Math.max(8, Math.floor((parentRect.height - yesSize.height) / 2));

    // Setze relative Pixelwerte (relativ zur Container)
    yesBtn.style.left = `${yesLeft}px`;
    yesBtn.style.top  = `${yesTop}px`;

    // Update globale YES-Rect (viewport coords)
    yesRect = yesBtn.getBoundingClientRect();
    yesRelPos = { left: yesRect.left - parentRect.left, top: yesRect.top - parentRect.top, width: yesRect.width, height: yesRect.height };

    // NO initial: rechts neben Card / innerhalb Margin
    noRect = noBtn.getBoundingClientRect();
    const initialLeft = Math.min(window.innerWidth - noRect.width - minMargin, Math.floor(window.innerWidth * 0.72));
    const initialTop  = Math.min(window.innerHeight - noRect.height - minMargin, Math.floor(yesRect.top + (yesRect.height - noRect.height)/2));
    const left = Math.max(minMargin, initialLeft);
    const top  = Math.max(minMargin, initialTop);

    noBtn.style.left = `${left}px`;
    noBtn.style.top  = `${top}px`;
    lastNoPos = { left, top };

    // re-measure
    noRect = noBtn.getBoundingClientRect();
  }

  // Hilfsfunktion: euklidische Distanz zwischen Mittelpunkten zweier Rechtecke
  function centerDistance(ax, ay, aw, ah, bx, by, bw, bh){
    const acx = ax + aw/2, acy = ay + ah/2;
    const bcx = bx + bw/2, bcy = by + bh/2;
    const dx = acx - bcx, dy = acy - bcy;
    return Math.sqrt(dx*dx + dy*dy);
  }

  // Finde gültige NO-Position über den ganzen Viewport:
  // - innerhalb minMargin von Rändern
  // - Abstand zu YES mindestens requiredDist
  // - Distanz zu letzter NO-Position >= minJump (sofern möglich), damit Sprünge groß bleiben
  // - bevorzugt gegenüberliegende Seite von YES (macht große Sprünge)
  function findValidNoPosition(){
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();

    const maxLeft = window.innerWidth - noRect.width - minMargin;
    const maxTop  = window.innerHeight - noRect.height - minMargin;
    const minLeft = minMargin;
    const minTop  = minMargin;

    const requiredDist = Math.max((yesRect.width + noRect.width)/2 + minGap, 140);

    // bestimme bevorzugte X-Zone: wenn YES links ist, wollen wir NO eher rechts und umgekehrt
    const yesCenterX = yesRect.left + yesRect.width / 2;
    const preferRight = yesCenterX < window.innerWidth / 2;

    // Versuche zufällige Positionen, die groß genug springen
    let bestCandidate = null;
    let bestScore = -Infinity;
    for (let i = 0; i < attempts; i++){
      // Bias: wähle entweder weit links oder weit rechts, selten mittig
      const zoneChoice = Math.random();
      let left;
      if (zoneChoice < 0.46) {
        // linke Zone (biased)
        left = Math.floor(minLeft + Math.random() * Math.max(1, Math.floor(window.innerWidth * 0.32) - minLeft));
      } else if (zoneChoice < 0.92) {
        // rechte Zone (biased)
        left = Math.floor(Math.max(minLeft, Math.floor(window.innerWidth * 0.68)) + Math.random() * Math.max(1, maxLeft - Math.floor(window.innerWidth * 0.68)));
      } else {
        // mittig
        left = Math.floor(minLeft + Math.random() * Math.max(1, maxLeft - minLeft));
      }

      const top = Math.floor(minTop + Math.random() * Math.max(1, maxTop - minTop));

      const distToYes = centerDistance(left, top, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);

      // dist to last NO (if exist)
      let distToLastNo = Infinity;
      if (lastNoPos) {
        const dx = (left + noRect.width/2) - (lastNoPos.left + noRect.width/2);
        const dy = (top + noRect.height/2) - (lastNoPos.top + noRect.height/2);
        distToLastNo = Math.sqrt(dx*dx + dy*dy);
      }

      // Score: belohne größere Entfernung zu YES & größere Entfernung zu letztem NO & bevorzugte Seite
      let score = distToYes + 0.6 * distToLastNo;
      // prefer side
      const candidateOnRight = (left + noRect.width/2) > window.innerWidth / 2;
      if ((preferRight && candidateOnRight) || (!preferRight && !candidateOnRight)) score += 50;

      // akzeptiere wenn distToYes >= requiredDist und distToLastNo >= minJump (wenn möglich)
      if (distToYes >= requiredDist && (distToLastNo >= minJump || !lastNoPos)) {
        return { left: Math.min(Math.max(left, minLeft), maxLeft), top: Math.min(Math.max(top, minTop), maxTop) };
      }

      // Merke besten Kandidaten für Fallback
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { left, top, distToYes, distToLastNo };
      }
    }

    // Fallbacks: Ecken (prüfe, ob eine Ecke ausreichend weit von YES ist)
    const corners = [
      { left: minLeft, top: minTop },
      { left: maxLeft, top: minTop },
      { left: minLeft, top: maxTop },
      { left: maxLeft, top: maxTop },
    ];
    for (const p of corners) {
      const d = centerDistance(p.left, p.top, noRect.width, noRect.height, yesRect.left, yesRect.top, yesRect.width, yesRect.height);
      if (d >= requiredDist) return p;
    }

    // Wenn nichts perfekt, wähle besten Kandidaten aus Random-Versuchen
    if (bestCandidate) {
      const left = Math.min(Math.max(bestCandidate.left, minLeft), maxLeft);
      const top  = Math.min(Math.max(bestCandidate.top, minTop), maxTop);
      return { left, top };
    }

    // Letzte Rettung: kleine Anpassung der aktuellen Position
    const curLeft = parseInt(noBtn.style.left || minLeft, 10) || minLeft;
    const curTop  = parseInt(noBtn.style.top || minTop, 10) || minTop;
    const newLeft = Math.min(Math.max(curLeft + (Math.random() < 0.5 ? -minJump/2 : minJump/2), minLeft), maxLeft);
    const newTop  = Math.min(Math.max(curTop + (Math.random() < 0.5 ? -minJump/3 : minJump/3), minTop), maxTop);
    return { left: newLeft, top: newTop };
  }

  // Führt die Bewegung aus und merkt die Position als letzte Position
  function moveNoButton(){
    const target = findValidNoPosition();
    // setzen
    noBtn.style.left = `${target.left}px`;
    noBtn.style.top  = `${target.top}px`;
    lastNoPos = { left: target.left, top: target.top };
  }

  // Events: hover, touchstart, click -> move
  noBtn.addEventListener('mouseenter', () => {
    moveNoButton();
  }, { passive: true });

  noBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); // verhindert sofortigen Klick
    moveNoButton();
  }, { passive: false });

  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // spring sofort an neue große Position
    moveNoButton();
  });

  // YES: overlay mit katze + herz-Animation, overlay schließt bei tap/click oder nach Timeout
  yesBtn.addEventListener('click', () => {
    showOverlayWithCat();
    spawnHearts(28);
  });

  function showOverlayWithCat(){
    // ensure cat image is set (fallback wenn externe Quelle nicht geladen ist)
    if (catImg && (!catImg.src || catImg.naturalWidth === 0)) {
      setCatFallback();
    }
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(hideOverlay, autoCloseMs);
  }

  overlay.addEventListener('click', () => {
    hideOverlay();
  });

  function hideOverlay(){
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    heartsContainer.innerHTML = '';
    clearTimeout(autoCloseTimer);
  }

  // Herzpartikel wie zuvor (kleine optische Spielerei)
  function spawnHearts(count = 20){
    for (let i=0;i<count;i++){
      const h = document.createElement('div');
      h.className = 'heartParticle';
      const size = 12 + Math.random()*22;
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;
      h.style.left = `${50 + (Math.random()-0.5)*60}%`;
      h.style.top = `${60 + Math.random()*20}%`;
      h.style.opacity = String(0.7 + Math.random()*0.3);
      heartsContainer.appendChild(h);
      const duration = 1800 + Math.random()*2400;
      h.animate([
        { transform: `translateY(0) scale(1) rotate(${Math.random()*40-20}deg)`, opacity: h.style.opacity },
        { transform: `translateY(-240px) scale(1.2) rotate(${Math.random()*80-40}deg)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'cubic-bezier(.2,.9,.3,1)',
        iterations: 1,
        fill: 'forwards'
      });
      setTimeout(()=> h.remove(), duration + 60);
    }
  }

  // Füge CSS für Herzpartikel (falls noch nicht vorhanden)
  (function addHeartStyles(){
    if (document.getElementById('__heartStyles')) return;
    const s = document.createElement('style');
    s.id = '__heartStyles';
    s.textContent = `
    .heartParticle{
      position:absolute;
      pointer-events:none;
      background: radial-gradient(circle at 30% 30%, #fff 0%, rgba(255,255,255,0) 40%), linear-gradient(180deg, #ff7abf 0%, #ff2a8a 100%);
      transform-origin:center center;
      clip-path: path('M12 2c-1.7 0-3.2.9-4 2.3C6.2 2.9 4.7 2 3 2 0 2-1 6 1.2 8.8 5.2 13.4 12 18 12 18s6.8-4.6 10.8-9.2C25 6 24 2 21 2c-1.7 0-3.2.9-4 2.3C15.2 2.9 13.7 2 12 2z');
      filter: drop-shadow(0 6px 14px rgba(230,77,130,0.14));
      border-radius: 6px;
    }`;
    document.head.appendChild(s);
  })();

  // Initialisierung ausführen
  setCatFallback(); // stellt sicher, dass ein Bild verfügbar ist, falls externes nicht lädt
  initPositions();

  // Bei Resize: YES innerhalb Container neu positionieren, NO in Bounds halten
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initPositions();
      // NO innerhalb Viewport-Rand halten
      const nr = noBtn.getBoundingClientRect();
      const maxLeft = Math.max(minMargin, window.innerWidth - nr.width - minMargin);
      const maxTop  = Math.max(minMargin, window.innerHeight - nr.height - minMargin);
      let left = parseInt(noBtn.style.left || minMargin, 10);
      let top  = parseInt(noBtn.style.top || minMargin, 10);
      left = Math.min(Math.max(left, minMargin), maxLeft);
      top  = Math.min(Math.max(top, minMargin), maxTop);
      noBtn.style.left = `${left}px`;
      noBtn.style.top  = `${top}px`;
      lastNoPos = { left, top };
    }, 120);
  });

  // Sicherheitsnetz: falls Bild extern angegeben ist und nicht geladen wurde, bei error fallback setzen
  if (catImg) {
    catImg.addEventListener('error', () => setCatFallback());
    // falls external src schon gesetzt, versuchen wir das externe laden; falls es fehlschlägt, wird error-Handler aktiv
  }
});
