import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Shield } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/admin/login");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[oklch(0.07_0.025_255)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#0066ff]/20 border border-[#0066ff]/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-6 h-6 text-[#0066ff]" />
          </div>
          <div className="text-gray-500 text-xs font-mono">Verifying access...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
