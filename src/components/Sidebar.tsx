"use client";

import React from "react";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  FileText, 
  Bot, 
  Cpu, 
  CircleDot,
  Sparkles,
  LogOut,
  X
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useApp } from "../context/AppContext";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  isOpen = false,
  onClose
}) => {
  const { contacts, members } = useApp();
  const { data: session } = useSession();
  
  // Calculate total unread messages
  const totalUnread = contacts.reduce((acc, contact) => acc + (contact.unreadCount || 0), 0);
  
  // Use session user name, fallback to env var
  const sessionName = (session?.user as any)?.name || "";
  const agentName = sessionName || "Agent";
  const appName = "WappFlow";
  const appVersion = "v2.4.0";

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "inbox", label: "Team Inbox", icon: MessageSquare, badge: totalUnread > 0 ? totalUnread : undefined },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "templates", label: "Templates", icon: FileText },
    { id: "chatbot", label: "Bot Builder", icon: Cpu },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 cursor-pointer"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 lg:static w-64 bg-white text-stone-700 flex flex-col border-r border-orange-200 h-screen select-none shrink-0 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Brand Signature */}
        <div className="p-6 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-stone-900 leading-none tracking-wide">{appName}</h1>
              <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">{appVersion}</span>
            </div>
          </div>
          {/* Close button for mobile inside the sidebar */}
          <button 
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-orange-50 text-stone-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          <div className="text-[11px] font-semibold text-stone-500 tracking-wider uppercase px-2 mb-2">
            Management
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group relative cursor-pointer ${
                  isActive
                    ? "bg-orange-600 text-white font-medium shadow-md shadow-orange-600/10"
                    : "hover:bg-orange-50 hover:text-orange-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? "text-white scale-110" : "text-zinc-400 group-hover:text-orange-700 group-hover:scale-105"
                  }`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                
                {item.badge !== undefined && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse-soft">
                    {item.badge}
                  </span>
                )}

                {/* Hover indicator glow */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-orange-300 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile / Signout */}
        <div className="p-4 border-t border-orange-100 bg-orange-50/60">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-semibold text-stone-700 border border-orange-200 uppercase">
                {agentName.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-900 truncate">{agentName}</div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <CircleDot className="w-3 h-3 text-orange-500 animate-pulse-soft" />
                <span>Live Support Online</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
