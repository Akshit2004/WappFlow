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
import { useApp, Contact, Message } from "../context/AppContext";
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
    integrations,
    members,
    lockSync,
    unlockSync
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [inputText, setInputText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simMessage, setSimMessage] = useState("");
  
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
  }, [activeChat.length, activeContactId]);

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
      return <Check className="w-3.5 h-3.5 text-zinc-400" />;
    }
    if (status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />;
    }
    if (status === "read") {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    }
    return null;
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden animate-slide-up relative">
      {/* 1. Left Contact List Pane */}
      <div className={`w-full md:w-80 border-r border-orange-100 flex flex-col h-full bg-white shrink-0 ${
        activeContactId ? "hidden md:flex" : "flex"
      }`}>
        {/* Search */}
        <div className="p-4 border-b border-orange-100 shrink-0 space-y-3">
          <h3 className="font-semibold text-base">Active Chats</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chats, phone, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-orange-50 border border-orange-100 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Contacts Stream */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-orange-100">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No matching active leads.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = c.id === activeContactId;
              const hasUnread = (c.unreadCount || 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveContactId(c.id)}
                  className={`w-full p-4 flex items-start gap-3 transition-colors hover:bg-orange-50 text-left ${
                    isSelected ? "bg-orange-50/50 border-l-3 border-orange-500" : ""
                  }`}
                >
                  <div className="relative shrink-0 mt-0.5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold text-stone-600">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    {c.status === "Active" ? (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-white dark:border-zinc-950" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-zinc-350 border-2 border-white dark:border-zinc-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-semibold truncate ${isSelected ? "text-orange-700" : "text-zinc-900"}`}>
                        {c.name}
                      </h4>
                      <span className="text-[10px] text-stone-400 font-medium shrink-0">{c.lastMessageTime}</span>
                    </div>

                    <p className="text-[11px] text-stone-500 truncate font-medium">
                      {c.lastMessage || "No messages yet"}
                    </p>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wide bg-orange-50 px-1 py-0.5 rounded leading-none shrink-0">
                        {c.source.includes("Shopify") ? "Shopify" : c.source.includes("Woo") ? "Woo" : "Ad"}
                      </span>
                      {c.tags.slice(0, 1).map((t, idx) => (
                        <span key={idx} className="text-[9px] bg-orange-500/10 text-orange-600 px-1 py-0.5 rounded leading-none truncate max-w-[80px]">
                          {t}
                        </span>
                      ))}
                      {c.tags.length > 1 && (
                        <span className="text-[9px] text-stone-400">+{c.tags.length - 1}</span>
                      )}
                    </div>
                  </div>

                  {hasUnread && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 animate-pulse-soft mt-1.5 shadow-sm">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle Chat Stream Window */}
      <div className={`flex-1 flex flex-col h-full bg-orange-50/30 relative ${
        activeContactId ? "flex" : "hidden md:flex"
      }`}>
        {/* Chat Background Graphic Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#f97316_1.5px,transparent_1.5px)] [background-size:24px_24px]" />

        {activeContact ? (
          <>
            {/* Active Contact Header */}
            <div className="h-16 px-4 md:px-6 bg-white border-b border-orange-100 flex items-center justify-between shrink-0 relative z-10 select-none">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                {/* Back button for mobile view */}
                <button
                  type="button"
                  onClick={() => setActiveContactId("")}
                  className="md:hidden p-1.5 rounded-lg hover:bg-orange-50 text-stone-700 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center font-bold text-orange-600 text-sm shrink-0">
                  {activeContact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-stone-900 leading-none truncate">{activeContact.name}</h4>
                  <span className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                    <span className="truncate">{activeContact.phone}</span>
                    <span>•</span>
                    <span className="capitalize truncate">{activeContact.source}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulate(!showSimulate)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold flex items-center gap-1 select-none transition-all shadow-sm shrink-0 cursor-pointer"
                  title="Simulate Inbound Customer Message"
                >
                  <Bot className="w-3 h-3 text-amber-600" />
                  Simulate Inbound
                </button>

                <span className="hidden sm:inline-flex text-[10px] px-2.5 py-1 rounded-full bg-orange-50 text-stone-600 font-semibold items-center gap-1.5 shrink-0">
                  <Laptop className="w-3 h-3 text-zinc-500" />
                  Agent: <span className="font-bold text-stone-800">{activeContact.assignedAgent}</span>
                </span>
                
                {/* Profile panel toggle button for mobile/tablet screens */}
                <button
                  type="button"
                  onClick={() => setShowMobileProfile(!showMobileProfile)}
                  className="lg:hidden p-2 rounded-lg hover:bg-orange-50 text-stone-700 cursor-pointer shrink-0 transition-colors"
                  title="View Customer Profile"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Inbound Customer Simulator Banner */}
            {showSimulate && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4 z-20 relative select-none animate-slide-up">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 shrink-0">
                  <Bot className="w-4 h-4 text-amber-600 animate-bounce" />
                  <span>Simulate message from {activeContact.name}:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Type what this customer says..."
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
                    className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Send Inbound
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSimulate(false)}
                    className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-700 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Live Message History Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar relative z-10">
              {activeChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-zinc-500 gap-2">
                  <Bot className="w-8 h-8 text-orange-500 animate-bounce" />
                  <p>Send a message to open support channel.</p>
                </div>
              ) : (
                activeChat.map((msg) => {
                  if (msg.sender === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center my-2 animate-slide-up">
                        <div className="bg-stone-200 text-[10px] font-semibold text-stone-600 px-3 py-1.5 rounded-lg shadow-sm max-w-[85%] text-center">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isAgent = msg.sender === "agent";

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isAgent ? "justify-end" : "justify-start"} animate-slide-up`}
                    >
                      <div className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed ${
                        isAgent 
                          ? "wa-bubble-sent-bg text-zinc-850 rounded-tr-none" 
                          : "wa-bubble-received-bg text-zinc-900 rounded-tl-none"
                      }`}>
                        {/* Text */}
                        <p className="whitespace-pre-line select-text">{msg.text}</p>
                        
                        {/* Interactive Buttons (e.g. CTA Quick Replies) */}
                        {msg.buttons && msg.buttons.length > 0 && (
                          <div className="mt-3.5 border-t border-orange-100/50 dark:border-zinc-700/50 pt-2.5 space-y-1.5 select-none">
                            {msg.buttons.map((btn, bIdx) => (
                              <button
                                key={bIdx}
                                onClick={() => {
                                  // Click simulation! It fires an automated response from client after a button click
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
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white/70 border border-zinc-300/30 text-orange-600 font-bold hover:bg-orange-50 active:scale-98 transition-all"
                              >
                                <span>{btn}</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Footer Details */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-stone-400 select-none">
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

            {/* Input Bar form */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 bg-white border-t border-orange-100 flex items-center gap-3 shrink-0 relative z-10"
            >
              <input
                type="text"
                placeholder="Type WhatsApp response..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-orange-50 border border-orange-100 rounded-xl py-2.5 px-4 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 transition-colors shadow-md shadow-orange-600/10 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-orange-100/50 flex items-center justify-center text-stone-400">
              <MessageSquareOff className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-stone-700">No Chat Selected</h4>
              <p className="text-stone-500 text-xs mt-1 max-w-[280px]">Select a lead from the left active panel to load customer messages and perform live-chat automation.</p>
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
              className="fixed inset-0 bg-black/40 z-30 lg:hidden transition-opacity duration-300 cursor-pointer"
            />
          )}

          <div className={`fixed inset-y-0 right-0 z-40 lg:static w-80 lg:w-72 border-l border-orange-100 bg-white flex flex-col h-full overflow-y-auto custom-scrollbar shrink-0 p-6 space-y-6 transition-transform duration-305 ease-in-out lg:translate-x-0 ${
            showMobileProfile ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          }`}>
            {/* Header close button inside mobile CRM drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-100 lg:hidden select-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Customer Profile</span>
              <button
                type="button"
                onClick={() => setShowMobileProfile(false)}
                className="p-1 rounded-lg hover:bg-orange-50 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          <div className="text-center pb-4 border-b border-orange-100 dark:border-zinc-900">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center text-xl font-bold mx-auto mb-3 border border-orange-500/10">
              {activeContact.name.split(" ").map(n => n[0]).join("")}
            </div>
            <h3 className="font-bold text-stone-900">{activeContact.name}</h3>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-semibold mt-1.5 inline-block">
              {activeContact.status} lead
            </span>
          </div>

          {/* CRM Info Fields */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Lead Metadata</h4>
            <div className="space-y-2.5 text-xs text-stone-600">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="truncate">{activeContact.phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="truncate">{activeContact.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-stone-400 shrink-0" />
                <span>Source: <strong className="text-stone-800 capitalize">{activeContact.source}</strong></span>
              </div>
            </div>
          </div>

          {/* Agent Assignment */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Change Agent</h4>
            <select
              value={activeContact.assignedAgent}
              onChange={handleAgentChange}
              className="w-full bg-orange-50 border border-orange-100 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500"
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
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Segmentation Tags
            </h4>
            
            {/* Tag pills */}
            <div className="flex flex-wrap gap-1.5">
              {activeContact.tags.length === 0 ? (
                <span className="text-[10px] text-stone-400 italic">No segment tags.</span>
              ) : (
                activeContact.tags.map((t, idx) => (
                  <span 
                    key={idx} 
                    className="text-[10px] font-semibold bg-orange-500/10 text-orange-600 pl-2 pr-1 py-0.5 rounded-full flex items-center gap-1"
                  >
                    <span>{t}</span>
                    <button 
                      onClick={() => handleRemoveTag(t)}
                      className="hover:bg-orange-500/20 p-0.5 rounded-full"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Add tag form */}
            <form onSubmit={handleAddTag} className="flex gap-2">
              <input
                type="text"
                placeholder="Add segment tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-2 py-1.5 hover:scale-102 active:scale-98 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Delete contact */}
          <div className="pt-6 border-t border-orange-100 dark:border-zinc-900">
            <button
              onClick={() => {
                deleteContact(activeContact.id);
                setShowMobileProfile(false);
              }}
              className="w-full text-center py-2 text-xs font-semibold text-red-500 hover:bg-red-500/5 hover:text-red-600 border border-red-500/10 hover:border-red-500/30 rounded-lg transition-colors cursor-pointer"
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
