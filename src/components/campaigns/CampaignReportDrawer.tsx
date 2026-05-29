"use client";

import React, { useState } from "react";
import { 
  X, 
  Users, 
  TrendingUp, 
  Layers, 
  Activity, 
  Clock, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { Campaign, Contact, SystemLog } from "../../context/AppContext";

interface CampaignReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  contacts: Contact[];
  systemLogs: SystemLog[];
}

export const CampaignReportDrawer: React.FC<CampaignReportDrawerProps> = ({
  isOpen,
  onClose,
  campaign,
  contacts,
  systemLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"recipients" | "logs">("recipients");

  if (!campaign || !isOpen) return null;

  // Filter contacts matching campaign target tag (handle "all" tag)
  const campaignContacts = campaign.targetTag === "all"
    ? contacts
    : contacts.filter((c) => c.tags.includes(campaign.targetTag));
  
  // Filter system logs matching this campaign by campaignId if available, fallback to string match
  const campaignLogs = systemLogs.filter((log) => 
    log.type === "campaign" && log.message.includes(campaign.id)
  );

  // Conversion Funnel Math
  const sent = campaign.sent || 0;
  const delivered = campaign.delivered || 0;
  const read = campaign.read || 0;
  const clicked = campaign.clicked || 0;

  const delRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
  const readRate = delivered > 0 ? Math.round((read / delivered) * 100) : 0;
  const clickRate = read > 0 ? Math.round((clicked / read) * 100) : 0;
  const totalCtr = sent > 0 ? Math.round((clicked / sent) * 100) : 0;

  // SVG Funnel Path Coordinates calculations
  // Width: 320, Height: 240
  // Funnel segments represent Sent -> Delivered -> Read -> Clicked
  const funnelWidths = [
    260, // Sent (Top)
    260 * (sent > 0 ? Math.max(0.3, delivered / sent) : 0.3), // Delivered
    260 * (delivered > 0 ? Math.max(0.2, read / delivered) : 0.2), // Read
    260 * (read > 0 ? Math.max(0.1, clicked / read) : 0.1), // Clicked (Bottom)
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-stone-900 bg-stone-100 border-stone-300";
      case "Sending":
        return "text-white bg-stone-950 border-stone-950";
      case "Scheduled":
        return "text-stone-600 bg-stone-50 border-stone-200";
      default:
        return "text-stone-500 bg-stone-50 border-stone-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
      {/* Backdrop tap closure */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Slide-over Content Drawer */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-xl flex flex-col z-10 animate-slide-left border-l border-stone-200 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Broadcast Detailed Audit</span>
            <h3 className="text-lg font-bold text-stone-900 leading-snug">{campaign.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-none border ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
              <span className="text-[10px] text-stone-505">Template: {campaign.templateName}</span>
              <span className="text-[10px] text-stone-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {campaign.date}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-none hover:bg-stone-200 text-stone-500 transition-colors shrink-0 border border-transparent"
          >
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-[#fafaf9]">
          
          {/* Metrics Grid Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-none border border-stone-200 shadow-none relative overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider font-bold text-stone-400 block">Total Target</span>
              <span className="text-xl font-extrabold text-stone-900 mt-1 block">{sent}</span>
              <span className="text-[10px] text-stone-500 mt-1 block">Leads Segmented</span>
              <div className="absolute right-3 bottom-3 text-stone-100"><Users className="w-8 h-8" /></div>
            </div>

            <div className="bg-white p-4 rounded-none border border-stone-200 shadow-none relative overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider font-bold text-stone-400 block">Delivered</span>
              <span className="text-xl font-extrabold text-stone-900 mt-1 block">{delivered}</span>
              <span className="text-[10px] text-stone-800 font-bold mt-1 block">{delRate}% Delivery Rate</span>
              <div className="absolute right-3 bottom-3 text-stone-100"><CheckCircle className="w-8 h-8" /></div>
            </div>

            <div className="bg-white p-4 rounded-none border border-stone-200 shadow-none relative overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider font-bold text-stone-400 block">Reads</span>
              <span className="text-xl font-extrabold text-stone-900 mt-1 block">{read}</span>
              <span className="text-[10px] text-stone-850 font-bold mt-1 block">{readRate}% Open Rate</span>
              <div className="absolute right-3 bottom-3 text-stone-100"><Activity className="w-8 h-8" /></div>
            </div>

            <div className="bg-white p-4 rounded-none border border-stone-200 shadow-none relative overflow-hidden">
              <span className="text-[9px] uppercase tracking-wider font-bold text-stone-400 block">Clicks</span>
              <span className="text-xl font-extrabold text-stone-900 mt-1 block">{clicked}</span>
              <span className="text-[10px] text-stone-900 font-bold mt-1 block">{clickRate}% Click-to-Read</span>
              <div className="absolute right-3 bottom-3 text-stone-100"><TrendingUp className="w-8 h-8" /></div>
            </div>
          </div>

          {/* SVG Conversion Funnel Section */}
          <div className="bg-white p-6 rounded-none border border-stone-200 shadow-none space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
              <Layers className="w-4 h-4 text-stone-900" />
              Conversion Funnel Visualization
            </h4>

            <div className="flex flex-col md:flex-row items-center gap-8 justify-around pt-2">
              
              {/* SVG Graphic */}
              <div className="relative select-none shrink-0 w-80 h-60 flex items-center justify-center">
                <svg width="320" height="240" viewBox="0 0 320 240">
                  <defs>
                    <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1c1917" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#57534e" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>

                  {/* Segment 1: Sent to Delivered */}
                  <polygon 
                    points={`
                      ${160 - funnelWidths[0]/2},10
                      ${160 + funnelWidths[0]/2},10
                      ${160 + funnelWidths[1]/2},65
                      ${160 - funnelWidths[1]/2},65
                    `} 
                    fill="url(#funnelGrad)"
                    opacity="1.0"
                    className="hover:opacity-90 transition-opacity cursor-help"
                  />
                  <text x="160" y="42" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                    SENT (100%) ➔ DELIVERED ({delRate}%)
                  </text>

                  {/* Segment 2: Delivered to Read */}
                  <polygon 
                    points={`
                      ${160 - funnelWidths[1]/2},70
                      ${160 + funnelWidths[1]/2},70
                      ${160 + funnelWidths[2]/2},125
                      ${160 - funnelWidths[2]/2},125
                    `} 
                    fill="url(#funnelGrad)"
                    opacity="0.8"
                    className="hover:opacity-75 transition-opacity cursor-help"
                  />
                  <text x="160" y="102" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                    OPEN RATE ({readRate}%)
                  </text>

                  {/* Segment 3: Read to Clicked */}
                  <polygon 
                    points={`
                      ${160 - funnelWidths[2]/2},130
                      ${160 + funnelWidths[2]/2},130
                      ${160 + funnelWidths[3]/2},185
                      ${160 - funnelWidths[3]/2},185
                    `} 
                    fill="url(#funnelGrad)"
                    opacity="0.6"
                    className="hover:opacity-50 transition-opacity cursor-help"
                  />
                  <text x="160" y="162" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                    CLICK-THROUGH RATE ({clickRate}%)
                  </text>

                  {/* Bottom Cap (Clicked Final Outcome) */}
                  <rect 
                    x={160 - funnelWidths[3]/2} 
                    y="190" 
                    width={funnelWidths[3]} 
                    height="35" 
                    rx="0" 
                    fill="url(#funnelGrad)" 
                    opacity="0.45"
                  />
                  <text x="160" y="211" textAnchor="middle" fill="#1c1917" fontSize="9" fontWeight="extrabold">
                    TOTAL OUTCOME: {clicked} LEADS ({totalCtr}% CTR)
                  </text>
                </svg>
              </div>

              {/* Text metrics checklist */}
              <div className="space-y-4 w-full max-w-[240px]">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-stone-500">Delivery Success</span>
                    <span className="text-stone-900 font-bold">{delRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                    <div className="h-full bg-stone-900" style={{ width: `${delRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-stone-500">Recipients Open Rate</span>
                    <span className="text-stone-900 font-bold">{readRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                    <div className="h-full bg-stone-700" style={{ width: `${readRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-stone-500">CTR (of Opened)</span>
                    <span className="text-stone-900 font-bold">{clickRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-100 rounded-none overflow-hidden">
                    <div className="h-full bg-stone-500" style={{ width: `${clickRate}%` }} />
                  </div>
                </div>

                <div className="bg-stone-50 p-2.5 rounded-none border border-stone-200 text-[10px] text-stone-600 leading-relaxed">
                  <HelpCircle className="w-3.5 h-3.5 text-stone-900 inline mr-1.5 shrink-0" />
                  <strong>Tip:</strong> Re-engage leads that fall off the funnel using follow-up campaign broadcasts.
                </div>
              </div>

            </div>
          </div>

          {/* Tabbed CRM Recipients Listing & Action logs */}
          <div className="bg-white rounded-none border border-stone-200 shadow-none overflow-hidden flex flex-col">
            
            {/* Tabs Selector Header */}
            <div className="flex border-b border-stone-200 bg-stone-50 shrink-0">
              <button
                onClick={() => setActiveSubTab("recipients")}
                className={`flex-1 py-3 text-xs font-bold text-center border-r border-stone-200 transition-colors uppercase ${
                  activeSubTab === "recipients" 
                    ? "bg-white text-stone-900 border-b-2 border-b-stone-950 font-bold" 
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                Audience Segment ({campaignContacts.length})
              </button>
              <button
                onClick={() => setActiveSubTab("logs")}
                className={`flex-1 py-3 text-xs font-bold text-center transition-colors uppercase ${
                  activeSubTab === "logs" 
                    ? "bg-white text-stone-900 border-b-2 border-b-stone-950 font-bold" 
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                Broadcast Logs ({campaignLogs.length})
              </button>
            </div>

            {/* Sub Tab Contents */}
            <div className="max-h-72 overflow-y-auto custom-scrollbar p-4 bg-white">
              
              {/* Recipients list */}
              {activeSubTab === "recipients" && (
                campaignContacts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400">
                    No contacts matched this campaign tag.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaignContacts.map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-none text-xs hover:bg-stone-50 transition-all select-none">
                        <div className="space-y-0.5">
                          <div className="font-bold text-stone-900">{contact.name}</div>
                          <div className="text-[10px] text-stone-500">{contact.phone} | {contact.email}</div>
                        </div>

                        {/* Status Label — accurate from campaign metrics */}
                        <div className="flex items-center gap-1.5">
                          {campaign.status === "Completed" ? (
                            <>
                              <span className="h-1.5 w-1.5 bg-stone-900" />
                              <span className="text-[10px] font-bold text-stone-900 uppercase">Sent</span>
                            </>
                          ) : campaign.status === "Sending" || campaign.status === "Scheduled" ? (
                            <>
                              <span className="h-1.5 w-1.5 bg-stone-400" />
                              <span className="text-[10px] font-bold text-stone-500 uppercase">Pending</span>
                            </>
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 bg-stone-300" />
                              <span className="text-[10px] font-bold text-stone-400 uppercase">Unknown</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Logs output list */}
              {activeSubTab === "logs" && (
                campaignLogs.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400">
                    No matching broadcast logs found in this workspace scope.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {campaignLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-white border border-stone-200 rounded-none text-xs select-text flex items-start gap-2.5">
                        <span className="text-[10px] text-stone-500 font-bold bg-stone-50 px-2 py-0.5 border border-stone-200 shrink-0">
                          {log.timestamp}
                        </span>
                        <div className="text-stone-700 leading-relaxed flex-1">
                          {log.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

            </div>
          </div>

        </div>

        {/* Drawer footer actions */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end shrink-0 select-none">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs rounded-none border border-stone-950 cursor-pointer transition-all"
          >
            CLOSE AUDIT
          </button>
        </div>

      </div>
    </div>
  );
};
