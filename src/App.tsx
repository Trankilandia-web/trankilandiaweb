import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import TourModal from './components/TourModal';
import LoginModal from './components/LoginModal';
import FloatingPassBadge from './components/FloatingPassBadge';
import HomePage from './pages/HomePage';
import ProtectedRoute from './components/portal/ProtectedRoute';

// Code-Splitting: Carga diferida de portales y páginas secundarias (< 250 KB initial bundle)
const AdminDashboard = lazy(() => import('./pages/portal/AdminDashboard'));
const CajaDashboard = lazy(() => import('./pages/portal/CajaDashboard'));
const EntrenadorDashboard = lazy(() => import('./pages/portal/EntrenadorDashboard'));
const ClientePortal = lazy(() => import('./pages/portal/ClientePortal'));
const PortalRedirect = lazy(() => import('./pages/portal/PortalRedirect'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const FacilitiesPage = lazy(() => import('./pages/FacilitiesPage'));

function AppContent() {
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [tourInitialPlan, setTourInitialPlan] = useState<string | undefined>(undefined);
  const location = useLocation();

  // Check if current route is a management portal route
  const isPortalRoute = ['/portal', '/admin', '/caja', '/entrenador', '/cliente'].some(
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
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-black">
      <ScrollToTop />

      {/* Public Navbar only on public website routes */}
      {!isPortalRoute && (
        <Navbar
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenTourModal={() => handleOpenTour()}
        />
      )}

      <main className="flex-1">
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
            {/* Public Landing & Marketing Routes */}
            <Route path="/" element={<HomePage onOpenTourModal={() => handleOpenTour()} />} />
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

            {/* Role Index & Management Portal Routes con Protección de Roles Estricta */}
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
                  <CajaDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entrenador"
              element={
                <ProtectedRoute allowedRoles={['admin', 'entrenador']}>
                  <EntrenadorDashboard />
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
          </Routes>
        </Suspense>
      </main>

      {/* Public Footer & Floating Badge only on public website routes */}
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
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
