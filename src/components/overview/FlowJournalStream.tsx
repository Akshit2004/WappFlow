"use client";

import React, { useState } from "react";
import { Search, Trash2, ArrowRight } from "lucide-react";
import { SystemLog } from "../../context/types";

interface FlowJournalStreamProps {
  systemLogs: SystemLog[];
  clearSystemLogs: () => void;
  onNavigate?: (tab: string) => void;
}

export const FlowJournalStream: React.FC<FlowJournalStreamProps> = ({
  systemLogs,
  clearSystemLogs,
  onNavigate,
}) => {
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState<string>("");

  // Filter logs locally
  const filteredLogs = systemLogs.filter((log) => {
    const matchesFilter = logFilter === "all" || log.type === logFilter;
    const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <section className="bg-white border border-stone-200 p-6 sm:p-8 flex flex-col h-[520px] select-none hover:border-stone-400 transition-colors duration-300">
      {/* Stream Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-stone-100 shrink-0">
        <div>
          <h3 className="text-lg font-light text-stone-900 flex items-center gap-2">
            Workspace Activity Stream
          </h3>
          <p className="text-xs text-stone-500 tracking-wide mt-1 uppercase">
            CHRONOLOGICAL DISPATCH & INTERACTION LEDGER
          </p>
        </div>

        <button
          onClick={clearSystemLogs}
          className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Ledger
        </button>
      </div>

      {/* Stream Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 py-5 border-b border-stone-100 shrink-0">
        {/* Editorial Tab Switcher */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 custom-scrollbar scrollbar-thin">
          {["all", "campaign", "chat", "integration", "crm"].map((type) => (
            <button
              key={type}
              onClick={() => setLogFilter(type)}
              className={`text-[10px] uppercase tracking-widest pb-1 transition-all border-b cursor-pointer ${
                logFilter === type
                  ? "border-stone-950 text-stone-950 font-bold"
                  : "border-transparent text-stone-400 hover:text-stone-900"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Flat Minimalist Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-450 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="FILTER LOG ENTRIES..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="bg-stone-50 border border-stone-200 text-[10px] tracking-wider text-stone-900 rounded-none py-1.5 pl-8 pr-4 w-full md:w-56 focus:outline-none focus:border-stone-900 focus:bg-white transition-all uppercase"
          />
        </div>
      </div>

      {/* Stream Timeline */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-6 space-y-5">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <span className="text-[10px] tracking-widest text-stone-400 uppercase">
              NO WORKSPACE LEDGER ENTRIES FOUND
            </span>
          </div>
        ) : (
          <div className="relative border-l border-stone-200 ml-3 pl-6 space-y-6">
            {filteredLogs.map((log) => {
              // Map log types to minimal styling and custom links
              let labelText = "CRM";
              let linkTab = "";
              let linkText = "";

              if (log.type === "campaign") {
                labelText = "CAMPAIGN";
                linkTab = "campaigns";
                linkText = "View Campaigns";
              } else if (log.type === "chat") {
                labelText = "CHAT";
                linkTab = "inbox";
                linkText = "Open Inbox";
              } else if (log.type === "integration") {
                labelText = "INTEGRATION";
                linkTab = "settings";
                linkText = "Check Settings";
              } else if (log.type === "crm") {
                labelText = "LEADS";
              }

              return (
                <div
                  key={log.id}
                  className="group relative flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs leading-relaxed animate-fade-in-down"
                >
                  {/* Vertical Timeline Dot */}
                  <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full border border-stone-200 bg-white group-hover:border-stone-950 group-hover:bg-stone-950 transition-all duration-300" />

                  {/* Left Column: Timestamp & Log Type */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-stone-400 font-medium">
                      {log.timestamp}
                    </span>
                    <span className="text-[9px] tracking-widest text-stone-500 bg-stone-100/80 px-2 py-0.5 font-semibold uppercase">
                      {labelText}
                    </span>
                  </div>

                  {/* Center Column: Text Content */}
                  <p className="flex-1 text-stone-700 font-light pl-0 sm:pl-4">
                    {log.message}
                  </p>

                  {/* Right Column: Dynamic Action Link */}
                  {linkTab && onNavigate && (
                    <button
                      onClick={() => onNavigate(linkTab)}
                      className="text-[9px] uppercase tracking-widest text-stone-500 hover:text-stone-950 hover:underline transition-colors shrink-0 flex items-center gap-1 mt-1 sm:mt-0 cursor-pointer self-start sm:self-center"
                    >
                      {linkText}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
