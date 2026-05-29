"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Globe, Phone, CheckCircle2, Loader, AlertCircle } from "lucide-react";

interface PhoneNumber {
  id: string;
  display_phone_number: string;
  quality_rating?: string;
}

interface Waba {
  wabaId: string;
  name: string;
  phoneNumbers: PhoneNumber[];
}

interface PortfolioData {
  activeWabaId: string | null;
  activePhoneNumberId: string | null;
  portfolios: Waba[];
}

export const SettingsTab: React.FC = () => {
  const params = useParams();
  const orgId = params.orgId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortfolioData | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) {
      const load = async () => {
        setLoading(true);
        setError("");
        try {
          const res = await fetch(`/api/whatsapp/portfolio?orgId=${orgId}`);
          if (!res.ok) {
            if (res.status === 404) {
              setError("WhatsApp is not connected yet. Please connect via Facebook from the sidebar first.");
            } else {
              setError("Failed to load Facebook Portfolio data.");
            }
            setLoading(false);
            return;
          }
          const json = await res.json();
          setData(json);
        } catch (err: unknown) {
          setError(err instanceof Error ? (err instanceof Error ? err.message : String(err)) : "An unexpected error occurred.");
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [orgId]);

  const handleLinkNumber = async (wabaId: string, phoneNumberId: string) => {
    setLinking(phoneNumberId);
    try {
      const res = await fetch("/api/whatsapp/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, wabaId, phoneNumberId }),
      });
      if (res.ok) {
        // Optimistically update
        setData((prev) => prev ? { ...prev, activeWabaId: wabaId, activePhoneNumberId: phoneNumberId } : null);
        // Dispatch custom event to let Sidebar know it needs to refresh connection status
        // Not strictly necessary since they share orgId, but good practice if needed.
        window.location.reload();
      } else {
        alert("Failed to link phone number.");
      }
    } catch {
      alert("Network error.");
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar space-y-6 sm:space-y-8 animate-slide-up bg-[#fafaf9]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 uppercase">Settings</h2>
          <p className="text-stone-500 text-xs mt-1">Manage your workspace configuration and WhatsApp connection.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-none border border-stone-200 flex flex-col shadow-none max-w-3xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-stone-900" />
          Facebook Portfolio Management
        </h3>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3 bg-[#fafaf9] border border-stone-200">
            <Loader className="w-6 h-6 animate-spin text-stone-900" />
            <span className="text-xs text-stone-500 font-bold uppercase">Loading Portfolio...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-300 rounded-none text-stone-900 font-semibold text-xs">
            <AlertCircle className="w-5 h-5 text-stone-900 shrink-0" />
            <p>{error}</p>
          </div>
        ) : data && data.portfolios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-3 p-6 border border-dashed border-stone-300 rounded-none bg-stone-50">
            <p className="text-sm text-stone-900 text-center font-bold uppercase text-xs">No WhatsApp Business Accounts found.</p>
            <p className="text-xs text-stone-500 text-center max-w-md">Make sure your Facebook account has a configured WhatsApp Business Account (WABA). Ensure the app has been granted access to your businesses during login.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data?.portfolios.map((waba) => (
              <div key={waba.wabaId} className="border border-stone-200 rounded-none overflow-hidden bg-white shadow-none">
                <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-stone-900">{waba.name}</h4>
                    <p className="text-[10px] text-stone-500 mt-0.5">WABA ID: {waba.wabaId}</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {waba.phoneNumbers.length === 0 ? (
                    <p className="text-xs text-stone-500 italic">No phone numbers associated with this account.</p>
                  ) : (
                    waba.phoneNumbers.map((phone) => {
                      const isActive = data.activePhoneNumberId === phone.id;
                      return (
                        <div key={phone.id} className={`flex items-center justify-between p-3 rounded-none border transition-all duration-300 ${isActive ? "bg-stone-100 border-stone-300" : "bg-stone-50 border-stone-200 hover:border-stone-400"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-none flex items-center justify-center ${isActive ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"}`}>
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-stone-800">{phone.display_phone_number}</p>
                              <p className="text-[10px] text-stone-500 mt-0.5">Phone ID: {phone.id}</p>
                            </div>
                          </div>
                          <div>
                            {isActive ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-stone-950 text-white text-[10px] font-bold rounded-none uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                Linked
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLinkNumber(waba.wabaId, phone.id)}
                                disabled={linking !== null}
                                className="px-4 py-1.5 bg-stone-950 text-white text-[10px] uppercase tracking-wider font-bold rounded-none hover:bg-stone-900 border border-stone-950 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                              >
                                {linking === phone.id ? (
                                  <><Loader className="w-3 h-3 animate-spin" /> Linking...</>
                                ) : "Link Number"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
