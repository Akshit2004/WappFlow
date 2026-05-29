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
import { useApp } from "../../context/AppContext";
import { useParams } from "next/navigation";
import { CampaignReportDrawer } from "./CampaignReportDrawer";

export const CampaignsTab: React.FC = () => {
  const { campaigns, templates, contacts, systemLogs, sendBroadcast, deleteCampaign, addSystemLog } = useApp();
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
  const [excludeTag, setExcludeTag] = useState("None");
  const [templateName, setTemplateName] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [broadcastMode, setBroadcastMode] = useState<"template" | "session">("template");
  const [sessionText, setSessionText] = useState("");
  
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
    let mounted = true;
    if (!templateName && templates.length > 0) {
      setTimeout(() => {
        if (mounted) setTemplateName(templates[0].name);
      }, 0);
    }
    return () => { mounted = false; };
  }, [templates, templateName]);

  const activeTemplate = templates.find((t) => t.name === templateName);

  // Scan and parse variables from active template body
  useEffect(() => {
    let mounted = true;
    const t = templates.find((x) => x.name === templateName);
    const initialMapping: Record<string, { type: "contact_field" | "static"; value: string }> = {};
    if (t?.body) {
      const matches = t.body.match(/\{\{\d+\}\}/g);
      if (matches) {
        matches.forEach((match) => {
          initialMapping[match] = { type: "contact_field", value: "name" };
        });
      }
    }
    setTimeout(() => {
      if (mounted) setVariablesMapping(initialMapping);
    }, 0);
    return () => { mounted = false; };
  }, [templateName, templates]);

  // Calculate target audience size in real-time
  const targetAudienceSize = contacts.filter((c) => {
    const hasTarget = targetTag === "all" || c.tags.includes(targetTag);
    const isExcluded = excludeTag !== "None" && c.tags.includes(excludeTag);
    return hasTarget && !isExcluded;
  }).length;

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !targetTag || !orgId) return;
    if (broadcastMode === "template" && !templateName) return;
    if (broadcastMode === "session" && !sessionText.trim()) return;

    const scheduledAtStr = runMode === "scheduled" && scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
      : undefined;

    if (broadcastMode === "session") {
      try {
        addSystemLog("campaign", `Launching session broadcast '${campaignName}'...`);
        const res = await fetch("/api/whatsapp/session-broadcast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: campaignName.trim(),
            targetTag,
            text: sessionText.trim(),
            organizationId: orgId,
            delay: sendDelay,
            scheduledAt: scheduledAtStr
          })
        });
        const data = await res.json();
        if (!res.ok) {
          addSystemLog("campaign", `Session broadcast failed: ${data.error}`);
          alert(data.error);
          return;
        }
        addSystemLog("campaign", `Session broadcast launched! ${data.eligibleCount} contacts in 24h window.`);
      } catch (err: unknown) {
        addSystemLog("campaign", `Session broadcast error: ${(err instanceof Error ? err.message : String(err))}`);
      }
    } else {
      const variablesPayload = Object.entries(variablesMapping).map(([key, map]) => ({
        key,
        type: map.type,
        value: map.value
      }));

      sendBroadcast({
        name: campaignName.trim(),
        targetTag,
        templateName,
        organizationId: orgId,
        variables: variablesPayload,
        delay: sendDelay,
        scheduledAt: scheduledAtStr,
        excludeTag: excludeTag === "None" ? undefined : excludeTag,
        mediaType: activeTemplate?.mediaType,
        mediaUrl: mediaUrl.trim() || undefined,
      });
    }

    setCampaignName("");
    setRunMode("immediate");
    setScheduledDate("");
    setScheduledTime("");
    setSendDelay(1);
    setSessionText("");
    setMediaUrl("");
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
          <span className="text-[10px] font-bold text-stone-900 bg-stone-100 border border-stone-300 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <CheckCircle className="w-3.5 h-3.5 text-stone-900" />
            Completed
          </span>
        );
      case "Sending":
      case "Active":
        return (
          <span className="text-[10px] font-bold text-white bg-stone-950 border border-stone-950 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <PlayCircle className="w-3.5 h-3.5 text-white" />
            Sending
          </span>
        );
      case "Scheduled":
        return (
          <span className="text-[10px] font-bold text-stone-600 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-none flex items-center gap-1.5 self-start uppercase">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            Scheduled
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold text-stone-500 bg-stone-50 px-2.5 py-1 rounded-none border border-stone-200 flex items-center gap-1.5 self-start uppercase">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Campaigns & Broadcasts</h2>
          <p className="text-stone-500 text-xs mt-1">Broadcast WhatsApp bulk templates, track dynamic click metrics, and filter target leads.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs px-4 py-2.5 rounded-none flex items-center gap-2 cursor-pointer border border-stone-950 transition-all"
        >
          <Megaphone className="w-4 h-4" />
          LAUNCH BROADCAST
        </button>
      </div>

      {/* Filter and Overview Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-205 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            Filter Status:
          </span>
          {(["all", "Sending", "Completed", "Scheduled"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-none border transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-stone-950 text-white border-stone-950"
                  : "text-stone-500 border-transparent hover:bg-stone-100"
              }`}
            >
              {status === "all" ? "All Broadcasts" : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Listing Grid */}
      <div className="space-y-6">
        <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900">Recent Broadcast Activity</h3>
        
        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center rounded-none space-y-3 bg-white border border-stone-200">
            <Send className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-bold text-stone-700 uppercase text-xs">No campaigns match this filter</h4>
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
                <div key={camp.id} className="p-6 rounded-none flex flex-col justify-between space-y-6 bg-white border border-stone-200 relative overflow-hidden">
                  
                  {/* Status Indicator Bar at Top */}
                  {(camp.status === "Sending" || camp.status === "Active") && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-stone-950" />
                  )}

                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-sm text-stone-900 leading-none">{camp.name}</h4>
                      <span className="text-[10px] text-stone-500 block mt-1">Template: {camp.templateName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(camp.status)}
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to permanently delete this campaign?")) {
                            await deleteCampaign(camp.id);
                          }
                        }}
                        className="p-1.5 rounded-none text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer border border-transparent"
                        title="Delete Campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Audience Meta */}
                  <div className="grid grid-cols-2 gap-4 bg-stone-50 p-3 rounded-none border border-stone-200 text-[11px] text-stone-500 font-medium">
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
                    <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                      <div className="h-full bg-stone-900 transition-all duration-500" style={{ width: `${delRate}%` }} />
                    </div>

                    {/* Lower Funnel row cards */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">Read rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{readRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.read} read)</span></div>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200">
                        <div className="text-[10px] text-stone-500 font-semibold uppercase">CTR rate</div>
                        <div className="text-xs font-bold text-stone-800 mt-0.5">{clickRate}% <span className="text-[10px] text-stone-400 font-normal">({camp.clicked} clicked)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Analytics Button Footer */}
                  <div className="border-t border-stone-200 pt-4 flex justify-between items-center">
                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {camp.date}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCampaignId(camp.id);
                        setReportDrawerOpen(true);
                      }}
                      className="text-[10px] font-bold text-stone-905 bg-stone-100 border border-stone-300 hover:bg-stone-200 px-3 py-1.5 rounded-none flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <BarChart4 className="w-3.5 h-3.5" />
                      View Analytics
                      <Maximize2 className="w-3 h-3 text-stone-500" />
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
        <div className="fixed inset-0 bg-black/40 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-none flex flex-col overflow-hidden animate-slide-up bg-white border border-stone-300">
            
            {/* Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-stone-900" />
                Launch New WhatsApp Broadcast
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-none hover:bg-stone-200 text-stone-500 transition-colors border border-transparent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLaunchCampaign} className="p-6 space-y-5 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">
              
              {/* Campaign Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Black Friday discount drop"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                />
              </div>

              {/* Broadcast Mode Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Broadcast Mode</label>
                <div className="flex gap-2 bg-stone-50 p-1 rounded-none border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("template")}
                    className={`flex-1 py-2 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      broadcastMode === "template" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Template Broadcast
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastMode("session")}
                    className={`flex-1 py-2 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                      broadcastMode === "session" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Free-Form Session (24h window)
                  </button>
                </div>
                {broadcastMode === "session" && (
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-700 font-semibold bg-stone-50 px-2.5 py-1.5 rounded-none border border-stone-200">
                    <span>No template needed — sends within 24h customer-initiated window.</span>
                  </div>
                )}
              </div>

              {/* Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-505 flex justify-between">
                  <span>Target Audience segment</span>
                  <span className="text-[10px] text-stone-500 font-normal normal-case">Match: {targetAudienceSize} leads</span>
                </label>
                <select
                  value={targetTag}
                  onChange={(e) => setTargetTag(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                >
                  <option value="all">All Contacts</option>
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                {targetAudienceSize === 0 && (
                  <div className="text-[10px] text-stone-900 font-semibold flex items-center gap-1.5 mt-1 bg-stone-50 px-2.5 py-1.5 rounded-none border border-stone-300">
                    <AlertCircle className="w-3.5 h-3.5 text-stone-900" />
                    No active CRM contacts match this segment tag. Fired broadcasts will sent to 0 users.
                  </div>
                )}
              </div>

              {/* Exclude Tag Targeting */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex justify-between">
                  <span>Exclude Audience segment</span>
                </label>
                <select
                  value={excludeTag}
                  onChange={(e) => setExcludeTag(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                >
                  <option value="None">-- No Exclusion --</option>
                  {allUniqueTags.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {broadcastMode === "template" ? (
                <>
                  {/* Approved Templates list */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Pre-approved message template</label>
                    <select
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.name}>{t.name} ({t.category})</option>
                      ))}
                    </select>
                  </div>

                  {/* Dynamic Media Input */}
                  {activeTemplate && activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        {activeTemplate.mediaType} Media URL
                      </label>
                      <input
                        type="url"
                        placeholder={`https://example.com/media.${activeTemplate.mediaType === 'image' ? 'jpg' : 'mp4'}`}
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  )}

                  {/* Dynamic Variables Mapping Form */}
                  {activeTemplate && Object.keys(variablesMapping).length > 0 && (
                    <div className="bg-stone-50 p-4 rounded-none border border-stone-200 space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                        <Settings2 className="w-4 h-4 text-stone-900" />
                        Template Parameter Mappings
                      </h5>
                      
                      <div className="space-y-3">
                        {Object.keys(variablesMapping).map((variable) => {
                          const current = variablesMapping[variable];

                          return (
                            <div key={variable} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-none border border-stone-200">
                              <div className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                                <span className="bg-stone-100 text-stone-800 text-[10px] px-1.5 py-0.5 rounded-none border border-stone-300">
                                  {variable}
                                </span>
                                Parameter
                              </div>

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
                                  className="w-full bg-white border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
                                >
                                  <option value="contact_field">CRM Contact Field</option>
                                  <option value="static">Static Custom Text</option>
                                </select>
                              </div>

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
                                    className="w-full bg-white border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
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
                                    className="w-full bg-white border border-stone-200 rounded-none p-1.5 text-[11px] focus:outline-none"
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
                    <div className="bg-stone-50 p-4 rounded-none border border-stone-200 space-y-3">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-stone-500" />
                        Interactive Mapped Preview
                      </h5>
                      <div className="bg-white border border-stone-200 rounded-none p-3.5 text-xs text-stone-700 leading-relaxed max-w-[95%]">
                        {activeTemplate.mediaType && activeTemplate.mediaType !== "none" && (
                          <div className="mb-2 px-2.5 py-1 rounded-none bg-stone-150 text-[10px] text-stone-800 font-bold uppercase inline-flex items-center gap-1.5 select-none leading-none border border-stone-300">
                            <span>{activeTemplate.mediaType} Media Header</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap select-none font-medium">
                          {compileLivePreview()}
                        </p>
                        {activeTemplate.buttons && activeTemplate.buttons.length > 0 && (
                          <div className="mt-3.5 border-t border-stone-200 pt-2.5 space-y-1 text-center font-bold text-stone-900">
                            {activeTemplate.buttons.map((btn, idx) => (
                              <div key={idx} className="py-1 bg-stone-50 rounded-none border border-stone-300 text-[11px] mb-1">
                                {btn}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Session Broadcast Text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Free-Form Message</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Write your message here — no template needed. Only contacts active in the last 24 hours will receive it."
                      value={sessionText}
                      onChange={(e) => setSessionText(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-none py-2.5 px-4 text-xs focus:outline-none focus:border-stone-900 resize-none"
                    />
                    <div className="flex items-start gap-2 bg-stone-50 border border-stone-250 rounded-none p-3 text-[10px] text-stone-700 leading-relaxed font-semibold">
                      <span>📱 Only contacts who messaged in the last 24h will receive this. No Meta template approval needed.</span>
                    </div>
                  </div>
                </>
              )}

              {/* Scheduling and Delays Advanced Parameters Drawer */}
              <div className="border border-stone-200 rounded-none p-4 bg-stone-50 space-y-4">
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <Sliders className="w-4 h-4 text-stone-900" />
                  Advanced Delivery Controls
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Immediate vs Scheduled Run Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-stone-400">Launch Timeline</label>
                    <div className="flex gap-2 bg-white p-1 rounded-none border border-stone-200">
                      <button
                        type="button"
                        onClick={() => setRunMode("immediate")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                          runMode === "immediate" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
                        }`}
                      >
                        Send Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setRunMode("scheduled")}
                        className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded-none cursor-pointer transition-all ${
                          runMode === "scheduled" ? "bg-stone-950 text-white" : "text-stone-500 hover:text-stone-900"
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
                      <span className="text-stone-900 font-bold">{sendDelay}s / msg</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.5"
                      value={sendDelay}
                      onChange={(e) => setSendDelay(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-stone-200 rounded-none appearance-none cursor-pointer accent-stone-950"
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
                        className="w-full bg-white border border-stone-200 rounded-none p-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-stone-400">Target Time</label>
                      <input
                        type="time"
                        required
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-none p-2 text-xs focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-none cursor-pointer border border-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={targetAudienceSize === 0 || !campaignName.trim()}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-900 border border-stone-950 disabled:opacity-40 disabled:hover:bg-stone-950 text-white font-bold text-xs rounded-none cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {runMode === "scheduled" ? "SCHEDULE BROADCAST TRIGGER" : "LAUNCH LIVE BROADCAST"}
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
