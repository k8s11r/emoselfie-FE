import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="centered-page">
      <div className="error-emoji" aria-hidden="true">🧭</div>
      <h1>길을 잃었어요</h1>
      <p>주소를 확인하거나 처음 화면으로 돌아가 주세요.</p>
      <Link className="text-link" to="/">처음으로</Link>
    </div>
  );
}

