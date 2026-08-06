/* Browsers restore the previous scroll position on a plain reload by
   default, so refreshing mid-scroll re-lands wherever you were instead of
   the hero at the top. Opt out, and only keep the current position when
   the URL actually asks for a section (e.g. index.html#objects). */
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (!window.location.hash) {
  window.scrollTo(0, 0);
}
/* Safari can restore scroll position later than this (e.g. via bfcache),
   after this script has already run — catch that case too. */
window.addEventListener('pageshow', () => {
  if (!window.location.hash) window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {

  /* ---- one viewport-height source for Chrome / Safari / Firefox ---- */
  const root = document.documentElement;
  let viewportFrame = 0;

  const syncViewportHeight = () => {
    viewportFrame = 0;
    const height = Math.round(document.documentElement.clientHeight);
    root.style.setProperty('--app-height', `${height}px`);
    root.style.setProperty('--app-height-115', `${Math.round(height * 1.15)}px`);
    root.style.setProperty('--app-vh', `${height / 100}px`);
    document.querySelectorAll('.scroll-pin').forEach((pin) => {
      const slides = Number.parseFloat(getComputedStyle(pin).getPropertyValue('--slides')) || 1;
      const multiplier = window.innerWidth <= 768 ? 0.65 : 0.9;
      pin.style.height = `${Math.round(slides * multiplier * height)}px`;
    });
  };

  const requestViewportSync = () => {
    if (!viewportFrame) {
      viewportFrame = requestAnimationFrame(syncViewportHeight);
    }
  };

  window.addEventListener('resize', requestViewportSync);
  window.addEventListener('orientationchange', requestViewportSync);
  window.visualViewport?.addEventListener('resize', requestViewportSync);
  syncViewportHeight();
  document.fonts?.ready.then(requestViewportSync);

  /* ---- restrained wheel / trackpad smoothing ---- */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  let smoothTargetY = window.scrollY;
  let smoothCurrentY = window.scrollY;
  let smoothFrame = 0;
  let smoothWriting = false;
  const pageScrollEase = 0.11;
  const pageScrollMaxStep = 180;

  const maxScrollY = () => Math.max(
    0,
    document.documentElement.scrollHeight - document.documentElement.clientHeight
  );
  const clampScrollY = (value) => Math.max(0, Math.min(maxScrollY(), value));

  const stopSmoothScroll = () => {
    if (smoothFrame) cancelAnimationFrame(smoothFrame);
    smoothFrame = 0;
    smoothCurrentY = window.scrollY;
    smoothTargetY = window.scrollY;
  };

  const paintSmoothScroll = () => {
    const difference = smoothTargetY - smoothCurrentY;
    const step = Math.sign(difference) * Math.min(
      Math.abs(difference) * pageScrollEase,
      pageScrollMaxStep
    );
    smoothCurrentY += step;

    if (Math.abs(difference) < 0.35) {
      smoothCurrentY = smoothTargetY;
    }

    smoothWriting = true;
    window.scrollTo(0, smoothCurrentY);
    smoothWriting = false;

    if (smoothCurrentY !== smoothTargetY) {
      smoothFrame = requestAnimationFrame(paintSmoothScroll);
    } else {
      smoothFrame = 0;
    }
  };

  const startSmoothScroll = () => {
    if (!smoothFrame) {
      smoothCurrentY = window.scrollY;
      smoothFrame = requestAnimationFrame(paintSmoothScroll);
    }
  };

  const smoothScrollTo = (top) => {
    const destination = clampScrollY(top);
    if (reducedMotion.matches) {
      window.scrollTo({ top: destination, left: 0, behavior: 'auto' });
      return;
    }
    if (!finePointer.matches) {
      window.scrollTo({ top: destination, left: 0, behavior: 'smooth' });
      return;
    }
    smoothTargetY = destination;
    startSmoothScroll();
  };

  const canNativeScroll = (start, deltaY) => {
    let element = start instanceof Element ? start : null;
    while (element && element !== document.body) {
      const style = getComputedStyle(element);
      const scrollable = /(auto|scroll)/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 1;
      if (scrollable) {
        const canMoveUp = deltaY < 0 && element.scrollTop > 0;
        const canMoveDown = deltaY > 0 &&
          element.scrollTop + element.clientHeight < element.scrollHeight - 1;
        if (canMoveUp || canMoveDown) return true;
      }
      element = element.parentElement;
    }
    return false;
  };

  window.addEventListener('wheel', (event) => {
    if (
      reducedMotion.matches ||
      !finePointer.matches ||
      event.ctrlKey ||
      document.body.style.overflow === 'hidden' ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
      canNativeScroll(event.target, event.deltaY)
    ) {
      return;
    }

    if (event.cancelable) event.preventDefault();
    const unit = event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? document.documentElement.clientHeight
        : 1;
    const delta = Math.max(-240, Math.min(240, event.deltaY * unit));
    const origin = smoothFrame ? smoothTargetY : window.scrollY;
    const candidate = clampScrollY(origin + delta);
    smoothTargetY = Math.max(
      window.scrollY - 1200,
      Math.min(window.scrollY + 1200, candidate)
    );
    startSmoothScroll();
  }, { passive: false });

  window.addEventListener('scroll', () => {
    if (!smoothFrame && !smoothWriting) {
      smoothCurrentY = window.scrollY;
      smoothTargetY = window.scrollY;
    }
  }, { passive: true });

  reducedMotion.addEventListener?.('change', () => {
    stopSmoothScroll();
  });

  /* ---- preloader ---- */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('is-done'), 400);
  });

  /* ---- header contrast follows the section beneath it ---- */
  const siteHeader = document.getElementById('siteHeader');
  const ivorySurfaces = Array.from(document.querySelectorAll(
    '.places-after, .objects, .updates, .admission, .site-footer__mountain, .site-footer__card'
  ));
  let headerThemeFrame = 0;

  const updateHeaderTheme = () => {
    headerThemeFrame = 0;
    const probeY = siteHeader ? Math.max(1, siteHeader.offsetHeight * 0.5) : 40;
    const isOnIvory = ivorySurfaces.some((surface) => {
      const rect = surface.getBoundingClientRect();
      return rect.top <= probeY && rect.bottom > probeY;
    });
    siteHeader?.classList.toggle('is-on-ivory', isOnIvory);
  };

  const requestHeaderTheme = () => {
    if (!headerThemeFrame) {
      headerThemeFrame = requestAnimationFrame(updateHeaderTheme);
    }
  };

  window.addEventListener('scroll', requestHeaderTheme, { passive: true });
  window.addEventListener('resize', requestHeaderTheme);
  updateHeaderTheme();

  /* ---- custom cursor ---- */
  const cursor = document.querySelector('.cursor-dot');
  if (cursor && matchMedia('(hover:hover)').matches) {
    window.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
    document.querySelectorAll('a, button, input, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  /* ---- directional stone light ---- */
  const heroStone = document.querySelector('.hero__stone');
  if (heroStone && matchMedia('(hover:hover)').matches) {
    heroStone.addEventListener('pointerenter', () => {
      heroStone.classList.add('is-lit');
    });
    heroStone.addEventListener('pointermove', (e) => {
      const rect = heroStone.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      heroStone.style.setProperty('--stone-glow-x', `${x}%`);
      heroStone.style.setProperty('--stone-glow-y', `${y}%`);
    });
    heroStone.addEventListener('pointerleave', () => {
      heroStone.classList.remove('is-lit');
    });
  }

  /* ---- original-style hero exit motion ---- */
  const heroSection = document.getElementById('hero');
  if (heroSection && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let heroProgress = 0;
    let heroProgressTarget = 0;
    let heroMotionFrame = 0;

    const paintHeroMotion = () => {
      heroProgress += (heroProgressTarget - heroProgress) * 0.14;
      if (Math.abs(heroProgressTarget - heroProgress) < 0.001) {
        heroProgress = heroProgressTarget;
      }

      const viewportHeight = document.documentElement.clientHeight;
      heroSection.style.setProperty('--side-drop', `${heroProgress * viewportHeight * 0.1}px`);
      heroSection.style.setProperty('--left-rotation', `${-8 + heroProgress * 38}deg`);
      heroSection.style.setProperty('--right-rotation', `${8 - heroProgress * 38}deg`);
      const stoneBaseScale = window.innerWidth <= 768 ? 1.28 : 1.35;
      heroSection.style.setProperty('--stone-scroll-scale', stoneBaseScale * (1 - heroProgress * 0.5));
      heroSection.style.setProperty('--stone-anchor-shift', `${heroStone.offsetHeight * stoneBaseScale * heroProgress * 0.25}px`);
      heroSection.style.setProperty('--stone-darkness', Math.max(0, -0.5 + heroProgress * 1.5));

      if (heroProgress !== heroProgressTarget) {
        heroMotionFrame = requestAnimationFrame(paintHeroMotion);
      } else {
        heroMotionFrame = 0;
      }
    };

    const updateHeroMotion = () => {
      const rect = heroSection.getBoundingClientRect();
      const viewportHeight = document.documentElement.clientHeight;
      heroProgressTarget = Math.max(0, Math.min(1, -rect.top / viewportHeight));
      if (!heroMotionFrame) heroMotionFrame = requestAnimationFrame(paintHeroMotion);
    };

    window.addEventListener('scroll', updateHeroMotion, { passive: true });
    window.addEventListener('resize', updateHeroMotion);
    updateHeroMotion();
  }

  /* ---- original-style Places scatter / focus / exit ---- */
  let requestPlacesRepaint = null;
  let requestPlacesAmbientRecalc = null;
  const placesStory = document.getElementById('placesScroll');
  if (placesStory && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const placesCarousel = placesStory.querySelector('.places__carousel');
    const placesSlides = placesCarousel.querySelector('.places__slides');
    const placesBaseSlidesHeight = placesSlides.offsetHeight;
    const placesStatement = placesStory.querySelector('.places__statement');
    const ambientMotion = [
      ['.places__ambient--top', 0, -65, 'top'],
      ['.places__ambient--right-top', 55, -12, 'rightTop'],
      ['.places__ambient--right-bottom', 55, 18, 'rightTop'],
      ['.places__ambient--bottom', 0, 65, 'bottom'],
      ['.places__ambient--left-bottom', -55, 18, 'leftTop'],
      ['.places__ambient--left-top', -55, -12, 'leftTop']
    ].map(([selector, x, y, group]) => ({
      el: placesStory.querySelector(selector), x, y, group
    }));
    let placesMotionFrame = 0;

    /* Exact 16px gap from the main photo (static, unscrolled state) ----
       The ambient photos keep their size/spacing from each other purely
       via CSS grid (grid-gap already gives clean 16px where tracks
       touch), but the main photo isn't part of that grid — it's sized
       and centered independently — so no fixed grid line can land it
       exactly 16px away at every viewport width. This measures the
       CSS-native (un-scattered) boxes and stores the pixel delta each
       outer group needs, folded into the scatter transform below so
       there's only one thing writing `transform` on these elements. */
    const ambientNudge = { leftTop: { x: 0 }, rightTop: { x: 0 }, top: { y: 0 }, bottom: { y: 0 } };
    const computeAmbientNudge = () => {
      ambientMotion.forEach(({ el }) => { if (el) el.style.transform = 'none'; });
      const mainRect = placesSlides.getBoundingClientRect();
      const GAP = 16;

      /* The main box is landscape-shaped, but a portrait photo inside it
         (object-fit: contain) leaves transparent letterbox margin on the
         left/right — gapping off the box's own edge left a visible gap
         to the actual photo pixels. Shrink the target left/right in by
         that margin so the ambient photos land next to what's actually
         visible, not the invisible box. */
      const activeImg = placesCarousel.querySelector('.places__slide.is-active .places__slide-original');
      let visibleLeft = mainRect.left;
      let visibleRight = mainRect.right;
      if (activeImg && activeImg.naturalWidth && activeImg.naturalHeight) {
        const boxAspect = mainRect.width / mainRect.height;
        const imgAspect = activeImg.naturalWidth / activeImg.naturalHeight;
        if (imgAspect < boxAspect) {
          const visibleWidth = mainRect.height * imgAspect;
          const margin = (mainRect.width - visibleWidth) / 2;
          visibleLeft = mainRect.left + margin;
          visibleRight = mainRect.right - margin;
        }
      }

      const leftTopEl = placesStory.querySelector('.places__ambient--left-top');
      const rightTopEl = placesStory.querySelector('.places__ambient--right-top');
      const topEl = placesStory.querySelector('.places__ambient--top');
      const bottomEl = placesStory.querySelector('.places__ambient--bottom');
      if (leftTopEl) ambientNudge.leftTop.x = (visibleLeft - GAP) - leftTopEl.getBoundingClientRect().right;
      if (rightTopEl) ambientNudge.rightTop.x = (visibleRight + GAP) - rightTopEl.getBoundingClientRect().left;
      if (topEl) ambientNudge.top.y = (mainRect.top - GAP) - topEl.getBoundingClientRect().bottom;
      if (bottomEl) ambientNudge.bottom.y = (mainRect.bottom + GAP) - bottomEl.getBoundingClientRect().top;
      /* "top" also has to stay exactly 16px left of "right-top" — which
         just moved to clear the main photo — so nudge its X independently
         of its Y (already tied to the main photo above). The two axes
         don't conflict; only the old fixed grid position couldn't do both. */
      if (topEl && rightTopEl) {
        const rightTopNewLeft = rightTopEl.getBoundingClientRect().left + ambientNudge.rightTop.x;
        ambientNudge.top.x = (rightTopNewLeft - GAP) - topEl.getBoundingClientRect().right;
      }
    };

    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const smoothstep = (value) => value * value * (3 - 2 * value);

    const paintPlacesMotion = () => {
      placesMotionFrame = 0;
      const rect = placesStory.getBoundingClientRect();
      const scrollable = placesStory.offsetHeight - document.documentElement.clientHeight;
      const progress = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;
      const expansion = smoothstep(clamp01(progress / 0.28));
      const shrinking = smoothstep(clamp01((progress - 0.68) / 0.32));

      const activeSlideEl = placesCarousel.querySelector('.places__slide.is-active');
      const activeOriginalImg = activeSlideEl?.querySelector('.places__slide-original');
      if (activeOriginalImg) {
        const slideIndex = Array.from(placesCarousel.querySelectorAll('.places__slide')).indexOf(activeSlideEl);
        const zoomAmounts = [0.22, 0.5, 0.4];
        const zoomAmount = zoomAmounts[slideIndex] ?? 0.5;
        const panAmounts = [0, -22, 0];
        const panPercent = (panAmounts[slideIndex] ?? 0) * shrinking;
        activeOriginalImg.style.transform = `translateX(calc(-50% + ${panPercent}%)) scale(${1 + shrinking * zoomAmount})`;
      }

      ambientMotion.forEach(({ el, x, y, group }) => {
        if (!el) return;
        const yOffset = y * expansion * document.documentElement.clientHeight / 100;
        const nudge = ambientNudge[group] || {};
        const nudgeX = nudge.x || 0;
        const nudgeY = nudge.y || 0;
        el.style.transform = `translate3d(calc(${x * expansion}vw + ${nudgeX}px), calc(${yOffset}px + ${nudgeY}px), 0)`;
        el.style.opacity = 1 - expansion;
      });

      const carouselWidth = placesCarousel.offsetWidth;
      const availableWidth = placesStory.clientWidth;
      const coverScale = availableWidth / carouselWidth;
      const expandedScale = 1 + expansion * (coverScale - 1);

      /* The reveal image's own background is transparent (no boxed look
         while it's on full display), but that means the arched top the
         box grows during shrink has nothing to show it against — fade a
         backing color in behind it only as it actually shrinks/arches. */
      placesSlides.style.backgroundColor = `rgba(36,35,36,${shrinking})`;

      /* Real width/height (not a transform:scale) so object-fit measures
         the box's true final shape each frame — a non-uniform scaleX/
         scaleY transform would otherwise stretch the photo unevenly once
         it's cropped into the tall, narrow arch. */
      /* Leave real room for the statement text beside the photo — without
         this cap the photo alone can grow to fill nearly the whole
         viewport, leaving nowhere for the text to sit but on top of it. */
      const maxExpandedWidth = Math.max(300, availableWidth - 480);
      const expandedWidth = Math.min(carouselWidth * expandedScale, maxExpandedWidth);
      const expandedHeight = placesBaseSlidesHeight * expandedScale;
      const finalWidth = Math.min(carouselWidth, Math.max(220, Math.min(320, availableWidth * 0.16)));
      const finalHeight = Math.min(placesBaseSlidesHeight * 1.2, Math.max(340, Math.min(520, document.documentElement.clientHeight * 0.45)));
      const currentWidth = expandedWidth + shrinking * (finalWidth - expandedWidth);
      const currentHeight = expandedHeight + shrinking * (finalHeight - expandedHeight);
      placesSlides.style.width = `${currentWidth}px`;
      placesSlides.style.height = `${currentHeight}px`;

      /* Derive the leftward shift from the box's own current width rather
         than a fixed rem value tied only to `expansion` — a fixed value
         can't know how wide the box actually got partway through growing,
         so it used to under-shift mid-transition and let the box's right
         edge run under the (still narrow) text. Shifting by exactly
         however much is needed to clear the reserved text space keeps
         them apart at every frame, not just at the start and end. */
      const naturalRight = availableWidth / 2 + currentWidth / 2;
      const safeMaxRight = availableWidth - 480;
      /* Scale by expansion so the shift is 0 in the resting/unscrolled
         state (main photo stays perfectly centered) and only grows in as
         the text actually fades into view — otherwise this fired even at
         expansion 0 whenever the box's plain width alone left less than
         the reserved text space, nudging everything left before there
         was any text to make room for. */
      const requiredShift = expansion * Math.max(0, naturalRight - safeMaxRight);
      placesCarousel.style.setProperty('--places-shift-x', `${-requiredShift}px`);

      placesCarousel.style.setProperty('--places-center-y', `${48.5 + expansion * 1.5}%`);
      placesCarousel.style.setProperty(
        '--places-radius-top-x',
        shrinking > 0 ? `${shrinking * 50}%` : '.4rem'
      );
      placesCarousel.style.setProperty(
        '--places-radius-top-y',
        shrinking > 0 ? `${shrinking * 28}%` : '.4rem'
      );
      placesCarousel.style.setProperty(
        '--places-radius-bottom',
        `${0.4 * (1 - shrinking)}rem`
      );

      /* Read the photo's edges only after every layout-affecting style
         above has been applied this frame — reading them any earlier
         would measure last frame's (stale) box and let the text overlap
         the photo while it's quickly growing/shrinking. */
      if (placesStatement) {
        placesStatement.style.opacity = expansion;
        placesStatement.style.pointerEvents = expansion > 0.5 ? 'auto' : 'none';
        const stickyEl = placesStatement.offsetParent;
        if (stickyEl) {
          const stickyRect = stickyEl.getBoundingClientRect();
          const slidesRect = placesSlides.getBoundingClientRect();
          const photoBottom = stickyRect.bottom - slidesRect.bottom;
          const photoRight = slidesRect.right - stickyRect.left;
          /* Cap how far right the text can sit so it can never run past
             the viewport edge and get clipped — once the photo grows wide
             enough to leave no room after it, the text backs off in front
             of it instead of overflowing. */
          const maxLeft = stickyRect.width - placesStatement.offsetWidth - 32;
          placesStatement.style.top = 'auto';
          placesStatement.style.bottom = `${photoBottom}px`;
          placesStatement.style.left = `${Math.min(photoRight + 12, maxLeft)}px`;
          placesStatement.style.right = 'auto';
          placesStatement.style.transform = 'none';
        }
      }
    };

    const updatePlacesMotion = () => {
      if (!placesMotionFrame) {
        placesMotionFrame = requestAnimationFrame(paintPlacesMotion);
      }
    };
    requestPlacesRepaint = updatePlacesMotion;

    const handlePlacesResize = () => {
      paintPlacesMotion();
      computeAmbientNudge();
      paintPlacesMotion();
    };
    /* Each photo has its own natural aspect ratio, so the transparent
       margin (and therefore where the ambient photos need to land) is
       different per photo — recompute whenever the active slide changes,
       not just on resize, or switching to a differently-shaped photo
       leaves the old photo's gap baked in. */
    requestPlacesAmbientRecalc = handlePlacesResize;

    window.addEventListener('scroll', updatePlacesMotion, { passive: true });
    window.addEventListener('resize', handlePlacesResize);
    /* Main box has no CSS width of its own (it's set entirely by JS
       below) — paint once first so it has real dimensions to measure,
       then compute the gap nudge against that, then paint again so the
       nudge actually gets applied to the ambient photos' transform. */
    paintPlacesMotion();
    computeAmbientNudge();
    paintPlacesMotion();
  }

  /* ---- elastic cursor trail ----
     A chain of points chases the pointer with easing (each point
     eases toward the one before it), producing a springy line that
     lags behind fast mouse movement. The line fades out shortly
     after the pointer stops moving. */
  const trailCanvas = document.getElementById('cursorTrail');
  if (trailCanvas && matchMedia('(hover:hover)').matches) {
    const ctx = trailCanvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const POINT_COUNT = 22;
    const HEAD_EASE = 0.42;
    const CHAIN_EASE = 0.32;
    const FADE_DELAY = 80;
    const FADE_DURATION = 550;

    let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    let lastMoveAt = performance.now();
    let hasMoved = false;
    const trail = Array.from({ length: POINT_COUNT }, () => ({ x: mouse.x, y: mouse.y }));

    const resizeTrail = () => {
      trailCanvas.width = innerWidth * DPR;
      trailCanvas.height = innerHeight * DPR;
      trailCanvas.style.width = innerWidth + 'px';
      trailCanvas.style.height = innerHeight + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resizeTrail();
    window.addEventListener('resize', resizeTrail);

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      lastMoveAt = performance.now();
      hasMoved = true;
    });

    let trailFrame = 0;

    const drawTrail = () => {
      const idle = performance.now() - lastMoveAt;
      const opacity = hasMoved ? Math.max(0, 1 - Math.max(0, idle - FADE_DELAY) / FADE_DURATION) : 0;

      trail[0].x += (mouse.x - trail[0].x) * HEAD_EASE;
      trail[0].y += (mouse.y - trail[0].y) * HEAD_EASE;
      for (let i = 1; i < POINT_COUNT; i++) {
        trail[i].x += (trail[i - 1].x - trail[i].x) * CHAIN_EASE;
        trail[i].y += (trail[i - 1].y - trail[i].y) * CHAIN_EASE;
      }

      ctx.clearRect(0, 0, innerWidth, innerHeight);

      if (opacity > 0.01) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#fffff0';
        for (let i = 0; i < POINT_COUNT - 1; i++) {
          const t = i / (POINT_COUNT - 1);
          ctx.globalAlpha = opacity * (1 - t);
          ctx.lineWidth = Math.max(0.5, 2.6 * (1 - t));
          ctx.beginPath();
          ctx.moveTo(trail[i].x, trail[i].y);
          ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      if (opacity > 0.01 || idle < FADE_DELAY + FADE_DURATION) {
        trailFrame = requestAnimationFrame(drawTrail);
      } else {
        trailFrame = 0;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    };

    window.addEventListener('mousemove', () => {
      if (!trailFrame) trailFrame = requestAnimationFrame(drawTrail);
    });
  }

  /* ---- fullscreen menu ---- */
  const menuToggle = document.getElementById('menuToggle');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');
  const menuX = document.getElementById('menuX');

  const openMenu = () => {
    stopSmoothScroll();
    menuOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    menuOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
    stopSmoothScroll();
  };
  menuToggle.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menuX.addEventListener('click', closeMenu);
  menuOverlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  /* ---- reveal on scroll ---- */
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));

  /* ---- scroll-driven pinned carousel (Places / Objects) ----
     Mirrors the original's pinned-scroll sections: the wrapper is
     N * viewport-height tall, its inner panel is position:sticky,
     and scroll position within that tall wrapper drives the active
     slide — same effect as the source's scroll-jacked panels,
     without reimplementing its WebGL/scroll-lock engine. */
  function initScrollCarousel({
    wrapperId, slideSel, countEl, nameEl, names, prevBtn, nextBtn,
    progressStart = 0, progressEnd = 1, lockToFirst = false, autoplayMs = 0, onChange
  }) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const slides = Array.from(wrapper.querySelectorAll(slideSel));
    if (!slides.length) return;
    let current = -1;
    let ticking = false;

    const setActive = (i) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (i === current) return;
      if (current >= 0) slides[current].classList.remove('is-active');
      current = i;
      slides[current].classList.add('is-active');
      if (countEl) countEl.textContent = `${current + 1} / ${slides.length}`;
      if (nameEl && names) nameEl.textContent = names[current] || names[0];
      /* The active slide can change on its own (autoplay), independent of
         scroll — anything that repaints per-slide effects (like Places'
         zoom) only runs on scroll/resize otherwise, so it'd miss this. */
      onChange?.(current);
    };

    /* lockToFirst: scrolling never advances the slide — it only stays on
       slide 0 while the pinned box grows/shrinks. Browsing other slides is
       then only possible via the prev/next buttons, not by scrolling. */
    if (lockToFirst) {
      setActive(0);

      let autoplayTimer = null;
      const startAutoplay = () => {
        if (!autoplayMs || slides.length < 2) return;
        clearInterval(autoplayTimer);
        autoplayTimer = setInterval(() => {
          setActive((current + 1) % slides.length);
        }, autoplayMs);
      };
      startAutoplay();

      if (prevBtn) prevBtn.addEventListener('click', () => { setActive(current - 1); startAutoplay(); });
      if (nextBtn) nextBtn.addEventListener('click', () => { setActive(current + 1); startAutoplay(); });
      return;
    }

    const updateFromScroll = () => {
      ticking = false;
      const rect = wrapper.getBoundingClientRect();
      const scrollable = wrapper.offsetHeight - document.documentElement.clientHeight;
      if (scrollable <= 0) { setActive(0); return; }
      const rawProgress = Math.max(0, Math.min(1, -rect.top / scrollable));
      const progress = Math.max(0, Math.min(1,
        (rawProgress - progressStart) / (progressEnd - progressStart)
      ));
      setActive(Math.round(progress * (slides.length - 1)));
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(updateFromScroll); }
    };

    const scrollToIndex = (i) => {
      i = Math.max(0, Math.min(slides.length - 1, i));
      const scrollable = wrapper.offsetHeight - document.documentElement.clientHeight;
      const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
      const slideProgress = slides.length <= 1 ? 0 : i / (slides.length - 1);
      const adjustedProgress = progressStart + slideProgress * (progressEnd - progressStart);
      const targetY = wrapperTop + (scrollable <= 0 ? 0 : adjustedProgress * scrollable);
      smoothScrollTo(targetY);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateFromScroll);
    updateFromScroll();

    if (prevBtn) prevBtn.addEventListener('click', () => scrollToIndex(current - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => scrollToIndex(current + 1));
  }

  /* ---- PORT / FOLIO split motion across the pinned Objects story ---- */
  const objectsScroll = document.getElementById('objectsScroll');
  const portfolioTitle = objectsScroll?.querySelector('.objects__portfolio-title');
  const portfolioSlides = Array.from(objectsScroll?.querySelectorAll('.objects__slide') || []);
  const portfolioSlidesCanvas = objectsScroll?.querySelector('.objects__slides');
  const portfolioMergeDetails = objectsScroll?.querySelector('.objects__merge-details');
  const objectMergeName = document.getElementById('objectMergeName');
  const objectMergeCount = document.getElementById('objectMergeCount');
  const objectsButterflyGradient = document.getElementById('objectsButterflyGradient');
  const objectsButterflyPath = objectsScroll?.querySelector('.objects__butterfly-path');
  let portfolioMotionFrame = 0;

  const objectRevealWindows = [[.1, .5], [.2, .6], [.4, .8], [.3, .7]];
  const objectGridOrder = [1, 3, 2, 0];
  const objectSequenceBase = [-2, -1, 0, 1];
  const objectSequenceSlot = [1, 2, 3, 0];
  const objectNames = [
    'AI IN_APP',
    'EYEUM',
    'MARSHALL',
    'VINER'
  ];
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const rotateRight = (values, amount) => {
    const offset = ((amount % values.length) + values.length) % values.length;
    return values.slice(values.length - offset).concat(values.slice(0, values.length - offset));
  };

  const updatePortfolioMotion = () => {
    portfolioMotionFrame = 0;
    if (!objectsScroll || !portfolioTitle) return;

    const rect = objectsScroll.getBoundingClientRect();
    const scrollable = objectsScroll.offsetHeight - document.documentElement.clientHeight;
    const progress = scrollable > 0
      ? Math.max(0, Math.min(1, -rect.top / scrollable))
      : 0;

    /* The reference uses two independent sticky stories: 40% reveal, 60% stack. */
    const revealProgress = clamp01(progress / .4);
    const stackProgress = clamp01((progress - .4) / .6);
    const isStack = progress >= .4;
    const travel = window.innerWidth <= 600 ? 92 : 78;
    const cardSpacing = window.innerWidth <= 600 ? 23 : 20;

    portfolioTitle.style.setProperty('--portfolio-progress', revealProgress.toFixed(4));
    portfolioTitle.style.setProperty('--portfolio-shift-left', `${-travel * revealProgress}vw`);
    portfolioTitle.style.setProperty('--portfolio-shift-right', `${travel * revealProgress}vw`);
    portfolioTitle.style.setProperty('--portfolio-scale', Math.max(.18, 1 - revealProgress * .82).toFixed(4));
    portfolioTitle.style.visibility = isStack ? 'hidden' : 'visible';
    portfolioSlidesCanvas?.classList.toggle('is-card-stack', isStack);
    objectsButterflyPath?.classList.toggle('is-visible', isStack);

    let sequenceStep = 0;
    let localProgress = 0;
    if (stackProgress < .2) {
      localProgress = stackProgress / .2;
    } else if (stackProgress < .4) {
      sequenceStep = 1;
      localProgress = (stackProgress - .2) / .2;
    } else if (stackProgress < .6) {
      sequenceStep = 2;
      localProgress = (stackProgress - .4) / .2;
    } else {
      sequenceStep = 3;
      localProgress = (stackProgress - .6) / .4;
    }

    const sequenceValues = rotateRight(objectSequenceBase, sequenceStep);
    portfolioSlides.forEach((slide, index) => {
      if (!isStack) {
        const [start, end] = objectRevealWindows[index];
        const local = clamp01((revealProgress - start) / (end - start));
        const gridPosition = objectGridOrder[index] - 1.5;
        /* At exactly 0 opacity these are still GPU-composited (transform +
           will-change), which can leak faint rectangular seams in Chromium.
           visibility:hidden fully drops them from painting until they
           actually start fading in. */
        slide.style.visibility = local > 0.001 ? 'visible' : 'hidden';
        slide.style.setProperty('--object-card-opacity', Math.min(1, local * 2).toFixed(4));
        slide.style.setProperty('--object-card-shift', `${(gridPosition * cardSpacing).toFixed(4)}vw`);
        slide.style.setProperty('--object-card-y', `${(2 - local * 4).toFixed(4)}vh`);
        slide.style.setProperty('--object-card-scale', (.5 + local / 2).toFixed(4));
        slide.style.setProperty('--object-card-layer', String(index + 1));
      } else {
        const sequenceOrder = sequenceValues[objectSequenceSlot[index]];
        const depth = Math.abs(sequenceOrder);
        slide.style.visibility = 'visible';
        slide.style.setProperty('--object-card-opacity', '1');
        slide.style.setProperty('--object-card-shift', '0vw');
        slide.style.setProperty('--object-card-y', `${sequenceOrder * 12}vh`);
        slide.style.setProperty('--object-card-scale', (Math.max(.72, 1 - depth / 8) * 1.12).toFixed(4));
        slide.style.setProperty('--object-card-layer', String(sequenceOrder === 1 ? 0 : 20 - depth));
      }
      slide.style.setProperty('--object-card-rotate', '0deg');
    });

    if (portfolioMergeDetails) {
      const detailsProgress = clamp01(stackProgress / .12);
      portfolioMergeDetails.style.setProperty('--merge-details-opacity', detailsProgress.toFixed(4));
      portfolioMergeDetails.classList.toggle('is-visible', isStack);
    }
    if (objectMergeName && objectMergeCount) {
      objectMergeName.textContent = objectNames[sequenceStep];
      objectMergeCount.textContent = `${sequenceStep + 1}/4`;
      objectMergeCount.style.setProperty('--object-local-progress', clamp01(localProgress).toFixed(4));
    }
    if (objectsButterflyGradient) {
      objectsButterflyGradient.setAttribute('gradientTransform', `rotate(${stackProgress * 360} .5 .5)`);
    }
  };

  const requestPortfolioMotion = () => {
    if (!portfolioMotionFrame) {
      portfolioMotionFrame = requestAnimationFrame(updatePortfolioMotion);
    }
  };

  window.addEventListener('scroll', requestPortfolioMotion, { passive: true });
  window.addEventListener('resize', requestPortfolioMotion);
  updatePortfolioMotion();

  /* ---- click a grid card to open that object's own detail page ---- */
  const objectPageIds = ['viner', 'ai-in-app', 'eyeum', 'marshall'];
  portfolioSlides.forEach((slide, index) => {
    const id = objectPageIds[index];
    if (!id) return;
    slide.addEventListener('click', () => {
      window.location.href = `object.html?id=${id}`;
    });
  });

  initScrollCarousel({
    wrapperId: 'placesScroll',
    slideSel: '.places__slide',
    prevBtn: document.getElementById('placePrev'),
    nextBtn: document.getElementById('placeNext'),
    countEl: document.getElementById('placeCount'),
    nameEl: document.getElementById('placeName'),
    names: ['Self Portrait', 'Self Portrait II', 'Self Portrait III'],
    lockToFirst: true,
    autoplayMs: 4000,
    onChange: () => requestPlacesAmbientRecalc ? requestPlacesAmbientRecalc() : requestPlacesRepaint?.()
  });

  /* ---- updates pager ---- */
  const pagerItems = document.querySelectorAll('.updates__pager li');
  const mainImg = document.querySelector('.updates__card--main img');
  const mainTag = document.querySelector('.updates__col--main .updates__tag');
  const mainHeadline = document.querySelector('.updates__col--main .updates__headline');
  const mainText = document.querySelector('.updates__col--main p');
  pagerItems.forEach(li => {
    li.addEventListener('click', () => {
      pagerItems.forEach(i => i.classList.remove('is-active'));
      li.classList.add('is-active');
      if (mainImg) mainImg.src = li.dataset.img;
      if (mainTag) mainTag.textContent = li.dataset.tag;
      if (mainHeadline) mainHeadline.innerHTML = li.dataset.headline;
      if (mainText) mainText.textContent = li.dataset.text;
    });
  });

  /* ---- admission form ---- */
  const form = document.getElementById('admissionForm');
  const success = document.getElementById('admissionSuccess');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      success.classList.add('is-visible');
      form.reset();
    });
  }

  /* ---- smooth in-page nav ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          smoothScrollTo(target.getBoundingClientRect().top + window.scrollY);
        }
      }
    });
  });
});
