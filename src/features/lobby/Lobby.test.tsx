import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeRoom } from '../../api/roomEntry';
import { roomJoinedSchema, toLobbySnapshot } from '../../api/roomEntry';
import { useRoomStore } from '../../stores/roomStore';
import { roomJoinedFixture } from '../../tests/fixtures/room';
import { Lobby } from './Lobby';

vi.mock('../../realtime/socket', () => ({ connectRoomSocket: vi.fn(() => vi.fn()) }));
vi.mock('../../api/roomEntry', async (original) => ({ ...await original<typeof import('../../api/roomEntry')>(), closeRoom: vi.fn() }));
const clients: QueryClient[] = [];
function renderLobby() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter><Lobby /></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); } });
  useRoomStore.getState().hydrate(toLobbySnapshot(roomJoinedSchema.parse(roomJoinedFixture)));
  useRoomStore.getState().setConnection('connected');
});
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
  useRoomStore.getState().clear();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('Lobby controls and closure', () => {
  it('방 닫기를 확인한 후 HTTP 성공만으로도 종료 화면과 정리된 상태를 보여 준다', async () => {
    vi.mocked(closeRoom).mockResolvedValue({ ok: true });
    renderLobby();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '방 닫기' }));
    expect(closeRoom).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole('button', { name: '방 닫기' })[1]);
    expect(await screen.findByRole('heading', { name: '종료된 방이에요' })).toBeVisible();
    expect(closeRoom).toHaveBeenCalledWith(roomJoinedFixture.room.slug);
    expect(useRoomStore.getState().snapshot).toBeNull();
  });

  it('닫기 실패 시 방을 유지하고 서버 오류를 표시한다', async () => {
    vi.mocked(closeRoom).mockRejectedValue(new Error('offline'));
    renderLobby();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '방 닫기' }));
    await user.click(screen.getAllByRole('button', { name: '방 닫기' })[1]);
    expect(await screen.findByText('방을 닫지 못했어요.')).toBeVisible();
    expect(useRoomStore.getState().closedReason).toBeNull();
    expect(useRoomStore.getState().snapshot).not.toBeNull();
  });

  it('연결 단절 시 확인창을 닫고 관리 동작을 잠근다', async () => {
    renderLobby();
    await userEvent.setup().click(screen.getByRole('button', { name: '방 닫기' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    act(() => useRoomStore.getState().setConnection('reconnecting'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '설정 변경' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '방 닫기' })).toBeDisabled();
    expect(screen.getByRole('region', { name: '연결 상태' })).toBeVisible();
  });

  it('열려 있는 설정에서 방장 권한이 사라지면 설정을 숨긴다', async () => {
    renderLobby();
    await userEvent.setup().click(screen.getByRole('button', { name: '설정 변경' }));
    expect(screen.getByRole('group', { name: '라운드' })).toBeVisible();
    act(() => useRoomStore.getState().updateHost('42', true));
    expect(screen.queryByRole('group', { name: '라운드' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '방 닫기' })).not.toBeInTheDocument();
    expect(screen.getByText('방장이 잠시 자리를 비워 임시 방장이 진행하고 있어요.')).toBeVisible();
  });

  it('중복 탭으로 밀려나면 사용자 재연결 안내와 잠긴 버튼을 보여 준다', async () => {
    renderLobby();
    act(() => useRoomStore.getState().setConnection('superseded'));
    expect(screen.getByRole('button', { name: '다시 연결' })).toBeVisible();
    expect(screen.getByRole('button', { name: '설정 변경' })).toBeDisabled();
    act(() => useRoomStore.getState().close('expired'));
    await waitFor(() => expect(screen.getByText('오랫동안 활동이 없어 방이 종료됐어요.')).toBeVisible());
    expect(screen.queryByRole('button', { name: '다시 연결' })).not.toBeInTheDocument();
  });
});
