// src/components/deals/DealQuickInputModal.tsx
"use client";

import { useState, useEffect } from "react";
import NumberInput from "@/components/NumberInput";

interface DealQuickInputModalProps {
  isOpen: boolean;
  amount: string;
  probability: string;
  minimumContractMonths: string;
  proposalMode: "competitor" | "current" | "new";
  primaryContactName: string;
  primaryContactTitle: string;
  contactEmail: string;
  contactPhone: string;
  decisionMakerName: string;
  communicationPreference: string;
  contactHours: string;
  onClose: () => void;
  onSave: (data: {
    amount: string;
    probability: string;
    minimumContractMonths: string;
    proposalMode: "competitor" | "current" | "new";
    primaryContactName: string;
    primaryContactTitle: string;
    contactEmail: string;
    contactPhone: string;
    decisionMakerName: string;
    communicationPreference: string;
    contactHours: string;
  }) => void;
}

export function DealQuickInputModal({
  isOpen,
  amount,
  probability,
  minimumContractMonths,
  proposalMode,
  primaryContactName,
  primaryContactTitle,
  contactEmail,
  contactPhone,
  decisionMakerName,
  communicationPreference,
  contactHours,
  onClose,
  onSave,
}: DealQuickInputModalProps) {
  const [activeTab, setActiveTab] = useState<"deal" | "company">("deal");
  const [localAmount, setLocalAmount] = useState(amount);
  const [localProbability, setLocalProbability] = useState(probability);
  const [localMinimumContractMonths, setLocalMinimumContractMonths] = useState(minimumContractMonths);
  const [localProposalMode, setLocalProposalMode] = useState<"competitor" | "current" | "new">(proposalMode);
  const [localPrimaryContactName, setLocalPrimaryContactName] = useState(primaryContactName);
  const [localPrimaryContactTitle, setLocalPrimaryContactTitle] = useState(primaryContactTitle);
  const [localContactEmail, setLocalContactEmail] = useState(contactEmail);
  const [localContactPhone, setLocalContactPhone] = useState(contactPhone);
  const [localDecisionMakerName, setLocalDecisionMakerName] = useState(decisionMakerName);
  const [localCommunicationPreference, setLocalCommunicationPreference] = useState(communicationPreference);
  const [localContactHours, setLocalContactHours] = useState(contactHours);

  useEffect(() => {
    if (isOpen) {
      setLocalAmount(amount);
      setLocalProbability(probability);
      setLocalMinimumContractMonths(minimumContractMonths);
      setLocalProposalMode(proposalMode);
      setLocalPrimaryContactName(primaryContactName);
      setLocalPrimaryContactTitle(primaryContactTitle);
      setLocalContactEmail(contactEmail);
      setLocalContactPhone(contactPhone);
      setLocalDecisionMakerName(decisionMakerName);
      setLocalCommunicationPreference(communicationPreference);
      setLocalContactHours(contactHours);
    }
  }, [
    isOpen,
    amount,
    probability,
    minimumContractMonths,
    proposalMode,
    primaryContactName,
    primaryContactTitle,
    contactEmail,
    contactPhone,
    decisionMakerName,
    communicationPreference,
    contactHours,
  ]);

  const handleSave = () => {
    onSave({
      amount: localAmount,
      probability: localProbability,
      minimumContractMonths: localMinimumContractMonths,
      proposalMode: localProposalMode,
      primaryContactName: localPrimaryContactName,
      primaryContactTitle: localPrimaryContactTitle,
      contactEmail: localContactEmail,
      contactPhone: localContactPhone,
      decisionMakerName: localDecisionMakerName,
      communicationPreference: localCommunicationPreference,
      contactHours: localContactHours,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">クイック入力</h2>
              <p className="mt-1 text-[13px] text-slate-600">商談中に素早く情報を記録</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* タブ */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("deal")}
              className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                activeTab === "deal"
                  ? "bg-indigo-100 text-indigo-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              商談情報
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("company")}
              className={`flex-1 rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
                activeTab === "company"
                  ? "bg-indigo-100 text-indigo-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              企業情報
            </button>
          </div>
        </div>

        {/* ボディ */}
        <div className="px-6 py-5 space-y-4 max-h-[400px] overflow-y-auto">
          {activeTab === "deal" ? (
            <>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">想定金額（月額）</label>
                <NumberInput
                  value={localAmount}
                  onChange={setLocalAmount}
                  placeholder="例: 150000"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">受注確度（%）</label>
                <NumberInput
                  min="0"
                  max="100"
                  value={localProbability}
                  onChange={setLocalProbability}
                  placeholder="例: 70"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              {/* クイック設定ボタン */}
              <div>
                <div className="text-[12px] font-semibold text-slate-600 mb-2">クイック設定</div>
                <div className="flex flex-wrap gap-2">
                  {[30, 50, 70, 80, 90].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLocalProbability(String(val))}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-all hover:bg-indigo-50 hover:border-indigo-300"
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">最低契約期間（ヶ月）</label>
                <NumberInput
                  min="1"
                  value={localMinimumContractMonths}
                  onChange={setLocalMinimumContractMonths}
                  placeholder="例: 3"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">提案タイプ</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalProposalMode("competitor")}
                    className={`rounded-lg px-3 py-2.5 text-[12px] font-semibold border-2 transition-all ${
                      localProposalMode === "competitor"
                        ? "bg-indigo-100 border-indigo-500 text-indigo-900"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    競合比較
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalProposalMode("current")}
                    className={`rounded-lg px-3 py-2.5 text-[12px] font-semibold border-2 transition-all ${
                      localProposalMode === "current"
                        ? "bg-indigo-100 border-indigo-500 text-indigo-900"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    現状改善
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalProposalMode("new")}
                    className={`rounded-lg px-3 py-2.5 text-[12px] font-semibold border-2 transition-all ${
                      localProposalMode === "new"
                        ? "bg-indigo-100 border-indigo-500 text-indigo-900"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    新規導入
                  </button>
                </div>
                <div className="mt-2 text-[12px] text-slate-600">
                  {localProposalMode === "competitor"
                    ? "他社RPOサービスとの比較で提案"
                    : localProposalMode === "current"
                    ? "現在の採用方法からの改善で提案"
                    : "採用費用をかけていない企業への新規提案"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">担当者氏名</label>
                <input
                  type="text"
                  value={localPrimaryContactName}
                  onChange={(e) => setLocalPrimaryContactName(e.target.value)}
                  placeholder="例: 山田太郎"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">担当者役職</label>
                <input
                  type="text"
                  value={localPrimaryContactTitle}
                  onChange={(e) => setLocalPrimaryContactTitle(e.target.value)}
                  placeholder="例: 人事部長"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">決裁者氏名</label>
                <input
                  type="text"
                  value={localDecisionMakerName}
                  onChange={(e) => setLocalDecisionMakerName(e.target.value)}
                  placeholder="例: 鈴木一郎"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">メールアドレス</label>
                <input
                  type="email"
                  value={localContactEmail}
                  onChange={(e) => setLocalContactEmail(e.target.value)}
                  placeholder="例: yamada@example.com"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">電話番号</label>
                <input
                  type="tel"
                  value={localContactPhone}
                  onChange={(e) => setLocalContactPhone(e.target.value)}
                  placeholder="例: 03-1234-5678"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">連絡希望方法</label>
                <input
                  type="text"
                  value={localCommunicationPreference}
                  onChange={(e) => setLocalCommunicationPreference(e.target.value)}
                  placeholder="例: メール希望"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-2">連絡可能時間</label>
                <input
                  type="text"
                  value={localContactHours}
                  onChange={(e) => setLocalContactHours(e.target.value)}
                  placeholder="例: 平日10-18時"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-[14px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="border-t border-slate-200 px-6 py-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all hover:from-indigo-600 hover:to-purple-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
