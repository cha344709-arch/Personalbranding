document.addEventListener('DOMContentLoaded', () => {
  const OBJECTS = {
    viner: {
      name: 'VINER',
      tag: '(팀프로젝트)',
      image: 'img/wine.png',
      tagline: 'Every Bottle Has a Story',
      desc: '당신의 취향으로 시작되는 와인 이야기, 좋아하는 맛을 발견하고, 특별한 순간을 나눠보세요.'
    },
    'ai-in-app': {
      name: 'AI IN_APP',
      tag: '(AI 활용한 IN_APP)',
      image: 'img/AI Money Coach.png?v=2',
      tagline: '소비 내역을 넘어, 다음 행동을 알려드려요.',
      desc: '소비 데이터를 분석해 돈이 새는 지점을 찾고, 실천 가능한 절약 방법과 목표의 변화를 예측합니다.'
    },
    eyeum: {
      name: 'EYEUM',
      tag: '(개인프로젝트)',
      image: 'img/EYEUM.png?v=2',
      tagline: 'For the Beautiful and the Free',
      desc: ''
    },
    marshall: {
      name: 'MARSHALL',
      tag: '(팀프로젝트)',
      image: 'img/marshall_rebrand.png',
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
});
