import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { ApiError } from '../../api/errors';
import { getRoomPreview, getRoomState, joinRoom, type LobbySnapshot } from '../../api/roomEntry';
import { getMe, updateNickname } from '../../api/session';
import { CameraAccessError, type CameraFailure, verifyCameraAccess } from '../../camera/permission';
import { ErrorView } from '../../components/ErrorView';
import { CameraBlocked } from '../entry/CameraBlocked';
import { CameraIntro } from '../entry/CameraIntro';
import { NicknameSetup } from '../entry/NicknameSetup';
import { Lobby } from '../lobby/Lobby';
import { useRoomStore } from '../../stores/roomStore';

type EntryStep = 'nickname' | 'camera' | 'blocked' | 'lobby';

async function bootstrapRoom(slug: string) {
  try {
    return { kind: 'restored' as const, snapshot: await getRoomState(slug) };
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'NOT_A_PARTICIPANT') {
      throw error;
    }
  }

  return { kind: 'new' as const, preview: await getRoomPreview(slug) };
}

function errorCopy(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'ROOM_NOT_FOUND':
        return { title: '방을 찾을 수 없어요', description: '초대 링크를 다시 확인해 주세요.' };
      case 'ROOM_CLOSED':
        return { title: '종료된 방이에요', description: '새 방을 만들어 친구들을 다시 초대해 주세요.' };
      case 'ROOM_FULL':
        return { title: '방이 가득 찼어요', description: '최대 12명까지 참여할 수 있어요.' };
      case 'ROOM_FINISHED':
        return { title: '이미 끝난 게임이에요', description: '새 방을 만들어 다음 게임을 시작해 주세요.' };
      default:
        return { title: error.message, description: '잠시 후 다시 시도해 주세요.' };
    }
  }

  return { title: '방에 들어가지 못했어요', description: '네트워크 연결을 확인하고 다시 시도해 주세요.' };
}

export default function RoomPage() {
  const { slug = '' } = useParams();
  const validSlug = /^[A-Za-z0-9_-]{12,}$/.test(slug);
  const hydrate = useRoomStore((state) => state.hydrate);
  const clear = useRoomStore((state) => state.clear);
  const [step, setStep] = useState<EntryStep>('nickname');
  const [nickname, setNickname] = useState('');
  const [cameraFailure, setCameraFailure] = useState<CameraFailure>('unknown');
  const [entryError, setEntryError] = useState<string | null>(null);

  const meQuery = useQuery({ queryKey: ['me'], queryFn: getMe, enabled: validSlug });
  const roomQuery = useQuery({
    queryKey: ['room-entry', slug],
    queryFn: () => bootstrapRoom(slug),
    enabled: validSlug && meQuery.isSuccess,
    retry: (count, error) => count < 1 && !(error instanceof ApiError && ['ROOM_NOT_FOUND', 'ROOM_CLOSED', 'ROOM_FULL'].includes(error.code)),
  });

  useEffect(() => {
    clear();
    return clear;
  }, [clear, slug]);

  useEffect(() => {
    if (roomQuery.data?.kind === 'restored') {
      hydrate(roomQuery.data.snapshot);
    }
  }, [hydrate, roomQuery.data]);

  const nicknameMutation = useMutation({
    mutationFn: updateNickname,
    onSuccess(data, submittedNickname) {
      setNickname(data.nickname ?? submittedNickname);
      setEntryError(null);
      setStep('camera');
    },
    onError(error) {
      setEntryError(error instanceof ApiError ? error.message : '닉네임을 저장하지 못했어요.');
    },
  });

  const cameraMutation = useMutation({
    mutationFn: async (): Promise<LobbySnapshot> => {
      await verifyCameraAccess();
      await joinRoom(slug, nickname);
      return getRoomState(slug);
    },
    onMutate() {
      setEntryError(null);
    },
    onSuccess(snapshot) {
      hydrate(snapshot);
      setEntryError(null);
      setStep('lobby');
    },
    onError(error) {
      if (error instanceof CameraAccessError) {
        setCameraFailure(error.reason);
        setStep('blocked');
      } else {
        setEntryError(error instanceof ApiError ? error.message : '입장을 완료하지 못했어요. 다시 시도해 주세요.');
      }
    },
  });

  if (!validSlug) {
    return <ErrorView title="방을 찾을 수 없어요" description="초대 링크를 다시 확인해 주세요." />;
  }

  // A disabled dependent query is also pending. Surface session failures first
  // so a failed cookie bootstrap cannot leave the entry screen loading forever.
  if (meQuery.error) {
    return <ErrorView title="참여 정보를 불러오지 못했어요" description="네트워크 연결을 확인해 주세요." onRetry={() => meQuery.refetch()} />;
  }

  if (roomQuery.isPending || meQuery.isPending) {
    return <div className="route-status" role="status">방에 들어갈 준비를 하고 있어요</div>;
  }

  if (roomQuery.error) {
    const copy = errorCopy(roomQuery.error);
    return <ErrorView {...copy} onRetry={() => roomQuery.refetch()} />;
  }

  if (roomQuery.data?.kind === 'new' && roomQuery.data.preview.isFull) {
    return <ErrorView title="방이 가득 찼어요" description="최대 12명까지 참여할 수 있어요." onRetry={() => roomQuery.refetch()} />;
  }

  if (roomQuery.data?.kind === 'restored' || step === 'lobby') return <Lobby />;
  if (step === 'camera') return <CameraIntro pending={cameraMutation.isPending} error={entryError} onStart={() => cameraMutation.mutate()} />;
  if (step === 'blocked') return <CameraBlocked reason={cameraFailure} pending={cameraMutation.isPending} onRetry={() => cameraMutation.mutate()} />;

  return (
    <NicknameSetup
      initialNickname={nickname || meQuery.data?.nickname || ''}
      pending={nicknameMutation.isPending}
      error={entryError}
      onSubmit={(value) => nicknameMutation.mutate(value)}
    />
  );
}
