# My Tasks - 할 일 관리 앱

매일 10~20개 정도의 할 일을 관리하는 개인용 웹 앱입니다.

## Project Overview
- 할 일 추가/수정/삭제, 완료 체크, 카테고리(업무/개인/공부) 분류, 진행률 대시보드를 제공
- 브라우저에서 `index.html`을 바로 열어 실행하며, 새로고침해도 데이터가 유지됨(localStorage)
- 키워드 기반 자동 카테고리 분류 기능 포함 (5장)

## Commands
- 실행: `index.html` 더블 클릭 (모바일 중심 카드 레이아웃)
- 데스크톱 버전 실행: `web_version/index.html` 더블 클릭 (전체 화면 레이아웃)
- 빌드/설치 과정 없음

## Tech Stack
- 순수 HTML5 / CSS3 / JavaScript (ES6+), 프레임워크·라이브러리 없음
- 저장소: localStorage
  - `mytasks.todos` 할 일 배열, `mytasks.theme` 테마, `mytasks.sort` 정렬, `mytasks.autoCategory` 자동 분류 설정

## Architecture
- `index.html` : 화면 구조 (헤더, 대시보드, 입력 폼, 필터, 검색/정렬, 목록, 모달)
- `style.css`  : 스타일. CSS 변수로 라이트/다크 테마 전환 (`[data-theme="dark"]`)
- `script.js`  : 모든 동작. IIFE 하나에 상태(state) → 렌더(render) 단방향 구조
  - `addTodo / toggleTodo / deleteTodo / updateTodo` : CRUD
  - `suggestCategory(title)` : 키워드 점수 기반 카테고리 추천
  - `render()` → `renderList / renderDashboard / renderFilters`
  - `startEdit(li)` : 더블클릭 인라인 수정
  - `exportData / importData` : JSON 내보내기/가져오기
- `web_version/` : 데스크톱 최적화 버전. `script.js`는 루트와 동일, HTML/CSS만 다름

### 데이터 구조
```js
{ id, title, category: 'work'|'personal'|'study', completed, createdAt, completedAt, order }
```

### 카테고리 색상
- 업무(work) `#4A90E2` / 개인(personal) `#27AE60` / 공부(study) `#8E44AD`
- 다크 모드: 배경 `#1A1A1A`, 카드 `#2D2D2D`, 텍스트 `#E0E0E0`

## Code Style
- 변수·함수명은 camelCase 영어, 주석과 UI 문구는 한국어
- 사용자 입력은 반드시 `escapeHTML()`을 거쳐 출력
- 목록 렌더링은 DocumentFragment로 한 번에 반영 (100개 이상 항목 성능)
- localStorage 접근은 try/catch로 감싸기

## Development Notes
- 단축키: Alt+N 입력창 포커스, Alt+1~4 카테고리 필터
- 드래그 앤 드롭 정렬은 정렬 옵션이 "직접 정렬"일 때만 활성화
- 루트와 `web_version`의 `script.js`를 수정할 때는 두 파일을 함께 갱신할 것
