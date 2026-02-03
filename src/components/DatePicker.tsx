"use client";

import { useRef, memo } from "react";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
};

/**
 * カレンダーアイコン付きの日付入力コンポーネント
 * ネイティブの date input をベースに、カレンダーアイコンボタンを追加
 *
 * Performance: Memoized to prevent unnecessary re-renders
 */
const DatePicker = memo(function DatePicker({
  value,
  onChange,
  className = "",
  style,
  disabled = false,
  placeholder,
  min,
  max,
}: DatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.showPicker?.();
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        style={style}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
      />
      <button
        type="button"
        onClick={handleIconClick}
        disabled={disabled}
        className={`absolute right-2 flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-slate-100 dark:hover:bg-slate-700/50 active:bg-slate-200 dark:active:bg-slate-600/50"
        }`}
        aria-label="カレンダーを開く"
        tabIndex={-1}
      >
        <svg
          className="h-4 w-4 text-slate-500 dark:text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
});

export default DatePicker;
