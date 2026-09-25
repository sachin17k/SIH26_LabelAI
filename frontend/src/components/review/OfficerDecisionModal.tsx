import React, { useState } from 'react';
import { ComplianceFinding, OfficerDecisionType } from '../../types';
import { ShieldCheck, X, CheckCircle, AlertTriangle, XCircle, FileSignature } from 'lucide-react';

interface OfficerDecisionModalProps {
  finding: ComplianceFinding;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (decision: OfficerDecisionType, remarks: string, evidenceNotes?: string) => Promise<void>;
}

export const OfficerDecisionModal: React.FC<OfficerDecisionModalProps> = ({
  finding,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [decision, setDecision] = useState<OfficerDecisionType>('CONFIRMED_VIOLATION');
  const [remarks, setRemarks] = useState<string>('');
  const [evidenceNotes, setEvidenceNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert('Officer statutory remarks are mandatory before recording official decision.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(decision, remarks, evidenceNotes);
      onClose();
    } catch (err) {
      alert('Failed to submit officer decision. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gov-dark px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Officer Review & Statutory Determination</h3>
              <p className="text-xs text-slate-400">Legal Metrology Act, 2009 Enforcement Record</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Finding Details Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{finding.requirement}</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                finding.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {finding.severity}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed">{finding.reason}</p>
            <div className="text-[11px] text-slate-400">
              AI Confidence: <span className="font-semibold text-slate-700">{Math.round(finding.ai_confidence * 100)}%</span>
            </div>
          </div>

          {/* Decision Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Official Determination
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              
              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition ${
                decision === 'CONFIRMED_VIOLATION'
                  ? 'border-red-500 bg-red-50 text-red-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="CONFIRMED_VIOLATION"
                  checked={decision === 'CONFIRMED_VIOLATION'}
                  onChange={() => setDecision('CONFIRMED_VIOLATION')}
                  className="text-red-600"
                />
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="text-xs">Confirm Violation</span>
              </label>

              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition ${
                decision === 'REJECTED_FALSE_POSITIVE'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="REJECTED_FALSE_POSITIVE"
                  checked={decision === 'REJECTED_FALSE_POSITIVE'}
                  onChange={() => setDecision('REJECTED_FALSE_POSITIVE')}
                  className="text-emerald-600"
                />
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs">Reject / Compliant</span>
              </label>

              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition ${
                decision === 'WAIVED'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="WAIVED"
                  checked={decision === 'WAIVED'}
                  onChange={() => setDecision('WAIVED')}
                  className="text-amber-600"
                />
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs">Discretionary Waiver</span>
              </label>

              <label className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer transition ${
                decision === 'MANUAL_OVERRIDE'
                  ? 'border-blue-500 bg-blue-50 text-blue-900 font-semibold'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="decision"
                  value="MANUAL_OVERRIDE"
                  checked={decision === 'MANUAL_OVERRIDE'}
                  onChange={() => setDecision('MANUAL_OVERRIDE')}
                  className="text-blue-600"
                />
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs">Manual Override</span>
              </label>

            </div>
          </div>

          {/* Statutory Officer Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Officer Statutory Remarks (Mandatory)
            </label>
            <textarea
              required
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Verified physically on package side; unit symbol conjoined without space in violation of Rule 13."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Optional Evidence Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Additional Physical Evidence Reference (Optional)
            </label>
            <input
              type="text"
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="e.g., Physical sample seized under Seizure Memo No. 89"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-gov-blue hover:bg-blue-900 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Decision...' : 'Commit Official Determination'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
