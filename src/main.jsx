import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { LicenseManager } from 'tldraw';

if (LicenseManager && LicenseManager.prototype) {
  LicenseManager.prototype.getIsDevelopment = function () {
    return true;
  };
}


const isMobileRoute = window.location.search.includes('mobileCam=true') || window.location.pathname.includes('/mobile');

const App = lazy(() => import('./App.jsx'));
const MobileUpload = lazy(() => import('./MobileUpload.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: '#0f172a', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
        Loading...
      </div>
    }>
      {isMobileRoute ? <MobileUpload /> : <App />}
    </Suspense>
  </StrictMode>
);
