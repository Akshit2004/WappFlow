"use client";

import React, { useState } from "react";
import { Users, Send, FileCode2, UploadCloud, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CSVImporterModal } from "../contacts/CSVImporterModal";
import { ChecklistWizard } from "./ChecklistWizard";
import { WalletTopupModal } from "./WalletTopupModal";
import { EditorialHeader } from "./EditorialHeader";
import { FlowJournalStream } from "./FlowJournalStream";

interface OverviewTabProps {
  onNavigate?: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigate }) => {
  const { 
    organization, 
    contacts, 
    campaigns, 
    templates, 
    systemLogs, 
    clearSystemLogs, 
    dismissOnboarding, 
    refreshWorkspace,
    sendLiveChatMessage,
    addSystemLog,
  } = useApp();
  
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  // Aggregate stats
  const totalContacts = contacts.length;
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active" || c.status === "Sending").length;

  const fbConnected = !!(organization?.whatsappConnected || organization?.whatsappBusinessAccountId);
  const templatesApproved = templates.some(t => t.metaStatus === "approved");
  const contactsImported = contacts.length > 0;
  const campaignSent = campaigns.length > 0;
  
  const allStepsDone = fbConnected && templatesApproved && contactsImported && campaignSent;
  const showChecklist = !!(organization && !organization.onboardingDismissed && !allStepsDone);

  return (
    <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-8 bg-[#fafaf9] min-h-screen">
      {/* 1. Elegant Editorial Header & Wallet Dock */}
      <EditorialHeader 
        organization={organization}
        onTopupClick={() => setIsTopupOpen(true)}
      />

      {/* 2. Getting Started Onboarding checklist */}
      {organization && (
        <ChecklistWizard
          organizationId={organization.id}
          fbConnected={fbConnected}
          templatesApproved={templatesApproved}
          contactsImported={contactsImported}
          campaignSent={campaignSent}
          onNavigate={onNavigate}
          onImportClick={() => setIsCSVModalOpen(true)}
          dismissOnboarding={dismissOnboarding}
          showChecklist={showChecklist}
        />
      )}

      {/* 3. Main Editorial Asymmetric Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left Column (3/5): Workspace Timeline Log */}
        <div className="lg:col-span-3">
          {/* Chronological Activity Stream Ledger */}
          <FlowJournalStream
            systemLogs={systemLogs}
            clearSystemLogs={clearSystemLogs}
            onNavigate={onNavigate}
          />
        </div>

        {/* Right Column (2/5): Minimalist Pricing Calculator and Metadata Sheet */}
        <div className="lg:col-span-2 space-y-8">
          {/* Flat Workspace Metadata Ledger */}
          <div className="bg-white border border-stone-200 p-6 sm:p-8 hover:border-stone-400 transition-colors duration-300 select-none">
            <div className="pb-6 border-b border-stone-100">
              <h3 className="text-lg font-light text-stone-900">
                Workspace Metadata
              </h3>
              <p className="text-xs text-stone-500 tracking-wide mt-1 uppercase">
                Saas Operational Index
              </p>
            </div>

            <div className="py-6 space-y-6">
              {/* Stat 1: Contacts */}
              <div className="flex items-start justify-between gap-4 border-b border-stone-50 pb-5">
                <div className="space-y-1">
                  <span className="text-[10px] tracking-wider text-stone-400 uppercase font-bold block">
                    TOTAL CRM AUDIENCE LEADS
                  </span>
                  <span className="text-2xl text-stone-900">{totalContacts}</span>
                  <p className="text-[10px] text-stone-500 uppercase">
                    Synchronized Shopify & Webhook Sources
                  </p>
                </div>
                <button 
                  onClick={() => setIsCSVModalOpen(true)}
                  className="bg-stone-950 text-white text-[9px] tracking-wider uppercase py-1.5 px-3 border border-stone-950 hover:bg-white hover:text-stone-950 transition-all duration-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer rounded-none"
                >
                  <UploadCloud className="w-3 h-3" />
                  Import CSV
                </button>
              </div>

              {/* Stat 2: Broadcasts */}
              <div className="flex items-start justify-between gap-4 border-b border-stone-50 pb-5">
                <div className="space-y-1">
                  <span className="text-[10px] tracking-wider text-stone-400 uppercase font-bold block">
                    BROADCAST CAMPAIGNS
                  </span>
                  <span className="text-2xl text-stone-900">{totalCampaigns}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 bg-stone-900 rounded-full animate-pulse-soft" />
                    <span className="text-[9px] text-stone-500 uppercase font-bold">
                      {activeCampaigns} campaigns processing
                    </span>
                  </div>
                </div>
                {onNavigate && (
                  <button 
                    onClick={() => onNavigate("campaigns")}
                    className="bg-white text-stone-950 border border-stone-200 hover:border-stone-950 text-[9px] tracking-wider uppercase py-1.5 px-3 transition-all duration-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer rounded-none"
                  >
                    <Send className="w-3 h-3" />
                    Broadcasts
                  </button>
                )}
              </div>

              {/* Stat 3: Meta Templates */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] tracking-wider text-stone-400 uppercase font-bold block">
                    VERIFIED MESSAGE TEMPLATES
                  </span>
                  <span className="text-2xl text-stone-900">{templates.length}</span>
                  <p className="text-[10px] text-stone-500 uppercase">
                    Meta approved messaging payloads
                  </p>
                </div>
                {onNavigate && (
                  <button 
                    onClick={() => onNavigate("templates")}
                    className="bg-white text-stone-950 border border-stone-200 hover:border-stone-950 text-[9px] tracking-wider uppercase py-1.5 px-3 transition-all duration-300 font-bold shrink-0 flex items-center gap-1 cursor-pointer rounded-none"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    Templates
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Leads CSV Importer Modal */}
      {organization && (
        <CSVImporterModal 
          orgId={organization.id} 
          isOpen={isCSVModalOpen} 
          onClose={() => setIsCSVModalOpen(false)} 
          onSuccess={() => {
            refreshWorkspace(organization.id);
          }}
        />
      )}

      {/* 5. Secure Credits Top-Up Modal */}
      {organization && (
        <WalletTopupModal
          isOpen={isTopupOpen}
          onClose={() => setIsTopupOpen(false)}
          organizationId={organization.id}
          refreshWorkspace={refreshWorkspace}
        />
      )}
    </div>
  );
};
