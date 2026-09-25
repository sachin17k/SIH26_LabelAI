import React, { useEffect, useState } from 'react';
import { Scale, PlusCircle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { ruleService } from '../services/api';
import { ComplianceRule } from '../types';
import { useAuth } from '../context/AuthContext';

export const RuleManagementPage: React.FC = () => {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { hasRole } = useAuth();

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [ruleCode, setRuleCode] = useState<string>('');
  const [ruleNumber, setRuleNumber] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [reqType, setReqType] = useState<string>('NET_QUANTITY');
  const [valType, setValType] = useState<string>('quantity_validation');
  const [severity, setSeverity] = useState<any>('CRITICAL');

  const fetchRules = async () => {
    try {
      const data = await ruleService.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ruleService.createRule({
        rule_code: ruleCode,
        rule_number: ruleNumber,
        title,
        description,
        requirement_type: reqType,
        validation_type: valType,
        severity,
        is_mandatory: true
      });
      setIsAddModalOpen(false);
      fetchRules();
    } catch (err) {
      alert('Failed to add compliance rule');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Legal Metrology (Packaged Commodities) Rule Repository
          </h1>
          <p className="text-xs text-slate-500">
            Version-controlled statutory compliance rules, First Schedule numeral height tables, and gazette amendments (2011-2026)
          </p>
        </div>

        {hasRole(['ADMIN']) && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Statutory Rule</span>
          </button>
        )}
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-slate-400">Loading statutory rules...</div>
        ) : (
          rules.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3 hover:border-sky-300 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {r.rule_number}
                  </span>
                  <span className="font-mono text-xs text-slate-400">({r.rule_code})</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  r.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {r.severity}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.description}</p>
              </div>

              {/* Version & History */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Validation: <strong>{r.validation_type}</strong></span>
                </span>
                <span className="font-mono text-slate-400">
                  {r.versions?.length || 1} Version(s) Active
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Statutory Compliance Rule</h3>
            
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Code *</label>
                  <input
                    type="text"
                    required
                    value={ruleCode}
                    onChange={(e) => setRuleCode(e.target.value)}
                    placeholder="LM-PC-R06-NEW"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Number *</label>
                  <input
                    type="text"
                    required
                    value={ruleNumber}
                    onChange={(e) => setRuleNumber(e.target.value)}
                    placeholder="Rule 6(1)(h)"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Best Before or Expiry Date for Perishables"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Statutory Description *</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mandatory expiry date declaration under Legal Metrology packaged commodity rules."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Validation Type</label>
                  <select
                    value={valType}
                    onChange={(e) => setValType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value="presence_check">presence_check</option>
                    <option value="quantity_validation">quantity_validation</option>
                    <option value="mrp_validation">mrp_validation</option>
                    <option value="date_validation">date_validation</option>
                    <option value="unit_validation">unit_validation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="MAJOR">MAJOR</option>
                    <option value="MINOR">MINOR</option>
                    <option value="ADVISORY">ADVISORY</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md"
                >
                  Save Statutory Rule
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
