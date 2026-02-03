document.addEventListener('DOMContentLoaded', () => {
  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const buttonsWrap = document.getElementById('buttons');
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('closeBtn');
  const heartsContainer = document.getElementById('hearts');

  let parentRect = null;
  let yesRect = null;
  let noRect = null;

  const minGap = 16; // minimaler Abstand zwischen Buttons in px
  const padding = 8; // Abstand zum Container-Rand

  // initial setup: position both buttons absolutely inside the container
  function setInitialPositions(){
    parentRect = buttonsWrap.getBoundingClientRect();

    // reset any inline positioning so we can measure natural sizes
    yesBtn.style.left = '';
    yesBtn.style.top = '';
    noBtn.style.left = '';
    noBtn.style.top = '';
    yesBtn.style.position = 'absolute';
    noBtn.style.position = 'absolute';

    // measure button sizes (after CSS adjustments)
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();

    // vertical center
    const centerY = Math.max(padding, (parentRect.height - yesRect.height) / 2);

    // place YES on the left-ish, NO on the right-ish
    const yesLeft = Math.max(padding, Math.floor(parentRect.width * 0.12));
    const noLeft = Math.min(parentRect.width - noRect.width - padding, Math.floor(parentRect.width * 0.72));

    yesBtn.style.left = `${yesLeft}px`;
    yesBtn.style.top = `${centerY}px`;

    noBtn.style.left = `${noLeft}px`;
    noBtn.style.top = `${centerY}px`;

    // re-measure after setting positions
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();
  }

  // compute a valid new position for NO that doesn't overlap YES
  function findValidNoPosition(attempts = 30){
    parentRect = buttonsWrap.getBoundingClientRect();
    yesRect = yesBtn.getBoundingClientRect();
    noRect = noBtn.getBoundingClientRect();

    const maxLeft = parentRect.width - noRect.width - padding;
    const maxTop  = parentRect.height - noRect.height - padding;
    const minLeft = padding;
    const minTop  = padding;

    // compute minimal center distance to avoid visually overlapping
    const requiredDist = Math.max((yesRect.width + noRect.width) / 2 + minGap, 90);

    for (let i = 0; i < attempts; i++) {
      // bias positions towards edges for playful movement
      const left = Math.floor(minLeft + Math.random() ** 0.9 * (maxLeft - minLeft));
      const top  = Math.floor(minTop + (Math.random() - 0.5) * 18 + (parentRect.height - noRect.height) / 2);

      // compute centers relative to viewport (we'll compare)
      const candidateCenterX = parentRect.left + left + noRect.width / 2;
      const candidateCenterY = parentRect.top + top + noRect.height / 2;

      const yesCenterX = yesRect.left + yesRect.width / 2;
      const yesCenterY = yesRect.top + yesRect.height / 2;

      const dx = candidateCenterX - yesCenterX;
      const dy = candidateCenterY - yesCenterY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist >= requiredDist) {
        return {left, top};
      }
    }

    // fallback: try forced positions at corners (left/top/right)
    const fallbacks = [
      { left: minLeft, top: minTop },
      { left: maxLeft, top: minTop },
      { left: minLeft, top: maxTop },
      { left: maxLeft, top: maxTop },
    ];
    for (const p of fallbacks) {
      const candidateCenterX = parentRect.left + p.left + noRect.width / 2;
      const yesCenterX = yesRect.left + yesRect.width / 2;
      const dx = candidateCenterX - yesCenterX;
      const dy = (parentRect.top + p.top + noRect.height / 2) - (yesRect.top + yesRect.height / 2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist >= requiredDist) return p;
    }

    // last resort: stay where it is
    return { left: parseInt(noBtn.style.left || 0, 10), top: parseInt(noBtn.style.top || 0, 10) };
  }

  // move NO button to a valid position with animation
  function moveNoButton(){
    // compute target
    const target = findValidNoPosition();
    // apply
    noBtn.style.left = `${target.left}px`;
    noBtn.style.top  = `${target.top}px`;
  }

  // event handlers
  noBtn.addEventListener('mouseenter', () => {
    moveNoButton();
  }, {passive:true});

  noBtn.addEventListener('touchstart', (e) => {
    // prevent immediate click if touch moves it
    e.preventDefault();
    moveNoButton();
  }, {passive:false});

  // On click, move away instead of accepting the NO
  noBtn.addEventListener('click', (e) => {
    e.preventDefault();
    moveNoButton();
  });

  // YES behavior unchanged: show overlay + hearts
  yesBtn.addEventListener('click', () => {
    showOverlay();
    spawnHearts(24);
  });

  closeBtn.addEventListener('click', () => {
    hideOverlay();
  });

  function showOverlay(){
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideOverlay(){
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    heartsContainer.innerHTML = '';
  }

  // hearts (same as before)
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
      const duration = 2200 + Math.random()*2000;
      h.animate([
        { transform: `translateY(0) scale(1) rotate(${Math.random()*40-20}deg)`, opacity: h.style.opacity },
        { transform: `translateY(-220px) scale(1.2) rotate(${Math.random()*80-40}deg)`, opacity: 0 }
      ], {
        duration: duration,
        easing: 'ease-out',
        iterations: 1,
        fill: 'forwards'
      });
      setTimeout(()=> h.remove(), duration + 60);
    }
  }

  // create CSS for heart particles
  (function addHeartStyles(){
    const s = document.createElement('style');
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

  // initialize positions once DOM + fonts ready
  setInitialPositions();

  // recompute positions on resize to avoid layout issues
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setInitialPositions();
    }, 120);
  });
});
