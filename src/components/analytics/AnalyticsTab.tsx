"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Send,
  CheckCheck,
  Eye,
  MousePointerClick,
  Users,
  Tag,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

/* ─── Helpers ─── */
const pct = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10);
const fmt = (n: number) => n.toLocaleString("en-US");
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/* ─── Radial Gauge (SVG) ─── */
const RadialGauge: React.FC<{ value: number; label: string; color: string; icon: React.ReactNode }> = ({
  value,
  label,
  color,
  icon,
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamp(value, 0, 100) / 100) * circumference;

  return (
    <div className="bg-white border border-stone-200 p-6 flex flex-col items-center gap-4 hover:border-stone-400 transition-colors duration-300 select-none">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-stone-905 tracking-tight">{value}%</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
        <span className="text-stone-400">{icon}</span>
        {label}
      </div>
    </div>
  );
};

/* ─── Mini Stat Card ─── */
const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
}> = ({ title, value, subtitle, icon, trend }) => (
  <div className="bg-white border border-stone-200 p-6 flex items-center justify-between hover:border-stone-400 transition-colors duration-300 select-none">
    <div className="space-y-2">
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{title}</span>
      <h3 className="text-2xl font-bold text-stone-950 tracking-tight">{value}</h3>
      {subtitle && (
        <span className="text-[10px] text-stone-400 font-bold flex items-center gap-1 uppercase">
          {trend !== undefined &&
            (trend >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-stone-900" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-stone-450" />
            ))}
          {subtitle}
        </span>
      )}
    </div>
    <div className="w-12 h-12 bg-stone-50 border border-stone-200 text-stone-900 flex items-center justify-center shrink-0">
      {icon}
    </div>
  </div>
);

