# Obsidian Assembly 구현 분석

조사일: 2026-07-16  
대상: https://obsidianassembly.com/  
근거: 공개 SSR HTML, Nuxt CSS/JS 번들, 웹 렌더링 텍스트. 현재 환경에는 브라우저 DevTools 직접 제어 기능이 노출되지 않아, 실제 브라우저의 Performance/Computed 패널에서만 확인 가능한 프레임별 값은 제외했다.

## 1. 기술 구조

- Nuxt 3 + Vue 3 SSR/하이드레이션.
- 자체 인터랙션 런타임 `StringTune`을 60fps로 시작한다.
- 런타임 모듈: smooth scroll, progress/in-view, parallax, lerp, cursor tracking, string split, sequence/slider, responsive screen state.
- 데스크톱 스크롤은 `smooth`, 모바일은 native `default`; 모달/메뉴에서는 둘 다 `disable`.
- DOM 속성(`string="split|parallax"`, `string-parallax`, 시퀀스 속성)을 런타임이 읽고 CSS 변수와 클래스를 갱신한다.
- 홈 배경 일부는 WebGL 1 기반 fragment shader, 나머지는 CSS transform/clip-path/mask/gradient로 구성된다.
- 애니메이션 라이브러리 GSAP/Three.js/Lenis는 쓰지 않고 자체 엔진을 번들에 포함했다.

## 2. 디자인 토큰

### 색상

| 토큰 | 값 | 용도 |
|---|---:|---|
| `--c-white` | `#fff` | 대형 타이틀, 반전 텍스트 |
| `--c-black` | `#151415` | 기본 암색 배경/텍스트 |
| `--c-grey` | `#3f383c` | 오버레이, 아치 그라데이션 |
| `--c-stone` | `#242324` | 거대 장식 텍스트 |
| `--c-yellow` | `#f1eade` | 아이보리 배경/텍스트 |
| `--c-brown` | `#7b5136` | 포인트/버튼/링크 |
| `--c-stroke` | `#9faf9b` | 녹회색 선 |
| `--c-red` | `#ff5113` | WebGL 활성 하이라이트 계열 |

### 폰트

- 본문: `Switzer-Regular`; 강조 본문: `Switzer-Medium`.
- 디스플레이 1: `OTJubilee-Platinum`.
- 디스플레이 2: `Voyage-Regular` (`ascent-override:100%`, `descent-override:10%`).
- 입력은 모바일에서 16px로 고정해 iOS 자동 확대를 방지하고, 데스크톱에서 본문 토큰을 사용한다.
- 전역 font feature: `dlig`, `ss03`, `ss08`, `ss06`.

### 타입 스케일

- 기준 `1rem`, 배율 `1.25`, line-height 기준 `1.3`.
- `p=1rem`, `m=.8rem`, `mm=.64rem`, `h6=1.25rem`, `h5=1.5625rem`, `h4=1.953rem`, `h3=2.441rem`, `h2=3.052rem`, `h1=3.815rem`, `h0=4.768rem`.
- 대형 타입는 `max(h0 × 1.25², 12.5vw)`, 작은 화면 변형에서는 `h0`.
- HTML 기준 크기: 기본 16px, 너비가 커지면서 20/22/24/28px 단계로 증가한다.
- 디스플레이 line-height는 `pow()` 기반으로 사이즈가 커질수록 촘촘해진다. letter-spacing intensity는 `-2`.

### 그리드/간격

- 모바일 6열, 데스크톱 12열. 일부 섹션 내부는 24열로 세분화.
- gap `1rem`; 모바일 외곽 margin `1rem`, 데스크톱 `2rem`.
- 열 폭: `(100vw - 양쪽 margin - 전체 gap) / 열 수`를 CSS 변수 `--col`로 계산.
- 공통 카드 radius `.4rem`; 선은 대부분 `1px`; 버튼 원형선은 `2px` 마스크 링.
- 데스크톱 전환 기준은 실질적으로 1024/1025px 경계다.

### 이징/시간

| 토큰 | cubic-bezier |
|---|---|
| `--f-cubic` | `.35,.35,0,1` |
| `--f-cubic-in` | `.69,0,0,1` |
| `--f-fast` | `.2,.75,.35,1` |
| `--f-smooth` | `.5,0,.3,1` |
| `--f-smooth-alt` | `.6,0,.05,1` |
| `--f-bounce` | `.6,.5,0,3` |

주요 duration은 `.6s`, `.9s`, `1.2s`, `1.5s`, `2.1s`, `3s`. 문자 stagger는 보통 `75ms × index/random`.

## 3. 전역 인터랙션

### 부드러운 스크롤

- 전용 스크롤 매니저가 wheel/native scroll을 받아 `current`, `target`, `lerped`, `delta`, direction을 관리한다.
- 매 프레임 `--progress`(0~1), `--lerp`, `--x`, in-view 클래스와 이벤트를 업데이트한다.
- 기본 설정: parallax `.2`, lerp `.2`, cursor-lerp `.75`, cursor radius `150`, strength `.3`, timeout `900ms`.
- resize는 `ResizeObserver`, DOM 변경은 `MutationObserver`; in-view는 런타임 계산과 `IntersectionObserver`를 병용한다.

