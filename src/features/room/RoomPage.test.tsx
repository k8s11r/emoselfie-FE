import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RoomPage from './RoomPage';

const clients: QueryClient[] = [];
function renderRoom() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/r/Xk9mQ2vB7nLp']}>
        <Routes><Route path="/r/:slug" element={<RoomPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const session = { nickname: null, hasActiveRoom: false, activeRoomSlug: null };
function roomResponse(path: string) {
  if (path.endsWith('/state')) return json({ error: { code: 'NOT_A_PARTICIPANT', message: '먼저 입장해 주세요' } }, 403);
  return json({ exists: true, status: 'waiting', isFull: false, isHost: false, settings: { roundCount: 5, timeLimitSec: 20 } });
}

afterEach(() => { clients.splice(0).forEach((client) => client.clear()); vi.unstubAllGlobals(); });

describe('RoomPage session bootstrap', () => {
  it('세션 응답 전에는 방 요청을 보내지 않고, 이후 상태 조회와 신규 입장 조회를 순서대로 보낸다', async () => {
    let resolveSession!: (response: Response) => void;
    const pendingSession = new Promise<Response>((resolve) => { resolveSession = resolve; });
    const fetchMock = vi.fn((path: string) => path === '/api/me' ? pendingSession : Promise.resolve(roomResponse(path)));
    vi.stubGlobal('fetch', fetchMock);
    renderRoom();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/me');
    await act(async () => { resolveSession(json(session)); });
    expect(await screen.findByRole('textbox', { name: '닉네임' })).toBeVisible();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/me', '/api/rooms/Xk9mQ2vB7nLp/state', '/api/rooms/Xk9mQ2vB7nLp',
    ]);
  });

  it('세션 실패 시 무한 대기 대신 재시도를 제공하고 성공 후에만 방을 조회한다', async () => {
    let attempts = 0;
    const fetchMock = vi.fn(async (path: string) => {
      if (path === '/api/me') return ++attempts === 1
        ? json({ error: { code: 'UNAVAILABLE', message: '잠시 후 다시 시도해 주세요' } }, 503)
        : json(session);
      return roomResponse(path);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderRoom();
    expect(await screen.findByRole('heading', { name: '참여 정보를 불러오지 못했어요' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.setup().click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('textbox', { name: '닉네임' })).toBeVisible();
    expect(fetchMock.mock.calls.map(([path]) => path).slice(0, 3)).toEqual([
      '/api/me', '/api/me', '/api/rooms/Xk9mQ2vB7nLp/state',
    ]);
  });
});
