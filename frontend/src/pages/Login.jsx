import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Wrench, ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-brand-500/25">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Khodiyar Steel Fabrication
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Business Owner Admin Portal</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                placeholder="e.g. sharmaprayag78@gmail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In as Owner'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