### 헤더

- fixed, z-index 102, 상단 `mm`; 갈색 60%에서 투명으로 사라지는 세로 gradient.
- 최초 로딩 시 `translateY(-150%) skew(-10deg,-5deg)` → 2.1s로 복귀.
- 스크롤 임계점은 viewport 높이의 50배에 해당하는 내부 값 이후 `-scrolled` 상태.
- 이 상태에서 Request 버튼은 위에서 내려오며 opacity 0→1, 메뉴 텍스트는 위로 사라지고 햄버거가 중앙으로 이동한다.
- 각 섹션의 `data` 경계를 읽어 `-dark` 클래스를 변경한다. scroll/resize 처리는 RAF로 throttle.
- 햄버거 hover: 3개의 1px gradient line의 background-position이 서로 다른 방향으로 이동한다.

### 기본 버튼

- 텍스트, 배경, 아이콘을 별도 레이어로 두고 hover 시 background-color/문자 이동/화살표 회전을 조합한다.
- 전환은 주로 `.9s --f-cubic`; 원형 화살표는 밑에서 차오르는 `scaleY(0→1)` 배경과 중심 바깥을 회전축으로 삼는 `rotate(0→-90deg)` 교체 효과.

### 전체 메뉴

- 검정/회색 80% overlay, 컨텐츠는 검은 돌 텍스처와 fade mask.
- open: overlay 1.5s, underlay 2.1s, 인물/동심원 scale 0→1, 각 글자 random 75ms fade, 링크는 아래에서 stagger 진입.
- desktop 링크 hover: 현재 글자가 `translateY(-105%)`; 복제 글자가 `rotate(60deg) scale(1.5) translateY(105%)`에서 0deg/1로 올라온다.
- close X는 진입 때 양쪽 밖에서 교차하고 hover 시 선 길이가 120%.

### 페이지 전환

- 4개 검은 세로 패널이 `--order` 순서로 화면을 덮고 벗겨진다.
- Obsidian Assembly 문자가 패널 사이에 놓이며 enter 1.2s, leave 1.5s.
- 전환 중 스크롤을 정지하고 페이지를 최상단으로 보낸 뒤 약 1.2s 후 재활성화한다.

## 4. 홈 섹션별 구현

### Welcome

- 배경 `w-bg.jpg`; 상단 arch SVG clip-path, 하단은 50%부터 검정으로 누적되는 다단 gradient.
- 모바일 top padding 25vh, desktop 15vh; bottom 10vh.
- 대형 3줄 제목은 6/12열 그리드에서 비대칭 배치. 2·3번째 줄은 scroll progress에 각각 최대 10vh/20vh 아래로 이동.
- CTA는 최대 5vh 이동. CTA hover 시 위의 세 줄 micro-copy가 `.6/.75/.9s`로 서로 반대 방향 재정렬.
- 중앙 stone은 SVG mask, 초기 scale 1.2/translateY 50%, ready 후 1; 스크롤로 `scale(1 - progress×.5)`.
- 마우스 spotlight: 포인터 각도와 중심 거리로 `--spotlight-angle`, `--spotlight-distance`를 갱신. 두 WebP 레이어에 반대 방향 linear-gradient mask를 적용해 표면 하이라이트가 회전/감쇠한다.
- 양쪽 P/I 카드는 초기 ±15deg, scroll 중 최대 반대 방향 30deg; transform origin을 화면 바깥(-150%, 250%)에 둬 부채꼴로 움직인다.
- SVG path는 `translateX(--x × .1rem)`로 미세하게 마우스를 추적한다.

### Places

- 검정 배경, 아이보리 텍스트. 400vh 높이 sticky story(데스크톱), 100vh 고정 stage.
- WebGL relief 배경: stone-wall texture를 높이장으로 변환. 기본 옵션 `radius:600`, rise `.25`, decay `.015`, spread `.32`, relief `35`, parallax `16`, ambient `.05→.3`, diffuse `3.5`, specular `2.8`, shininess `24`.
- mouse/touch 위치에 높이장을 주입하고 ping-pong framebuffer로 확산/감쇠. fragment shader가 normal, diffuse, specular, shadow, texture parallax를 계산한다.
- viewport 밖에서는 RAF를 pause하고, 들어오면 resume. scrollFactor는 active `.5`, idle `.25`.
- 중앙 이미지 시퀀스는 progress 초반에 clip-path inset이 풀리며 카드에서 전체 stage로 확장.
- 주변 6개 이미지는 progress×2 구간에서 각기 ±20~35vw, ±10~30vh로 방사 이동.
- 슬라이드 교체: entering 이미지는 좌/우 100% clip 상태에서 `.9s`; 내부 이미지는 `scale(1.5,1.2)→1` 1.5s.
- prev/next 원형 버튼 hover는 아이보리 fill이 아래에서 차오르고 두 화살표가 90deg 회전 교대. next 외곽은 `conic-gradient`로 자동 진행률 표시.
- 장소명은 글자별 75ms stagger, `translate(.1em×index,.5em) scale(1.5)`에서 진입.

