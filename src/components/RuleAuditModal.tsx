import React, { useState } from 'react';
import { X, Sliders, ShieldCheck, HelpCircle } from 'lucide-react';
import { RiskRuleResult } from '../../shared/types.js';
import { formatDateTime } from '../services/api';

interface RuleAuditModalProps {
  rule: RiskRuleResult;
  currentThreshold: number;
  onUpdateThreshold: (newThreshold: number) => void;
  onClose: () => void;
}

export const RuleAuditModal: React.FC<RuleAuditModalProps> = ({
  rule,
  currentThreshold,
  onUpdateThreshold,
  onClose,
}) => {
  const [sliderValue, setSliderValue] = useState(currentThreshold);

  const handleApplyThreshold = (val: number) => {
    setSliderValue(val);
    onUpdateThreshold(val);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-audit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl border border-slate-200 text-slate-800 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-teal-400">
                Rule Engine Audit · {rule.ruleId}
              </span>
              <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {rule.ruleVersion}
              </span>
            </div>
            <h2 id="rule-audit-title" className="text-base font-semibold text-white mt-0.5">
              {rule.ruleName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
            aria-label="Close rule audit modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Rule Evaluation Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Current Evaluation Result for {rule.locationName}
            </h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Assigned Label</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">{rule.riskLabel}</span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Severity Tier</span>
                <span className="font-semibold text-slate-900 uppercase text-[11px] mt-0.5 block">
                  {rule.riskSeverity}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">24h Rain Sum</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {rule.measuredValue} {rule.thresholdUnit.split('/')[0]}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">Active Threshold</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {currentThreshold} {rule.thresholdUnit}
                </span>
              </div>
            </div>

            {/* Requirement 2: Confidence not assessed with documented factors */}
            <div className="mt-3 bg-white p-3 rounded border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Confidence Status:</span>
                <span className="font-mono text-slate-600">not assessed</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {rule.confidenceNote}
              </p>
              <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span className="font-semibold text-slate-700 block mb-0.5">
                  Future methodology will calculate confidence from:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                  {rule.confidenceFutureFactors.map((f, idx) => (
                    <li key={idx}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Configurable Threshold Sandbox */}
          <div className="border border-slate-200 rounded-md p-4 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-slate-900">
                  Configurable Trigger Threshold
                </h3>
              </div>
              <span className="text-xs font-mono font-medium text-slate-700">
                {sliderValue} mm / 24h
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              Adjust the 24-hour rainfall threshold used to classify risk. Standard operational baseline is 30 mm/24h.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={sliderValue}
                onChange={e => handleApplyThreshold(parseFloat(e.target.value))}
                className="w-full accent-slate-800 h-2 bg-slate-200 rounded-lg cursor-pointer"
                aria-label="Adjust 24-hour rainfall threshold"
              />
              <button
                onClick={() => handleApplyThreshold(30)}
                className="text-xs text-slate-600 hover:text-slate-900 underline shrink-0"
              >
                Reset (30mm)
              </button>
            </div>
          </div>

          {/* Transparent Input Variables Table with two timestamps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Audited Input Records
              </h3>
              <span className="text-[11px] text-slate-500">
                {rule.inputs.length} normalized variables
              </span>
            </div>
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Variable</th>
                    <th className="py-2 px-3 font-semibold">Label</th>
                    <th className="py-2 px-3 font-semibold">Value</th>
                    <th className="py-2 px-3 font-semibold">Timestamps (Valid / Retrieved)</th>
                    <th className="py-2 px-3 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {rule.inputs.map((inp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-800">
                        {inp.variableName}
                      </td>
                      <td className="py-2 px-3">{inp.label}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {inp.value !== null ? `${inp.value} ${inp.unit}` : 'Data unavailable'}
                      </td>
                      <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                        {inp.model_run_at ? (
                          <div>
                            <span>Valid: {formatDateTime(inp.model_run_at)}</span>
                            <span className="block text-slate-400">Retrieved: {formatDateTime(inp.retrieved_at)}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {inp.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logic & Mathematical Formulation */}
          <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <HelpCircle className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
              <span>Visible Rule Classification Formula</span>
            </div>
            <p>{rule.ruleLogicDescription}</p>
            <div className="font-mono text-[11px] bg-white p-2.5 rounded border border-slate-200 text-slate-800 space-y-1">
              <div>R_24h = Sum(Hourly Forecast Precipitation, t=0 to 24h)</div>
              <div>IF R_24h &gt;= 2 × T  -&gt; 'Severe flood risk' (High severity)</div>
              <div>ELSE IF R_24h &gt;= T  -&gt; 'Heavy rain outlook' (Elevated severity)</div>
              <div>ELSE IF R_24h &gt;= 0.5 × T -&gt; 'Moderate rain alert' (Moderate severity)</div>
              <div>ELSE -&gt; 'Low hazard signal' (Low severity)</div>
            </div>
          </div>

          {/* Disclaimer & Authority Role */}
          <div className="bg-slate-100 border border-slate-300 rounded p-3 text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong className="text-slate-900">Official Authority Precedence: </strong>
              {rule.officialSourceDisclaimer}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};
