const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const body = document.body;
const header = document.querySelector('.site-header');
const cursor = document.querySelector('.cursor');
const progressBar = document.querySelector('.scroll-rail i');
const menuButton = document.querySelector('.menu-button');
const menuOverlay = document.querySelector('.menu-overlay');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sections = [...document.querySelectorAll('main > section')];
let lastScroll = 0;
let scrollTicking = false;
let practiceIndex = 0;
let objectIndex = 0;

const scrollFlow = document.querySelector('.scroll-flow');
const sizeScrollFlow = () => {
  if (scrollFlow) scrollFlow.style.height = `${document.documentElement.scrollHeight}px`;
};
window.addEventListener('load', sizeScrollFlow);
window.addEventListener('resize', sizeScrollFlow);
requestAnimationFrame(sizeScrollFlow);

const trailCanvas = document.querySelector('.cursor-trail');
if (trailCanvas && !reduceMotion) {
  const trailContext = trailCanvas.getContext('2d');
  const trailPoints = [];
  const trailLifetime = 1100;
  let smoothX = null;
  let smoothY = null;
  let targetX = null;
  let targetY = null;
  let velocityX = 0;
  let velocityY = 0;
  let lastMoveTime = 0;

  const resizeTrail = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    trailCanvas.width = Math.round(window.innerWidth * ratio);
    trailCanvas.height = Math.round(window.innerHeight * ratio);
    trailContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  window.addEventListener('resize', resizeTrail);
  window.addEventListener('pointermove', event => {
    targetX = event.clientX;
    targetY = event.clientY;
    lastMoveTime = performance.now();
    if (smoothX === null) {
      smoothX = targetX;
      smoothY = targetY;
    }
  });

  const drawTrail = now => {
    if (targetX !== null) {
      velocityX += (targetX - smoothX) * .105;
      velocityY += (targetY - smoothY) * .105;
      velocityX *= .79;
      velocityY *= .79;
      smoothX += velocityX;
      smoothY += velocityY;

      const lastPoint = trailPoints[trailPoints.length - 1];
      const isSettling = Math.hypot(targetX - smoothX, targetY - smoothY) > .25 || Math.hypot(velocityX, velocityY) > .18;
      if ((now - lastMoveTime < 100 || isSettling) && (!lastPoint || Math.hypot(smoothX - lastPoint.x, smoothY - lastPoint.y) > 1.4)) {
        trailPoints.push({ x: smoothX, y: smoothY, time: now });
      }
    }

    while (trailPoints.length && now - trailPoints[0].time > trailLifetime) trailPoints.shift();
    trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    trailContext.lineCap = 'round';
    trailContext.lineJoin = 'round';
    trailContext.shadowBlur = 2;
    trailContext.shadowColor = 'rgba(243,237,228,.2)';

    for (let index = 2; index < trailPoints.length; index += 1) {
      const previous = trailPoints[index - 2];
      const control = trailPoints[index - 1];
      const point = trailPoints[index];
      const opacity = Math.max(0, 1 - (now - control.time) / trailLifetime);
      const startX = (previous.x + control.x) / 2;
      const startY = (previous.y + control.y) / 2;
      const endX = (control.x + point.x) / 2;
      const endY = (control.y + point.y) / 2;
      trailContext.beginPath();
      trailContext.moveTo(startX, startY);
      trailContext.quadraticCurveTo(control.x, control.y, endX, endY);
      trailContext.lineWidth = .35 + opacity * 1.15;
      trailContext.strokeStyle = `rgba(243,237,228,${opacity * .52})`;
      trailContext.stroke();
    }
    requestAnimationFrame(drawTrail);
  };

  resizeTrail();
  requestAnimationFrame(drawTrail);
}

document.querySelectorAll('[data-split-lines]').forEach(element => {
  [...element.children].forEach(line => {
    line.innerHTML = `<span class="line-mask"><span class="line-inner">${line.innerHTML}</span></span>`;
  });
});

function finishIntro() {
  body.classList.add('is-ready');
  window.setTimeout(() => body.classList.remove('is-loading'), reduceMotion ? 0 : 2050);
}

