import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, CheckCircle2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand & Workstation Name */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 flex items-center justify-center shadow-md border border-sky-400/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                LabelGuard AI
              </span>
              <span className="text-[10px] font-semibold text-slate-400 border-l border-slate-700 pl-2">
                Commodity Inspection Station
              </span>
            </div>
          </div>

          {/* Right Status & Simple Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold">100% Offline Metrology Engine</span>
            </div>

            {user && (
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-red-950/80 hover:text-red-300 text-slate-300 text-xs font-semibold transition border border-slate-700 hover:border-red-800 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
