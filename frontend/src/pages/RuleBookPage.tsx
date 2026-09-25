import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Scale, Download, ExternalLink, ShieldCheck, 
  ChevronDown, ChevronUp, AlertCircle, FileText, Sparkles, Filter
} from 'lucide-react';
import { ruleService } from '../services/api';
import { GazetteViewerModal } from '../components/legal/GazetteViewerModal';

interface StatutoryRule {
  rule_code: string;
  rule_number: string;
  title: string;
  chapter: string;
  page_number: number;
  gazette_reference: string;
  statutory_text: string;
  penalty_section: string;
  keywords: string[];
}

export const RuleBookPage: React.FC = () => {
  const [rules, setRules] = useState<StatutoryRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [expandedRuleCode, setExpandedRuleCode] = useState<string | null>(null);

  // Gazette viewer modal state
  const [gazetteModalOpen, setGazetteModalOpen] = useState<boolean>(false);
  const [targetPage, setTargetPage] = useState<number>(37);
  const [selectedRuleMeta, setSelectedRuleMeta] = useState<{
    title?: string;
    citation?: string;
    statutoryText?: string;
    penaltySection?: string;
  }>({});

  useEffect(() => {
    const fetchGazetteRules = async () => {
      setLoading(true);
      try {
        const data = await ruleService.getGazetteIndex();
        if (data && data.rules) {
          setRules(data.rules);
          // Expand first rule by default
          if (data.rules.length > 0) {
            setExpandedRuleCode(data.rules[0].rule_code);
          }
        }
      } catch (err) {
        console.error('Failed to load gazette rules', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGazetteRules();
  }, []);

  const openGazettePage = (pageNum: number, rule?: StatutoryRule) => {
    setTargetPage(pageNum);
    if (rule) {
      setSelectedRuleMeta({
        title: rule.title,
        citation: `${rule.rule_number} (${rule.gazette_reference})`,
        statutoryText: rule.statutory_text,
        penaltySection: rule.penalty_section
      });
    } else {
      setSelectedRuleMeta({
        title: 'Official Gazette of India — Packaged Commodities Rules',
        citation: `Gazette Page ${pageNum}`,
        statutoryText: 'The Legal Metrology (Packaged Commodities) Rules, 2011 and official amendments.',
        penaltySection: 'Section 36 of Legal Metrology Act, 2009'
      });
    }
    setGazetteModalOpen(true);
  };

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = 
      rule.rule_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.statutory_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.keywords.some((k) => k.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeCategory === 'RULE_6') {
      return rule.rule_number.startsWith('Rule 6');
    }
    if (activeCategory === 'RULE_13') {
      return rule.rule_number.startsWith('Rule 13');
    }
    if (activeCategory === 'RULE_18') {
      return rule.rule_number.startsWith('Rule 18');
    }
    if (activeCategory === 'AMENDMENTS') {
      return rule.page_number > 83 || rule.chapter.toLowerCase().includes('amendment');
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[11px] border border-amber-500/30">
              Primary Statutory Record
            </span>
            <span className="text-slate-400 text-xs font-semibold">&bull; 194 Consolidated Gazette Pages</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Legal Metrology Rule Book
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            The Legal Metrology (Packaged Commodities) Rules, 2011 and Official Gazette Amendments (2015–2024). Authoritative English statutory text spans from Page 37 through 194, indexed for court-admissible legal compliance.
          </p>

          {/* Quick Page Jump Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => openGazettePage(39)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 6 Declarations (Pg 39)
            </button>
            <button
              onClick={() => openGazettePage(47)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 13 Numeral Heights (Pg 47)
            </button>
            <button
              onClick={() => openGazettePage(56)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Rule 18 MRP Overcharging Ban (Pg 56)
            </button>
            <button
              onClick={() => openGazettePage(121)}
              className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-semibold transition cursor-pointer"
            >
              Unit Sale Price Amendment (Pg 121)
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => openGazettePage(37)}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
          >
            <Scale className="w-4 h-4" />
            <span>📜 Open 194-Page Gazette</span>
          </button>
          <a
            href="http://localhost:8000/api/v1/rules/gazette-pdf"
            download="legal_metrology_rules_consolidated.pdf"
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition border border-white/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF (38.8 MB)</span>
          </a>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rules by keyword (e.g. MRP, net weight, height, manufacturer, penalty)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 shrink-0 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Rules' },
            { id: 'RULE_6', label: 'Rule 6 Declarations' },
            { id: 'RULE_13', label: 'Rule 13 Numeral Heights' },
            { id: 'RULE_18', label: 'Rule 18 MRP Rules' },
            { id: 'AMENDMENTS', label: 'Amendments & Schedules' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Directory List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Indexing statutory rule book...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-700">No matching rules found</h3>
          <p className="text-xs text-slate-500">Try searching for generic terms like &quot;commodity&quot;, &quot;MRP&quot;, or &quot;Rule 6&quot;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => {
            const isExpanded = expandedRuleCode === rule.rule_code;

            return (
              <div
                key={rule.rule_code}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isExpanded ? 'border-sky-300 shadow-md ring-1 ring-sky-100' : 'border-slate-200/80 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Rule Accordion Header */}
                <div
                  onClick={() => setExpandedRuleCode(isExpanded ? null : rule.rule_code)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition gap-4"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <span className="font-mono text-xs font-black text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1 rounded-xl shrink-0">
                      {rule.rule_number}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {rule.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate">
                        {rule.chapter} &bull; {rule.gazette_reference}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGazettePage(rule.page_number, rule);
                      }}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      <Scale className="w-3.5 h-3.5 text-amber-700" />
                      <span>Gazette Pg {rule.page_number}</span>
                    </button>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Rule Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4 bg-slate-50/30 animate-in fade-in duration-200">
                    
                    {/* Statutory Text Quote */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-2">
                      <div className="flex items-center space-x-1.5 text-sky-700 text-xs font-black uppercase tracking-wider">
                        <FileText className="w-4 h-4" />
                        <span>Official Gazette Statutory Text</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-serif italic pl-3 border-l-2 border-sky-400">
                        &ldquo;{rule.statutory_text}&rdquo;
                      </p>
                    </div>

                    {/* Penalty Provisions */}
                    <div className="bg-red-50/60 rounded-xl p-4 border border-red-200 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-red-800 text-xs font-black uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span>Statutory Penalty Provision</span>
                      </div>
                      <p className="text-xs text-red-900 font-semibold">
                        {rule.penalty_section}
                      </p>
                    </div>

                    {/* Action & Verification footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Tags:</span>
                        {rule.keywords.slice(0, 5).map((k, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md text-[10px] font-semibold">
                            {k}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => openGazettePage(rule.page_number, rule)}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        <Scale className="w-4 h-4 text-amber-400" />
                        <span>View High-Res Gazette Page {rule.page_number}</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Gazette Viewer Modal */}
      <GazetteViewerModal
        isOpen={gazetteModalOpen}
        onClose={() => setGazetteModalOpen(false)}
        initialPage={targetPage}
        ruleTitle={selectedRuleMeta.title}
        citation={selectedRuleMeta.citation}
        statutoryText={selectedRuleMeta.statutoryText}
        penaltySection={selectedRuleMeta.penaltySection}
      />
    </div>
  );
};
