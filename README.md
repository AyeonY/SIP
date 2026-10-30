# SIP · 인공지능활용실습 (바이브 코딩 with 클로드 코드)

인공지능활용실습 3~8장 실습 결과물 모음입니다.

| 장 | 실습 | 폴더 | 실행 방법 |
|---|---|---|---|
| 3장 | 손글씨 인식 프로그램 (MNIST, 데스크톱/웹 버전, CLAUDE.md 계층 구조) | [`VibeCoding/손글씨인식`](VibeCoding/손글씨인식) | `desktop_version/run_digit_recognition.bat`, `web_version/run_web.bat` |
| 4장 | 단계별 프롬프트 – 할 일 관리 앱 (Step 1~5) | [`VibeCoding/투두앱`](VibeCoding/투두앱) | `index.html` 열기 |
| 5장 | 작업 재개와 효율성 – 키워드 기반 자동 카테고리 분류 | [`VibeCoding/투두앱`](VibeCoding/투두앱) | [자동 재분류]·[분류 설정] 버튼 |
| 6장 | 프로젝트 개선 – 캡처 이미지로 데스크톱 UI 개선 | [`VibeCoding/투두앱/web_version`](VibeCoding/투두앱/web_version) | `web_version/index.html` 열기 |
| 7장 | 할루시네이션 없는 AI 콘텐츠 – 상식 퀴즈 게임 + 교차 검증 가이드라인 | [`VibeCoding/퀴즈게임`](VibeCoding/퀴즈게임) | `index.html` 열기 |
| 8장 | 자동화 – 게임 모드·점수 시스템 + 커스텀 명령어 | [`VibeCoding/퀴즈게임/.claude/commands`](VibeCoding/퀴즈게임/.claude/commands) | 클로드 코드에서 `/quiz-validate`, `/quiz-range 1 20`, `/quiz-add 한국사 medium` |

## 폴더 구조
```
SIP/
└─ VibeCoding/
   ├─ 손글씨인식/             # 3장 손글씨 인식 (desktop_version / web_version)
   ├─ 투두앱/                 # 4~6장 할 일 관리 앱
   │  ├─ CLAUDE.md, PRD.md, step_prompts.md
   │  ├─ index.html, style.css, script.js
   │  ├─ 화면캡처.png
   │  └─ web_version/         # 데스크톱 최적화 버전
   └─ 퀴즈게임/               # 7~8장 상식 퀴즈 게임
      ├─ CLAUDE.md (교차 검증 가이드라인 포함), PRD.md
      ├─ index.html, style.css, script.js, quiz-data.js
      └─ .claude/commands/    # quiz-validate.md, quiz-range.md, quiz-add.md
```

## 주요 기능 요약
### 투두앱
- 추가/삭제/완료 체크, localStorage 저장 (새로고침해도 유지)
- 업무·개인·공부 카테고리, 색상 태그, 필터, "2시간 전" 상대 시간
- 진행률 대시보드(전체 + 카테고리별), 더블클릭 인라인 수정(Enter 저장 / Esc 취소)
- 다크 모드, 완료 항목 일괄 삭제, 실시간 검색, 남은 개수 배지, 단축키(Alt+N, Alt+1~4)
- JSON 내보내기/가져오기(백업 확인), 정렬(최신·카테고리·완료 상태·드래그 앤 드롭), 오늘의 격언
- 키워드 기반 자동 카테고리 분류 ('영화 보러 가기' → 개인, '내일 회사 스케줄 확인' → 업무)

### 퀴즈게임
- 한국사·세계지리·과학·예술과 문화 4개 카테고리 41문제 (`/quiz-add`로 추가한 1문제 포함)
- 정답/오답 즉시 피드백 + 해설, 최종 점수·정답률·카테고리별 결과, 명예의 전당(Top 10)
- 게임 모드: 전체 도전 / 카테고리별 10문제 / 스피드 퀴즈(20문제, 15초 제한)
- 점수: 난이도 배수, 빠른 정답·힌트 미사용 보너스, 연속 정답 콤보, 힌트 사용 시 −2점
- 모든 문제는 교차 검증 가이드라인 적용 (예: "세계에서 가장 긴 강은? (전통적 측정 기준)")
