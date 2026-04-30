import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ServicesPage from './pages/ServicesPage';
import AccessPointsPage from './pages/AccessPointsPage';
import LogsPage from './pages/LogsPage';
import SettingsPage from './pages/SettingsPage';
import { getConfig } from './services/config';
import { initTheme } from './utils/theme';

function App() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getConfig()
      .then(config => initTheme(config.app_theme))
      .then(fn => { unlisten = fn; })
      .catch(err => console.error('Failed to initialize theme:', err));
    return () => { unlisten?.(); };
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/services" replace />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/access-points" element={<AccessPointsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
