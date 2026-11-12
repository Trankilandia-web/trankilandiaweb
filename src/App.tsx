import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import TourModal from './components/TourModal';
import LoginModal from './components/LoginModal';
import FloatingPassBadge from './components/FloatingPassBadge';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/portal/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Code-Splitting: Carga diferida de portales y páginas secundarias (< 250 KB initial bundle)
const AdminDashboard = lazy(() => import('./pages/portal/AdminDashboard'));
const HubReceptionSimple = lazy(() => import('./pages/portal/HubReceptionSimple'));
const ClientePortal = lazy(() => import('./pages/portal/ClientePortal'));
const PortalRedirect = lazy(() => import('./pages/portal/PortalRedirect'));
const DesktopStaffLogin = lazy(() => import('./pages/portal/DesktopStaffLogin'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));

// Utilidad infalible para detectar entorno de escritorio (Electron App / Desktop Hub)
export function isDesktopEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'file:' ||
    /electron|trankilandiadesktopapp/i.test(navigator.userAgent) ||
    Boolean((window as any).electronAPI?.isElectron) ||
    sessionStorage.getItem('trankilandia_desktop_mode') === 'true'
  );
}

function AppContent() {
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [tourInitialPlan, setTourInitialPlan] = useState<string | undefined>(undefined);
  const location = useLocation();

  // Detectar modo escritorio (ejecutable Electron o acceso a /hub en navegador)
  const isDesktopMode = isDesktopEnvironment();

  // En modo escritorio NUNCA se muestran Navbar ni Footer públicos
  const isPortalRoute =
    isDesktopMode ||
    ['/portal', '/hub', '/admin', '/caja', '/entrenador', '/cliente'].some(
      (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
    );

  const handleOpenTour = (planId?: string) => {
    setTourInitialPlan(planId);
    setIsTourModalOpen(true);
  };

  const handleCloseTour = () => {
    setIsTourModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-black">
      <ScrollToTop />

      {/* Public Navbar solo en la web pública de clientes */}
      {!isPortalRoute && (
        <Navbar
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenTourModal={() => handleOpenTour()}
        />
      )}

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        <Suspense
          fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
              <div className="text-center space-y-3 font-mono">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-zinc-400">Cargando módulo Trankilandia Gym...</p>
              </div>
            </div>
          }
        >
          <Routes>
            {isDesktopMode ? (
              /* ==============================================================
                 MODO ESCRITORIO (PC DEL GIMNASIO · ELECTRON · HUB TERMINAL)
                 Cero web pública, cero landing page. Directo a Personal y PIN.
                 ============================================================== */
              <>
                <Route path="/" element={<DesktopStaffLogin />} />
                <Route path="/hub" element={<DesktopStaffLogin />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caja"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'caja']}>
                      <HubReceptionSimple />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cliente"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'caja', 'entrenador', 'cliente']}>
                      <ClientePortal />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
              /* ==============================================================
                 MODO WEB PÚBLICA (EXCLUSIVA PARA CLIENTES Y ACCESO A SOCIOS)
                 ============================================================== */
              <>
                {/* Public Landing & Marketing Routes */}
                <Route path="/" element={<HomePage onOpenTourModal={() => handleOpenTour()} />} />
                <Route path="/hub" element={<DesktopStaffLogin />} />
                <Route
                  path="/planes"
                  element={
                    <PlansPage
                      onSelectPlan={(id) => handleOpenTour(id)}
                      onOpenTourModal={() => handleOpenTour()}
                    />
                  }
                />
                <Route
                  path="/clases"
                  element={
                    <SchedulePage
                      onBookClass={() => handleOpenTour()}
                      onOpenTourModal={() => handleOpenTour()}
                    />
                  }
                />
                <Route
                  path="/instalaciones"
                  element={<FacilitiesPage onOpenTourModal={() => handleOpenTour()} />}
                />

                {/* Role Portals con Protección */}
                <Route path="/portal" element={<PortalRedirect />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caja"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'caja']}>
                      <HubReceptionSimple />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cliente"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'caja', 'entrenador', 'cliente']}>
                      <ClientePortal />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback to Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </Suspense>
      </main>

      {/* Public Footer & Floating Badge solo en la web pública */}
      {!isPortalRoute && <Footer onOpenTourModal={() => handleOpenTour()} />}
      {!isPortalRoute && <FloatingPassBadge onOpenTourModal={() => handleOpenTour()} />}

      {/* Global Modals */}
      <TourModal
        isOpen={isTourModalOpen}
        onClose={handleCloseTour}
        initialPlan={tourInitialPlan}
      />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenTourModal={() => handleOpenTour()}
      />
    </div>
  );
}

export default function App() {
  const isDesktop = isDesktopEnvironment();
  const Router = isDesktop ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
}
