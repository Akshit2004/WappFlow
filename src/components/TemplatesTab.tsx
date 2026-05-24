"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileCode2, 
  Plus, 
  Tag, 
  Check, 
  Sparkles, 
  Image, 
  Video, 
  FileText,
  MousePointerClick,
  X,
  PlusCircle,
  Trash,
  Loader
} from "lucide-react";
import { useApp, Template } from "../context/AppContext";
import { useParams } from "next/navigation";

export const TemplatesTab: React.FC = () => {
  const { templates, addTemplate, addSystemLog } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [tmplName, setTmplName] = useState("");
  const [tmplCategory, setTmplCategory] = useState<Template["category"]>("Utility");
  const [tmplBody, setTmplBody] = useState("");
  const [tmplMediaType, setTmplMediaType] = useState<Template["mediaType"]>("none");
  const [buttonInput, setButtonInput] = useState("");
  const [buttonsList, setButtonsList] = useState<string[]>([]);

  // Filter templates
  const filteredTemplates = templates.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

  const handleAddButton = () => {
    if (!buttonInput.trim() || buttonsList.length >= 3) return;
    setButtonsList([...buttonsList, buttonInput.trim()]);
    setButtonInput("");
  };

  const handleRemoveButton = (idx: number) => {
    setButtonsList(buttonsList.filter((_, i) => i !== idx));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim() || !tmplBody.trim()) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/whatsapp/create-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tmplName.trim(),
          category: tmplCategory,
          body: tmplBody.trim(),
          mediaType: tmplMediaType,
          buttons: buttonsList,
          organizationId: orgId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("crm", `Template creation failed: ${err.error}`);
        return;
      }

      const data = await res.json();
      addTemplate(data.template);
    } catch (err: any) {
      addSystemLog("crm", `Template creation error: ${err.message}`);
    } finally {
      setSubmitting(false);
      setTmplName("");
      setTmplBody("");
      setTmplMediaType("none");
      setButtonsList([]);
      setIsModalOpen(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "Marketing":
        return <span className="bg-pink-500/10 text-pink-600 border border-pink-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Marketing</span>;
      case "Utility":
        return <span className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Utility</span>;
      default:
        return <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">Authentication</span>;
    }
  };

  // Poll pending templates every 15s for status changes
  useEffect(() => {
    const pending = templates.filter((t) => t.metaStatus === "pending" && t.metaId);
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      for (const t of pending) {
        try {
          const res = await fetch(`/api/whatsapp/check-template-status?templateId=${t.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.metaStatus !== "pending") {
              addSystemLog("crm", `Template "${t.name}" ${data.metaStatus === "approved" ? "approved" : "rejected"} by Meta`);
            }
          }
        } catch {}
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [templates, addSystemLog]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Meta Approved
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
            Rejected by Meta
          </span>
        );
      default:
        return (
          <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" />
            Pending Meta Approval
          </span>
        );
    }
  };

  const getMediaIcon = (mediaType?: string) => {
    if (!mediaType || mediaType === "none") return null;
    let Icon = FileText;
    if (mediaType === "image") Icon = Image;
    if (mediaType === "video") Icon = Video;
    return (
      <span className="text-[10px] bg-orange-50 text-stone-500 border border-orange-100 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
        <Icon className="w-3 h-3 text-stone-500" />
        {mediaType}
      </span>
    );
  };

  // Highlights variables e.g. {{1}}
  const formatBodyWithHighlights = (body: string) => {
    const parts = body.split(/(\{\{\d\}\})/g);
    return parts.map((part, idx) => {
      if (/^\{\{\d\}\}$/.test(part)) {
        return (
          <span 
            key={idx} 
            className="bg-orange-500/10 dark:bg-orange-500/25 text-orange-600 font-mono font-bold px-1 rounded"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 animate-slide-up">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meta Approved Templates</h2>
          <p className="text-zinc-500 text-sm mt-1">Manage WhatsApp-compliant template layouts, media variables, and quick action headers.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-orange-600/10 hover:scale-102 active:scale-98 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Filter Category pills */}
      <div className="flex items-center gap-1.5 border-b border-orange-100 pb-3">
        {["all", "Marketing", "Utility", "Authentication"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${
              activeCategory === cat
                ? "bg-orange-600 text-white"
                : "text-stone-500 hover:bg-orange-50"
            }`}
          >
            {cat === "all" ? "All Templates" : cat}
          </button>
        ))}
      </div>

      {/* Templates Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((t) => (
          <div 
            key={t.id} 
            className="glass-panel rounded-2xl flex flex-col justify-between shadow-sm border border-orange-100/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden bg-white"
          >
            {/* Template Card Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] text-stone-500 font-mono font-bold select-none">{t.id}</span>
                {getCategoryBadge(t.category)}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-900 truncate leading-none">{t.name}</h4>
                <div className="flex items-center gap-2 pt-1 select-none">
                  {getMediaIcon(t.mediaType)}
                  {getStatusBadge(t.metaStatus)}
                </div>
              </div>

              {/* Message body box with highlights */}
              <div className="bg-orange-50/40 border border-orange-100 p-4 rounded-xl text-xs leading-relaxed text-stone-700 max-h-40 overflow-y-auto custom-scrollbar select-text whitespace-pre-wrap">
                {formatBodyWithHighlights(t.body)}
              </div>
            </div>

            {/* Quick reply buttons footer */}
            {t.buttons && t.buttons.length > 0 ? (
              <div className="bg-orange-50/50 border-t border-orange-100/60 p-3.5 space-y-2 select-none shrink-0">
                <div className="text-[9px] uppercase tracking-wider font-bold text-stone-500 flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3 text-stone-500" />
                  Interactive Buttons
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.buttons.map((btn, bIdx) => (
                    <span 
                      key={bIdx}
                      className="text-[10px] font-bold border border-orange-100 bg-white px-2.5 py-1 text-orange-600 rounded-lg flex items-center gap-1 shadow-sm leading-none"
                    >
                      {btn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-orange-50/20 border-t border-orange-100/60 py-3.5 px-6 shrink-0">
                <span className="text-[10px] italic text-stone-500">No CTA buttons defined.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up bg-white">
            
            {/* Header */}
            <div className="p-6 border-b border-orange-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-orange-500" />
                Build Message Template
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-orange-50 text-stone-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTemplate} className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Template Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Template Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. order_completed_alert"
                  value={tmplName}
                  onChange={(e) => setTmplName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <span className="text-[9px] text-stone-500 block font-mono">Lowercase letters and underscores only (Meta Compliance).</span>
              </div>

              {/* Grid 2x2 for categories */}
              <div className="grid grid-cols-2 gap-4">
                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Category Type</label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value as Template["category"])}
                    className="w-full bg-orange-50 border border-orange-100 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Marketing">Marketing</option>
                    <option value="Utility">Utility</option>
                    <option value="Authentication">Authentication</option>
                  </select>
                </div>

                {/* Media header select */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Header Attachment</label>
                  <select
                    value={tmplMediaType}
                    onChange={(e) => setTmplMediaType(e.target.value as Template["mediaType"])}
                    className="w-full bg-orange-50 border border-orange-100 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="none">None (Text-only)</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document PDF</option>
                  </select>
                </div>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Message Body Text</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Hey {{1}}! Thanks for shopping. Your discount is valid til {{2}}."
                  value={tmplBody}
                  onChange={(e) => setTmplBody(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
                />
                <span className="text-[9px] text-stone-500 block leading-tight">Use double braces like <code className="font-mono bg-orange-50 px-1 py-0.5 rounded text-orange-500 font-bold select-all">{"{{1}}"}</code>, <code className="font-mono bg-orange-50 px-1 py-0.5 rounded text-orange-500 font-bold select-all">{"{{2}}"}</code> to map custom variables.</span>
              </div>

              {/* Interactive buttons builder */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Interactive CTA Buttons (Max 3)</label>
                
                {/* Active buttons layout */}
                {buttonsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-orange-50/40 rounded-xl border border-orange-100">
                    {buttonsList.map((btn, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-bold bg-white text-orange-600 border border-orange-100 px-2 py-0.5 rounded flex items-center gap-1.5"
                      >
                        <span>{btn}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="hover:bg-red-500/10 p-0.5 rounded-full text-stone-500 hover:text-red-500"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input row */}
                {buttonsList.length < 3 && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Chat with Support 💬"
                      value={buttonInput}
                      onChange={(e) => setButtonInput(e.target.value)}
                      className="flex-1 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddButton}
                      className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:scale-102 transition-all flex items-center gap-1"
                    >
                      <PlusCircle className="w-4 h-4 text-orange-500" />
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-orange-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-orange-50 hover:bg-zinc-200 text-stone-600 dark:text-stone-600 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!tmplName.trim() || !tmplBody.trim() || submitting}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/10"
                >
                  {submitting ? (
                    <><Loader className="w-3.5 h-3.5 animate-spin" /> Submitting to Meta...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Save and Sync Template</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
