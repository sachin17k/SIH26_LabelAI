import React, { useEffect, useState } from 'react';
import { Users, Shield, History, Award, MapPin } from 'lucide-react';
import { authService } from '../services/api';
import { User } from '../types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uList = await authService.getUsers();
        setUsers(uList);
        const logs = await authService.getAuditLogs();
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load user management data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Enforcement Officers & Statutory Audit Trail
          </h1>
          <p className="text-xs text-slate-500">
            Role-Based Access Control, badge verification, and tamper-evident action logs
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Officer Roster
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Officer Name</th>
                <th className="px-6 py-3.5">Official Email</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Badge Number</th>
                <th className="px-6 py-3.5">Jurisdiction</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">{u.full_name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'SUPERVISOR'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-700">{u.badge_number || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-500">{u.jurisdiction || 'All Divisions'}</td>
                  <td className="px-6 py-4">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Officer</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Target ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 font-mono">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 font-bold text-slate-900">{log.action}</td>
                  <td className="px-6 py-3 text-slate-700">{log.user_email || 'System'}</td>
                  <td className="px-6 py-3 text-slate-500">{log.target_entity}</td>
                  <td className="px-6 py-3 text-sky-700">{log.target_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
