import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Package, Calendar, AlertTriangle, CheckCircle, AlertOctagon,
  ShieldAlert, Download, Eye, PlusCircle, RefreshCw, X, Trash2,
  FileText, ExternalLink, Scale, Image as ImageIcon
} from 'lucide-react';
import { productService, reportService } from '../services/api';
import { Product, ComplianceFinding } from '../types';
import { GazetteViewerModal } from '../components/legal/GazetteViewerModal';

export const ProductRepositoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'ALL';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);

  // Product deletion state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Sync state with URL params if they change
  useEffect(() => {
    const qStatus = searchParams.get('status');
    if (qStatus && qStatus !== statusFilter) {
      setStatusFilter(qStatus);
    }
  }, [searchParams]);

  // Gazette viewer modal state
  const [gazetteModalOpen, setGazetteModalOpen] = useState<boolean>(false);
  const [activeGazettePage, setActiveGazettePage] = useState<number>(39);
  const [activeGazetteRule, setActiveGazetteRule] = useState<{
    title?: string;
    citation?: string;
    statutoryText?: string;
    penaltySection?: string;
  }>({});

  const fetchProducts = async (currentStatus?: string) => {
    setLoading(true);
    const filterToUse = currentStatus !== undefined ? currentStatus : statusFilter;
    try {
      const data = await productService.getProducts({
        search: searchTerm,
        status: filterToUse === 'ALL' ? undefined : filterToUse
      });
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [statusFilter]);

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    if (newStatus === 'ALL') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: newStatus });
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productService.deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      if (selectedProduct?.id === productToDelete.id) {
        setSelectedProduct(null);
      }
      setProductToDelete(null);
    } catch (err) {
      console.error('Failed to delete product', err);
      alert('Unable to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDownloadReport = async (inspectionId: number) => {
    try {
      setGeneratingPdf(true);
      await reportService.downloadPdfReport(inspectionId);
    } catch (err) {
      console.error('Failed to download report', err);
      alert('Unable to download PDF report at this time.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const openGazetteForRule = (finding: ComplianceFinding) => {
    const pageNum = finding.gazette_page_number || 39;
    setActiveGazettePage(pageNum);
    setActiveGazetteRule({
      title: finding.requirement,
      citation: finding.gazette_citation || `Rule 6 (Gazette Pg ${pageNum})`,
      statutoryText: finding.statutory_text || finding.reason,
      penaltySection: finding.penalty_section || 'Section 36(1) of Legal Metrology Act, 2009.'
    });
    setGazetteModalOpen(true);
  };

  const openGazetteForCompliantRule = (ruleNumber: string, requirement: string, pageNum: number = 39, details?: string) => {
    setActiveGazettePage(pageNum);
    setActiveGazetteRule({
      title: `${ruleNumber} - ${requirement}`,
      citation: ruleNumber,
      statutoryText: details || requirement,
      penaltySection: undefined
    });
    setGazetteModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLIANT') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>COMPLIANT</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
        <span>NON-COMPLIANT</span>
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Package className="w-7 h-7 text-sky-600" />
            <span>Product Repository</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable catalog of scanned packaged commodities, compliance history, and statutory inspection reports.
          </p>
        </div>
        <button
          onClick={() => navigate('/new-inspection')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Inspection</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, brand, or commodity..."
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Status Filter Pills */}
        <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Products' },
            { id: 'COMPLIANT', label: 'Compliant' },
            { id: 'POTENTIAL_NON_COMPLIANCE', label: 'Non-Compliant' },
            { id: 'OFFICER_REVIEW_REQUIRED', label: 'Pending Review' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => handleStatusFilterChange(pill.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                statusFilter === pill.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {pill.label}
            </button>
          ))}
          <button
            onClick={() => fetchProducts()}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading product repository...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No products match your search or filter. Run a new inspection to add products to the repository.
          </p>
          <button
            onClick={() => navigate('/new-inspection')}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Inspection</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const violationsCount = product.findings?.filter(
              (f) => f.severity === 'CRITICAL' || f.severity === 'MAJOR'
            ).length || 0;
            const previewImage = product.images && product.images.length > 0 ? product.images[0] : null;

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-slate-400">
                        PRODUCT #{product.id}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {product.product_name}
                      </h3>
                      {product.brand && (
                        <p className="text-xs font-semibold text-sky-700">{product.brand}</p>
                      )}
                    </div>
                    <div>{getStatusBadge(product.compliance_status)}</div>
                  </div>

                  {/* Thumbnail / Side preview */}
                  <div className="h-28 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                    {previewImage ? (
                      <img
                        src={`http://localhost:8000${previewImage.file_path}`}
                        alt={product.product_name}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          // Fallback icon if image fails to load
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center space-y-1 text-slate-400">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-semibold">Package Image</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Meta */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-bold block">SCANNED</span>
                      <span className="text-xs font-semibold text-slate-700 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{formatDate(product.created_at)}</span>
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <span className="text-[10px] text-slate-400 font-bold block">VIOLATIONS</span>
                      <span className={`text-xs font-black mt-0.5 block ${violationsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {violationsCount > 0 ? `${violationsCount} Violations` : '0 Violations'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Analysis</span>
                  </button>
                  <button
                    onClick={() => handleDownloadReport(product.inspection_id)}
                    disabled={generatingPdf}
                    title="Download Official Legal Inspection Report"
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-200 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setProductToDelete(product)}
                    title="Delete product from repository"
                    className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition border border-slate-200 hover:border-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal / Slide-over */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    INSPECTION #{selectedProduct.inspection_id} &bull; PRODUCT #{selectedProduct.id}
                  </span>
                  {getStatusBadge(selectedProduct.compliance_status)}
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  {selectedProduct.product_name}
                </h2>
                {selectedProduct.brand && (
                  <p className="text-xs font-semibold text-sky-700">{selectedProduct.brand} &bull; {selectedProduct.category}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownloadReport(selectedProduct.inspection_id)}
                  disabled={generatingPdf}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{generatingPdf ? 'Downloading...' : 'Download Report (PDF)'}</span>
                </button>
                <button
                  onClick={() => setProductToDelete(selectedProduct)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
                  title="Delete product"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Extracted Structured Declarations */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>Extracted Mandatory Declarations (Rule 6)</span>
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">MRP (INCL. TAXES)</span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                      {selectedProduct.structured_data?.mrp_raw || 'Not detected'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">NET QUANTITY</span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                      {selectedProduct.structured_data?.net_quantity_raw || 'Not detected'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">MFG / PACK DATE</span>
                    <span className="text-xs font-extrabold text-slate-800 mt-0.5 block truncate">
                      {selectedProduct.structured_data?.date_raw || 'Not detected'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">MANUFACTURER / PACKER</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block truncate">
                      {selectedProduct.structured_data?.manufacturer_name || 'Not detected'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">CONSUMER CARE</span>
                    <span className="text-xs font-semibold text-slate-800 mt-0.5 block truncate">
                      {selectedProduct.structured_data?.consumer_care_email || selectedProduct.structured_data?.consumer_care_phone || 'Not detected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TWO-COLUMN RESULTS: VIOLATED RULES & COMPLIANT RULES */}
              {(() => {
                const compliantList: any[] = selectedProduct.structured_data?.compliant_rules || selectedProduct.compliant_rules || [];
                const violationsList: any[] = selectedProduct.findings || [];

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    
                    {/* COLUMN 1: VIOLATED RULES */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/20 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                        <div className="flex items-center space-x-1.5">
                          <AlertOctagon className="w-4 h-4 text-rose-600" />
                          <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                            Violated Rules
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[11px] font-black">
                          {violationsList.length}
                        </span>
                      </div>

                      {violationsList.length === 0 ? (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                          <CheckCircle className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          <p className="text-xs font-black text-emerald-800">No Rule Violations</p>
                          <p className="text-[10px] text-emerald-600">All statutory requirements complied with.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {violationsList.map((f, idx) => {
                            const pg = f.gazette_page_number || 39;
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start space-x-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 mt-0.5 ${
                                      f.severity === 'CRITICAL' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                                    }`}>
                                      {f.severity}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 leading-snug">
                                        {f.requirement}
                                      </p>
                                      <p className="text-[11px] text-slate-600 mt-0.5">{f.reason}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => openGazetteForRule(f)}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    <span>📜 Gazette Pg {pg}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* COLUMN 2: COMPLIANT RULES */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                        <div className="flex items-center space-x-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                            Compliant Rules
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black">
                          {compliantList.length}
                        </span>
                      </div>

                      {compliantList.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500">No verified compliant rules record available.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {compliantList.map((cr, idx) => {
                            const pg = cr.gazette_page_number || 39;
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="flex items-start space-x-2">
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-900 shrink-0 mt-0.5">
                                      {cr.rule_number}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-slate-900 leading-snug">
                                        {cr.requirement}
                                      </p>
                                      {cr.details && (
                                        <p className="text-[11px] text-slate-600 mt-0.5">{cr.details}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {cr.verified_value && (
                                  <p className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Verified: <strong>{cr.verified_value}</strong>
                                  </p>
                                )}
                                <div className="flex justify-end pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openGazetteForCompliantRule(cr.rule_number, cr.requirement, pg, cr.details)}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded text-[10px] font-bold transition cursor-pointer"
                                  >
                                    <span>📜 Gazette Pg {pg}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })()}

              {/* Package Image Evidence */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>Captured Package Evidence ({selectedProduct.images.length} photos)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedProduct.images.map((img) => (
                      <div key={img.id} className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 h-28 flex items-center justify-center relative group">
                        <img
                          src={`http://localhost:8000${img.file_path}`}
                          alt={img.package_side}
                          className="w-full h-full object-contain p-1"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/80 text-white text-[9px] font-bold rounded">
                          {img.package_side}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                Official statutory inspection record
              </span>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Product?</h3>
                <p className="text-xs text-slate-500">This action will remove the product and its inspection records.</p>
              </div>
            </div>
            
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800">{productToDelete.product_name}</div>
              <div className="text-slate-500">Product #{productToDelete.id} &bull; Inspection #{productToDelete.inspection_id}</div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setProductToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                disabled={isDeleting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gazette Viewer Modal */}
      <GazetteViewerModal
        isOpen={gazetteModalOpen}
        onClose={() => setGazetteModalOpen(false)}
        initialPage={activeGazettePage}
        ruleTitle={activeGazetteRule.title}
        citation={activeGazetteRule.citation}
        statutoryText={activeGazetteRule.statutoryText}
        penaltySection={activeGazetteRule.penaltySection}
      />
    </div>
  );
};
