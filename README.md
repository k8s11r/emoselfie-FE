# emoselfie-FE

이모셀피 모바일 웹 프론트엔드 프로젝트입니다.

## 개발 문서

- [Frontend 구현 명세](./spec.md)
- [개발 계획](./PLAN.md)
- [TODO](./TODO.md)

Phase 0 프로젝트 기반과 Phase 1 핵심 컴포넌트를 구현했습니다. 현재 작업 상태와 다음 항목은 TODO에서 확인할 수 있습니다.

## 로컬 실행

Node.js 22와 pnpm 11이 필요합니다.

```bash
pnpm install
pnpm dev
```

개발 서버는 `/api`, `/media`, `/socket.io` 요청을 기본적으로 `http://localhost:8000`에 전달합니다. 다른 백엔드를 사용할 때는 `VITE_DEV_BACKEND_TARGET`을 설정합니다.

## 품질 검사

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