if (reduceMotion) finishIntro();
else {
  const counter = document.querySelector('.loader em');
  const start = performance.now();
  const count = now => {
    const value = Math.min(100, Math.round((now - start) / 11));
    counter.textContent = String(value).padStart(2, '0');
    if (value < 100) requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  window.setTimeout(finishIntro, 1250);
}

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .12, rootMargin: '0px 0px -4% 0px' });

document.querySelectorAll('.reveal-up, .reveal-clip, .reveal-arch, [data-split-lines]').forEach(element => revealObserver.observe(element));

const practiceSlides = [...document.querySelectorAll('.practice-slide')];
const practiceDots = [...document.querySelectorAll('.practice-dots button')];
const practiceNames = ['아이음', '마샬', '와인 커뮤니티'];
const practiceName = document.querySelector('#practiceName');
const practiceNumber = document.querySelector('#practiceNumber');

function setPractice(index) {
  index = clamp(index, 0, practiceSlides.length - 1);
  if (index === practiceIndex) return;
  const previous = practiceIndex;
  practiceIndex = index;
  practiceSlides[previous].classList.remove('is-active');
  practiceSlides[previous].classList.add('was-active');
  practiceSlides[index].classList.remove('was-active');
  requestAnimationFrame(() => practiceSlides[index].classList.add('is-active'));
  practiceDots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
  practiceName.style.opacity = '0';
  practiceName.style.transform = 'translateY(12px)';
  window.setTimeout(() => {
    practiceName.textContent = practiceNames[index];
    practiceNumber.textContent = index + 1;
    practiceName.style.opacity = '';
    practiceName.style.transform = '';
  }, 250);
  window.setTimeout(() => practiceSlides[previous].classList.remove('was-active'), 1100);
}
practiceDots.forEach((dot, index) => dot.addEventListener('click', () => setPractice(index)));

const objectCards = [...document.querySelectorAll('.object-card')];
const objectLabels = ['A signal, tuned together', 'A relation, held in space', 'A table, kept in conversation'];
const objectLabel = document.querySelector('#objectLabel');
const objectNumber = document.querySelector('#objectNumber');

function setObject(index) {
  index = clamp(index, 0, objectCards.length - 1);
  if (index === objectIndex) return;
  const previous = objectIndex;
  objectIndex = index;
  objectCards[previous].classList.remove('is-active');
  objectCards[previous].classList.add('was-active');
  objectCards[index].classList.remove('was-active');
  requestAnimationFrame(() => objectCards[index].classList.add('is-active'));
  objectLabel.textContent = objectLabels[index];
  objectNumber.textContent = index + 1;
  window.setTimeout(() => objectCards[previous].classList.remove('was-active'), 1100);
}

const aboutSlides = [...document.querySelectorAll('.about-feature-slide')];
const aboutNumber = document.querySelector('#aboutNumber');
const aboutSection = document.querySelector('.about-gallery');
const aboutFeature = document.querySelector('.about-feature');
const aboutTiles = [...document.querySelectorAll('.about-tile')];
const aboutHeading = document.querySelector('.about-heading');
const aboutKicker = document.querySelector('.about-kicker');
const aboutArchCaption = document.querySelector('#aboutArchCaption');
const aboutArchNumber = document.querySelector('#aboutArchNumber');
let aboutIndex = 0;
let aboutSlideStarted = performance.now();

function setAboutSlide(nextIndex) {
  const next = (nextIndex + aboutSlides.length) % aboutSlides.length;
  if (next === aboutIndex) return;
  const previous = aboutIndex;
  aboutIndex = next;
  aboutSlides[previous].classList.remove('is-active');
  aboutSlides[previous].classList.add('was-active');
  aboutSlides[next].classList.remove('was-active');
  requestAnimationFrame(() => aboutSlides[next].classList.add('is-active'));
  aboutNumber.textContent = next + 1;
  aboutArchNumber.textContent = next + 1;
  aboutArchCaption.textContent = aboutSlides[next].querySelector('figcaption').textContent;
  aboutSlideStarted = performance.now();
  window.setTimeout(() => aboutSlides[previous].classList.remove('was-active'), 1100);
}

document.querySelector('#aboutPrev').addEventListener('click', () => setAboutSlide(aboutIndex - 1));
document.querySelector('#aboutNext').addEventListener('click', () => setAboutSlide(aboutIndex + 1));

