import { StickerButton } from '../../components/StickerButton';
import { SurfaceCard } from '../../components/SurfaceCard';

type CameraIntroProps = { pending: boolean; error?: string | null; onStart: () => void };

export function CameraIntro({ pending, error, onStart }: CameraIntroProps) {
  return (
    <div className="entry-page camera-intro">
      <div className="camera-hero" aria-hidden="true">📷</div>
      <h1>이 게임에는<br /><span>카메라가 필요해요</span></h1>
      <p>지금 찍은 셀카로만 진행되는 게임이에요. 앨범 사진은 사용할 수 없어요.</p>
      <SurfaceCard className="camera-reasons">
        <div><span aria-hidden="true">🤖</span><p><strong>감정 판별에만 사용해요</strong><small>촬영한 사진으로 표정 점수를 계산해요.</small></p></div>
        <div><span aria-hidden="true">🗑️</span><p><strong>사진은 영구 저장하지 않아요</strong><small>영구 앨범이나 전적에는 남기지 않아요.</small></p></div>
        <div><span aria-hidden="true">👀</span><p><strong>제출 전까지 나만 볼 수 있어요</strong><small>확인하고 다시 찍을 수 있어요.</small></p></div>
      </SurfaceCard>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <StickerButton fullWidth disabled={pending} onClick={onStart}>
        {pending ? '브라우저 응답을 기다리고 있어요' : '카메라 켜기'}
      </StickerButton>
      <p className="field-help centered-copy">버튼을 누르면 브라우저가 카메라 권한을 물어봐요.</p>
    </div>
  );
}
