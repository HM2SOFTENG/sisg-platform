import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(password);
    if (success) {
      setLocation('/dashboard');
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[oklch(0.07_0.025_255)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-[#0066ff]/5 rounded-br-3xl"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#0066ff]/5 rounded-tl-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-[oklch(0.12_0.02_255)] border border-[#0066ff]/20 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#0066ff] flex items-center justify-center rounded-sm">
                <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <Terminal className="w-5 h-5 text-[#0066ff]" />
            </div>
            <h1 className="text-xs font-bold tracking-widest text-[#0066ff] mb-2" style={{ fontFamily: 'Sora, -apple-system, sans-serif' }}>
              SISG ENTERPRISE
            </h1>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold mb-6 text-center">
            <span className="bg-gradient-to-r from-[#0066ff] to-[#00d4ff] bg-clip-text text-transparent">
              Admin Access
            </span>
          </h2>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Password Input */}
            <div className="relative">
              <label className="block text-xs font-mono text-gray-400 mb-2">
                PASSWORD
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#0066ff]/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[oklch(0.08_0.015_255)] border border-[#0066ff]/20 rounded-lg pl-10 pr-12 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#0066ff]/50 focus:ring-1 focus:ring-[#0066ff]/20 transition"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-[#0066ff] transition"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs font-mono"
              >
                {error}
              </motion.div>
            )}

            {/* Authenticate Button */}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-[#0066ff] hover:bg-[#0052cc] disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg mt-6 transition duration-200 text-sm uppercase tracking-wide flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-[#0066ff]/10 text-center text-xs text-gray-500 font-mono">
            SISG Platform v1.0
          </div>
        </div>
      </motion.div>
    </div>
  );
}
