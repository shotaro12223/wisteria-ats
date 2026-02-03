"use client";

import { memo } from "react";

type NumberInputProps = {
  value: string | number;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
};

/**
 * 上下矢印ボタン付きの数値入力コンポーネント
 * ネイティブの number input をベースに、より目立つスピナーボタンを追加
 *
 * Performance: Memoized to prevent unnecessary re-renders
 */
const NumberInput = memo(function NumberInput({
  value,
  onChange,
  className = "",
  style,
  disabled = false,
  placeholder,
  min,
  max,
  step = 1,
}: NumberInputProps) {
  const handleIncrement = () => {
    if (disabled) return;
    const currentValue = parseFloat(String(value)) || 0;
    const stepValue = parseFloat(String(step)) || 1;
    const newValue = currentValue + stepValue;

    if (max !== undefined && newValue > Number(max)) return;

    onChange(String(newValue));
  };

  const handleDecrement = () => {
    if (disabled) return;
    const currentValue = parseFloat(String(value)) || 0;
    const stepValue = parseFloat(String(step)) || 1;
    const newValue = currentValue - stepValue;

    if (min !== undefined && newValue < Number(min)) return;

    onChange(String(newValue));
  };

  return (
    <div className="relative flex items-stretch">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        style={style}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
      />
      <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center px-2 transition-colors border-b border-slate-200 dark:border-slate-700 ${
            disabled
              ? "cursor-not-allowed opacity-40 bg-slate-50 dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-700/50 active:bg-slate-200 dark:active:bg-slate-600/50 bg-white dark:bg-slate-900"
          }`}
          aria-label="値を増やす"
          tabIndex={-1}
        >
          <svg
            className="h-3 w-3 text-slate-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center px-2 transition-colors ${
            disabled
              ? "cursor-not-allowed opacity-40 bg-slate-50 dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-700/50 active:bg-slate-200 dark:active:bg-slate-600/50 bg-white dark:bg-slate-900"
          }`}
          aria-label="値を減らす"
          tabIndex={-1}
        >
          <svg
            className="h-3 w-3 text-slate-600 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default NumberInput;
