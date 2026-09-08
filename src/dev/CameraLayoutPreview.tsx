import { useRef } from 'react';
import { CameraPreview } from '../components/CameraPreview';
import { ServerTimer } from '../components/ServerTimer';
import { SubmissionCounter } from '../components/SubmissionCounter';

// Layout fixture: no camera permission or real media is requested.
export function CameraLayoutPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  return <main className="capture-stage">
    <header className="capture-stage__header"><SubmissionCounter submitted={1} total={5} /><span className="round-label">1 / 5 라운드</span><ServerTimer endsAtMs={0} label="촬영 마감까지" /></header>
    <section className="emotion-prompt"><span aria-hidden="true">😲</span><div><h1>놀람</h1><p>뒤에서 누가 부른 것처럼</p></div></section>
    <div className="capture-frame"><CameraPreview videoRef={videoRef} phase="starting" slow={false} failure={null} onRetry={() => {}} /></div>
    <div className="shutter-area"><button className="shutter-button" type="button" aria-label="사진 촬영" disabled><span /></button><p>카메라 권한을 요청하지 않는 레이아웃 점검 화면이에요.</p></div>
  </main>;
}