/* ─── Analytics Tab ─── */
export const AnalyticsTab: React.FC = () => {
  const { contacts, campaigns, templates, chatHistory } = useApp();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");
  const [funnelMode, setFunnelMode] = useState<"absolute" | "percentage">("absolute");

  /* ─── Time-Filtered Campaigns ─── */
  const filteredCampaigns = useMemo(() => {
    if (timeRange === "all") return campaigns;
    const now = new Date();
    const days = timeRange === "7d" ? 7 : 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return campaigns.filter((c) => {
      const d = new Date(c.date || c.createdAt || "");
      return d >= cutoff;
    });
  }, [campaigns, timeRange]);

  /* ─── Aggregate KPIs ─── */
  const kpis = useMemo(() => {
    const totalSent = filteredCampaigns.reduce((s, c) => s + (c.sent || 0), 0);
    const totalDelivered = filteredCampaigns.reduce((s, c) => s + (c.delivered || 0), 0);
    const totalRead = filteredCampaigns.reduce((s, c) => s + (c.read || 0), 0);
    const totalClicked = filteredCampaigns.reduce((s, c) => s + (c.clicked || 0), 0);
    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalClicked,
      deliveryRate: pct(totalDelivered, totalSent),
      readRate: pct(totalRead, totalDelivered),
      clickRate: pct(totalClicked, totalRead),
    };
  }, [filteredCampaigns]);

  /* ─── Funnel Data (Elegant Monochromatic Gray Scales) ─── */
  const funnelStages = useMemo(() => {
    const { totalSent, totalDelivered, totalRead, totalClicked } = kpis;
    return [
      { label: "Sent", value: totalSent, color: "#1c1917", pct: 100 },
      { label: "Delivered", value: totalDelivered, color: "#44403c", pct: pct(totalDelivered, totalSent) },
      { label: "Read", value: totalRead, color: "#78716c", pct: pct(totalRead, totalSent) },
      { label: "Clicked", value: totalClicked, color: "#a8a29e", pct: pct(totalClicked, totalSent) },
    ];
  }, [kpis]);

  /* ─── Campaign Timeline ─── */
  const timelineData = useMemo(() => {
    const dateMap: Record<string, { sent: number; status: string }> = {};
    filteredCampaigns.forEach((c) => {
      const dateStr = (c.date || c.createdAt || "Unknown").split("T")[0];
      if (!dateMap[dateStr]) dateMap[dateStr] = { sent: 0, status: c.status };
      dateMap[dateStr].sent += c.sent || 0;
      // Keep highest-priority status
      if (c.status === "Failed") dateMap[dateStr].status = "Failed";
      else if (c.status === "Active" && dateMap[dateStr].status !== "Failed") dateMap[dateStr].status = "Active";
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // last 14 entries
      .map(([date, data]) => ({ date, ...data }));
  }, [filteredCampaigns]);

  const maxTimelineSent = Math.max(...timelineData.map((d) => d.sent), 1);

  /* ─── Contact Source Distribution (Refined Stone Colors) ─── */
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach((c) => {
      const src = c.source || "Unknown";
      map[src] = (map[src] || 0) + 1;
    });
    const total = contacts.length || 1;
    const colors = ["#1c1917", "#44403c", "#78716c", "#a8a29e", "#d6d3d1", "#e7e5e4"];
    let entries = Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([source, count], i) => ({
        source,
        count,
        pct: pct(count, total),
        color: colors[i % colors.length],
      }));
    return entries;
  }, [contacts]);

  const conicGradient = useMemo(() => {
    if (sourceData.length === 0) return "conic-gradient(#e7e5e4 0% 100%)";
    let acc = 0;
    const stops = sourceData.map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [sourceData]);

  /* ─── Tag Cloud ─── */
  const tagCloud = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach((c) => {
      (c.tags || []).forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));
  }, [contacts]);

  const maxTagCount = Math.max(...tagCloud.map((t) => t.count), 1);

  /* ─── Template Performance ─── */
  const templatePerf = useMemo(() => {
    return templates.map((tmpl) => {
      const linked = filteredCampaigns.filter((c) => c.templateName === tmpl.name);
      const sent = linked.reduce((s, c) => s + (c.sent || 0), 0);
      const delivered = linked.reduce((s, c) => s + (c.delivered || 0), 0);
      const read = linked.reduce((s, c) => s + (c.read || 0), 0);
      const clicked = linked.reduce((s, c) => s + (c.clicked || 0), 0);
      return {
        ...tmpl,
        usedInCampaigns: linked.length,
        sent,
        delivered,
        read,
        clicked,
        deliveryRate: pct(delivered, sent),
        readRate: pct(read, delivered),
        clickRate: pct(clicked, read),
      };
    });
  }, [templates, filteredCampaigns]);

  /* ─── Message Activity Heatmap (Sleek Charcoal Heatmap) ─── */
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    Object.values(chatHistory).forEach((messages) => {
      messages.forEach((msg) => {
        try {
          const d = new Date(msg.timestamp);
          if (!isNaN(d.getTime())) {
            grid[d.getDay()][d.getHours()]++;
          }
        } catch { /* skip invalid timestamps */ }
      });
    });
    return grid;
  }, [chatHistory]);

  const maxHeat = Math.max(...heatmapData.flat(), 1);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourLabels = Array.from({ length: 24 }, (_, i) => (i === 0 ? "12a" : i < 12 ? `${i}a` : i === 12 ? "12p" : `${i - 12}p`));

  /* ─── Status color helpers ─── */
  const statusColor = (s: string) => {
    switch (s) {
      case "Completed": return "bg-stone-950";
      case "Active": case "Sending": return "bg-stone-600";
      case "Scheduled": return "bg-stone-300";
      case "Failed": return "bg-stone-200";
      default: return "bg-stone-100";
    }
  };

  const metaStatusBadge = (status?: string) => {
    switch (status) {
      case "approved": return "bg-stone-100 text-stone-900 border-stone-300";
      case "rejected": return "bg-stone-200 text-stone-500 border-stone-200";
      default: return "bg-stone-50 text-stone-400 border-stone-200";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-8 bg-[#fafaf9] min-h-screen">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pb-6 border-b border-stone-200 select-none">
        <div>
          <h2 className="text-2xl font-light tracking-tight text-stone-950 flex items-center gap-2">
            <BarChart3 className="w-5.5 h-5.5 text-stone-950" />
            Analytics Overview
          </h2>
          <p className="text-stone-500 text-xs tracking-wider uppercase mt-1">
            CAMPAIGN PERFORMANCE & CONTACT LEDGER INDEX
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-none border border-stone-200">
          {(["7d", "30d", "all"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-none transition-all cursor-pointer ${
                timeRange === range
                  ? "bg-stone-950 text-white"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Section 1: Top-Level KPI Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Messages Sent"
          value={fmt(kpis.totalSent)}
          subtitle={`${filteredCampaigns.length} campaigns dispatch`}
          icon={<Send className="w-5 h-5 text-stone-950" />}
        />
        <StatCard
          title="Messages Delivered"
          value={fmt(kpis.totalDelivered)}
          subtitle={`${kpis.deliveryRate}% delivery rate`}
          icon={<CheckCheck className="w-5 h-5 text-stone-950" />}
          trend={kpis.deliveryRate > 90 ? 1 : -1}
        />
        <StatCard
          title="Messages Read"
          value={fmt(kpis.totalRead)}
          subtitle={`${kpis.readRate}% read rate`}
          icon={<Eye className="w-5 h-5 text-stone-950" />}
          trend={kpis.readRate > 50 ? 1 : -1}
        />
        <StatCard
          title="Link Clicks"
          value={fmt(kpis.totalClicked)}
          subtitle={`${kpis.clickRate}% click-through`}
          icon={<MousePointerClick className="w-5 h-5 text-stone-950" />}
          trend={kpis.clickRate > 5 ? 1 : -1}
        />
      </div>

      {/* ─── Section 2: Radial Gauges ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <RadialGauge
          value={kpis.deliveryRate}
          label="Delivery Rate"
          color="#1c1917"
          icon={<CheckCheck className="w-3.5 h-3.5 text-stone-950" />}
        />
        <RadialGauge
          value={kpis.readRate}
          label="Read Rate"
          color="#44403c"
          icon={<Eye className="w-3.5 h-3.5 text-stone-900" />}
        />
        <RadialGauge
          value={kpis.clickRate}
          label="Click-Through Rate"
          color="#78716c"
          icon={<MousePointerClick className="w-3.5 h-3.5 text-stone-500" />}
        />
      </div>

      {/* ─── Section 3: Campaign Funnel ─── */}
      <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-lg font-light text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-950" />
              Campaign Delivery Funnel
            </h3>
            <p className="text-xs text-stone-500 tracking-wider uppercase mt-1">Message journey index from send to click</p>
          </div>
          <button
            onClick={() => setFunnelMode(funnelMode === "absolute" ? "percentage" : "absolute")}
            className="text-[9px] font-bold text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-none border border-stone-250/20 uppercase tracking-widest transition-all cursor-pointer"
          >
            {funnelMode === "absolute" ? "Show %" : "Show #"}
          </button>
        </div>
        <div className="space-y-4">
          {funnelStages.map((stage, i) => (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-stone-400 w-20 text-right uppercase tracking-wider">{stage.label}</span>
              <div className="flex-1 h-9 bg-stone-100 rounded-none overflow-hidden relative border border-stone-200/40">
                <div
                  className="h-full rounded-none transition-all duration-1000 ease-out flex items-center justify-end pr-3"
                  style={{
                    width: `${Math.max(stage.pct, 2)}%`,
                    backgroundColor: stage.color,
                  }}
                >
                  <span className="text-[10px] font-bold text-white tracking-widest uppercase">
                    {funnelMode === "absolute" ? fmt(stage.value) : `${stage.pct}%`}
                  </span>
                </div>
              </div>
              {i < funnelStages.length - 1 && (
                <span className="text-[10px] text-stone-400 font-bold w-12 text-center uppercase">
                  {pct(funnelStages[i + 1].value, stage.value || 1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Section 4: Campaign Timeline ─── */}
      <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
        <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-stone-950" />
          Campaign Activity Timeline
        </h3>
        <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Messages dispatched per campaign day ledger</p>
        {timelineData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-stone-450 text-xs font-bold uppercase tracking-widest">
            NO ACTIVE CAMPAIGN RECORDS DISCOVERED IN THIS PERIOD
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-48 overflow-x-auto custom-scrollbar pb-1">
            {timelineData.map((d) => {
              const heightPct = (d.sent / maxTimelineSent) * 100;
              return (
                <div key={d.date} className="flex flex-col items-center gap-1.5 min-w-[36px] group flex-1">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-stone-900 bg-white border border-stone-250 px-2 py-1 uppercase whitespace-nowrap pointer-events-none tracking-widest">
                    {fmt(d.sent)} sent
                  </div>
                  <div
                    className={`w-full rounded-none transition-all duration-500 ${statusColor(d.status)}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-[9px] text-stone-405 font-bold uppercase whitespace-nowrap tracking-wider">
                    {d.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-4 border-t border-stone-100 text-[9px] text-stone-450 font-bold uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-950" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-600" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-300" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-stone-200" /> Failed</span>
        </div>
      </div>

      {/* ─── Section 5 + 6: Contact Source & Tag Cloud ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Source Donut */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
          <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-stone-950" />
            Contact Source Distribution
          </h3>
          <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">CRM entry node index</p>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="relative w-36 h-36 shrink-0">
              <div
                className="w-full h-full rounded-full border border-stone-200/50"
                style={{ background: conicGradient }}
              />
              <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center border border-stone-200">
                <span className="text-lg font-bold text-stone-950">{contacts.length}</span>
                <span className="text-[8px] text-stone-450 font-bold uppercase tracking-widest">Total CRM</span>
              </div>
            </div>
            <div className="flex-1 space-y-2.5 max-h-36 overflow-y-auto w-full custom-scrollbar">
              {sourceData.map((s) => (
                <div key={s.source} className="flex items-center justify-between text-xs text-stone-705 border-b border-stone-50 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="font-semibold text-stone-800 uppercase text-[10px] tracking-wider truncate max-w-[120px]">{s.source}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-stone-800">{s.count}</span>
                    <span className="text-stone-400">{s.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tag Cloud */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
          <h3 className="text-lg font-light text-stone-900 flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-stone-950" />
            Audience Tag Distribution
          </h3>
          <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Active crm taxonomy segments</p>
          {tagCloud.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-stone-455 text-xs font-bold uppercase tracking-widest">
              NO CRM TAXONOMY TAGS SPECIFIED YET
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagCloud.map((t) => {
                const intensity = t.count / maxTagCount;
                const opacity = 0.6 + intensity * 0.4;
                return (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-900 text-[10px] font-bold uppercase tracking-wider transition-all"
                    style={{ opacity }}
                  >
                    <Tag className="w-3 h-3 text-stone-450" />
                    {t.tag}
                    <span className="text-stone-400 ml-0.5">×{t.count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 7: Template Performance Matrix ─── */}
      <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
        <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-stone-950" />
          Template Performance Matrix
        </h3>
        <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Waba payload delivery rate analysis index</p>
        {templatePerf.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-stone-450 text-xs font-bold uppercase tracking-widest">
            NO META APPROVED MESSAGE PAYLOADS CURRENTLY ON RECORD
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4">Template</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Status</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Campaigns</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Sent</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Delivery %</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 pr-4 text-center">Read %</th>
                  <th className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-3 text-center">Click %</th>
                </tr>
              </thead>
              <tbody>
                {templatePerf.map((t) => (
                  <tr key={t.id} className="border-b border-stone-100 hover:bg-[#fafaf9]/80 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">{t.name}</span>
                        <span className="text-[9px] text-stone-400 uppercase tracking-wider mt-0.5">{t.category}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded-none border ${metaStatusBadge(t.metaStatus)}`}>
                        {t.metaStatus || "pending"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center text-xs font-bold">{t.usedInCampaigns}</td>
                    <td className="py-3 pr-4 text-center text-xs font-bold">{fmt(t.sent)}</td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                          <div className="h-full bg-stone-900 rounded-none" style={{ width: `${t.deliveryRate}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-stone-600">{t.deliveryRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                          <div className="h-full bg-stone-600 rounded-none" style={{ width: `${t.readRate}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-stone-600">{t.readRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1 bg-stone-100 border border-stone-200/50 rounded-none overflow-hidden shrink-0">
                          <div className="h-full bg-stone-300 rounded-none" style={{ width: `${t.clickRate}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-stone-600">{t.clickRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Section 8: Message Activity Heatmap ─── */}
      <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300">
        <h3 className="text-lg font-light text-stone-950 flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-stone-950" />
          Message Activity Heatmap
        </h3>
        <p className="text-xs text-stone-500 tracking-wider uppercase mt-1 mb-6">Hourly webhook chat transmission volume metrics by week day</p>
        <div className="overflow-x-auto custom-scrollbar">
          <div className="flex items-center mb-2">
            <div className="w-10 shrink-0" />
            {hourLabels.map((h, i) => (
              i % 2 === 0 ? (
                <span key={i} className="text-[8.5px] text-stone-400 font-bold uppercase" style={{ width: "calc(100% / 24)", minWidth: "20px", textAlign: "center" }}>
                  {h}
                </span>
              ) : (
                <span key={i} style={{ width: "calc(100% / 24)", minWidth: "20px" }} />
              )
            ))}
          </div>
          {heatmapData.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-0 mb-1">
              <span className="text-[10px] text-stone-500 font-bold w-10 shrink-0 text-right pr-3 uppercase">
                {dayLabels[dayIdx]}
              </span>
              <div className="flex-1 flex gap-[2px]">
                {row.map((val, hourIdx) => {
                  const intensity = val / maxHeat;
                  return (
                    <div
                      key={hourIdx}
                      className="aspect-square rounded-none transition-all hover:scale-125 hover:z-10 group relative border border-stone-200/10 cursor-default"
                      style={{
                        flex: 1,
                        minWidth: "14px",
                        backgroundColor: val === 0
                          ? "#fafaf9"
                          : `rgba(28, 25, 23, ${0.12 + intensity * 0.88})`,
                      }}
                      title={`${dayLabels[dayIdx]} ${hourLabels[hourIdx]}: ${val} messages`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-end gap-1 mt-4 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
            <span className="mr-1">Less Activity</span>
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div
                key={i}
                className="w-3.5 h-3.5 rounded-none border border-stone-200/50"
                style={{
                  backgroundColor: i === 0 ? "#fafaf9" : `rgba(28, 25, 23, ${0.12 + i * 0.88})`,
                }}
              />
            ))}
            <span className="ml-1">More Activity</span>
          </div>
        </div>
      </div>
    </div>
  );
};
