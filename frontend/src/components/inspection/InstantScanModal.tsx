import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Sparkles, X, FileImage, RefreshCw, Smartphone, Image as ImageIcon } from 'lucide-react';
import { inspectionService } from '../../services/api';
import { LiveCameraScanner } from '../camera/LiveCameraScanner';

interface InstantScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionId?: number;
}

export const InstantScanModal: React.FC<InstantScanModalProps> = ({
  isOpen,
  onClose,
  inspectionId
}) => {
  const navigate = useNavigate();
  const [scanMode, setScanMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [establishmentName, setEstablishmentName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleCameraCapture = (capturedFile: File) => {
    setSelectedFiles((prev) => [...prev, capturedFile]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      alert('Please snap with the camera or upload at least one package photo.');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('Preprocessing image and running multi-angle OCR...');

    try {
      setTimeout(() => {
        setCurrentStep('Auto-detecting commodity name & extracting statutory declarations...');
      }, 1200);

      setTimeout(() => {
        setCurrentStep('Evaluating against Legal Metrology Rules (2011 to 2026)...');
      }, 2500);

      const result = await inspectionService.instantScan(
        selectedFiles,
        establishmentName || undefined,
        inspectionId
      );

      // Successfully processed -> Navigate straight to the product scan canvas!
      navigate(`/products/${result.product_id}/scan`);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to complete instant photo analysis.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gov-dark via-slate-900 to-sky-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-600/30 text-sky-400 border border-sky-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center space-x-2">
                <span>Instant Photo AI Inspection</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-full border border-sky-400/30">
                  Zero Data Entry
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Snap or upload photos &bull; AI auto-detects product & verifies compliance
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {isProcessing ? (
            <div className="py-14 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-200 shadow-inner">
                <RefreshCw className="w-8 h-8 text-sky-600 animate-spin" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">AI Inspection in Progress</h4>
                <p className="text-xs text-sky-700 font-semibold">{currentStep}</p>
                <p className="text-[11px] text-slate-400">
                  Comparing package declarations against Legal Metrology Rules, 2011 & Amendments
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Optional Premise / Store Name */}
              {!inspectionId && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store / Establishment Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={establishmentName}
                    onChange={(e) => setEstablishmentName(e.target.value)}
                    placeholder="e.g., Metro Hypermarket or leave blank for default jurisdiction"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Mode Selector Tabs: Live Camera vs File Upload */}
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setScanMode('CAMERA')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                    scanMode === 'CAMERA'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Live Camera Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('UPLOAD')}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                    scanMode === 'UPLOAD'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>Upload Photos</span>
                </button>
              </div>

              {/* Scan Mode View: Live Camera */}
              {scanMode === 'CAMERA' ? (
                <div className="space-y-2">
                  <LiveCameraScanner
                    onCapture={handleCameraCapture}
                  />
                </div>
              ) : (
                /* Scan Mode View: Drag & Drop Upload Box */
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
                    className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 group"
                  >
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-600 group-hover:scale-105 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to Browse or Drag & Drop Package Photos
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Accepts JPG, PNG, WEBP &bull; Front, Back, or MRP panels (e.g. sample.png)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected / Captured Thumbnails List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Photos Ready for Inspection ({selectedFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-[11px] text-red-600 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative bg-slate-100 rounded-xl p-2 border border-slate-200 text-xs flex items-center justify-between group shadow-sm"
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
                          className="text-slate-400 hover:text-red-600 p-0.5 rounded transition"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={selectedFiles.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {selectedFiles.length === 0
                      ? 'Snap or Upload Photo to Inspect'
                      : `Run AI Inspection (${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''})`}
                  </span>
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
