(() => {
  const TOTAL_FRAMES = 240;
  const FRAME_PATH = (index) =>
    `imagenes-bolso/ezgif-frame-${String(index).padStart(3, "0")}.webp`;

  const hero = document.getElementById("hero");
  const canvas = document.getElementById("bagCanvas");
  const fallbackImg = document.getElementById("bagFallback");

  if (!hero || !canvas || !fallbackImg) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const frames = new Array(TOTAL_FRAMES + 1);
  const loaded = new Array(TOTAL_FRAMES + 1).fill(false);

  let heroActive = true;
  let rafId = 0;
  let targetFrame = 1;
  let renderedFrame = 1;
  let heroTop = 0;
  let heroHeight = 1;
  let ticking = false;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFrame(Math.round(renderedFrame));
  }

  function drawFrame(index) {
    const image = frames[index];
    if (!image || !loaded[index]) return;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;

    context.clearRect(0, 0, cw, ch);

    const imageRatio = image.naturalWidth / image.naturalHeight;
    const canvasRatio = cw / ch;

    let drawWidth = cw;
    let drawHeight = ch;
    let dx = 0;
    let dy = 0;

    if (imageRatio > canvasRatio) {
      drawHeight = cw / imageRatio;
      dy = (ch - drawHeight) / 2;
    } else {
      drawWidth = ch * imageRatio;
      dx = (cw - drawWidth) / 2;
    }

    context.drawImage(image, dx, dy, drawWidth, drawHeight);
  }

  function animate() {
    if (!heroActive || prefersReducedMotion) {
      rafId = 0;
      return;
    }

    renderedFrame += (targetFrame - renderedFrame) * 0.16;
    const next = Math.round(renderedFrame);

    if (Math.abs(targetFrame - renderedFrame) < 0.02) {
      renderedFrame = targetFrame;
    }

    drawFrame(next);

    if (Math.abs(targetFrame - renderedFrame) > 0.01) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = 0;
    }
  }

  function requestTick() {
    if (!rafId) rafId = requestAnimationFrame(animate);
  }

  function updateHeroMetrics() {
    const rect = hero.getBoundingClientRect();
    heroTop = window.scrollY + rect.top;
    heroHeight = Math.max(hero.offsetHeight - window.innerHeight * 0.8, 1);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updateTargetFromScroll() {
    if (prefersReducedMotion) {
      targetFrame = 1;
      drawFrame(1);
      return;
    }

    const scroll = window.scrollY - heroTop + window.innerHeight * 0.2;
    const progress = clamp(scroll / heroHeight, 0, 1);
    targetFrame = 1 + progress * (TOTAL_FRAMES - 1);
    requestTick();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateTargetFromScroll();
      ticking = false;
    });
  }

  function loadFrame(index, priority = "auto") {
    if (frames[index]) return;

    const img = new Image();
    if (priority !== "auto") img.fetchPriority = priority;
    img.decoding = "async";

    img.onload = () => {
      loaded[index] = true;
      if (index === 1) {
        fallbackImg.style.display = "none";
        resizeCanvas();
        drawFrame(1);
      }
    };

    img.src = FRAME_PATH(index);
    frames[index] = img;
  }

  function preloadSequence() {
    const initialBurst = [
      1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160, 192, 224,
      240,
    ];
    initialBurst.forEach((index, i) => {
      loadFrame(index, i < 3 ? "high" : "auto");
    });

    const loadRest = () => {
      for (let i = 1; i <= TOTAL_FRAMES; i += 1) {
        loadFrame(i);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadRest, { timeout: 1500 });
    } else {
      setTimeout(loadRest, 180);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        heroActive = entry.isIntersecting;
        if (heroActive) {
          updateTargetFromScroll();
        }
      });
    },
    { threshold: 0 },
  );

  observer.observe(hero);

  let resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateHeroMetrics();
      resizeCanvas();
      updateTargetFromScroll();
    }, 100);
  }

  updateHeroMetrics();
  loadFrame(1, "high");
  preloadSequence();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });

  if (prefersReducedMotion) {
    loadFrame(1, "high");
    return;
  }

  updateTargetFromScroll();
})();
