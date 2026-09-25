import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, CheckCircle2, AlertOctagon, Clock, 
  PlusCircle, ArrowRight, Eye, Sparkles, ShieldCheck
} from 'lucide-react';
import { dashboardService, inspectionService } from '../services/api';
import { DashboardSummary, Inspection } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInspections, setRecentInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sumData, inspData] = await Promise.all([
          dashboardService.getSummary(),
          inspectionService.getInspections()
        ]);
        setSummary(sumData);
        setRecentInspections(inspData.slice(0, 8));
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading Inspection Workstation...</span>
        </div>
      </div>
    );
  }

  const totalInspections = summary?.total_inspections || 0;
  const nonCompliant = (summary?.confirmed_violations_count || 0) + (summary?.potential_violations_count || 0);
  const compliant = summary?.compliant_count ?? Math.max(0, (summary?.total_products_scanned || 0) - nonCompliant);
  const pendingReviews = summary?.pending_review_count || 0;

  const statCards = [
    {
      title: 'Total Inspections',
      value: totalInspections,
      icon: ClipboardCheck,
      color: 'from-blue-600 to-indigo-700',
      textColor: 'text-blue-600',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200/80',
      hoverBorder: 'hover:border-blue-400',
      link: '/repository?status=ALL',
      detailLabel: 'View All Products'
    },
    {
      title: 'Compliant Products',
      value: compliant,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-700',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50',
      border: 'border-emerald-200/80',
      hoverBorder: 'hover:border-emerald-400',
      link: '/repository?status=COMPLIANT',
      detailLabel: 'View Compliant'
    },
    {
      title: 'Non-Compliant Products',
      value: nonCompliant,
      icon: AlertOctagon,
      color: 'from-rose-600 to-red-700',
      textColor: 'text-rose-600',
      bgLight: 'bg-rose-50',
      border: 'border-rose-200/80',
      hoverBorder: 'hover:border-rose-400',
      link: '/repository?status=POTENTIAL_NON_COMPLIANCE',
      detailLabel: 'View Violations'
    },
    {
      title: 'Pending Reviews',
      value: pendingReviews,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50',
      border: 'border-amber-200/80',
      hoverBorder: 'hover:border-amber-400',
      link: '/repository?status=OFFICER_REVIEW_REQUIRED',
      detailLabel: 'Review Needed'
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Inspection Workstation Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Legal Metrology Packaged Commodities Rule Compliance Monitoring
          </p>
        </div>
        <Link
          to="/new-inspection"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create New Inspection</span>
        </Link>
      </div>

      {/* Exactly 4 Clean & Visually Appealing Interactive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.link)}
              className={`bg-white rounded-2xl border ${card.border} ${card.hoverBorder} p-5 shadow-xs transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer group flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-800 transition">
                    {card.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${card.bgLight} ${card.textColor} group-hover:scale-110 transition`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {card.value}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-sky-600 transition">
                <span>{card.detailLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Inspections Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Recent Commodity Inspections
            </h3>
            <p className="text-xs text-slate-500">
              Latest packaged items audited against Legal Metrology Rules
            </p>
          </div>
          <Link
            to="/repository"
            className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center space-x-1"
          >
            <span>View All in Repository</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Reference Number</th>
                <th className="px-6 py-3.5">Product / Commodity</th>
                <th className="px-6 py-3.5">Audit Date</th>
                <th className="px-6 py-3.5">Compliance State</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInspections.length > 0 ? (
                recentInspections.map((insp) => {
                  const firstProd = insp.products && insp.products.length > 0 ? insp.products[0] : null;
                  const isCompliant = firstProd?.compliance_status === 'COMPLIANT';
                  const isViolation = firstProd?.compliance_status === 'CONFIRMED_NON_COMPLIANCE' || firstProd?.compliance_status === 'POTENTIAL_NON_COMPLIANCE';

                  return (
                    <tr key={insp.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4 font-mono font-bold text-sky-700">
                        <Link
                          to={`/inspections/${insp.id}`}
                          className="hover:underline hover:text-sky-900 transition"
                          title="View Inspection Dossier"
                        >
                          {insp.inspection_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {firstProd?.product_name || 'Packaged Commodity'}
                        {firstProd?.brand && (
                          <span className="block text-[11px] font-normal text-slate-500">
                            {firstProd.brand}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {insp.scheduled_date ? new Date(insp.scheduled_date).toLocaleDateString() : 'Today'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isCompliant
                            ? 'bg-emerald-100 text-emerald-800'
                            : isViolation
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {firstProd?.compliance_status ? firstProd.compliance_status.replace(/_/g, ' ') : insp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={firstProd ? `/products/${firstProd.id}/scan` : `/inspections/${insp.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg font-bold transition border border-slate-200"
                          title="View Audit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Audit</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No inspections conducted yet. Click "+ Create New Inspection" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
