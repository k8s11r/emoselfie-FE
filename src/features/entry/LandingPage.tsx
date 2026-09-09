import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createRoom } from '../../api/rooms';
import { ApiError } from '../../api/errors';
import { SettingChips } from '../../components/SettingChips';
import { StatusBadge } from '../../components/StatusBadge';
import { StickerButton } from '../../components/StickerButton';
import { SurfaceCard } from '../../components/SurfaceCard';
import { ToastRegion } from '../../components/ToastRegion';

const roundOptions = [
  { value: 3, label: '3', description: '가볍게' },
  { value: 5, label: '5', description: '기본' },
  { value: 7, label: '7', description: '끝까지' },
] as const;

const timeOptions = [
  { value: 15, label: '15초', description: '순간포착' },
  { value: 20, label: '20초', description: '기본' },
  { value: 30, label: '30초', description: '넉넉하게' },
] as const;

export default function LandingPage() {
  const navigate = useNavigate();
  const [roundCount, setRoundCount] = useState<3 | 5 | 7>(5);
  const [timeLimitSec, setTimeLimitSec] = useState<15 | 20 | 30>(20);
  const [toast, setToast] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createRoom,
    onSuccess(room) {
      if (room.existing) setToast('이미 만든 방으로 이동했어요');
      window.setTimeout(() => navigate(`/r/${room.slug}`), room.existing ? 350 : 0);
    },
  });

  const errorMessage = mutation.error
    ? mutation.error instanceof ApiError
      ? mutation.error.message
      : '방을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
    : null;

  return (
    <div className="landing-page">
      <header className="brand-header">
        <StatusBadge tone="yellow">앱 설치 없이 바로</StatusBadge>
        <span className="player-count">2~12명</span>
      </header>

      <section className="hero" aria-labelledby="landing-title">
        <div className="hero__faces" aria-hidden="true">😆 😲 😐</div>
        <h1 id="landing-title"><span>감정 하나,</span><br />셀카 한 장</h1>
        <p>화면에 뜬 감정을 제한 시간 안에 표현해 보세요. AI가 얼마나 닮았는지 점수로 알려줘요.</p>
      </section>

      <SurfaceCard className="settings-card">
        <h2>방 설정</h2>
        <SettingChips
          legend="몇 라운드로 놀까요?"
          name="round-count"
          value={roundCount}
          options={roundOptions}
          onChange={setRoundCount}
          disabled={mutation.isPending}
        />
        <SettingChips
          legend="한 장 찍을 시간은?"
          name="time-limit"
          value={timeLimitSec}
          options={timeOptions}
          onChange={setTimeLimitSec}
          disabled={mutation.isPending}
        />
      </SurfaceCard>

      <div className="privacy-note">
        <span aria-hidden="true">📷</span>
        <p>카메라가 필요한 게임이에요. 사진은 영구 저장하지 않아요.</p>
      </div>

      {errorMessage ? <p className="form-error" role="alert">{errorMessage}</p> : null}

      <StickerButton
        id="create-room"
        fullWidth
        disabled={mutation.isPending}
        onClick={() => mutation.mutate({ roundCount, timeLimitSec })}
      >
        {mutation.isPending ? '방을 만들고 있어요' : '방 만들기'}
      </StickerButton>
      <p className="cookie-note">익명 참여와 방 복원을 위해 브라우저 쿠키를 사용해요.</p>
      <ToastRegion message={toast} />
    </div>
  );
}
