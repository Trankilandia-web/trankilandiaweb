import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import TourModal from './components/TourModal';
import LoginModal from './components/LoginModal';
import FloatingPassBadge from './components/FloatingPassBadge';
import HomePage from './pages/HomePage';
import PlansPage from './pages/PlansPage';
import SchedulePage from './pages/SchedulePage';
import FacilitiesPage from './pages/FacilitiesPage';

export default function App() {
  const [isTourModalOpen, setIsTourModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [tourInitialPlan, setTourInitialPlan] = useState<string | undefined>(undefined);

  const handleOpenTour = (planId?: string) => {
    setTourInitialPlan(planId);
    setIsTourModalOpen(true);
  };

  const handleCloseTour = () => {
    setIsTourModalOpen(false);
  };

  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-zinc-950 text-white font-display antialiased selection:bg-amber-400 selection:text-black">
          <ScrollToTop />
          <Navbar
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onOpenTourModal={() => handleOpenTour()}
          />
          <main className="flex-1">
            <Routes>
              <Route
                path="/"
                element={<HomePage onOpenTourModal={() => handleOpenTour()} />}
              />
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer onOpenTourModal={() => handleOpenTour()} />
          <FloatingPassBadge onOpenTourModal={() => handleOpenTour()} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
