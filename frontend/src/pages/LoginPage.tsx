import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('inspector@labelguard.gov.in');
  const [password, setPassword] = useState<string>('Inspector@123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'INSPECTOR' | 'SUPERVISOR' | 'ADMIN') => {
    if (role === 'INSPECTOR') {
      setEmail('inspector@labelguard.gov.in');
      setPassword('Inspector@123');
    } else if (role === 'SUPERVISOR') {
      setEmail('supervisor@labelguard.gov.in');
      setPassword('Supervisor@123');
    } else {
      setEmail('admin@labelguard.gov.in');
      setPassword('Admin@123');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex flex-col justify-center items-center p-4">
      
      {/* Container */}
      <div className="max-w-md w-full space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-800 border border-sky-400/30 shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            LabelGuard AI
          </h1>
          <p className="text-xs text-sky-200 font-medium">
            Official Legal Metrology Packaged Commodity Compliance Inspection Platform
          </p>
          <div className="inline-block text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/80">
            Enforcing LM Act 2009 & LM-PC Rules 2011
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 backdrop-blur-xl space-y-5">
          
          {error && (
            <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="officer@labelguard.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/50 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate & Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick-Fill Demo Logins for Testing & Inspection Walkthrough */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider">
              Quick-Fill Role Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('INSPECTOR')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 text-center border border-slate-700 transition"
              >
                Inspector
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('SUPERVISOR')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 text-center border border-slate-700 transition"
              >
                Supervisor
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('ADMIN')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 text-center border border-slate-700 transition"
              >
                Admin
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Authorized Legal Metrology Personnel Only &bull; Access Monitored & Audited
        </p>

      </div>
    </div>
  );
};
