import type { Participant } from '../api/roomEntry';
import { StatusBadge } from './StatusBadge';

const colors = ['#FFD72F', '#FF3D86', '#8F66FF', '#5AC8FF', '#80EFD6', '#B8F16A', '#FF5A47', '#FFC07A', '#A8E6CF', '#C7B8FF', '#91D7FF', '#F7A8C4'];

type ParticipantRowProps = { participant: Participant; isMe: boolean };

export function ParticipantRow({ participant, isMe }: ParticipantRowProps) {
  return (
    <li className="participant-row">
      <span className="participant-avatar" style={{ backgroundColor: colors[participant.colorTag] }} aria-hidden="true">
        {participant.nickname.slice(0, 1)}
      </span>
      <span className="participant-row__identity">
        <strong>{participant.nickname}{isMe ? ' (나)' : ''}</strong>
        <small>{participant.connectionStatus === 'connected' ? '연결됨' : '연결 끊김'}</small>
      </span>
      {participant.isHost ? <StatusBadge tone="yellow">방장</StatusBadge> : null}
    </li>
  );
}

