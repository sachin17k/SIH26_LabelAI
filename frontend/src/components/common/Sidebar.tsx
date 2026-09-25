import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, PlusCircle, PackageSearch, BookOpen, 
  ShieldCheck, HelpCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/new-inspection', label: 'New Inspection', icon: PlusCircle },
    { to: '/repository', label: 'Product Repository', icon: PackageSearch },
    { to: '/rules', label: 'Metrology Rule Book', icon: BookOpen },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-6">
        
        <div>
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Inspection Workstation
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                        : 'hover:bg-slate-800/80 hover:text-white text-slate-400'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-800 space-y-1">
        <div className="flex items-center space-x-2 text-[11px] text-slate-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Legal Metrology Engine</span>
        </div>
        <p className="text-[10px] text-slate-500">
          PC Rules 2011 & Amendments (194 Pages)
        </p>
      </div>

    </aside>
  );
};
