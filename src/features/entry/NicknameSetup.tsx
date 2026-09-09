import { useEffect, useRef, useState, type FormEvent } from 'react';
import { StickerButton } from '../../components/StickerButton';
import { SurfaceCard } from '../../components/SurfaceCard';

type NicknameSetupProps = {
  initialNickname: string;
  pending: boolean;
  error: string | null;
  onSubmit: (nickname: string) => void;
};

export function NicknameSetup({ initialNickname, pending, error, onSubmit }: NicknameSetupProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setNickname(initialNickname);
  }, [initialNickname]);

  const normalized = nickname.trim();
  const valid = normalized.length >= 2 && normalized.length <= 10;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid && !pending) onSubmit(normalized);
  }

  return (
    <form className="entry-page" onSubmit={submit}>
      <header className="entry-header"><span aria-hidden="true">👋</span><p>친구들이 알아볼 이름을 정해 주세요</p></header>
      <SurfaceCard className="nickname-card">
        <h1>어떤 이름으로<br />참여할까요?</h1>
        <label htmlFor="nickname">닉네임</label>
        <div className="nickname-field">
          <input
            id="nickname"
            value={nickname}
            maxLength={10}
            autoComplete="nickname"
            enterKeyHint="next"
            autoFocus
            aria-describedby="nickname-help"
            aria-invalid={Boolean(error)}
            onChange={(event) => { dirty.current = true; setNickname(event.target.value); }}
          />
          <span aria-hidden="true">{nickname.length}/10</span>
        </div>
        <p id="nickname-help" className={error ? 'form-error' : 'field-help'}>
          {error ?? '2~10자로 입력해 주세요. 같은 이름도 사용할 수 있어요.'}
        </p>
      </SurfaceCard>
      <StickerButton fullWidth type="submit" disabled={!valid || pending} disabledReason={!valid ? '닉네임을 2~10자로 입력해 주세요' : undefined}>
        {pending ? '저장하고 있어요' : '다음'}
      </StickerButton>
    </form>
  );
}

