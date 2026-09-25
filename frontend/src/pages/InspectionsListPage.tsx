import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, Filter, ClipboardList, Eye, Camera } from 'lucide-react';
import { inspectionService } from '../services/api';
import { Inspection, InspectionStatus } from '../types';
import { InstantScanModal } from '../components/inspection/InstantScanModal';

export const InspectionsListPage: React.FC = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const data = await inspectionService.getInspections({
        search: search || undefined,
        status: statusFilter || undefined
      });
      setInspections(data);
    } catch (err) {
      console.error('Failed to load inspections', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInspections();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Inspection Dossiers & Audits
          </h1>
          <p className="text-xs text-slate-500">
            Official packaged commodity inspections conducted across retail stores and warehouses
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>⚡ Instant Photo Scan</span>
          </button>
          <Link
            to="/inspections/new"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual Dossier</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Establishment name, Location, or Inspection Number..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ANALYSIS_COMPLETE">Analysis Complete</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="FINALIZED">Finalized</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5">Inspection Reference</th>
                <th className="px-6 py-3.5">Establishment / Premise</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Scheduled Date</th>
                <th className="px-6 py-3.5">Commodities</th>
                <th className="px-6 py-3.5">Compliance State</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading inspections...
                  </td>
                </tr>
              ) : inspections.length > 0 ? (
                inspections.map((insp) => (
                  <tr key={insp.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {insp.inspection_number}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{insp.establishment?.name || 'N/A'}</p>
                      <p className="text-[11px] text-slate-400">{insp.establishment?.license_number}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {insp.establishment?.city}, {insp.establishment?.state}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {new Date(insp.scheduled_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {insp.products?.length || 0} Products
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        insp.status === 'FINALIZED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : insp.status === 'ANALYSIS_COMPLETE'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {insp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/inspections/${insp.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg font-bold transition border border-slate-200"
                        title="View Audit"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Audit</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No inspections found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InstantScanModal
        isOpen={isScanModalOpen}
        onClose={() => {
          setIsScanModalOpen(false);
          fetchInspections();
        }}
      />

    </div>
  );
};
