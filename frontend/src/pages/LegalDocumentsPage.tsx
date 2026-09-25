import React, { useEffect, useState } from 'react';
import { FileText, Calendar, ExternalLink, ShieldCheck, Scale, Download, Eye } from 'lucide-react';
import { ruleService } from '../services/api';
import { LegalDocument } from '../types';
import { GazetteViewerModal } from '../components/legal/GazetteViewerModal';

export const LegalDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGazetteOpen, setIsGazetteOpen] = useState<boolean>(false);
  const [targetPage, setTargetPage] = useState<number>(37);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await ruleService.getLegalDocuments();
        setDocuments(data);
      } catch (err) {
        console.error('Failed to load legal documents', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Official Gazette Notifications & Legal Acts
          </h1>
          <p className="text-xs text-slate-500">
            Authoritative repository of statutory rules, amendments, and gazette notifications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setTargetPage(37);
              setIsGazetteOpen(true);
            }}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>📜 Open 194-Page Gazette</span>
          </button>
          <a
            href="/api/v1/rules/gazette-pdf"
            download="legal_metrology_rules_consolidated.pdf"
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF (38.8 MB)</span>
          </a>
        </div>
      </div>

      {/* Featured 194-Page Gazette Card */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
              Primary Statutory Record
            </span>
            <span className="text-slate-400 text-xs">&bull; 194 Scanned Gazette Pages</span>
          </div>
          <h2 className="text-lg font-black tracking-tight">
            The Legal Metrology (Packaged Commodities) Rules, 2011 & Amendments
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consolidated official Gazette of India publication. Authoritative English text spans from Page 37 through 83, followed by all Gazette Amendment notifications (2015 to 2024). Fully indexed for court-admissible legal notices.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => { setTargetPage(39); setIsGazetteOpen(true); }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 6 Mandatory Declarations (Pg 39)
            </button>
            <button
              onClick={() => { setTargetPage(47); setIsGazetteOpen(true); }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 13 Numeral Height Tables (Pg 47)
            </button>
            <button
              onClick={() => { setTargetPage(56); setIsGazetteOpen(true); }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 18 MRP Overcharging Ban (Pg 56)
            </button>
            <button
              onClick={() => { setTargetPage(121); setIsGazetteOpen(true); }}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              2021 Unit Sale Price Amendment (Pg 121)
            </button>
          </div>
        </div>

        <button
          onClick={() => { setTargetPage(37); setIsGazetteOpen(true); }}
          className="shrink-0 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center space-x-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Launch Gazette Reader</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">Loading gazette documents...</div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  {doc.notification_number || 'Principal Act'}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  {doc.document_type}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{doc.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{doc.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center space-x-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Effective: {new Date(doc.effective_date).toLocaleDateString()}</span>
                </span>
                <span className="text-sky-600 font-bold">Authoritative Source</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Gazette Evidence Viewer Modal */}
      {isGazetteOpen && (
        <GazetteViewerModal
          isOpen={isGazetteOpen}
          onClose={() => setIsGazetteOpen(false)}
          initialPage={targetPage}
          ruleTitle="The Legal Metrology (Packaged Commodities) Rules, 2011"
          citation={`Gazette of India, Page ${targetPage}`}
        />
      )}

    </div>
  );
};
