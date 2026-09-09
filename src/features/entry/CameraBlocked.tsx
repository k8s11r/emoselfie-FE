import { useState } from 'react';
import type { CameraFailure } from '../../camera/permission';
import { StickerButton } from '../../components/StickerButton';
import { SurfaceCard } from '../../components/SurfaceCard';

type CameraBlockedProps = { reason: CameraFailure; pending: boolean; onRetry: () => void };

const content: Record<CameraFailure, { emoji: string; title: string; body: string }> = {
  denied: { emoji: '🙈', title: '카메라 없이는 참여할 수 없어요', body: '브라우저 설정에서 이 사이트의 카메라 권한을 허용해 주세요.' },
  no_device: { emoji: '🔌', title: '카메라를 찾을 수 없어요', body: '카메라가 있는 기기에서 초대 링크를 다시 열어 주세요.' },
  unavailable: { emoji: '📹', title: '카메라를 켤 수 없어요', body: '다른 앱에서 사용 중일 수 있어요. 영상통화나 카메라 앱을 닫고 다시 시도해 주세요.' },
  unsupported: { emoji: '🌐', title: '이 환경에서는 카메라를 사용할 수 없어요', body: '최신 iOS Safari 또는 Android Chrome에서 초대 링크를 열어 주세요.' },
  unknown: { emoji: '🛠️', title: '카메라를 켜지 못했어요', body: '잠시 후 다시 시도해 주세요.' },
};

export function CameraBlocked({ reason, pending, onRetry }: CameraBlockedProps) {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const view = content[reason];
  const showGuide = reason === 'denied';
  const steps = platform === 'ios'
    ? ['주소창의 페이지 메뉴를 열어요', '웹사이트 설정을 선택해요', '카메라를 허용하고 페이지로 돌아와요']
    : ['주소창 왼쪽 사이트 정보를 열어요', '권한 또는 사이트 설정을 선택해요', '카메라를 허용하고 페이지로 돌아와요'];

  return (
    <div className="entry-page camera-blocked">
      <div className="camera-hero" aria-hidden="true">{view.emoji}</div>
      <h1>{view.title}</h1>
      <p>{view.body}</p>
      {showGuide ? (
        <SurfaceCard className="permission-guide">
          <div className="platform-tabs" role="tablist" aria-label="브라우저 설정 방법">
            <button type="button" role="tab" aria-selected={platform === 'ios'} onClick={() => setPlatform('ios')}>iOS Safari</button>
            <button type="button" role="tab" aria-selected={platform === 'android'} onClick={() => setPlatform('android')}>Android Chrome</button>
          </div>
          <ol>{steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
        </SurfaceCard>
      ) : null}
      <StickerButton fullWidth disabled={pending || reason === 'no_device' || reason === 'unsupported'} onClick={onRetry}>
        {pending ? '확인하고 있어요' : '다시 시도'}
      </StickerButton>
    </div>
  );
}

