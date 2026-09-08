import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { ConnectionState } from '../stores/roomStore';
import { StickerButton } from './StickerButton';

export function ConnectionNotice({ connection }: { connection: ConnectionState }) {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 10_000);
    return () => clearTimeout(timer);
  }, []);

  if (connection === 'connected') return null;
  const superseded = connection === 'superseded';
  return (
    <section className="connection-notice" aria-label="연결 상태">
      <p role="status">{superseded
        ? '다른 탭에서 접속했어요. 이 탭에서 계속하려면 다시 연결해 주세요.'
        : '연결을 확인하고 있어요. 연결이 복구되면 계속할 수 있어요.'}</p>
      {superseded || waited ? (
        <div className="error-view__actions">
          <StickerButton tone="plain" onClick={() => window.location.reload()}>다시 연결</StickerButton>
          <Link className="text-link" to="/">처음으로</Link>
        </div>
      ) : null}
    </section>
  );
}
