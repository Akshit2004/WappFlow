"use client";

import React, { useState, useEffect } from "react";
import { 
  Send, 
  Megaphone, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  X,
  PlayCircle,
  Eye,
  Settings2,
  Calendar,
  AlertCircle,
  Trash2,
  Clock,
  Sliders,
  Filter,
  BarChart4,
  Maximize2
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useParams } from "next/navigation";
import { CampaignReportDrawer } from "./CampaignReportDrawer";

export const CampaignsTab: React.FC = () => {
  const { campaigns, templates, contacts, systemLogs, sendBroadcast, deleteCampaign } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Status filtering
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Sending" | "Scheduled">("all");

  // Detailed Report Drawer state
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Campaign Form States
  const [campaignName, setCampaignName] = useState("");
  const [targetTag, setTargetTag] = useState("Shopify");
  const [templateName, setTemplateName] = useState("");
  
  // Advanced Delivery States
  const [runMode, setRunMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [sendDelay, setSendDelay] = useState(1); // Spacing delay in seconds

  // Dynamic Variable Mappings
  // Store variable name (e.g. "{{1}}") mapped to its type and chosen value
  const [variablesMapping, setVariablesMapping] = useState<Record<string, { type: "contact_field" | "static"; value: string }>>({});

  // Auto-initialize template choice and variables
  useEffect(() => {
    if (!templateName && templates.length > 0) {
      setTemplateName(templates[0].name);
    }
  }, [templates, templateName]);

  const activeTemplate = templates.find((t) => t.name === templateName);

  // Scan and parse variables from active template body
  useEffect(() => {
    if (!activeTemplate) return;

    // Scan for variables matching {{number}}
    const varRegex = /\{\{(\d+)\}\}/g;
    const matches = Array.from(activeTemplate.body.matchAll(varRegex)).map((m) => m[0]);
    const uniqueVars = Array.from(new Set(matches));

    // Initialize mapping with defaults
    const initialMapping: Record<string, { type: "contact_field" | "static"; value: string }> = {};
    uniqueVars.forEach((v, index) => {
      // Default first variable mapping to contact name, others static/empty
      if (index === 0) {
        initialMapping[v] = { type: "contact_field", value: "name" };
      } else {
        initialMapping[v] = { type: "static", value: "" };
      }
    });
    setVariablesMapping(initialMapping);
  }, [activeTemplate]);

  // Calculate target audience size in real-time
  const targetAudienceSize = contacts.filter((c) => c.tags.includes(targetTag)).length;

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !targetTag || !templateName || !orgId) return;

    // Formulate variables array for backend API
    const variablesPayload = Object.entries(variablesMapping).map(([key, map]) => ({
      key,
      type: map.type,
      value: map.value
    }));

    // Formulate scheduling datetime ISO string
    let scheduledAtStr: string | undefined;
    if (runMode === "scheduled" && scheduledDate && scheduledTime) {
      scheduledAtStr = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    sendBroadcast({
      name: campaignName.trim(),
      targetTag,
      templateName,
      organizationId: orgId,
      variables: variablesPayload,
      delay: sendDelay,
      scheduledAt: scheduledAtStr
    });

    // Reset and close
    setCampaignName("");
    setRunMode("immediate");
    setScheduledDate("");
    setScheduledTime("");
    setSendDelay(1);
    setIsModalOpen(false);
  };

  // Compile real-time template body live preview
  const compileLivePreview = () => {
    if (!activeTemplate) return "";
    let body = activeTemplate.body;
    
    Object.entries(variablesMapping).forEach(([variable, mapping]) => {
      let replacement = `[${variable}]`;
      if (mapping.type === "contact_field") {
        if (mapping.value === "name") replacement = "[Lead Name]";
        if (mapping.value === "email") replacement = "[Lead Email]";
        if (mapping.value === "phone") replacement = "[Lead Phone]";
      } else if (mapping.type === "static" && mapping.value) {
        replacement = mapping.value;
      }
      body = body.replace(variable, replacement);
    });

    return body;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return (
          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case "Sending":
      case "Active":
        return (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start animate-pulse-soft">
            <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
            Sending
          </span>
        );
      case "Scheduled":
        return (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 self-start">
            <Calendar className="w-3.5 h-3.5" />
            Scheduled
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-stone-500 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 flex items-center gap-1.5 self-start">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  // Find active selected campaign for report drawer
  const activeReportCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;

  // Extract all unique tags in contacts database for tag dropdown
  const allUniqueTags = Array.from(new Set(contacts.flatMap((c) => c.tags)));

  // Filter campaigns list based on user filter selections
  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === "all") return true;
    return c.status === statusFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-amber-50">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campaigns & Broadcasts</h2>
          <p className="text-stone-500 text-sm mt-1">Broadcast WhatsApp bulk templates, track dynamic click metrics, and filter target leads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-orange-600/10 hover:scale-102 active:scale-98 transition-all"
        >
          <Megaphone className="w-4 h-4" />
          Launch Broadcast
        </button>
      </div>

      {/* Filter and Overview Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-stone-500 text-[11px] font-bold uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            Filter Status:
          </span>
          {(["all", "Sending", "Completed", "Scheduled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-orange-600 text-white"
                  : "text-stone-500 hover:bg-orange-50/50"
              }`}
            >
              {status === "all" ? "All Broadcasts" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Listing Grid */}
      <div className="space-y-6">
        <h3 className="font-bold text-base text-stone-800">Recent Broadcast Activity</h3>
        
        {filteredCampaigns.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl space-y-3 bg-white border border-orange-100">
            <Send className="w-10 h-10 text-stone-500 mx-auto" />
            <h4 className="font-bold text-stone-700">No campaigns match this filter</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">Create a template and fire your first marketing broadcast to observe live metric counters and system webhook outputs!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCampaigns.map((camp) => {
              // Rates calculations
              const delRate = camp.sent > 0 ? Math.round((camp.delivered / camp.sent) * 100) : 0;
              const readRate = camp.delivered > 0 ? Math.round((camp.read / camp.delivered) * 100) : 0;
              const clickRate = camp.read > 0 ? Math.round((camp.clicked / camp.read) * 100) : 0;

              return (
                <div key={camp.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md hover:border-orange-300 dark:hover:border-zinc-700 transition-all duration-300 relative overflow-hidden bg-white border border-orange-100/60">
                  
                  {/* Status Indicator Bar at Top */}
                  {camp.status === "Sending" && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-pulse-soft" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-stone-900 leading-none">{camp.name}</h4>
                      <span className="text-[10px] text-stone-500 font-mono block mt-1">Template: {camp.templateName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(camp.status)}
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to permanently delete this campaign?")) {
                            await deleteCampaign(camp.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Audience Meta */}
                  <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-3 rounded-xl border border-orange-100 text-[11px] text-stone-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>Target Tag: <strong className="text-stone-800">{camp.targetTag}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
                      <span>Fired: <strong className="text-stone-800">{camp.sent} recipients</strong></span>
                    </div>
                  </div>

                  {/* Delivery Metrics Funnel Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500">Delivery Status ({delRate}%)</span>
                      <span className="font-bold text-stone-800">{camp.delivered} / {camp.sent}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${delRate}%` }} />
                    </div>

                    {/* Lower Funnel row cards */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-orange-50/30 p-2.5 rounded-lg border border-orange-100">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">Read rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{readRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.read} read)</span></div>
                      </div>
                      <div className="bg-orange-50/30 p-2.5 rounded-lg border border-orange-100">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">CTR rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{clickRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.clicked} clicked)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Analytics Button Footer */}
                  <div className="border-t border-orange-100/60 pt-4 flex justify-between items-center">
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {camp.date}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setReportDrawerOpen(true);
                      }}
                      className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/50 hover:bg-orange-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <BarChart4 className="w-3.5 h-3.5" />
                      View Analytics
                      <Maximize2 className="w-3 h-3 text-orange-400" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Launch Campaign Wizard Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up bg-white">
            
            {/* Header */}
            <div className="p-6 border-b border-orange-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-500" />
                Launch New WhatsApp Broadcast
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-orange-50 text-stone-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">
              
              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Friday discount drop"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                  <span>Target Audience segment</span>
                  <span className="text-[10px] text-stone-500 font-normal font-mono normal-case">Match: {targetAudienceSize} leads</span>
                </label>
                <select
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                {targetAudienceSize === 0 && (
                  <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1.5 mt-1 bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No active CRM contacts match this segment tag. Fired broadcasts will sent to 0 users.
                  </div>
                )}
              </div>

              {/* Approved Templates list */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Pre-approved message template</label>
                <select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Variables Mapping Form */}
              {activeTemplate && Object.keys(variablesMapping).length > 0 && (
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-4">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Settings2 className="w-4 h-4 text-orange-500" />
                    Template Parameter Mappings
                  </h5>
                  
                  <div className="space-y-3">
                    {Object.keys(variablesMapping).map((variable) => {
                      const current = variablesMapping[variable];

                      return (
                        <div key={variable} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-lg border border-orange-100">
                          <div className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                            <span className="bg-orange-500/10 text-orange-600 font-mono text-[10px] px-1.5 py-0.5 rounded">
                              {variable}
                            </span>
                            Parameter
                          </div>

                          {/* Mapping Type Selection */}
                          <div>
                            <select
                              value={current.type}
                              onChange={(e) => {
                                const nextType = e.target.value as "contact_field" | "static";
                                setVariablesMapping((prev) => ({
                                  ...prev,
                                  [variable]: { 
                                    type: nextType, 
                                    value: nextType === "contact_field" ? "name" : "" 
                                  }
                                }));
                              }}
                              className="w-full bg-orange-50 border border-orange-100 rounded-lg p-1.5 text-[11px] focus:outline-none"
                            >
                              <option value="contact_field">CRM Contact Field</option>
                              <option value="static">Static Custom Text</option>
                            </select>
                          </div>

                          {/* Mapping Value Form */}
                          <div>
                            {current.type === "contact_field" ? (
                              <select
                                value={current.value}
                                onChange={(e) => {
                                  setVariablesMapping((prev) => ({
                                    ...prev,
                                    [variable]: { type: "contact_field", value: e.target.value }
                                  }));
                                }}
                                className="w-full bg-orange-50 border border-orange-100 rounded-lg p-1.5 text-[11px] focus:outline-none"
                              >
                                <option value="name">Contact Name (name)</option>
                                <option value="email">Contact Email (email)</option>
                                <option value="phone">Contact Phone (phone)</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter custom text..."
                                required
                                value={current.value}
                                onChange={(e) => {
                                  setVariablesMapping((prev) => ({
                                    ...prev,
                                    [variable]: { type: "static", value: e.target.value }
                                  }));
                                }}
                                className="w-full bg-orange-50 border border-orange-100 rounded-lg p-1.5 text-[11px] focus:outline-none"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Template Body Live Preview with variables compiled */}
              {activeTemplate && (
                <div className="bg-orange-50/30 p-4 rounded-xl border border-orange-100 space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    Interactive Mapped Preview
                  </h5>
                  <div className="bg-white border border-orange-100 rounded-xl p-3.5 text-xs text-stone-700 leading-relaxed shadow-sm max-w-[95%]">
                    {/* Optional Media badge */}
                    {activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                      <div className="mb-2 px-2.5 py-1 rounded bg-orange-50 text-[10px] text-stone-500 font-bold uppercase inline-flex items-center gap-1.5 select-none leading-none">
                        <span>{activeTemplate.mediaType} Media Header</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap select-none font-medium">
                      {compileLivePreview()}
                    </p>

                    {/* Preview Buttons */}
                    {activeTemplate.buttons && activeTemplate.buttons.length > 0 && (
                      <div className="mt-3.5 border-t border-orange-100 pt-2.5 space-y-1 text-center font-bold text-orange-600">
                        {activeTemplate.buttons.map((btn, idx) => (
                          <div key={idx} className="py-1 bg-orange-50/50 rounded-md border border-orange-100/40 text-[11px] mb-1">
                            {btn}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scheduling and Delays Advanced Parameters Drawer */}
              <div className="border border-orange-100 rounded-xl p-4 bg-orange-50/20 space-y-4">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5 border-b border-orange-100/40 pb-2">
                  <Sliders className="w-4 h-4 text-orange-500" />
                  Advanced Delivery Controls
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Immediate vs Scheduled Run Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-400">Launch Timeline</label>
                    <div className="flex gap-2 bg-orange-50 p-1 rounded-xl border border-orange-100">
                      <button
                        type="button"
                        onClick={() => setRunMode("immediate")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                          runMode === "immediate" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"
                        }`}
                      >
                        Send Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunMode("scheduled")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                          runMode === "scheduled" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"
                        }`}
                      >
                        Schedule Later
                      </button>
                    </div>
                  </div>

                  {/* Delay Spacing Parameter */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-400 flex justify-between">
                      <span>Anti-Spam Spacing Delay</span>
                      <span className="font-mono text-orange-600">{sendDelay}s / msg</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={sendDelay}
                      onChange={(e) => setSendDelay(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-orange-600"
                    />
                  </div>
                </div>

                {/* Conditional Scheduled inputs */}
                {runMode === "scheduled" && (
                  <div className="grid grid-cols-2 gap-3 pt-2 animate-slide-up">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-400">Target Date</label>
                      <input
                        type="date"
                        required
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-white border border-orange-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-400">Target Time</label>
                      <input
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white border border-orange-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-orange-100 dark:border-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-orange-50 hover:bg-zinc-200 text-stone-600 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={targetAudienceSize === 0 || !campaignName.trim()}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/10"
                >
                  <Send className="w-3.5 h-3.5" />
                  {runMode === "scheduled" ? "Schedule Broadcast Trigger" : "Launch Live Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Slide-over Report Drawer Integration */}
      <CampaignReportDrawer
        isOpen={reportDrawerOpen}
        onClose={() => {
          setReportDrawerOpen(false);
          setSelectedCampaignId(null);
        }}
        campaign={activeReportCampaign}
        contacts={contacts}
        systemLogs={systemLogs}
      />

    </div>
  );
};
