# P 캘린더

React 19 + Vite + Tailwind 기반의 감각 캘린더 실험 프로젝트입니다. Supabase 인증을 이용해 게스트/로그인 상태를 구분합니다.

## 디자이너용 빠른 시연 세팅

> 디자인 확인만 필요하면 아래 순서만 따르면 됩니다. 코드 수정은 `src/App.jsx` 와 `src/index.css` 정도만 보면 됩니다.

1. **Node 20+** 설치 (nvm 권장)
2. GitHub 레포 클론
   ```bash
   git clone https://github.com/yoonseo-100/P-calendar.git
   cd P-calendar
   ```
3. 의존성 설치
   ```bash
   npm install
   ```
4. `.env.local` 생성 (키는 운영자가 전달)
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
5. 미리보기 실행
   ```bash
   npm run dev
   ```
6. 브라우저에서 `http://localhost:5173` 접속 → 헤더 우측 뱃지가 `자동 로그인 완료` 로 뜨는지 확인

### 디자인 포인트

- 컴포넌트 구조: `src/App.jsx` 하나로 전체 UI 구성 → 원하는 섹션만 찾아 빠르게 수정 가능
- 색/폰트: 기본값은 `src/index.css` 와 Tailwind config 에 정의, 색상 토큰 변경 시 즉시 반영
- 이미지/아이콘: `tabs`, `coverThemes`, `sampleEvents` 등의 상단 배열만 바꾸면 UI가 즉시 업데이트되어 프로토타입 확인이 쉽습니다.

## 개발 환경 준비

1. 의존성 설치
   ```bash
   npm install
   ```
2. 개발 서버 실행
   ```bash
   npm run dev
   ```

## Supabase 연동

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 새 프로젝트를 생성합니다.
2. `프로젝트 설정 → API` 에서 **Project URL** 과 **anon public key** 를 확인합니다.
3. 레포 루트에 `.env.local` 파일을 만들고 아래 값을 채워 넣습니다. (커밋 금지)
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. 개발 서버를 재시작하면 `src/lib/supabaseClient.js` 에서 해당 값으로 클라이언트를 생성하고 `App.jsx` 가 세션을 조회합니다.

> 참고: 예시는 `env.example` 에서 확인할 수 있습니다. 실제 키는 절대 버전에 올리지 마세요.

## 프로젝트 구조

- `src/App.jsx` : 메인 UI, Supabase 세션 상태 표시
- `src/lib/supabaseClient.js` : Supabase JS v2 클라이언트
- `tailwind.config.js` : Tailwind 프리셋

## 배포

```bash
npm run build
npm run preview
```
