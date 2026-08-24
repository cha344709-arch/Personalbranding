document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const syncObjectViewport = () => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const fixedDesktop = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const layoutScale = fixedDesktop ? width / DESIGN_WIDTH : 1;
    root.style.setProperty('--layout-scale', layoutScale.toFixed(6));
    root.style.setProperty('--app-vw', `${(DESIGN_WIDTH * layoutScale) / 100}px`);
    root.style.setProperty('--app-vh', `${(DESIGN_HEIGHT * layoutScale) / 100}px`);
  };
  syncObjectViewport();
  window.addEventListener('resize', syncObjectViewport);

  const cursor = document.querySelector('.cursor-dot');
  const trailCanvas = document.getElementById('cursorTrail');
  const hasFinePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  if (cursor && hasFinePointer) {
    window.addEventListener('mousemove', event => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
    document.querySelectorAll('a, button').forEach(element => {
      element.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      element.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  }

  if (trailCanvas && hasFinePointer) {
    const context = trailCanvas.getContext('2d');
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const points = Array.from({ length: 22 }, () => ({ x: innerWidth / 2, y: innerHeight / 2 }));
    let mouseX = innerWidth / 2;
    let mouseY = innerHeight / 2;
    let lastMove = 0;

    const resizeTrail = () => {
      trailCanvas.width = innerWidth * pixelRatio;
      trailCanvas.height = innerHeight * pixelRatio;
      trailCanvas.style.width = `${innerWidth}px`;
      trailCanvas.style.height = `${innerHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawTrail = time => {
      points[0].x += (mouseX - points[0].x) * .42;
      points[0].y += (mouseY - points[0].y) * .42;
      for (let index = 1; index < points.length; index += 1) {
        points[index].x += (points[index - 1].x - points[index].x) * .32;
        points[index].y += (points[index - 1].y - points[index].y) * .32;
      }

      context.clearRect(0, 0, innerWidth, innerHeight);
      const opacity = Math.max(0, 1 - Math.max(0, time - lastMove - 80) / 550);
      if (opacity > .01) {
        context.lineCap = 'round';
        context.strokeStyle = '#fffff0';
        for (let index = 0; index < points.length - 1; index += 1) {
          const fade = 1 - index / (points.length - 1);
          context.globalAlpha = opacity * fade;
          context.lineWidth = Math.max(.5, 2.6 * fade);
          context.beginPath();
          context.moveTo(points[index].x, points[index].y);
          context.lineTo(points[index + 1].x, points[index + 1].y);
          context.stroke();
        }
        context.globalAlpha = 1;
      }
      requestAnimationFrame(drawTrail);
    };

    resizeTrail();
    window.addEventListener('resize', resizeTrail);
    window.addEventListener('mousemove', event => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      lastMove = performance.now();
    });
    requestAnimationFrame(drawTrail);
  }

  const OBJECTS = {
    viner: {
      name: 'VINER',
      tag: 'Mobile Web · 팀 프로젝트',
      image: 'img/viner-thumbnail.png',
      tagline: '와인을 발견하는 순간부터, 취향을 나누는 경험까지.',
      desc: '취향을 기반으로 와인을 발견하고 기록하며, 다른 사용자와 경험을 공유할 수 있는 와인 커뮤니티 서비스입니다. 와인 탐색부터 리뷰와 기록, 커뮤니티 활동까지 자연스럽게 이어질 수 있도록 모바일 사용자 경험을 구현했습니다.',
      meta: [
        ['ROLE', '기획 참여 · UI 구현 · Front-end'],
        ['CONTRIBUTION', '프론트엔드 개발 · 웹 퍼블리싱 · 테스트 및 개선'],
        ['AI UTILIZATION', 'Claude · Codex를 활용한 개발 및 오류 개선'],
        ['PERIOD', '2026.07.06 — 2026.08.06']
      ]
    },
    'ai-in-app': {
      name: 'AI IN_APP',
      tag: 'AI를 활용한 IN_APP · 개인 프로젝트',
      image: 'img/ai-in-app-thumbnail.png',
      tagline: '소비 기록을 넘어, 다음 행동을 설계합니다.',
      desc: '소비 데이터를 분석해 놓치기 쉬운 소비 패턴을 발견하고, 사용자가 바로 실천할 수 있는 절약 방법과 목표 변화를 제안하는 AI 금융 코칭 서비스입니다. 단순한 소비 기록을 넘어, 데이터가 실제 행동의 변화로 이어지는 경험을 설계했습니다.',
      meta: [
        ['ROLE', '기획 · UI/UX Design · Front-end'],
        ['CONTRIBUTION', '개인 프로젝트 · 100%'],
        ['AI UTILIZATION', 'Codex를 활용한 개발 · 테스트 · 반복 개선'],
        ['PERIOD', '2026.07.31 — 2026.08.04']
      ]
    },
    eyeum: {
      name: 'EYEUM',
      tag: 'Mobile App · 개인 프로젝트',
      image: 'img/eyeum-thumbnail.png',
      tagline: '렌즈를 고르는 과정을, 나에게 맞는 경험으로.',
      desc: 'AR 가상 착용과 맞춤형 렌즈 추천을 결합한 컬러렌즈 서비스입니다. 사용자가 수많은 제품을 직접 비교하는 불편을 줄이고, 자신의 취향과 특징에 맞는 렌즈를 보다 쉽고 직관적으로 탐색할 수 있도록 사용자 경험을 설계했습니다.',
      meta: [
        ['ROLE', '기획 · Branding · UI/UX Design · Front-end'],
        ['CONTRIBUTION', '개인 프로젝트 · 100%'],
        ['AI UTILIZATION', 'Claude · Codex를 활용한 구현 및 개선'],
        ['PERIOD', '2026.03.24 — 2026.05.29']
      ]
    },
    marshall: {
      name: 'MARSHALL',
      tag: 'Brand Redesign · 팀 프로젝트',
      image: 'img/marshall-thumbnail.png',
      tagline: '브랜드의 감성은 유지하고, 탐색 경험은 더 명확하게.',
      desc: 'Marshall의 브랜드 아이덴티티를 유지하면서 사용자가 필요한 정보에 보다 쉽게 접근할 수 있도록 웹사이트를 리디자인했습니다. 서포트 페이지를 중심으로 정보 구조와 화면을 설계하고, 디자인이 실제 웹 경험으로 이어지도록 구현했습니다.',
      meta: [
        ['ROLE', '기획 참여 · Support UI Design · Front-end'],
        ['CONTRIBUTION', '서포트 페이지 디자인 · 프론트엔드 구현'],
        ['AI UTILIZATION', 'Claude · Codex를 활용한 개발 및 수정'],
        ['PERIOD', '2026.06.19 — 2026.07.03']
      ]
    }
  };

  const id = new URLSearchParams(window.location.search).get('id');
  const data = OBJECTS[id] || OBJECTS.viner;

  const deckUrls = {
    viner: 'https://drive.google.com/file/d/1reS4O_iV9PcuZp6FREZguyaP7UCP1q4v/view?usp=sharing',
    marshall: 'https://drive.google.com/file/d/1LwIDIBZg29SB01glA2GzUQUbcMfXY1ug/view?usp=sharing'
  };
  const deckLabels = {
    viner: 'VINER장표보기',
    marshall: 'MARSHALL장표보기'
  };
  const liveUrls = {
    'ai-in-app': 'https://ai-money-coach-recovered-final.vercel.app/'
  };
  const detailAction = document.getElementById('objectDetailAction');
  const selectedDeckUrl = deckUrls[id || 'viner'];
  const selectedLiveUrl = liveUrls[id];
  if (selectedLiveUrl) {
    detailAction.href = selectedLiveUrl;
    detailAction.target = '_blank';
    detailAction.rel = 'noopener noreferrer';
    detailAction.innerHTML = 'AI Money Coach 체험하기&nbsp;&nearr;';
  } else if (selectedDeckUrl) {
    detailAction.href = selectedDeckUrl;
    detailAction.target = '_blank';
    detailAction.rel = 'noopener noreferrer';
    detailAction.innerHTML = `${deckLabels[id] || '장표 보기'}&nbsp;&nearr;`;
  }

  document.title = `${data.name} — CHA KYEONG AH`;

  const image = document.getElementById('objectDetailImage');
  image.src = data.image;
  image.alt = data.name;

  document.getElementById('objectDetailTag').textContent = data.tag;
  document.getElementById('objectDetailName').textContent = data.name;

  const tagline = document.getElementById('objectDetailTagline');
  if (data.tagline) tagline.textContent = data.tagline;
  else tagline.remove();

  const desc = document.getElementById('objectDetailDesc');
  if (data.desc) desc.textContent = data.desc;
  else desc.remove();

  const meta = document.getElementById('objectDetailMeta');
  if (data.meta?.length) {
    data.meta.forEach(([label, value]) => {
      const item = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      item.append(term, detail);
      meta.append(item);
    });
  } else {
    meta.remove();
  }
});