### Places 후속/지도

- star/mask 장식과 figure-map을 사용하며 SVG path가 scroll progress에 맞춰 그려진다.
- 지도·문장·버튼은 서로 다른 parallax 계수로 깊이를 분리한다.

### Objects / Origin Objects

- sticky-container와 sequence 모듈을 다시 사용하되 stone/object 4개를 연결한다.
- 제목/본문은 split char/line 단위 reveal; 이미지 stage는 clip-path와 scale 전환.
- 연결 섹션으로 넘어가며 배경·카드·텍스트가 서로 다른 progress 곡선으로 겹쳐진다.

### Connection

- figure holder는 모바일 50vh, 데스크톱 100vh. 위로 20vh 확장된 이미지를 `translateY(20vh × progress)`로 이동해 내부 패럴랙스.
- SVG connection path와 order 그래픽을 동일 stage에 겹친다.
- 대형 `Connection`은 split + `parallax:-.1`, 보조 단어도 역방향 패럴랙스.

### Updates

- desktop 내부 24열. 중앙 active 카드, 좌우 prev/next preview 카드.
- preview hover: 어두운 gradient overlay가 나타나고 원형 화살표가 opacity 0/scale .5/±100%에서 원위치로 `.9s`.
- 제목/상태/설명은 word별 `.9s`, `translateY(1.5em)` reveal; 75ms × 텍스트 지연/line index.
- 하단 1~5 번호에는 `.4rem` 갈색 캡슐 배경. active/neighbor/hover/far 상태별 inset, opacity, scale을 `.9s`로 보간.

### People

- 검정 섹션 상단에 star mask. 돌 텍스처 underlay는 fade mask.
- 24열에서 중앙 12열 arch. 아치 자체는 `scale(1-progress×.2)`, 내부 벽/사람은 `scale(1+progress×.5)`라 서로 반대 zoom으로 깊이 생성.
- 거대 돌색 텍스트는 32vw. 좌우 창 윤곽과 중앙 arch를 겹쳐 건축적 프레임 형성.

### Admission

- 아이보리 이미지 canvas 위에 검정→투명 top gradient.
- 배경 3장: 이전 이미지는 scale 1.5×1.2→1, 새 이미지는 opacity/scale 2.1~3s crossfade.
- 중앙 원형/유기 mask 이미지도 scale 1.5×2.5→1.
- 모바일 form 6열 전체, desktop 8열 중앙 배치. field 간 gap 1rem, textarea는 추가 top gap.
- label을 크게 사용하고 실제 입력/placeholder를 grid로 겹친다. focus/hover는 2px inset + 1px 외곽선.
- 제출 성공 시 900ms 후 성공 modal, 그동안 스크롤 isolate.

## 5. 모바일 차이

- 6열, margin/gap 1rem; 데스크톱 전용 hover 효과는 대부분 `min-width:1024px` 안에 있어 touch에서 제거.
- WebGL places 배경 대신 stone-wall gradient fallback이 준비되어 있다.
- 데스크톱 400vh sticky choreography가 짧은 카드 중심 흐름으로 축소된다.
- 메뉴 링크는 hover 복제글자 대신 기본 진입/퇴장만 유지.
- people arch와 admission form은 화면 폭 전체에 가깝게 확장.
- `screen:mobile` 이벤트로 WebGL/sequence/resize 측정 경로를 분기한다.

## 6. 재구현 순서

1. 위 토큰, 6/12열 CSS grid, 공통 `.4rem` radius부터 구축.
2. scroll manager에서 `--progress`, `--lerp`, in-view를 단일 RAF 루프로 공급.
3. text split 유틸로 char/word/line wrapper와 index/random CSS 변수를 생성.
4. Welcome의 mask/clip/path/spotlight를 먼저 완성.
5. reusable sequence controller를 만들고 Places, Objects, Updates, Admission에 상태(`entering/leaving/active`)만 바꿔 재사용.
6. WebGL relief는 마지막에 추가하고 모바일 raster fallback을 유지.
7. 메뉴/폼/page transition 시 scroll lock과 focus/keyboard 접근성을 함께 구현.

## 7. 주의점

- 원 사이트의 폰트와 이미지/코드를 그대로 복제해 배포하면 라이선스·저작권 문제가 생길 수 있다. 구조와 움직임 원리를 참고하되 개인 브랜드의 타이포, 에셋, 컬러, 카피로 재설계해야 한다.
- `pow()` 기반 CSS 계산과 mask/clip-path/WebGL은 구형 브라우저 fallback이 필요하다.
- `prefers-reduced-motion` 대응이 번들에서 명확히 드러나지 않는다. 재구현에서는 WebGL/패럴랙스/문자 stagger를 축소하거나 정지시키는 옵션을 추가해야 한다.
- “모든 코드” 중 서버 코드와 원본 소스맵은 공개되지 않았으며, 분석 가능한 범위는 브라우저에 전달된 컴파일 결과다.
