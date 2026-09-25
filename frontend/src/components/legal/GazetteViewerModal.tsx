import React, { useState, useEffect } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, 
  FileText, ShieldCheck, Scale, Copy, Check, ExternalLink, RefreshCw 
} from 'lucide-react';

interface GazetteViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPage?: number;
  ruleTitle?: string;
  citation?: string;
  statutoryText?: string;
  penaltySection?: string;
}

export const GazetteViewerModal: React.FC<GazetteViewerModalProps> = ({
  isOpen,
  onClose,
  initialPage = 40,
  ruleTitle,
  citation,
  statutoryText,
  penaltySection
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [loadingImage, setLoadingImage] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage);
    }
  }, [initialPage, isOpen]);

  if (!isOpen) return null;

  const totalPages = 194;
  const pageImageUrl = `/api/v1/rules/gazette-page/${currentPage}`;

  const handlePrev = () => {
    if (currentPage > 1) {
      setLoadingImage(true);
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setLoadingImage(true);
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleCopyCitation = () => {
    const textToCopy = `Official Gazette Evidence: ${citation || `Legal Metrology Rules 2011, Page ${currentPage}`} | Statutory Reference: ${ruleTitle || 'Legal Metrology (Packaged Commodities) Rules'}${penaltySection ? ` | Penalty: ${penaltySection}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
        
        {/* Top Control Bar */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Title & Document Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Official Gazette Evidence Viewer
                </h3>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-400/30">
                  Authoritative English Text
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                The Legal Metrology (Packaged Commodities) Rules, 2011 & Amendments (194 Pages)
              </p>
            </div>
          </div>

          {/* Navigation & Zoom Controls */}
          <div className="flex items-center space-x-2">
            
            {/* Page Jumper */}
            <div className="flex items-center space-x-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentPage <= 1}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 text-xs font-semibold px-2">
                <span className="text-slate-400">Page</span>
                <span className="text-sky-400 font-bold">{currentPage}</span>
                <span className="text-slate-500">/ {totalPages}</span>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentPage >= totalPages}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-800/80 rounded-xl px-1.5 py-1 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                className="p-1 text-slate-300 hover:text-white transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-slate-300 font-mono w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                className="p-1 text-slate-300 hover:text-white transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Download PDF */}
            <a
              href="/api/v1/rules/gazette-pdf"
              download="legal_metrology_rules_consolidated.pdf"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700 cursor-pointer hidden md:flex items-center space-x-1 text-xs"
              title="Download Full 194-Page Gazette PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[11px]">PDF</span>
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close Gazette Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Middle Document Viewer Canvas */}
        <div className="flex-1 bg-slate-950 overflow-auto flex items-center justify-center p-4 relative custom-scrollbar">
          
          {loadingImage && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
              <RefreshCw className="w-7 h-7 text-sky-500 animate-spin" />
              <span className="text-xs font-semibold text-slate-300">Rendering Gazette Page {currentPage}...</span>
            </div>
          )}

          <div
            className="transition-all duration-150 shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-white"
            style={{ width: `${zoomLevel}%`, maxWidth: zoomLevel > 100 ? 'none' : '820px' }}
          >
            <img
              src={pageImageUrl}
              alt={`Official Gazette Page ${currentPage}`}
              onLoad={() => setLoadingImage(false)}
              onError={() => setLoadingImage(false)}
              className="w-full h-auto block select-none"
            />
          </div>

        </div>

        {/* Bottom Legal Citation & Statutory Info Bar */}
        <div className="bg-slate-900 border-t border-slate-800 p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-400">
                  {ruleTitle || `Gazette Notification — Page ${currentPage}`}
                </span>
                {citation && (
                  <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                    {citation}
                  </span>
                )}
              </div>
              {statutoryText ? (
                <p className="text-xs text-slate-300 line-clamp-2 italic">
                  "{statutoryText}"
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Scanned official legal record from the Ministry of Consumer Affairs, Food and Public Distribution.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCitation}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Citation Copied!' : 'Copy Legal Citation'}</span>
              </button>
            </div>

          </div>

          {penaltySection && (
            <div className="flex items-center space-x-2 text-[11px] text-red-400 bg-red-950/40 px-3 py-1.5 rounded-xl border border-red-900/40">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span><strong>Statutory Penalty:</strong> {penaltySection}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
