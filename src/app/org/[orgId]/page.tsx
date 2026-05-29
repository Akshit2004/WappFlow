"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useApp } from "../../../context/AppContext";
import { Sidebar } from "../../../components/layout/Sidebar";
import { OverviewTab } from "../../../components/overview/OverviewTab";
import { InboxTab } from "../../../components/inbox/InboxTab";
import { CampaignsTab } from "../../../components/campaigns/CampaignsTab";
import { TemplatesTab } from "../../../components/templates/TemplatesTab";
import { ChatbotTab } from "../../../components/chatbot/ChatbotTab";
import { MarketplaceTab } from "../../../components/marketplace/MarketplaceTab";
import { SettingsTab } from "../../../components/settings/SettingsTab";
import { AnalyticsTab } from "../../../components/analytics/AnalyticsTab";
import { AICopilotSidebar } from "../../../components/layout/AICopilotSidebar";
import { Loader, AlertCircle, Bot, Menu } from "lucide-react";

export default function TenantDashboard() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const { initializeWorkspace } = useApp();

  const orgId = params.orgId as string;

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Session Redirect Guard
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // 2. Fetch scoped PostgreSQL data on mount or org switch with polling
  useEffect(() => {
    if (status !== "authenticated" || !orgId) return;

    const fetchWorkspaceData = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      setErrorMsg("");

      try {
        const response = await fetch(`/api/org/${orgId}/data`);
        if (!response.ok) {
          if (response.status === 403) {
            setErrorMsg("Forbidden: You do not possess active membership access to this SaaS workspace.");
          } else {
            setErrorMsg("An error occurred during PostgreSQL workspace sync.");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        initializeWorkspace(data);
        setLoading(false);
      } catch {
        if (showLoading) {
          setErrorMsg("Failed to synchronize with local PostgreSQL. Connection timeout.");
          setLoading(false);
        }
      }
    };

    fetchWorkspaceData(true);
  }, [orgId, status, initializeWorkspace]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab onNavigate={setActiveTab} />;
      case "analytics":
        return <AnalyticsTab />;
      case "inbox":
        return <InboxTab />;
      case "campaigns":
        return <CampaignsTab />;
      case "templates":
        return <TemplatesTab />;
      case "chatbot":
        return <ChatbotTab />;
      case "marketplace":
        return <MarketplaceTab />;
      case "settings":
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  // Render authenticating screen
  if (status === "loading" || (loading && !errorMsg)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6f5] text-wa-green font-sans relative overflow-hidden">
        {/* Decorative blur rings */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-wa-green/10 rounded-full blur-3xl opacity-30 animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-wa-green-dark/10 rounded-full blur-3xl opacity-30 animate-pulse-soft" />
        
        <div className="flex flex-col items-center gap-4 animate-slide-up relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-wa-green flex items-center justify-center shadow-xl shadow-wa-green/30 animate-glow-pulse relative">
            <Loader className="w-7 h-7 animate-spin text-white" />
            <span className="absolute -inset-1 rounded-3xl border-2 border-emerald-400 opacity-20 animate-ping" />
          </div>
          <div className="text-center space-y-1">
            <span className="text-[11px] tracking-widest uppercase font-extrabold text-stone-600 block">WappFlow Portal</span>
            <span className="text-[9px] tracking-wide font-medium text-stone-400 block uppercase">Synchronizing secure PostgreSQL sandbox...</span>
          </div>
        </div>
      </div>
    );
  }

  // Render Access Error Screen
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#f4f6f5] flex flex-col justify-center items-center px-6 relative overflow-hidden">
        {/* Background decorative glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-100/50 rounded-full blur-3xl opacity-60 animate-pulse-soft" />
        
        <div className="max-w-md w-full bg-white/80 backdrop-blur-md border border-slate-200/60 p-8 rounded-3xl shadow-xl space-y-6 text-center animate-slide-up relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Workspace Access Refused</h3>
            <p className="text-stone-500 text-xs leading-relaxed select-text font-medium">{errorMsg}</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-wa-green hover:bg-wa-green-dark text-white font-bold text-xs py-3.5 rounded-xl transition-all duration-300 hover:shadow-md hover:shadow-wa-green/15 cursor-pointer"
          >
            Return to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f6f5] font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      {/* 2. Main Tab View Panels */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#f4f6f5] relative">
        {/* Mobile Top Navigation Header */}
        <header className="h-14 px-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between shrink-0 lg:hidden select-none z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-xl hover:bg-wa-green/10 text-stone-700 cursor-pointer transition-colors"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-wa-green flex items-center justify-center shadow-md shadow-wa-green/20">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">WappFlow</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-wa-green-light animate-pulse-soft" />
            <span className="text-[9px] font-extrabold text-wa-green-dark bg-wa-green/10 px-2 py-1 rounded-lg border border-wa-green/20 uppercase tracking-wide">SaaS Sandbox</span>
          </div>
        </header>

        {renderActiveTab()}
      </main>

      <AICopilotSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        orgId={orgId}
      />
    </div>
  );
}