function sectionProgress(section) {
  const travel = section.offsetHeight - window.innerHeight;
  return travel > 0 ? clamp((window.scrollY - section.offsetTop) / travel) : 0;
}

const practiceSection = document.querySelector('.practices');
const outcomesSection = document.querySelector('.outcomes');
const heroSection = document.querySelector('.hero');
const heroMaterial = document.querySelector('.hero-material');
const heroCards = [...document.querySelectorAll('.hero-card')];
const floatingImages = [...document.querySelectorAll('.floating-image')];
const parallaxMedia = [...document.querySelectorAll('.connection-media img, .people-arch img')];
const peopleSection = document.querySelector('.people');
const peopleGhost = document.querySelector('.people-ghost');
const peopleArch = document.querySelector('.people-arch');
const peoplePaths = [...document.querySelectorAll('.people-path')];

if (heroMaterial) {
  heroMaterial.addEventListener('pointerenter', () => heroMaterial.classList.add('is-lit'));
  heroMaterial.addEventListener('pointermove', event => {
    const bounds = heroMaterial.getBoundingClientRect();
    const lightX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const lightY = ((event.clientY - bounds.top) / bounds.height) * 100;
    heroMaterial.style.setProperty('--light-x', `${clamp(lightX, 0, 100)}%`);
    heroMaterial.style.setProperty('--light-y', `${clamp(lightY, 0, 100)}%`);
  });
  heroMaterial.addEventListener('pointerleave', () => heroMaterial.classList.remove('is-lit'));
}

function splitHoverText(element) {
  if (element.querySelector('.hover-chars')) return;
  const text = element.textContent.trim();
  element.textContent = '';
  const holder = document.createElement('span');
  holder.className = 'hover-chars';
  [...text].forEach((char, index) => {
    const span = document.createElement('i');
    span.className = 'hover-char';
    span.dataset.char = char === ' ' ? '\u00a0' : char;
    span.style.setProperty('--char-delay', `${Math.abs(index - (text.length - 1) / 2) * .03}s`);
    span.textContent = char === ' ' ? '\u00a0' : char;
    holder.append(span);
  });
  element.append(holder);
}

document.querySelectorAll('.site-header nav > a, .context-link').forEach(splitHoverText);

function updateScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.height = `${max > 0 ? y / max * 100 : 0}%`;
  header.classList.toggle('scrolled', y > 35);
  header.classList.toggle('is-hidden', y > lastScroll && y > 180 && !body.classList.contains('menu-open'));

  const centerY = y + 60;
  const activeSection = sections.find(section => centerY >= section.offsetTop && centerY < section.offsetTop + section.offsetHeight);
  const isLight = activeSection?.classList.contains('light-section');
  header.style.color = isLight ? '#171412' : '#f0eadf';
  document.querySelector('.scroll-rail').style.color = isLight ? '#171412' : '#f0eadf';

  const heroTravel = Math.max(heroSection.offsetHeight - window.innerHeight, 0);
  const heroIsActive = y <= heroSection.offsetTop + heroTravel;
  if (heroIsActive) {
    const heroExit = reduceMotion ? 0 : sectionProgress(heroSection);
    const heroY = heroExit * heroTravel;
    const curveProgress = clamp(heroExit / .78);
    const dropEase = heroExit * heroExit * (3 - 2 * heroExit);
    const stoneScale = 1 - dropEase * .3;
    const cardScale = 1 - dropEase * .26;
    const fadeProgress = clamp((heroExit - .28) / .34);
    const smoothFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
    const objectFade = 1 - smoothFade;
    heroSection.style.setProperty('--hero-exit', heroExit.toFixed(4));
    heroSection.style.setProperty('--hero-curve', curveProgress.toFixed(4));
    heroSection.style.setProperty('--hero-title-y', `${heroY.toFixed(2)}px`);
    heroSection.classList.toggle('is-exiting', heroExit >= .08);
    heroMaterial.style.translate = `0 ${heroY * (.1 + dropEase * .3)}px`;
    heroMaterial.style.scale = stoneScale.toFixed(4);
    heroCards[0].style.translate = `${-heroY * dropEase * .04}px ${heroY * (.08 + dropEase * .27)}px`;
    heroCards[1].style.translate = `${heroY * dropEase * .04}px ${heroY * (.07 + dropEase * .25)}px`;
    heroCards.forEach(card => card.style.scale = cardScale.toFixed(4));
    heroMaterial.style.opacity = objectFade;
    heroMaterial.style.visibility = 'visible';
    heroMaterial.style.webkitMaskImage = 'none';
    heroMaterial.style.maskImage = 'none';
    heroCards.forEach(card => {
      card.style.opacity = objectFade;
      card.style.visibility = 'visible';
      card.style.webkitMaskImage = 'none';
      card.style.maskImage = 'none';
      card.style.pointerEvents = objectFade < .05 ? 'none' : '';
    });
    heroMaterial.style.pointerEvents = objectFade < .05 ? 'none' : '';
  } else if (heroSection) {
    heroSection.style.setProperty('--hero-exit', '1');
    heroSection.style.setProperty('--hero-curve', '1');
    heroSection.style.setProperty('--hero-title-y', `${heroTravel.toFixed(2)}px`);
    heroSection.classList.add('is-exiting');
    heroMaterial.style.opacity = '0';
    heroMaterial.style.visibility = 'hidden';
    heroMaterial.style.pointerEvents = 'none';
    heroCards.forEach(card => {
      card.style.opacity = '0';
      card.style.visibility = 'hidden';
      card.style.pointerEvents = 'none';
    });
  }

  const pProgress = sectionProgress(practiceSection);
  setPractice(Math.min(2, Math.floor(pProgress * 3)));
  document.querySelector('.practice-count').style.translate = `${(pProgress - .5) * 70}px 0`;
  document.querySelector('.practice-heading').style.translate = `${(pProgress - .5) * -35}px 0`;

  const oProgress = sectionProgress(outcomesSection);
  setObject(Math.min(2, Math.floor(oProgress * 3)));
  document.querySelector('.objects-heading').style.translate = `${oProgress * -40}px 0`;

  const aProgress = sectionProgress(aboutSection);
  const scatter = 1;
  aboutSection.style.setProperty('--scatter', scatter.toFixed(4));

  if (!reduceMotion && aboutFeature) {
    const expand = clamp((aProgress - .1) / .2);
    const slideProgress = clamp((aProgress - .3) / .36);
    const roundShrink = clamp((aProgress - .68) / .16);
    const archShrink = clamp((aProgress - .84) / .12);

    let left = 26 + (10 - 26) * expand;
    let top = 30 + (6 - 30) * expand;
    let width = 48 + (80 - 48) * expand;
    let height = 49 + (88 - 49) * expand;
    let radius = `${8 + (28 - 8) * expand}px`;

    if (aProgress >= .68) {
      left = 10 + (18 - 10) * roundShrink;
      top = 6 + (11 - 6) * roundShrink;
      width = 80 + (64 - 80) * roundShrink;
      height = 88 + (78 - 88) * roundShrink;
      radius = `${28 + (52 - 28) * roundShrink}px`;
    }

    if (aProgress >= .84) {
      left = 18 + (42 - 18) * archShrink;
      top = 11 + (15 - 11) * archShrink;
      width = 64 + (16 - 64) * archShrink;
      height = 78 + (46 - 78) * archShrink;
      const topRadius = 52 + 208 * archShrink;
      const bottomRadius = 52 + (8 - 52) * archShrink;
      radius = `${topRadius}px ${topRadius}px ${bottomRadius}px ${bottomRadius}px`;
    }

    aboutFeature.style.left = `${left}vw`;
    aboutFeature.style.top = `${top}vh`;
    aboutFeature.style.width = `${width}vw`;
    aboutFeature.style.height = `${height}vh`;
    aboutFeature.style.minHeight = '0';
    aboutFeature.style.borderRadius = radius;

    const focusTextOpacity = aProgress < .68 ? 1 - expand : roundShrink;
    aboutSection.style.setProperty('--focus-text-opacity', focusTextOpacity.toFixed(4));
    aboutSection.classList.toggle('is-arch', aProgress >= .84);

    const chromeOpacity = 1 - clamp((aProgress - .1) / .14);
    aboutTiles.forEach(tile => {
      tile.style.opacity = chromeOpacity;
      tile.style.pointerEvents = chromeOpacity < .05 ? 'none' : '';
    });
    aboutHeading.style.opacity = chromeOpacity;
    aboutKicker.style.opacity = chromeOpacity;

    if (aProgress >= .3 && aProgress < .68) {
      setAboutSlide(Math.min(aboutSlides.length - 1, Math.floor(slideProgress * aboutSlides.length)));
    }
  }

  floatingImages.forEach((figure, index) => {
    const rect = figure.parentElement.getBoundingClientRect();
    if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
      const relative = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      figure.style.translate = `0 ${relative * (index ? -55 : -90)}px`;
    }
  });

  parallaxMedia.forEach((image, index) => {
    const rect = image.parentElement.getBoundingClientRect();
    if (rect.bottom > -200 && rect.top < window.innerHeight + 200) {
      const relative = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
      image.style.translate = `0 ${relative * (index ? -45 : -60)}px`;
    }
  });

  const peopleRect = peopleSection.getBoundingClientRect();
  if (peopleRect.bottom > -200 && peopleRect.top < window.innerHeight + 200) {
    const progress = clamp((window.innerHeight - peopleRect.top) / (window.innerHeight + peopleRect.height));
    peopleGhost.style.translate = `${(progress - .5) * 150}px 0`;
    peopleArch.style.marginTop = `${(progress - .5) * -35}px`;
    peoplePaths[0].style.rotate = `${progress * 12 - 6}deg`;
    peoplePaths[1].style.rotate = `${progress * -10 + 5}deg`;
  }

  lastScroll = y;
  scrollTicking = false;
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(updateScroll);
  }
}, { passive: true });

