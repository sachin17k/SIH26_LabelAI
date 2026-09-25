import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building2, Calendar, FileDown, PlusCircle, CheckCircle, 
  AlertCircle, ShieldCheck, ChevronRight, Eye, Sparkles, FileText, Camera
} from 'lucide-react';
import { inspectionService, productService, reportService } from '../services/api';
import { Inspection, Product } from '../types';
import { InstantScanModal } from '../components/inspection/InstantScanModal';

export const InspectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Instant Scan modal
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);

  // Add Product modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdCategory, setNewProdCategory] = useState<string>('Food & Beverages');
  const [newProdBrand, setNewProdBrand] = useState<string>('');
  const [newProdBarcode, setNewProdBarcode] = useState<string>('');
  const [packageHeightMm, setPackageHeightMm] = useState<string>('');
  const [packageWidthMm, setPackageWidthMm] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const [generatingReport, setGeneratingReport] = useState<boolean>(false);

  const fetchInspection = async () => {
    if (!id) return;
    try {
      const data = await inspectionService.getInspection(Number(id));
      setInspection(data);
    } catch (err) {
      console.error('Failed to load inspection detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [id]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newProdName.trim()) return;
    setIsAdding(true);
    try {
      await productService.addProduct(Number(id), {
        product_name: newProdName,
        category: newProdCategory,
        brand: newProdBrand || undefined,
        barcode: newProdBarcode || undefined,
        package_height_mm: packageHeightMm ? parseFloat(packageHeightMm) : undefined,
        package_width_mm: packageWidthMm ? parseFloat(packageWidthMm) : undefined,
      });
      setIsAddModalOpen(false);
      setNewProdName('');
      setNewProdBrand('');
      setNewProdBarcode('');
      setPackageHeightMm('');
      setPackageWidthMm('');
      fetchInspection();
    } catch (err) {
      alert('Failed to add product');
    } finally {
      setIsAdding(false);
    }
  };

  const handleGenerateReport = async (format: 'PDF' | 'DOCX') => {
    if (!inspection) return;
    setGeneratingReport(true);
    try {
      if (format === 'PDF') {
        await reportService.downloadPdfReport(inspection.id);
      } else {
        await reportService.downloadDocxReport(inspection.id);
      }
    } catch (err) {
      alert(`Failed to download ${format} report.`);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-8 text-center text-slate-500">
        Inspection dossier not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-lg font-black text-slate-900">
              {inspection.inspection_number}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              inspection.status === 'FINALIZED'
                ? 'bg-emerald-100 text-emerald-800'
                : inspection.status === 'ANALYSIS_COMPLETE'
                ? 'bg-sky-100 text-sky-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {inspection.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Establishment: <strong className="text-slate-800">{inspection.establishment?.name}</strong> &bull; {inspection.establishment?.city}, {inspection.establishment?.state}
          </p>
        </div>

        {/* Report Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleGenerateReport('PDF')}
            disabled={generatingReport}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gov-blue hover:bg-blue-900 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{generatingReport ? 'Generating...' : 'Official Notice (PDF)'}</span>
          </button>
          <button
            onClick={() => handleGenerateReport('DOCX')}
            disabled={generatingReport}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            <FileText className="w-4 h-4" />
            <span>Show-Cause (DOCX)</span>
          </button>
        </div>
      </div>

      {/* Establishment & Premise Summary */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">License Number</span>
          <span className="font-semibold text-slate-800">{inspection.establishment?.license_number || 'N/A'}</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Premise Type</span>
          <span className="font-semibold text-slate-800">{inspection.establishment?.establishment_type}</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Contact Person</span>
          <span className="font-semibold text-slate-800">{inspection.establishment?.contact_person || 'N/A'} ({inspection.establishment?.contact_phone || 'N/A'})</span>
        </div>
        <div>
          <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Inspection Date</span>
          <span className="font-semibold text-slate-800">{new Date(inspection.scheduled_date).toLocaleString()}</span>
        </div>
      </div>

      {/* Products Audited List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Packaged Commodities Audited</h3>
            <p className="text-xs text-slate-400">Multi-view image capture, OCR parsing, and compliance status</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsScanModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 hover:from-sky-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              <Camera className="w-4 h-4" />
              <span>⚡ Instant Photo Scan</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
          </div>
        </div>

        {/* Instant Scan Modal */}
        <InstantScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          inspectionId={inspection.id}
        />

        {inspection.products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {inspection.products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-sky-300 bg-slate-50/50 hover:bg-white transition space-y-3 sm:space-y-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{p.product_name}</span>
                    <span className="text-xs text-slate-400 font-medium">({p.category})</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <span>Brand: <strong className="text-slate-700">{p.brand || 'N/A'}</strong></span>
                    <span>Scanned Views: <strong className="text-slate-700">{p.images?.length || 0} Sides</strong></span>
                    <span>Readability: <strong className="text-slate-700">{p.readability_grade} ({p.readability_score}%)</strong></span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    p.compliance_status === 'COMPLIANT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : p.compliance_status === 'CONFIRMED_NON_COMPLIANCE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {p.compliance_status}
                  </span>

                  <Link
                    to={`/products/${p.id}/scan`}
                    className="flex items-center space-x-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    <span>Multi-Side Scan & AI Review</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <p className="text-xs">No packaged commodities added to this inspection yet.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              + Add First Commodity
            </button>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <h3 className="text-base font-bold text-slate-900">Add Packaged Commodity to Inspection</h3>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Commodity Name *</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="e.g. Basmati Rice 1kg or Almond Milk 200ml"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Food & Beverages">Food & Beverages</option>
                    <option value="Dairy & Oils">Edible Oils & Dairy</option>
                    <option value="Cosmetics">Cosmetics & Personal Care</option>
                    <option value="Electronics">Electronics / Appliances</option>
                    <option value="Household">Household Goods</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={newProdBrand}
                    onChange={(e) => setNewProdBrand(e.target.value)}
                    placeholder="e.g. Golden Harvest"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Physical Dimension Calibration info for First Schedule */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Optional Physical Font Calibration
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Package Height (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={packageHeightMm}
                      onChange={(e) => setPackageHeightMm(e.target.value)}
                      placeholder="e.g. 240"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Package Width (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={packageWidthMm}
                      onChange={(e) => setPackageWidthMm(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {isAdding ? 'Adding...' : 'Add Commodity'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
