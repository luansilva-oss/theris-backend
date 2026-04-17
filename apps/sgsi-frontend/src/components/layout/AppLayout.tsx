import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar />
      <main className="flex-1 ml-56 p-8">
        <Outlet />
      </main>
    </div>
  );
}
