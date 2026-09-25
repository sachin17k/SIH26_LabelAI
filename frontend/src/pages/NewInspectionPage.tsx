import React, { useState, useRef } from 'react';
import { 
  Camera, Upload, Sparkles, AlertOctagon, CheckCircle2, 
  Download, RefreshCw, Scale, ChevronDown, ChevronUp, 
  X, FileText, Image as ImageIcon, ShieldAlert, ArrowRight
} from 'lucide-react';
import { inspectionService, reportService } from '../services/api';
import { LiveCameraScanner } from '../components/camera/LiveCameraScanner';
import { GazetteViewerModal } from '../components/legal/GazetteViewerModal';

interface AnalysisResult {
  inspection_id: number;
  product_id: number;
  product_name: string;
  brand?: string;
  category?: string;
  compliance_status: string;
  findings_count: number;
  compliant_count?: number;
  readability_score: number;
  readability_grade: string;
  structured_data?: any;
  compliant_rules?: Array<{
    rule_number: string;
    rule_code: string;
    requirement: string;
    status: string;
    gazette_page_number?: number;
    verified_value?: string;
    details?: string;
  }>;
  findings: Array<{
    id: number;
    requirement: string;
    category: string;
    severity: string;
    status: string;
    reason: string;
    evidence_data?: any;
    ai_confidence: number;
    gazette_page_number?: number;
    gazette_citation?: string;
    statutory_text?: string;
    penalty_section?: string;
  }>;
}

