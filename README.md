# emoselfie-FE

이모셀피 모바일 웹 프론트엔드 프로젝트입니다.

## 개발 문서

- [Frontend 구현 명세](./spec.md)
- [개발 계획](./PLAN.md)
- [TODO](./TODO.md)

프로젝트 기반·공통 UI·입장·대기실과 카메라·업로드 모듈을 구현했습니다. 대기실에는 방 종료, 방장 변경, 연결 상태 안내와 접속 유지 처리가 연결되어 있습니다. 카운트다운·촬영·결과·미제출·최종 순위 화면과 snapshot 복원 경로를 연결했습니다. 현재 백엔드는 게임 중 state/재접속을 지원하지 않으므로 실서버 전체 복원은 백엔드 구현이 필요합니다. [게임 연동 계약](./GAME_CONTRACT.md)과 TODO에서 완료 범위·제안 필드·검증 기록을 확인할 수 있습니다.

## 로컬 실행

Node.js 22와 pnpm 11이 필요합니다.

```bash
pnpm install
pnpm dev
```

개발 서버는 `/api`, `/media`, `/socket.io` 요청을 기본적으로 `http://localhost:8000`에 전달합니다. 다른 백엔드를 사용할 때는 `VITE_DEV_BACKEND_TARGET`을 설정합니다.

세션 쿠키는 `Secure`로 발급되고 운영에서는 https로 서비스합니다. Safari는 http 오리진에서 `Secure` 쿠키를 저장하지 않으므로(localhost 포함, Chrome과 다름) 개발 프록시가 http 응답에 한해 이 속성만 제거합니다. `HttpOnly`, `SameSite`, 백엔드 응답 자체는 그대로입니다.

## 품질 검사

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

개발 서버의 `/__preview/game`에서 결과·최종·미제출 화면 예시를 볼 수 있습니다. 이 경로와 예시는 운영 빌드에 포함되지 않습니다.
