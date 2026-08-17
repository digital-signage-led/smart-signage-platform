import { Sidebar } from './components/layout/Sidebar';
import { Modal, Toast } from './components/ui';
import { AppProvider, useApp } from './context/AppContext';
import { getPageModule } from './core/moduleRegistry';
import { L } from './i18n/labels';
import { tokens, font } from './tokens';

function AppShell() {
  const { page, confirm, closeConfirm, toast } = useApp();
  const mod = getPageModule(page);
  const PageView = mod.component;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        background: tokens.bg.base,
        color: tokens.text.primary,
        fontFamily: font,
        overflow: 'hidden',
      }}
    >
      <Sidebar />
      <PageView />

      <Modal
        open={confirm.open}
        title={confirm.title ?? ''}
        message={confirm.message ?? ''}
        confirmLabel={confirm.confirmLabel ?? L.common.run}
        danger={confirm.danger}
        onConfirm={() => { confirm.onConfirm?.(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
      <Toast show={toast.show} message={toast.msg} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
