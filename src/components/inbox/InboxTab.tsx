"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Search, 
  Send, 
  Check, 
  CheckCheck,
  User,
  Phone,
  Mail,
  Tag,
  Plus,
  X,
  Bot,
  MessageSquareOff,
  ShoppingBag,
  ExternalLink,
  Laptop,
  ArrowLeft
} from "lucide-react";
import { useApp, Message } from "../../context/AppContext";
import { useSession } from "next-auth/react";

export const InboxTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const { 
    contacts, 
    chatHistory, 
    activeContactId, 
    setActiveContactId, 
    sendLiveChatMessage, 
    updateContact,
    deleteContact,
    members,
    lockSync,
    unlockSync,
    refreshWorkspace
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => refreshWorkspace(orgId), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, orgId, refreshWorkspace]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active contact details
  const activeContact = contacts.find((c) => c.id === activeContactId) || null;
  const activeChat = activeContactId ? chatHistory[activeContactId] || [] : [];

  // Filter contacts
  const filteredContacts = contacts.filter((c) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Mark as read when active contact is loaded
    if (activeContactId && activeContact && (activeContact.unreadCount || 0) > 0) {
      updateContact(activeContactId, { unreadCount: 0 });
    }
  }, [activeChat.length, activeContactId, activeContact, updateContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContactId || !orgId) return;

    const text = inputText.trim();
    const contact = contacts.find(c => c.id === activeContactId);

    if (!contact) return;

    lockSync();

    // Send live chat message locally for instant snappy UI response
    sendLiveChatMessage(activeContactId, text, "agent");
    setInputText("");

    if (contact.assignedAgent === "Bot") {
      const agentName = session?.user?.name || "Agent";
      updateContact(activeContactId, { assignedAgent: agentName });
    }

    try {
      const phone = contact.phone.replace(/[^0-9]/g, "");
      await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          to: phone, 
          text,
          contactId: activeContactId,
          orgId: orgId
        }),
      });
    } catch (err) {
      console.error("Failed to sync live chat message with backend:", err);
    } finally {
      unlockSync();
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim() || !activeContact) return;

    const trimmed = newTagInput.trim();
    if (activeContact.tags.includes(trimmed)) return;

    const updatedTags = [...activeContact.tags, trimmed];
    updateContact(activeContact.id, { tags: updatedTags });
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!activeContact) return;
    const updatedTags = activeContact.tags.filter(t => t !== tagToRemove);
    updateContact(activeContact.id, { tags: updatedTags });
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!activeContact) return;
    updateContact(activeContact.id, { assignedAgent: e.target.value });
  };

  // Render ticks
  const renderMessageStatus = (status: Message["status"]) => {
    if (!status) return null;
    if (status === "sent") {
      return <Check className="w-3.5 h-3.5 text-stone-400" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-stone-450" />;
    }
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-stone-900" />;
    }
    return null;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-slide-up relative bg-[#fafaf9] min-h-screen">
      {/* 1. Left Contact List Pane */}
      <div className={`w-full md:w-80 border-r border-stone-200 flex flex-col h-full bg-white shrink-0 ${
        activeContactId ? "hidden md:flex" : "flex"
      }`}>
        {/* Search */}
        <div className="p-4 border-b border-stone-200 shrink-0 space-y-3 bg-[#fafaf9]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-xs tracking-wider uppercase">Active Conversations</h3>
            <button
              onClick={() => setAutoRefresh((p) => !p)}
              className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-none border transition-all cursor-pointer ${
                autoRefresh
                  ? "bg-stone-950 text-white border-stone-950"
                  : "bg-white text-stone-400 border-stone-200 hover:border-stone-950 hover:text-stone-950"
              }`}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              {autoRefresh ? "Live" : "Paused"}
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="FILTER LEADS, PHONES..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-none py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:border-stone-900 focus:bg-white transition-all uppercase placeholder:text-stone-300"
            />
          </div>
        </div>

        {/* Contacts Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-stone-100">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 font-bold uppercase tracking-wider">
              NO MATCHING CRM LEADS DISCOVERED
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = c.id === activeContactId;
              const hasUnread = (c.unreadCount || 0) > 0 && !isSelected;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveContactId(c.id)}
                  className={`w-full p-4 flex items-start gap-3 transition-all duration-200 hover:bg-stone-50 text-left relative rounded-none ${
                    isSelected ? "bg-stone-50" : ""
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5 select-none">
                    <div className="w-10 h-10 bg-stone-950 text-white flex items-center justify-center font-bold text-xs border border-stone-950 uppercase rounded-none">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    {c.status === "Active" ? (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-stone-950 border border-white" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-stone-200 border border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold truncate text-stone-950 uppercase tracking-wider">
                        {c.name}
                      </h4>
                      <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider shrink-0">{c.lastMessageTime}</span>
                    </div>

                    <p className="text-xs text-stone-500 truncate leading-normal">
                      {c.lastMessage || "No messages yet"}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[8px] font-bold text-stone-500 uppercase tracking-wider bg-stone-100 border border-stone-200 px-1.5 py-0.5 rounded-none leading-none shrink-0">
                        {c.source.includes("Shopify") ? "Shopify" : c.source.includes("Woo") ? "Woo" : "Ad"}
                      </span>
                      {c.tags.slice(0, 1).map((t, idx) => (
                        <span key={idx} className="text-[9px] font-bold bg-stone-900/10 text-stone-850 px-2 py-0.5 border border-stone-200 leading-none truncate max-w-[80px] rounded-none uppercase tracking-wider">
                          {t}
                        </span>
                      ))}
                      {c.tags.length > 1 && (
                        <span className="text-[9px] text-stone-400 font-bold">+{c.tags.length - 1}</span>
                      )}
                    </div>
                  </div>

                  {hasUnread && (
                    <span className="bg-stone-950 text-white text-[9px] font-bold w-5 h-5 rounded-none flex items-center justify-center shrink-0 mt-1.5 border border-stone-950">
                      {c.unreadCount}
                    </span>
                  )}

                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-stone-950" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Chat Stream Window */}
      <div className={`flex-1 flex flex-col h-full relative overflow-hidden ${
        activeContactId ? "flex" : "hidden md:flex"
      }`}>
        {activeContact ? (
          <>
            {/* Active Contact Header */}
            <div className="h-16 px-4 md:px-6 bg-white border-b border-stone-200 flex items-center justify-between shrink-0 relative z-10 select-none shadow-none">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                {/* Back button for mobile view */}
                <button
                  type="button"
                  onClick={() => setActiveContactId("")}
                  className="md:hidden p-1.5 rounded-none hover:bg-stone-100 text-stone-750 cursor-pointer shrink-0 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 bg-stone-950 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase border border-stone-950 rounded-none">
                  {activeContact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-950 leading-none truncate uppercase tracking-wider">{activeContact.name}</h4>
                  <span className="text-[9px] text-stone-400 font-bold flex items-center gap-1 mt-1 truncate uppercase">
                    <span className="truncate">{activeContact.phone}</span>
                    <span>•</span>
                    <span className="truncate text-stone-600">{activeContact.source}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulate(!showSimulate)}
                  className="text-[9px] px-3 py-1.5 rounded-none bg-stone-950 text-white hover:bg-white hover:text-stone-950 border border-stone-950 font-bold uppercase tracking-wider flex items-center gap-1.5 select-none transition-all shrink-0 cursor-pointer"
                  title="Simulate Inbound Customer Message"
                >
                  <Bot className="w-3.5 h-3.5" />
                  Simulate
                </button>

                <span className="hidden sm:inline-flex text-[9px] px-3 py-1.5 rounded-none bg-stone-50 text-stone-500 font-bold items-center gap-1.5 shrink-0 border border-stone-200 uppercase tracking-wider">
                  <Laptop className="w-3.5 h-3.5 text-stone-400" />
                  Agent: <span className="font-bold text-stone-850">{activeContact.assignedAgent}</span>
                </span>
                
                {/* Profile panel toggle button */}
                <button
                  type="button"
                  onClick={() => setShowMobileProfile(!showMobileProfile)}
                  className="lg:hidden p-2 rounded-none hover:bg-stone-100 text-stone-700 cursor-pointer shrink-0 transition-colors"
                  title="View Customer Profile"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Inbound Customer Simulator Banner */}
            {showSimulate && (
              <div className="bg-stone-50 border-b border-stone-200 px-6 py-3.5 flex items-center justify-between gap-4 z-20 relative select-none animate-slide-up">
                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-900 shrink-0 uppercase tracking-wider">
                  <Bot className="w-4.5 h-4.5" />
                  <span>Simulate from {activeContact.name}:</span>
                </div>
                <div className="flex items-center gap-2.5 flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Type simulated customer response..."
                    value={simMessage}
                    onChange={(e) => setSimMessage(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && simMessage.trim()) {
                        const text = simMessage.trim();
                        setSimMessage("");
                        setShowSimulate(false);
                        
                        lockSync();
                        sendLiveChatMessage(activeContact.id, text, "user");

                        try {
                          await fetch("/api/webhooks/whatsapp/process", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              from: activeContact.phone,
                              text,
                              msgId: `sim-${Date.now()}`,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            })
                          });
                        } catch (err) {
                          console.error(err);
                        } finally {
                          unlockSync();
                        }
                      }
                    }}
                    className="flex-1 bg-white border border-stone-200 rounded-none px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-900 uppercase"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!simMessage.trim()) return;
                      const text = simMessage.trim();
                      setSimMessage("");
                      setShowSimulate(false);
                      
                      lockSync();
                      sendLiveChatMessage(activeContact.id, text, "user");

                      try {
                        await fetch("/api/webhooks/whatsapp/process", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            from: activeContact.phone,
                            text,
                            msgId: `sim-${Date.now()}`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          })
                        });
                      } catch (err) {
                        console.error(err);
                      } finally {
                        unlockSync();
                      }
                    }}
                    className="bg-stone-950 hover:bg-stone-850 text-white border border-stone-950 font-bold text-[9px] tracking-wider uppercase px-4 py-2 rounded-none transition-all cursor-pointer shrink-0"
                  >
                    Simulate Inbound
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSimulate(false)}
                    className="p-2 rounded-none hover:bg-stone-100 text-stone-500 cursor-pointer shrink-0 transition-colors"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Live Message History Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative bg-[#fafaf9]">
              {activeChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-stone-400 font-bold uppercase tracking-wider gap-2.5 relative z-10">
                  <Bot className="w-9 h-9 text-stone-950" />
                  <p className="max-w-xs leading-relaxed">Live support channel is operational. Send an outbound support message or trigger template payload below.</p>
                </div>
              ) : (
                activeChat.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center my-3.5 animate-slide-up relative z-10 select-none">
                        <div className="bg-stone-100 text-[9px] font-bold text-stone-500 px-3.5 py-2 rounded-none shadow-none max-w-[85%] text-center uppercase tracking-wider border border-stone-200">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.sender === "agent";

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAgent ? "justify-end" : "justify-start"} animate-slide-up relative z-10`}
                    >
                      <div className={`max-w-[70%] rounded-none px-4 py-3.5 shadow-none text-xs leading-relaxed relative ${
                        isAgent 
                          ? "bg-stone-900 text-stone-50 border border-stone-900" 
                          : "bg-white text-stone-900 border border-stone-200"
                      }`}>
                        {/* Text */}
                        <p className="whitespace-pre-line select-text">{msg.text}</p>
                        
                        {/* Interactive Buttons (e.g. CTA Quick Replies) */}
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-3.5 border-t border-stone-200/40 pt-2.5 space-y-2 select-none">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                onClick={() => {
                                  sendLiveChatMessage(
                                    activeContact.id, 
                                    `Clicked action button: "${btn}"`, 
                                    "system"
                                  );
                                  setTimeout(() => {
                                    sendLiveChatMessage(
                                      activeContact.id, 
                                      `Simulated choice response regarding: ${btn}`, 
                                      "user"
                                    );
                                  }, 1500);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-none bg-stone-50 border border-stone-200 hover:border-stone-950 text-stone-900 font-bold hover:bg-stone-100 transition-all text-[9px] uppercase tracking-wider shadow-none"
                              >
                                <span>{btn}</span>
                                <ExternalLink className="w-3 h-3 text-stone-400" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Footer Details */}
                        <div className="flex items-center justify-end gap-1 mt-2.5 text-[8px] text-stone-400 font-bold uppercase select-none">
                          <span>{msg.timestamp}</span>
                          {isAgent && renderMessageStatus(msg.status)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar Form */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-stone-200 flex items-center gap-3 shrink-0 relative z-10"
            >
              <input
                type="text"
                placeholder="Compose secure WhatsApp messaging transmission..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-none py-3 px-4 text-xs font-semibold focus:outline-none focus:border-stone-900 transition-all placeholder:text-stone-300 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-11 h-11 rounded-none bg-stone-950 text-white hover:bg-white hover:text-stone-950 border border-stone-950 flex items-center justify-center disabled:opacity-40 disabled:hover:bg-stone-950 disabled:hover:text-white transition-all shadow-none cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4 select-none relative z-10">
            <div className="w-16 h-16 bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-700 shadow-none rounded-none">
              <MessageSquareOff className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-stone-950 text-xs uppercase tracking-widest">No Active Conversation</h4>
              <p className="text-stone-500 text-xs mt-1.5 max-w-[280px] leading-relaxed">Select a support ledger lead from the active panel to initiate chat history routing.</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right CRM Profile Panel Drawer */}
      {activeContact && (
        <>
          {/* Backdrop for mobile CRM drawer */}
          {showMobileProfile && (
            <div 
              onClick={() => setShowMobileProfile(false)}
              className="fixed inset-0 bg-[#fafaf9]/85 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-300 cursor-pointer"
            />
          )}

          <div className={`fixed inset-y-0 right-0 z-40 lg:static w-80 lg:w-72 border-l border-stone-200 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0 p-6 space-y-6 transition-transform duration-350 ease-in-out lg:translate-x-0 ${
            showMobileProfile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}>
            {/* Header close button inside mobile CRM drawer */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-200 lg:hidden select-none">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Customer Profile</span>
              <button
                type="button"
                onClick={() => setShowMobileProfile(false)}
                className="p-1.5 rounded-none hover:bg-stone-100 text-stone-600 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center pb-4 border-b border-stone-200 select-none">
              <div className="w-16 h-16 bg-stone-950 text-white flex items-center justify-center text-xl font-bold mx-auto mb-3 border border-stone-950 uppercase rounded-none">
                {activeContact.name.split(" ").map(n => n[0]).join("")}
              </div>
              <h3 className="font-bold text-stone-900 tracking-tight text-xs uppercase tracking-wider">{activeContact.name}</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider bg-stone-100 text-stone-900 px-2.5 py-1.5 border border-stone-300 mt-2.5 inline-block rounded-none">
                {activeContact.status} lead
              </span>
            </div>

            {/* CRM Info Fields */}
            <div className="space-y-4">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-stone-450">Lead Metadata</h4>
              <div className="space-y-3 text-[10px] font-bold text-stone-600 select-text uppercase tracking-wider">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="truncate">{activeContact.phone}</span>
                </div>
                <div className="flex items-center gap-3 lowercase normal-case select-all">
                  <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="truncate">{activeContact.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>Source: <strong className="text-stone-900 uppercase font-bold">{activeContact.source}</strong></span>
                </div>
              </div>
            </div>

            {/* Agent Assignment */}
            <div className="space-y-2 select-none">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-stone-450">Assigned Agent</h4>
              <select
                value={activeContact.assignedAgent}
                onChange={handleAgentChange}
                className="w-full bg-stone-50 border border-stone-200 rounded-none p-2.5 text-xs font-semibold focus:outline-none focus:border-stone-950 transition-all select-none uppercase tracking-wider"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
                <option value="Bot">Bot (Auto AI)</option>
                <option value="None">Unassigned</option>
              </select>
            </div>

            {/* Custom Tags Manager */}
            <div className="space-y-4 pt-2">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-stone-450 flex items-center gap-2 select-none">
                <Tag className="w-3.5 h-3.5" />
                Segmentation Tags
              </h4>
              
              {/* Tag pills */}
              <div className="flex flex-wrap gap-1.5 select-none">
                {activeContact.tags.length === 0 ? (
                  <span className="text-[10px] text-stone-450 font-bold uppercase tracking-wider">No active segment tags.</span>
                ) : (
                  activeContact.tags.map((t, idx) => (
                    <span 
                      key={idx} 
                      className="text-[9px] font-bold bg-stone-100 text-stone-850 pl-2.5 pr-1.5 py-1.5 flex items-center gap-1.5 border border-stone-200 rounded-none uppercase tracking-wider"
                    >
                      <span>{t}</span>
                      <button 
                        onClick={() => handleRemoveTag(t)}
                        className="hover:bg-stone-200 p-0.5 rounded-none cursor-pointer transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-stone-450" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add tag form */}
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Create tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-none px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-950 uppercase tracking-wider"
                />
                <button
                  type="submit"
                  className="bg-stone-950 hover:bg-white hover:text-stone-950 text-white border border-stone-950 rounded-none px-3 py-2 transition-all cursor-pointer shrink-0 flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            {/* Delete Contact */}
            <div className="pt-6 border-t border-stone-200 select-none">
              <button
                onClick={() => {
                  deleteContact(activeContact.id);
                  setShowMobileProfile(false);
                }}
                className="w-full text-center py-3.5 text-xs font-bold uppercase tracking-wider text-stone-500 hover:bg-stone-100 border border-stone-200 rounded-none transition-all cursor-pointer"
              >
                Delete Lead Profile
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
