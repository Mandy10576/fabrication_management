import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Wrench, ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // 100dvh rather than 100vh: on mobile browsers the toolbar chrome makes
    // 100vh taller than the visible area, which pushed the card off screen.
    <div className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center p-4 py-10 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/3 w-72 sm:w-96 h-72 sm:h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/3 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-pop backdrop-blur-xl relative z-10">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/25">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Khodiyar Steel Fabrication
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5 font-medium flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Business Owner Admin Portal</span>
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-sm font-medium flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-[1.15rem] h-[1.15rem] text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-[1.15rem] h-[1.15rem] text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                {showPassword ? <EyeOff className="w-[1.15rem] h-[1.15rem]" /> : <Eye className="w-[1.15rem] h-[1.15rem]" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent w-full min-h-[3rem] text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>Sign In as Owner</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
