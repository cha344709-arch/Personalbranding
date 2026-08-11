document.addEventListener('DOMContentLoaded', () => {
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
      tag: '(팀프로젝트)',
      image: 'img/viner-thumbnail.png',
      tagline: 'Every Bottle Has a Story',
      desc: '당신의 취향으로 시작되는 와인 이야기, 좋아하는 맛을 발견하고, 특별한 순간을 나눠보세요.'
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
      tag: '(개인프로젝트)',
      image: 'img/eyeum-thumbnail.png',
      tagline: 'For the Beautiful and the Free',
      desc: ''
    },
    marshall: {
      name: 'MARSHALL',
      tag: '(팀프로젝트)',
      image: 'img/marshall-thumbnail.png',
      tagline: '',
      desc: ''
    }
  };

  const id = new URLSearchParams(window.location.search).get('id');
  const data = OBJECTS[id] || OBJECTS.viner;

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