export const NewInspectionPage: React.FC = () => {
  const [productName, setProductName] = useState<string>('');
  const [scanMode, setScanMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<number | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  
  // Gazette Viewer state
  const [activeGazette, setActiveGazette] = useState<{
    page: number;
    title?: string;
    citation?: string;
    statutoryText?: string;
    penaltySection?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFiles((prev) => [...prev, file]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRunAnalysis = async () => {
    if (selectedFiles.length === 0) {
      alert('Please snap or upload at least one product label photo.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep('Preprocessing image and running multi-angle OCR...');
    setResult(null);

    try {
      setTimeout(() => {
        setAnalysisStep('Extracting statutory declarations (Net Qty, MRP, Mfg Date, Importer)...');
      }, 1200);

      setTimeout(() => {
        setAnalysisStep('Auditing compliance against 194-page Legal Metrology Rules...');
      }, 2400);

      const res = await inspectionService.instantScan(
        selectedFiles,
        undefined, // No location/establishment needed
        undefined,
        productName.trim() || undefined
      );

      setResult(res);
      // Auto-expand first finding if violations exist
      if (res.findings && res.findings.length > 0) {
        setExpandedFindingId(res.findings[0].id);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Analysis failed. Please check packaging photo quality.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setIsDownloadingPdf(true);
    try {
      const sanitizedName = (result.product_name || 'Commodity').replace(/[^a-zA-Z0-9_-]/g, '_');
      await reportService.downloadPdfReport(result.inspection_id, `Inspection_Report_${sanitizedName}.pdf`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to download PDF report.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFiles([]);
    setProductName('');
    setExpandedFindingId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            New Commodity Inspection
          </h1>
          <p className="text-xs text-slate-500">
            Snap or upload product packaging photos to verify Legal Metrology (Packaged Commodities) Rules
          </p>
        </div>
        {result && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300 cursor-pointer"
          >
            <span>+ Inspect Another Product</span>
          </button>
        )}
      </div>

      {/* Input / Upload Section (shown when no result or user wants to re-upload) */}
      {!result && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          
          {/* Product Name Field Only */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Product / Model Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Milk Chocolate Bar 28g (or leave blank for automatic AI detection)"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium text-slate-800"
            />
          </div>

          {/* Dual Capture Toggle: Live Camera vs Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Product Packaging Photos
              </label>
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScanMode('CAMERA')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scanMode === 'CAMERA'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('UPLOAD')}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    scanMode === 'UPLOAD'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>Upload Files</span>
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            {scanMode === 'CAMERA' ? (
              <div className="max-w-2xl mx-auto">
                <LiveCameraScanner onCapture={handleCameraCapture} />
              </div>
            ) : (
              /* Drag & Drop File Upload Area */
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                >
                  <div className="p-3.5 bg-white rounded-2xl shadow-sm text-sky-600 group-hover:scale-105 transition">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to Browse or Drag & Drop Product Packaging Images
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Front, Back, or MRP panels (e.g. sample.png) &bull; JPG, PNG, WEBP
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Captured / Selected Photo Gallery */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Photos Ready for Analysis ({selectedFiles.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="relative bg-slate-100 rounded-xl p-2 border border-slate-200 text-xs flex items-center justify-between group shadow-xs"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate font-semibold text-slate-800 text-[11px]" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Big "Analyse" Button */}
          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={selectedFiles.length === 0 || isAnalyzing}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white text-sm font-black rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{analysisStep}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyse</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* Same-Page Compliance Results Section */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* Status Banner with Direct PDF Download */}
          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            result.compliance_status === 'COMPLIANT'
              ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              : 'bg-rose-50/90 border-rose-300 text-rose-950'
          }`}>
            <div className="flex items-center space-x-3.5">
              <div className={`p-3 rounded-2xl ${
                result.compliance_status === 'COMPLIANT' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {result.compliance_status === 'COMPLIANT' ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <AlertOctagon className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-black tracking-tight">
                    {result.compliance_status === 'COMPLIANT'
                      ? 'Statutory Compliance Confirmed'
                      : `Potential Non-Compliance Detected (${result.findings_count} Violation${result.findings_count > 1 ? 's' : ''})`}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Audited Product: <strong>{result.product_name}</strong> &bull; Readability Score: <strong>{result.readability_score}% ({result.readability_grade})</strong>
                </p>
              </div>
            </div>

            {/* Direct In-Page PDF Report Download Button */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPdf ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Download Report (PDF)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Clean Basic Product Information Card (No Inspector IDs/Names) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  INSPECTION #{result.inspection_id} &bull; BASIC PRODUCT INFORMATION
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {result.product_name}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-black">
                  {result.findings.length} Violated
                </span>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                  {(result.compliant_rules || []).length} Compliant
                </span>
              </div>
            </div>

            {/* Extracted Statutory Declarations Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Brand</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.brand || 'Unbranded'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.category || 'General'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Net Quantity</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.structured_data?.net_quantity_raw || (result.structured_data?.net_quantity?.value ? `${result.structured_data.net_quantity.value} ${result.structured_data.net_quantity.unit}` : 'Not detected')}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Retail Price (MRP)</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.structured_data?.mrp_raw || (result.structured_data?.mrp?.value ? `₹ ${result.structured_data.mrp.value}` : 'Not detected')}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Mfg / Pack Date</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.structured_data?.date_raw || result.structured_data?.mfg_date?.date_string || 'Not detected'}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Origin</span>
                <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                  {result.structured_data?.country_of_origin?.country || 'India'}
                </span>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN RESULTS TABLE: VIOLATED RULES (COL 1) & COMPLIANT RULES (COL 2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* COLUMN 1: VIOLATED RULES */}
            <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-950 tracking-tight">
                      Violated Rules
                    </h3>
                    <p className="text-[11px] text-rose-600">
                      Statutory infractions requiring corrective action
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-xs font-black">
                  {result.findings.length}
                </span>
              </div>

              <div className="space-y-3">
                {result.findings.length > 0 ? (
                  result.findings.map((f) => {
                    const isExpanded = expandedFindingId === f.id;
                    const gazettePage = f.gazette_page_number || f.evidence_data?.gazette_page_number || 39;
                    const gazetteCitation = f.gazette_citation || f.evidence_data?.gazette_citation;
                    const statutoryText = f.statutory_text || f.evidence_data?.statutory_text;
                    const penaltySection = f.penalty_section || f.evidence_data?.penalty_section;

                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isExpanded
                            ? 'border-rose-400 ring-2 ring-rose-400/20 bg-rose-50/20'
                            : 'border-rose-200/80 bg-rose-50/10 hover:border-rose-300'
                        }`}
                      >
                        {/* Clickable Header */}
                        <div
                          onClick={() => setExpandedFindingId(isExpanded ? null : f.id)}
                          className="p-4 flex items-start justify-between cursor-pointer select-none gap-2"
                        >
                          <div className="flex items-start space-x-2.5">
                            <span className={`mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                              f.severity === 'CRITICAL'
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-amber-200 text-amber-900'
                            }`}>
                              {f.severity}
                            </span>
                            <div>
                              <span className="text-xs font-black text-slate-900 block leading-snug">
                                {f.requirement}
                              </span>
                              <span className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                {f.reason}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 mt-0.5">
                            {gazettePage && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                Pg {gazettePage}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Expanded Full Explanation & Rule Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-rose-100 bg-white">
                            
                            {/* Issue Detected */}
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                Non-Compliance Reason:
                              </span>
                              <p className="text-xs text-slate-800 bg-rose-50/50 p-2.5 rounded-xl border border-rose-200/60">
                                {f.reason}
                              </p>
                            </div>

                            {/* Statutory Rule Requirement */}
                            {statutoryText && (
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Legal Metrology Requirement:
                                </span>
                                <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl space-y-1 text-xs">
                                  <p className="text-slate-800 italic">"{statutoryText}"</p>
                                  {gazetteCitation && (
                                    <span className="text-[10px] font-bold text-amber-900 block">
                                      Citation: {gazetteCitation}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Penalty Clause */}
                            {penaltySection && (
                              <div className="p-2.5 bg-rose-100/60 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-950">
                                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                                <span><strong>Statutory Penalty:</strong> {penaltySection}</span>
                              </div>
                            )}

                            {/* Gazette Action Button */}
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveGazette({
                                    page: gazettePage,
                                    title: f.requirement,
                                    citation: gazetteCitation,
                                    statutoryText: statutoryText,
                                    penaltySection: penaltySection
                                  });
                                }}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                              >
                                <Scale className="w-3.5 h-3.5" />
                                <span>View Gazette (Page {gazettePage})</span>
                              </button>
                            </div>

                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-slate-400 space-y-2 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 p-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-emerald-900">No Rule Violations Observed</p>
                    <p className="text-[11px] text-emerald-700">All mandatory statutory requirements under Legal Metrology Rules, 2011 are satisfied.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: COMPLIANT RULES (CORRECTLY DONE) */}
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 tracking-tight">
                      Compliant Rules
                    </h3>
                    <p className="text-[11px] text-emerald-600">
                      Mandatory statutory declarations correctly applied
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
                  {(result.compliant_rules || []).length}
                </span>
              </div>

              <div className="space-y-3">
                {result.compliant_rules && result.compliant_rules.length > 0 ? (
                  result.compliant_rules.map((cr, idx) => {
                    const pageNum = cr.gazette_page_number || 39;

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-emerald-200/80 bg-emerald-50/20 hover:border-emerald-300 transition p-4 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2.5">
                            <span className="mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-900 shrink-0">
                              {cr.rule_number}
                            </span>
                            <div>
                              <span className="text-xs font-black text-slate-900 block leading-snug">
                                {cr.requirement}
                              </span>
                              {cr.details && (
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {cr.details}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                            Pg {pageNum}
                          </span>
                        </div>

                        {/* Verified Declaration Block */}
                        {cr.verified_value && (
                          <div className="bg-white p-2.5 rounded-xl border border-emerald-200/70 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-500 font-semibold">Verified on package:</span>
                            <span className="font-extrabold text-emerald-900 font-mono text-xs">
                              {cr.verified_value}
                            </span>
                          </div>
                        )}

                        {/* Gazette Action Button */}
                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveGazette({
                                page: pageNum,
                                title: `${cr.rule_number} - ${cr.requirement}`,
                                citation: cr.rule_number,
                                statutoryText: cr.details,
                                penaltySection: undefined
                              });
                            }}
                            className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                          >
                            <Scale className="w-3 h-3 text-amber-600" />
                            <span>Gazette Pg {pageNum}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold">No verified compliant rules available yet.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Gazette Evidence Viewer Modal */}
      {activeGazette && (
        <GazetteViewerModal
          isOpen={!!activeGazette}
          onClose={() => setActiveGazette(null)}
          initialPage={activeGazette.page}
          ruleTitle={activeGazette.title}
          citation={activeGazette.citation}
          statutoryText={activeGazette.statutoryText}
          penaltySection={activeGazette.penaltySection}
        />
      )}

    </div>
  );
};
