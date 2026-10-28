import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PortalRedirect() {
  const { role, getRedirectPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const target = getRedirectPath();
    navigate(target, { replace: true });
  }, [role, getRedirectPath, navigate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
      <div className="text-center space-y-3 font-mono">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-zinc-400">Redirigiendo a tu portal de Trankilandia...</p>
      </div>
    </div>
  );
}