function setMenu(open) {
  body.classList.toggle('menu-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuOverlay.setAttribute('aria-hidden', String(!open));
}
menuButton.addEventListener('click', () => setMenu(true));
document.querySelector('.menu-close').addEventListener('click', () => setMenu(false));
menuOverlay.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
document.querySelectorAll('[data-context]').forEach(button => button.addEventListener('click', () => document.querySelector('#admission').scrollIntoView({ behavior: 'smooth' })));

if (!reduceMotion) {
  window.addEventListener('pointermove', event => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    const mx = event.clientX / window.innerWidth - .5;
    const my = event.clientY / window.innerHeight - .5;
    heroMaterial.style.rotate = `${mx * 4}deg`;
    heroCards[0].style.marginLeft = `${mx * -18}px`;
    heroCards[1].style.marginRight = `${mx * 18}px`;
    if (peopleSection.getBoundingClientRect().top < window.innerHeight && peopleSection.getBoundingClientRect().bottom > 0) {
      peopleArch.style.marginLeft = `${mx * 18}px`;
      peopleArch.style.marginTop = `${my * 12}px`;
    }
  });

  document.querySelectorAll('a, button, input, textarea').forEach(element => {
    element.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
    element.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
  });
  document.querySelectorAll('.media-view').forEach(element => {
    element.addEventListener('mouseenter', () => cursor.classList.add('is-view'));
    element.addEventListener('mouseleave', () => cursor.classList.remove('is-view'));
  });
  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', event => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      element.style.transform = `translate(${x * .13}px, ${y * .18}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });

  document.querySelectorAll('.about-tile').forEach(tile => {
    tile.addEventListener('pointermove', event => {
      const rect = tile.getBoundingClientRect();
      const rx = (event.clientY - rect.top) / rect.height - .5;
      const ry = (event.clientX - rect.left) / rect.width - .5;
      tile.style.setProperty('--tilt-x', `${rx * -5}deg`);
      tile.style.setProperty('--tilt-y', `${ry * 6}deg`);
    });
    tile.addEventListener('pointerleave', () => {
      tile.style.removeProperty('--tilt-x');
      tile.style.removeProperty('--tilt-y');
    });
  });
}

if (!reduceMotion) {
  const aboutAutoplay = now => {
    const rect = aboutSection.getBoundingClientRect();
    const visible = rect.top < window.innerHeight && rect.bottom > 0;
    if (visible && sectionProgress(aboutSection) < .1 && now - aboutSlideStarted > 4800) setAboutSlide(aboutIndex + 1);
    requestAnimationFrame(aboutAutoplay);
  };
  requestAnimationFrame(aboutAutoplay);
}

practiceName.style.transition = 'opacity .25s, transform .45s var(--ease)';
updateScroll();
