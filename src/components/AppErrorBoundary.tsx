import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { safeLogger } from '../logging/safeLogger';

type State = { failed: boolean };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    safeLogger.error('React 화면 렌더링 실패', { componentStack: info.componentStack ?? undefined });
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="centered-page" role="alert">
          <div className="error-emoji" aria-hidden="true">🛠️</div>
          <h1>화면을 불러오지 못했어요</h1>
          <p>페이지를 새로고침해 다시 시도해 주세요.</p>
          <button className="sticker-button sticker-button--plain" type="button" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

