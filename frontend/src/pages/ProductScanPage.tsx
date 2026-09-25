import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Camera, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  XCircle, ChevronLeft, ShieldCheck, Scale, FileSignature, 
  Layers, RefreshCw, AlertCircle, Eye, Info
} from 'lucide-react';
import { 
  productService, imageService, analysisService, complianceService 
} from '../services/api';
import { 
  Product, ProductImage, ComplianceFinding, PackageSide, 
  OfficerDecisionType, AnalysisJobStatus 
} from '../types';
import { CanvasEvidenceViewer } from '../components/viewer/CanvasEvidenceViewer';
import { OfficerDecisionModal } from '../components/review/OfficerDecisionModal';
import { LiveCameraScanner } from '../components/camera/LiveCameraScanner';
import { GazetteViewerModal } from '../components/legal/GazetteViewerModal';

export const ProductScanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);
  const [selectedSide, setSelectedSide] = useState<PackageSide>('FRONT');
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [activeGazette, setActiveGazette] = useState<{
    page: number;
    title?: string;
    citation?: string;
    statutoryText?: string;
    penaltySection?: string;
  } | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  // Review modal
  const [modalFinding, setModalFinding] = useState<ComplianceFinding | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const prod = await productService.getProduct(Number(id));
      setProduct(prod);
      if (prod.images && prod.images.length > 0) {
        setSelectedImage(prod.images[0]);
      }
      const fList = await complianceService.getFindings(Number(id));
      setFindings(fList);
    } catch (err) {
      console.error('Failed to load product details', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setIsUploading(true);
    try {
      const uploaded = await imageService.uploadImage(Number(id), selectedSide, file);
      await loadData();
      setSelectedImage(uploaded);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = async (capturedFile: File) => {
    if (!id) return;
    setIsUploading(true);
    try {
      const uploaded = await imageService.uploadImage(Number(id), selectedSide, capturedFile);
      await loadData();
      setSelectedImage(uploaded);
      setIsCameraModalOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Camera image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!id) return;
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setAnalysisStep('Starting vision & OCR pipeline...');

    try {
      await analysisService.triggerAnalysis(Number(id));

      // Poll analysis status
      const pollInterval = setInterval(async () => {
        try {
          const job = await analysisService.getStatus(Number(id));
          setAnalysisProgress(job.progress_pct);
          setAnalysisStep(job.current_step);

          if (job.status === 'COMPLETED') {
            clearInterval(pollInterval);
            setIsAnalyzing(false);
            await loadData();
          } else if (job.status === 'FAILED') {
            clearInterval(pollInterval);
            setIsAnalyzing(false);
            alert(`Analysis failed: ${job.error_message}`);
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
        }
      }, 1000);

    } catch (err) {
      setIsAnalyzing(false);
      alert('Could not trigger AI analysis');
    }
  };

  const handleOfficerDecisionSubmit = async (
    decision: OfficerDecisionType,
    remarks: string,
    evidenceNotes?: string
  ) => {
    if (!modalFinding) return;
    await complianceService.submitDecision(modalFinding.id, decision, remarks, evidenceNotes);
    await loadData();
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const structured = product.structured_data || {};

  return (
    <div className="space-y-6">
      
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/inspections/${product.inspection_id}`}
            className="inline-flex items-center space-x-1 text-xs text-sky-600 hover:text-sky-800 font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Inspection Dossier</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {product.product_name}
            </h1>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              product.compliance_status === 'COMPLIANT'
                ? 'bg-emerald-100 text-emerald-800'
                : product.compliance_status === 'CONFIRMED_NON_COMPLIANCE'
                ? 'bg-red-100 text-red-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {product.compliance_status}
            </span>
          </div>
        </div>

        {/* Trigger Analysis Button */}
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing || !product.images || product.images.length === 0}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAnalyzing ? 'Running AI Pipeline...' : 'Run Compliance Analysis'}</span>
        </button>
      </div>

      {/* Analysis Progress Banner */}
      {isAnalyzing && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-sky-900">
            <span className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span>{analysisStep || 'Analyzing Package Declarations...'}</span>
            </span>
            <span>{analysisProgress}%</span>
          </div>
          <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-300 rounded-full"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Multi-side Package Images Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Multi-Side Package Scanning & Image Queue</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value as PackageSide)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-semibold text-slate-700"
            >
              <option value="FRONT">Front Side</option>
              <option value="BACK">Back Side</option>
              <option value="LEFT">Left Side</option>
              <option value="RIGHT">Right Side</option>
              <option value="TOP">Top Side</option>
              <option value="BOTTOM">Bottom Side</option>
              <option value="MRP_AREA">MRP Panel Close-Up</option>
              <option value="LABEL_CLOSEUP">Label Close-Up</option>
              <option value="CALIBRATION_CARD">Calibration Reference Card</option>
            </select>

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              disabled={isUploading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : '+ Upload File'}</span>
            </button>
          </div>
        </div>

        {/* Thumbnails grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {product.images.map((img) => (
            <div
              key={img.id}
              onClick={() => setSelectedImage(img)}
              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition p-1 bg-slate-50 ${
                selectedImage?.id === img.id ? 'border-sky-600 shadow-md ring-2 ring-sky-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <img
                src={imageService.getImageUrl(img.file_path)}
                alt={img.package_side}
                className="w-full h-24 object-cover rounded-lg"
              />
              <div className="mt-1.5 flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-700">{img.package_side}</span>
                <span className={`font-semibold px-1 rounded ${
                  img.quality_status === 'ACCEPTABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {img.quality_status === 'ACCEPTABLE' ? 'Clear' : 'Blur'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Analysis Workspace (2-Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Visual Canvas Evidence Inspector (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedImage ? (
            <CanvasEvidenceViewer
              imageUrl={imageService.getImageUrl(selectedImage.file_path)}
              findings={findings}
              selectedFindingId={selectedFindingId}
              onSelectFinding={(fId) => setSelectedFindingId(fId)}
            />
          ) : (
            <div className="h-96 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <Camera className="w-12 h-12 mb-2 text-slate-300" />
              <p className="text-xs font-semibold">No package image selected.</p>
              <p className="text-[11px]">Upload package photos above to view visual bounding boxes.</p>
            </div>
          )}

          {/* Readability & Font Calibration Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-sky-600" />
                <span>Readability & First Schedule Font Analysis</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                product.readability_grade === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                Level 1: {product.readability_grade} ({product.readability_score}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Level 2 Calibrated Font Height: <strong className="text-slate-800">{product.font_size_status}</strong></span>
              <span>Overall OCR Confidence: <strong className="text-slate-800">{Math.round(product.overall_confidence * 100)}%</strong></span>
            </div>
          </div>
        </div>

        {/* Right Col: Structured Declarations & Statutory Findings (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Synthesized Declarations Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Synthesized Declarations
              </span>
              <span className="text-[10px] text-slate-400">Aggregated Across Sides</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Net Quantity:</span>
                <span className="font-bold text-slate-800">
                  {structured.net_quantity ? `${structured.net_quantity.value} ${structured.net_quantity.unit}` : <span className="text-red-600 font-bold">Not Detected</span>}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Maximum Retail Price:</span>
                <span className="font-bold text-slate-800">
                  {structured.mrp ? `₹ ${structured.mrp.value} ${structured.mrp.inclusive_of_all_taxes ? '(Taxes Incl.)' : '(Tax Missing)'}` : <span className="text-red-600 font-bold">Not Detected</span>}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Unit Sale Price:</span>
                <span className="font-bold text-slate-800">
                  {structured.unit_sale_price ? `₹ ${structured.unit_sale_price.value} / ${structured.unit_sale_price.per_unit}` : <span className="text-amber-600 font-bold">Not Declared</span>}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Mfg / Pkd Date:</span>
                <span className="font-bold text-slate-800">
                  {structured.mfg_date?.date_string || <span className="text-red-600 font-bold">Not Detected</span>}
                </span>
              </div>

              <div className="py-1 border-b border-slate-50">
                <span className="text-slate-500 font-medium block">Manufacturer:</span>
                <span className="font-medium text-slate-800 text-[11px]">
                  {structured.manufacturer?.text || <span className="text-red-600 font-bold">Not Detected</span>}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Consumer Care:</span>
                <span className="font-medium text-slate-800 text-[11px]">
                  {structured.consumer_care?.phone || structured.consumer_care?.email || <span className="text-amber-600 font-bold">Not Detected</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Statutory Findings & Officer Action List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Statutory Rule Findings ({findings.length})
                </h3>
                <p className="text-[11px] text-slate-400">Click Review to confirm or waive violation</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveGazette({ page: 37, title: 'Legal Metrology (Packaged Commodities) Rules, 2011' })}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                title="Browse full 194-Page Scanned Gazette Rules"
              >
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                <span>📜 194-Page Gazette</span>
              </button>
            </div>

            <div className="space-y-3">
              {findings.length > 0 ? (
                findings.map((f) => {
                  const isSelected = selectedFindingId === f.id;
                  const isConfirmed = f.status === 'CONFIRMED_BY_OFFICER';
                  const isRejected = f.status === 'REJECTED_BY_OFFICER';

                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 cursor-pointer transition ${
                        isSelected 
                          ? 'border-sky-500 bg-sky-50/40 ring-1 ring-sky-400' 
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{f.requirement}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {f.severity}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {f.reason}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isConfirmed ? 'text-red-600' : isRejected ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {f.status.replace(/_/g, ' ')}
                        </span>

                        <div className="flex items-center space-x-2">
                          {f.evidence_data?.gazette_page_number && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveGazette({
                                  page: f.evidence_data.gazette_page_number,
                                  title: f.requirement,
                                  citation: f.evidence_data.gazette_citation,
                                  statutoryText: f.evidence_data.statutory_text,
                                  penaltySection: f.evidence_data.penalty_section
                                });
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 rounded-lg text-[10px] font-bold transition shadow-2xs cursor-pointer"
                              title="View official scanned Gazette page for court evidence"
                            >
                              <Scale className="w-3 h-3 text-amber-600" />
                              <span>Page {f.evidence_data.gazette_page_number}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalFinding(f);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 bg-gov-blue hover:bg-blue-900 text-white text-[11px] font-bold rounded-lg transition shadow-xs cursor-pointer"
                          >
                            <FileSignature className="w-3 h-3" />
                            <span>Officer Review</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                  <p className="text-xs font-semibold">No statutory violations detected.</p>
                  <p className="text-[11px]">All mandatory declarations appear compliant.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Decision Modal */}
      {modalFinding && (
        <OfficerDecisionModal
          finding={modalFinding}
          isOpen={!!modalFinding}
          onClose={() => setModalFinding(null)}
          onSubmit={handleOfficerDecisionSubmit}
        />
      )}

      {/* Camera Capture Modal */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-sky-950 px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Scan Product Label — {selectedSide}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <LiveCameraScanner
                onCapture={handleCameraCapture}
                onClose={() => setIsCameraModalOpen(false)}
              />
              <p className="text-[11px] text-center text-slate-500">
                Align the {selectedSide.toLowerCase()} panel or label within the guides and tap the red shutter button.
              </p>
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
