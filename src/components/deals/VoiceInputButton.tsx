// src/components/deals/VoiceInputButton.tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInputButton({ onTranscript, className = "" }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Web Speech API サポート確認
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "ja-JP";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            }
          }
          if (finalTranscript) {
            onTranscript(finalTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.error("音声認識エラー:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!isSupported) {
    return null; // 音声認識非対応ブラウザでは非表示
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={[
        "inline-flex items-center gap-2 rounded-md border-2 px-3 py-2 text-[12px] font-semibold shadow-sm transition",
        isListening
          ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 animate-pulse"
          : "border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/35 dark:focus-visible:ring-indigo-500/40",
        className,
      ].join(" ")}
      title={isListening ? "音声入力を停止" : "音声入力を開始"}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      {isListening ? "録音中…" : "🎤 音声入力"}
    </button>
  );
}
