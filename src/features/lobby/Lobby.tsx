import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { closeRoom, startRoom, updateRoomSettings } from '../../api/roomEntry';
import { ApiError } from '../../api/errors';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { ParticipantRow } from '../../components/ParticipantRow';
import { SettingChips } from '../../components/SettingChips';
import { StatusBadge } from '../../components/StatusBadge';
import { StickerButton } from '../../components/StickerButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { ToastRegion } from '../../components/ToastRegion';
import { connectRoomSocket } from '../../realtime/socket';
import { useRoomStore } from '../../stores/roomStore';

const rounds = [{ value: 3, label: '3' }, { value: 5, label: '5' }, { value: 7, label: '7' }] as const;
const times = [{ value: 15, label: '15초' }, { value: 20, label: '20초' }, { value: 30, label: '30초' }] as const;

export function Lobby() {
  const snapshot = useRoomStore((state) => state.snapshot);
  const roomSlug = snapshot?.room.slug;
  const connection = useRoomStore((state) => state.connection);
  const updateSettingsInStore = useRoomStore((state) => state.updateSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomSlug) return;
    return connectRoomSocket(roomSlug);
  }, [roomSlug]);

  const settingsMutation = useMutation({
    mutationFn: (settings: { roundCount: 3 | 5 | 7; timeLimitSec: 15 | 20 | 30 }) => updateRoomSettings(snapshot!.room.slug, settings),
    onSuccess(settings) { updateSettingsInStore(settings); setSettingsOpen(false); },
    onError(value) { setError(value instanceof ApiError ? value.message : '설정을 바꾸지 못했어요.'); },
  });
  const startMutation = useMutation({
    mutationFn: () => startRoom(snapshot!.room.slug),
    onError(value) { setError(value instanceof ApiError ? value.message : '게임을 시작하지 못했어요.'); },
  });
  const closeMutation = useMutation({
    mutationFn: () => closeRoom(snapshot!.room.slug),
    onSuccess() { setCloseOpen(false); },
    onError(value) { setError(value instanceof ApiError ? value.message : '방을 닫지 못했어요.'); },
  });

  const inviteUrl = useMemo(() => snapshot ? new URL(`/r/${snapshot.room.slug}`, window.location.origin).toString() : '', [snapshot]);

  if (!snapshot) return null;

  const activeParticipants = snapshot.participants.filter((participant) => participant.status === 'active');
  const canStart = activeParticipants.length >= 2 && connection === 'connected';
  const settings = snapshot.room.settings;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setToast('초대 링크를 복사했어요');
    } catch {
      setError('링크를 복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.');
    }
  }

  return (
    <div className="lobby-page">
      <header className="lobby-header">
        <div><StatusBadge tone="mint">대기 중</StatusBadge><h1>{settings.roundCount}라운드 · {settings.timeLimitSec}초</h1></div>
        <span className={`connection-dot connection-dot--${connection}`}>{connection === 'connected' ? '연결됨' : '연결 확인 중'}</span>
      </header>

      {snapshot.me.isHost ? (
        <div className="host-actions">
          <button type="button" onClick={() => setSettingsOpen((value) => !value)}>설정 변경</button>
          <button type="button" onClick={() => setCloseOpen(true)}>방 닫기</button>
        </div>
      ) : null}

      {settingsOpen ? (
        <SurfaceCard className="lobby-settings">
          <SettingChips legend="라운드" name="lobby-rounds" value={settings.roundCount} options={rounds} onChange={(roundCount) => settingsMutation.mutate({ roundCount, timeLimitSec: settings.timeLimitSec })} disabled={settingsMutation.isPending} />
          <SettingChips legend="제한시간" name="lobby-time" value={settings.timeLimitSec} options={times} onChange={(timeLimitSec) => settingsMutation.mutate({ roundCount: settings.roundCount, timeLimitSec })} disabled={settingsMutation.isPending} />
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="invite-card">
        <div><span aria-hidden="true">🔗</span><div><strong>초대 링크</strong><small>{inviteUrl}</small></div></div>
        <StickerButton tone="yellow" onClick={copyInvite}>복사</StickerButton>
      </SurfaceCard>

      <section className="participant-section" aria-labelledby="participants-title">
        <div className="section-title"><h2 id="participants-title">방에 있는 사람</h2><StatusBadge>{activeParticipants.length} / 12명</StatusBadge></div>
        <ul>{snapshot.participants.map((participant) => <ParticipantRow key={participant.participantId} participant={participant} isMe={participant.participantId === snapshot.me.participantId} />)}</ul>
      </section>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {snapshot.me.isHost ? (
        <StickerButton fullWidth disabled={!canStart || startMutation.isPending} disabledReason={!canStart ? '연결된 참여자가 2명 이상 모이면 시작할 수 있어요' : undefined} onClick={() => startMutation.mutate()}>
          {startMutation.isPending ? '시작하고 있어요' : `시작하기 · ${settings.roundCount}라운드`}
        </StickerButton>
      ) : <p className="waiting-copy">방장이 시작하기를 기다리는 중이에요.</p>}

      <ConfirmSheet open={closeOpen} title="방을 닫을까요?" description="방을 닫으면 모든 참여자가 나가게 돼요." confirmLabel="방 닫기" pending={closeMutation.isPending} onCancel={() => setCloseOpen(false)} onConfirm={() => closeMutation.mutate()} />
      <ToastRegion message={toast} />
    </div>
  );
}
