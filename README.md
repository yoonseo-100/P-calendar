# P 캘린더

React 19 + Vite + Tailwind 기반의 감각 캘린더 실험 프로젝트입니다. Supabase 인증을 이용해 게스트/로그인 상태를 구분합니다.

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
