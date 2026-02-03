"use client";

import { useState, useEffect } from "react";
import type { Filters } from "@/lib/workQueue";

export type SavedView = {
  id: string;
  name: string;
  filters: Filters;
  createdAt: string;
};

export type NoteTemplate = {
  id: string;
  name: string;
  content: string;
};

const SAVED_VIEWS_KEY = "wisteria_ats_workqueue_saved_views_v1";
const NOTE_TEMPLATES_KEY = "wisteria_ats_workqueue_note_templates_v1";



export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    loadViews();
  }, []);

  function loadViews() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(SAVED_VIEWS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setViews(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setViews([]);
    }
  }

  function saveView(name: string, filters: Filters) {
    const newView: SavedView = {
      id: `view_${Date.now()}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
    };

    const updated = [...views, newView];
    setViews(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    }
  }

  function deleteView(id: string) {
    const updated = views.filter((v) => v.id !== id);
    setViews(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    }
  }

  return { views, saveView, deleteView, loadViews };
}

export function SavedViewsPanel({
  views,
  currentFilters,
  onApplyView,
  onSaveView,
  onDeleteView,
}: {
  views: SavedView[];
  currentFilters: Filters;
  onApplyView: (view: SavedView) => void;
  onSaveView: (name: string) => void;
  onDeleteView: (id: string) => void;
}) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  function handleSave() {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName("");
      setShowSaveDialog(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-slate-900">📌 保存済みビュー</h3>
        <button
          type="button"
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + 現在のビューを保存
        </button>
      </div>

      {showSaveDialog && (
        <div className="mb-3 rounded-md border border-indigo-200 bg-indigo-50 p-3">
          <input
            type="text"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            placeholder="ビュー名を入力..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setShowSaveDialog(false);
            }}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setShowSaveDialog(false)}
              className="rounded-md bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {views.length === 0 ? (
        <div className="text-[12px] text-slate-500 text-center py-3">
          保存されたビューはありません
        </div>
      ) : (
        <div className="space-y-1">
          {views.map((view) => (
            <div
              key={view.id}
              className="group flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
            >
              <button
                type="button"
                onClick={() => onApplyView(view)}
                className="flex-1 text-left text-[12px] font-semibold text-slate-900 hover:text-indigo-700"
              >
                {view.name}
              </button>
              <button
                type="button"
                onClick={() => onDeleteView(view.id)}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-rose-600 hover:text-rose-800 font-semibold transition-opacity"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



export function useNoteTemplates() {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  function loadTemplates() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(NOTE_TEMPLATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTemplates(Array.isArray(parsed) ? parsed : []);
      } else {
        // Default templates
        const defaults: NoteTemplate[] = [
          { id: "t1", name: "クライアントに資料請求中", content: "クライアントに資料請求中です。回答待ち。" },
          { id: "t2", name: "掲載終了予定", content: "掲載終了予定（1週間後）" },
          { id: "t3", name: "媒体側で審査中", content: "媒体側で審査中。承認待ち。" },
          { id: "t4", name: "応募者対応中", content: "応募者への対応を進めています。" },
        ];
        setTemplates(defaults);
        localStorage.setItem(NOTE_TEMPLATES_KEY, JSON.stringify(defaults));
      }
    } catch {
      setTemplates([]);
    }
  }

  function saveTemplate(name: string, content: string) {
    const newTemplate: NoteTemplate = {
      id: `template_${Date.now()}`,
      name,
      content,
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(NOTE_TEMPLATES_KEY, JSON.stringify(updated));
    }
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);

    if (typeof window !== "undefined") {
      localStorage.setItem(NOTE_TEMPLATES_KEY, JSON.stringify(updated));
    }
  }

  return { templates, saveTemplate, deleteTemplate, loadTemplates };
}

export function NoteTemplatesPanel({
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}: {
  templates: NoteTemplate[];
  onApplyTemplate: (template: NoteTemplate) => void;
  onSaveTemplate: (name: string, content: string) => void;
  onDeleteTemplate: (id: string) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");

  function handleSave() {
    if (newName.trim() && newContent.trim()) {
      onSaveTemplate(newName.trim(), newContent.trim());
      setNewName("");
      setNewContent("");
      setShowAddDialog(false);
    }
  }

  return (
    <div className="rounded-lg border-2 border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-slate-900">📝 テンプレートメモ</h3>
        <button
          type="button"
          onClick={() => setShowAddDialog(!showAddDialog)}
          className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          + 新規作成
        </button>
      </div>

      {showAddDialog && (
        <div className="mb-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="テンプレート名"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="メモの内容"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setShowAddDialog(false)}
              className="rounded-md bg-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {templates.map((template) => (
          <div
            key={template.id}
            className="group flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 transition-colors"
          >
            <button
              type="button"
              onClick={() => onApplyTemplate(template)}
              className="flex-1 text-left"
            >
              <div className="text-[12px] font-semibold text-slate-900">{template.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-600 line-clamp-1">{template.content}</div>
            </button>
            <button
              type="button"
              onClick={() => onDeleteTemplate(template.id)}
              className="opacity-0 group-hover:opacity-100 text-[11px] text-rose-600 hover:text-rose-800 font-semibold transition-opacity"
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
