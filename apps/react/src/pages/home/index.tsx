import { Link } from 'react-router';
import reactLogo from '../../assets/react.svg';
import viteLogo from '/vite.svg';
import { Button } from '@design-system/ui';
import { css } from '@design-system/ui-lib/css';

export function HomePage() {
  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <div
          className={css({
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            justifyContent: 'center',
          })}
        >
          <Link to="/toast">
            <Button>Toast 예제 보기</Button>
          </Link>
        </div>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}