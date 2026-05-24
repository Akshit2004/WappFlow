"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";

// Types
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  tags: string[];
  status: "Active" | "Inactive";
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  assignedAgent?: string;
}

export interface Message {
  id: string;
  sender: "user" | "agent" | "system";
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  buttons?: string[];
}

export interface ChatHistory {
  [contactId: string]: Message[];
}

export interface Campaign {
  id: string;
  name: string;
  targetTag: string;
  templateName: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  status: "Completed" | "Active" | "Scheduled" | "Sending";
  date: string;
}

export interface Template {
  id: string;
  name: string;
  body: string;
  category: "Marketing" | "Utility" | "Authentication";
  buttons: string[];
  mediaType?: "none" | "image" | "video" | "document";
  metaStatus?: "pending" | "approved" | "rejected";
  metaId?: string;
}

export interface ChatbotNode {
  id: string;
  type: "trigger" | "message" | "question" | "delay";
  title: string;
  content: string;
  options?: string[]; // for questions
  delayTime?: number; // for delay in seconds
  nextId?: string;
  routes?: { [option: string]: string }; // routes for question options
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: "connected" | "disconnected";
  icon: string;
  apiKey?: string;
  webhookUrl?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: "campaign" | "chat" | "integration" | "crm";
  message: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppContextType {
  contacts: Contact[];
  campaigns: Campaign[];
  templates: Template[];
  chatHistory: ChatHistory;
  chatbotNodes: ChatbotNode[];
  integrations: Integration[];
  systemLogs: SystemLog[];
  members: Member[];
  activeContactId: string | null;
  setActiveContactId: (id: string | null) => void;
  // Actions
  addContact: (contact: Omit<Contact, "id">) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  sendBroadcast: (campaign: { name: string; targetTag: string; templateName: string; organizationId: string }) => Promise<void>;
  sendLiveChatMessage: (contactId: string, text: string, sender?: "user" | "agent" | "system", buttons?: string[]) => void;
  updateChatbotNodes: (nodes: ChatbotNode[]) => void;
  toggleIntegration: (id: string, config?: { apiKey?: string; webhookUrl?: string }) => void;
  addSystemLog: (type: SystemLog["type"], message: string) => void;
  clearSystemLogs: () => void;
  addTemplate: (template: Omit<Template, "id">) => void;
  lockSync: () => void;
  unlockSync: () => void;
  initializeWorkspace: (data: {
    contacts: Contact[];
    campaigns: Campaign[];
    templates: Template[];
    chatHistory: ChatHistory;
    chatbotNodes: ChatbotNode[];
    integrations: Integration[];
    systemLogs: SystemLog[];
    members: Member[];
  }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory>({});
  const [chatbotNodes, setChatbotNodes] = useState<ChatbotNode[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);

  // Helper: Format Time
  const getCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const addSystemLog = (type: SystemLog["type"], message: string) => {
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    setSystemLogs((prev) => [
      { id: `log-${Date.now()}`, timestamp: ts, type, message },
      ...prev.slice(0, 49), // cap at 50 logs
    ]);
  };

  const clearSystemLogs = () => setSystemLogs([]);

  const addTemplate = (newTmpl: Omit<Template, "id">) => {
    const id = newTmpl.metaId ? `meta-${newTmpl.metaId}` : `t-${Date.now()}`;
    const tmpl: Template = {
      ...newTmpl,
      id,
    };
    setTemplates((prev) => [...prev, tmpl]);
    addSystemLog("crm", `Created template: ${tmpl.name} (${tmpl.category}) - ${tmpl.metaStatus || "pending"}`);
  };

  const syncLockedRef = useRef(false);

  const lockSync = useCallback(() => {
    syncLockedRef.current = true;
  }, []);

  const unlockSync = useCallback(() => {
    setTimeout(() => {
      syncLockedRef.current = false;
    }, 1500);
  }, []);

  const initializeWorkspace = useCallback((data: {
    contacts: Contact[];
    campaigns: Campaign[];
    templates: Template[];
    chatHistory: ChatHistory;
    chatbotNodes: ChatbotNode[];
    integrations: Integration[];
    systemLogs: SystemLog[];
    members: Member[];
  }) => {
    if (syncLockedRef.current) {
      return;
    }
    setContacts(data.contacts);
    setCampaigns(data.campaigns);
    setTemplates(data.templates);
    setChatHistory(data.chatHistory);
    setChatbotNodes(data.chatbotNodes);
    setIntegrations(data.integrations);
    setSystemLogs(data.systemLogs);
    setMembers(data.members);
    if (data.contacts.length > 0) {
      setActiveContactId(data.contacts[0].id);
    } else {
      setActiveContactId(null);
    }
  }, []);

  // Actions
  const addContact = (newContact: Omit<Contact, "id">) => {
    const id = `c-${Date.now()}`;
    const contact: Contact = {
      ...newContact,
      id,
      unreadCount: 0,
    };
    setContacts((prev) => [contact, ...prev]);
    // Pre-populate empty chat history
    setChatHistory((prev) => ({ ...prev, [id]: [] }));
    addSystemLog("crm", `Added new contact: ${contact.name} (${contact.phone})`);
    return contact;
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    lockSync();
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    if (updates.tags) {
      addSystemLog("crm", `Updated tags for contact ID ${id}`);
    }
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        addSystemLog("crm", `Failed to save contact updates for ID ${id} to sandbox database.`);
      }
    } catch (err: any) {
      addSystemLog("crm", `Error updating contact ID ${id}: ${err.message}`);
    } finally {
      unlockSync();
    }
  };

  const deleteContact = async (id: string) => {
    lockSync();
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (activeContactId === id) setActiveContactId(null);
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        addSystemLog("crm", `Failed to delete contact ID ${id} from sandbox database.`);
      } else {
        addSystemLog("crm", `Permanently deleted contact ID ${id}`);
      }
    } catch (err: any) {
      addSystemLog("crm", `Error permanently deleting contact ID ${id}: ${err.message}`);
    } finally {
      unlockSync();
    }
  };

  const sendLiveChatMessage = (contactId: string, text: string, sender: "user" | "agent" | "system" = "agent", buttons?: string[]) => {
    const time = getCurrentTime();
    const newMsg: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      text,
      timestamp: time,
      status: sender === "agent" ? "sent" : undefined,
      buttons,
    };

    setChatHistory((prev) => {
      const current = prev[contactId] || [];
      return {
        ...prev,
        [contactId]: [...current, newMsg],
      };
    });

    // Update last message in contact list
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id === contactId) {
          const count = sender === "user" ? (c.unreadCount || 0) + 1 : c.unreadCount;
          return {
            ...c,
            lastMessage: text.length > 35 ? text.substring(0, 32) + "..." : text,
            lastMessageTime: time,
            unreadCount: count,
          };
        }
        return c;
      })
    );

    // Dynamic System Logs
    if (sender === "agent") {
      addSystemLog("chat", `Agent sent WhatsApp message to ID ${contactId}`);
      // Simulate delivered and read status updates
      setTimeout(() => {
        setChatHistory((prev) => {
          const current = prev[contactId] || [];
          return {
            ...prev,
            [contactId]: current.map((m) => (m.id === newMsg.id ? { ...m, status: "delivered" } : m)),
          };
        });
      }, 1000);

      setTimeout(() => {
        setChatHistory((prev) => {
          const current = prev[contactId] || [];
          return {
            ...prev,
            [contactId]: current.map((m) => (m.id === newMsg.id ? { ...m, status: "read" } : m)),
          };
        });
      }, 2500);
    } else if (sender === "user") {
      addSystemLog("chat", `Received WhatsApp message from ID ${contactId}`);
    }
  };

  const sendBroadcast = async (campaignData: { name: string; targetTag: string; templateName: string; organizationId: string }) => {
    try {
      addSystemLog("campaign", `Launching broadcast '${campaignData.name}' to matching contacts...`);
      
      const res = await fetch("/api/whatsapp/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });

      if (!res.ok) {
        const err = await res.json();
        addSystemLog("campaign", `Broadcast launch failed: ${err.error}`);
        return;
      }

      const data = await res.json();
      setCampaigns((prev) => [data.campaign, ...prev]);
      addSystemLog("campaign", `Broadcast launched successfully! Fired to ${data.campaign.sent} contacts.`);
    } catch (err: any) {
      addSystemLog("campaign", `Broadcast launch error: ${err.message}`);
    }
  };

  const updateChatbotNodes = (newNodes: ChatbotNode[]) => {
    setChatbotNodes(newNodes);
    addSystemLog("crm", "Chatbot Builder nodes layout saved");
  };

  const toggleIntegration = (id: string, config?: { apiKey?: string; webhookUrl?: string }) => {
    setIntegrations((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const nextStatus = it.status === "connected" ? "disconnected" : "connected";
          addSystemLog("integration", `${it.name} Integration is now ${nextStatus.toUpperCase()}`);
          return {
            ...it,
            status: nextStatus,
            apiKey: config?.apiKey || it.apiKey,
            webhookUrl: config?.webhookUrl || it.webhookUrl,
          };
        }
        return it;
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        contacts,
        campaigns,
        templates,
        chatHistory,
        chatbotNodes,
        integrations,
        systemLogs,
        members,
        activeContactId,
        setActiveContactId,
        addContact,
        updateContact,
        deleteContact,
        sendBroadcast,
        sendLiveChatMessage,
        updateChatbotNodes,
        toggleIntegration,
        addSystemLog,
        clearSystemLogs,
        addTemplate,
        lockSync,
        unlockSync,
        initializeWorkspace,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
