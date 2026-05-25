"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useApp, ChatbotNode } from "../context/AppContext";
import {
  Play,
  MessageSquare,
  HelpCircle,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Cpu,
  CornerDownRight,
  Save,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Info
} from "lucide-react";

export const ChatbotTab: React.FC = () => {
  const { chatbotNodes, updateChatbotNodes, addSystemLog, lockSync, unlockSync } = useApp();
  const params = useParams();
  const orgId = params.orgId as string;

  // Local nodes list so visual cards react instantly as the user types
  const [localNodes, setLocalNodes] = useState<ChatbotNode[]>([]);
  const [positions, setPositions] = useState<{ [id: string]: { x: number; y: number } }>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);

  // Figma/Miro style panning states
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging states for cards
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Inspector form states (local copy of selected node to avoid laggy typing)
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formDelayTime, setFormDelayTime] = useState<number>(5);
  const [formOptions, setFormOptions] = useState<string[]>([]);
  const [formRoutes, setFormRoutes] = useState<{ [option: string]: string }>({});
  const [formNextId, setFormNextId] = useState<string>("");

  // Lock database sync on mount to prevent the 5-second polling interval from overwriting visual edits!
  useEffect(() => {
    lockSync();
    return () => {
      unlockSync();
    };
  }, [lockSync, unlockSync]);

  // Synchronize localNodes with database nodes when they first load
  useEffect(() => {
    if (chatbotNodes.length > 0 && localNodes.length === 0) {
      setLocalNodes(chatbotNodes);
    }
  }, [chatbotNodes, localNodes]);

  // Global window listeners for Spacebar traversal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not block spacebar when user is actively typing in a form input, textarea, or select element!
      if (
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("select") ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Loading screen messages for AI Flow architect
  const loadingMessages = [
    "Contacting Groq Llama 3.1 Architect...",
    "Drafting conversational routing logic...",
    "Injecting system trigger nodes...",
    "Structuring branching question choices...",
    "Applying delay timers & campaign templates...",
    "Linking SVG flow curves...",
    "Finalizing database sandbox layout..."
  ];

  // Rotate loading messages when AI is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAiLoading) {
      setLoadingMessageIdx(0);
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isAiLoading]);

  // AI Prompt templates
  const promptTemplates = [
    {
      title: "Lead Gen & Tagging",
      prompt: "Make a lead gen bot. Starts with inbound 'Hi', sends message asking if they want Shopify or WooCommerce. Tag Shopify interest and ask for budget, wait 5s then send discount."
    },
    {
      title: "Support Triage",
      prompt: "Create a customer support router. Ask if they need Billing, Sales or Tech Support. If Tech Support, trigger bot-to-agent escalation. If Billing, wait 3s and provide invoice link."
    },
    {
      title: "Product Recommendation",
      prompt: "Create a bot that asks if they want Shoes or Apparel. If Shoes, ask size. If size is large, recommend sports sneakers. If Apparel, wait 2s and offer 15% discount."
    }
  ];

  // BFS / Layer-based Auto-Layout Algorithm
  const handleAutoLayout = (nodes: ChatbotNode[] = localNodes) => {
    if (nodes.length === 0) return;

    const newPositions: { [id: string]: { x: number; y: number } } = {};
    const adj: { [id: string]: string[] } = {};
    const parentCount: { [id: string]: number } = {};

    nodes.forEach((n) => {
      adj[n.id] = [];
      parentCount[n.id] = 0;
    });

    nodes.forEach((n) => {
      if (n.type === "question" && n.routes) {
        Object.values(n.routes).forEach((targetId) => {
          if (targetId && nodes.some((x) => x.id === targetId)) {
            adj[n.id].push(targetId);
            parentCount[targetId] = (parentCount[targetId] || 0) + 1;
          }
        });
      } else if (n.nextId && nodes.some((x) => x.id === n.nextId)) {
        adj[n.id].push(n.nextId);
        parentCount[n.nextId] = (parentCount[n.nextId] || 0) + 1;
      }
    });

    const queue: { id: string; depth: number }[] = [];
    const visited = new Set<string>();

    // Start from trigger node 'n1', or any node with 0 parents
    const roots = nodes.filter((n) => n.id === "n1" || parentCount[n.id] === 0);
    roots.forEach((r) => {
      queue.push({ id: r.id, depth: 0 });
      visited.add(r.id);
    });

    if (queue.length === 0 && nodes.length > 0) {
      queue.push({ id: nodes[0].id, depth: 0 });
      visited.add(nodes[0].id);
    }

    const layers: { [depth: number]: string[] } = {};
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (!layers[depth]) layers[depth] = [];
      layers[depth].push(id);

      const children = adj[id] || [];
      children.forEach((c) => {
        if (!visited.has(c)) {
          visited.add(c);
          queue.push({ id: c, depth: depth + 1 });
        }
      });
    }

    // Centered auto coordinate assignment
    Object.keys(layers).forEach((depthStr) => {
      const depth = parseInt(depthStr);
      const levelNodes = layers[depth];
      const spacingX = 320;
      const totalWidth = levelNodes.length * spacingX;
      const startX = 400 - totalWidth / 2;

      levelNodes.forEach((nodeId, idx) => {
        newPositions[nodeId] = {
          x: startX + idx * spacingX + 200,
          y: depth * 240 + 80
        };
      });
    });

    // Handle disconnected nodes gracefully
    let disconnectedCount = 0;
    nodes.forEach((n) => {
      if (!newPositions[n.id]) {
        newPositions[n.id] = {
          x: 150 + (disconnectedCount % 3) * 320,
          y: 700 + Math.floor(disconnectedCount / 3) * 240
        };
        disconnectedCount++;
      }
    });

    setPositions(newPositions);
    addSystemLog("crm", "Recalculated clean visual canvas coordinates successfully.");
  };

  // Sync positions when localNodes are first populated
  useEffect(() => {
    if (localNodes.length > 0 && Object.keys(positions).length === 0) {
      handleAutoLayout(localNodes);
      // Auto select the first trigger
      const trigger = localNodes.find(n => n.id === "n1") || localNodes[0];
      if (trigger) {
        setSelectedNodeId(trigger.id);
      }
    }
  }, [localNodes]);

  // Handle local form inputs when selected node changes (only triggers on selectedNodeId change!)
  useEffect(() => {
    if (selectedNodeId) {
      const node = localNodes.find((n) => n.id === selectedNodeId);
      if (node) {
        setFormTitle(node.title || "");
        setFormContent(node.content || "");
        setFormDelayTime(node.delayTime || 5);
        setFormOptions(node.options || []);
        setFormRoutes(node.routes || {});
        setFormNextId(node.nextId || "");
      }
    } else {
      setFormTitle("");
      setFormContent("");
      setFormDelayTime(5);
      setFormOptions([]);
      setFormRoutes({});
      setFormNextId("");
    }
  }, [selectedNodeId]);

  // Canvas Mouse Event Drag/Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If user holding space, engage canvas traversal pan!
    if (isSpacePressed) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      });
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (isSpacePressed) {
      // If Spacebar is pressed, card interaction maps to canvas panning instead of card drag!
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      });
      return;
    }

    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select")
    ) {
      return;
    }
    e.preventDefault();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);

    const pos = positions[nodeId] || { x: 100, y: 100 };
    setDragOffset({
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newX = e.clientX - panStart.x;
      const newY = e.clientY - panStart.y;
      setPan({ x: newX, y: newY });
      return;
    }

    if (!draggingNodeId) return;
    const newX = Math.max(20, Math.min(1800, e.clientX - dragOffset.x));
    const newY = Math.max(20, Math.min(1800, e.clientY - dragOffset.y));

    setPositions((prev) => ({
      ...prev,
      [draggingNodeId]: { x: newX, y: newY }
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Helper to instantly update a node's visual fields locally as the user types
  const updateLocalNodeField = (nodeId: string, updates: Partial<ChatbotNode>) => {
    setLocalNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return { ...n, ...updates };
        }
        return n;
      })
    );
  };

  // Save entire Visual Flow layout to PostgreSQL
  const handleSaveAllFlow = async () => {
    setIsSaving(true);
    try {
      await updateChatbotNodes(localNodes, orgId);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to save Visual Flow changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Input Change Handlers that trigger instant visual updates
  const handleTitleChange = (val: string) => {
    setFormTitle(val);
    updateLocalNodeField(selectedNodeId!, { title: val });
  };

  const handleContentChange = (val: string) => {
    setFormContent(val);
    updateLocalNodeField(selectedNodeId!, { content: val });
  };

  const handleDelayTimeChange = (seconds: number) => {
    setFormDelayTime(seconds);
    updateLocalNodeField(selectedNodeId!, { delayTime: seconds });
  };

  const handleNextIdChange = (targetId: string) => {
    setFormNextId(targetId);
    updateLocalNodeField(selectedNodeId!, { nextId: targetId || undefined });
  };

  const handleAddNode = (type: "message" | "question" | "delay") => {
    // Generate sequential ID
    let maxNum = 1;
    localNodes.forEach((n) => {
      const match = n.id.match(/^n(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    });
    const newId = `n${maxNum + 1}`;

    const defaultNode: ChatbotNode = {
      id: newId,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: type === "delay" ? "Wait node" : `This is a new ${type} message.`,
      options: type === "question" ? ["Yes", "No"] : undefined,
      delayTime: type === "delay" ? 5 : undefined,
      nextId: undefined,
      routes: type === "question" ? { "Yes": "", "No": "" } : undefined
    };

    // Space node on the canvas near the last placed node
    const lastNode = localNodes[localNodes.length - 1];
    const lastPos = lastNode ? positions[lastNode.id] : { x: 300, y: 150 };
    setPositions((prev) => ({
      ...prev,
      [newId]: { x: lastPos.x, y: lastPos.y + 180 }
    }));

    const updated = [...localNodes, defaultNode];
    setLocalNodes(updated);
    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === "n1") {
      alert("The entry trigger node (n1) cannot be deleted as it registers the incoming hook.");
      return;
    }

    // Filter node list
    let updated = localNodes.filter((n) => n.id !== nodeId);

    // Clean up references to this node in nextIds or option routes
    updated = updated.map((n) => {
      const copy = { ...n };
      if (copy.nextId === nodeId) {
        delete copy.nextId;
      }
      if (copy.routes) {
        const freshRoutes = { ...copy.routes };
        Object.keys(freshRoutes).forEach((opt) => {
          if (freshRoutes[opt] === nodeId) {
            freshRoutes[opt] = "";
          }
        });
        copy.routes = freshRoutes;
      }
      return copy;
    });

    setLocalNodes(updated);
    setSelectedNodeId(null);

    // Clean position
    setPositions((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  };

  // AI Architect flow generation call
  const handleGenerateAiFlow = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch("/api/ai/generate-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: aiPrompt })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse conversational flow.");
      }

      const data = await response.json();
      if (data.nodes && Array.isArray(data.nodes)) {
        // Update local state instantly
        setLocalNodes(data.nodes);
        handleAutoLayout(data.nodes);

        // Select the first trigger
        const first = data.nodes.find((n: any) => n.id === "n1") || data.nodes[0];
        if (first) {
          setSelectedNodeId(first.id);
        }

        // Save immediately for AI generated flows
        await updateChatbotNodes(data.nodes, orgId);
        setAiPrompt("");
        addSystemLog("crm", `Autonomous Groq Flow Architect compiled and wired ${data.nodes.length} nodes from user prompt.`);
      } else {
        throw new Error("Invalid node schema payload.");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "An unexpected compile error occurred.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Option actions inside Question node editor
  const handleAddOption = () => {
    const freshOptName = `Option ${formOptions.length + 1}`;
    const newOpts = [...formOptions, freshOptName];
    setFormOptions(newOpts);
    
    const newRts = { ...formRoutes, [freshOptName]: "" };
    setFormRoutes(newRts);

    updateLocalNodeField(selectedNodeId!, {
      options: newOpts,
      routes: newRts
    });
  };

  const handleUpdateOptionText = (idx: number, newVal: string) => {
    const oldVal = formOptions[idx];
    const newOpts = [...formOptions];
    newOpts[idx] = newVal;

    const newRts = { ...formRoutes };
    const mappedNodeId = newRts[oldVal] || "";
    delete newRts[oldVal];
    newRts[newVal] = mappedNodeId;

    setFormOptions(newOpts);
    setFormRoutes(newRts);

    updateLocalNodeField(selectedNodeId!, {
      options: newOpts,
      routes: newRts
    });
  };

  const handleRemoveOption = (idx: number) => {
    const oldVal = formOptions[idx];
    const newOpts = formOptions.filter((_, i) => i !== idx);
    const newRts = { ...formRoutes };
    delete newRts[oldVal];

    setFormOptions(newOpts);
    setFormRoutes(newRts);

    updateLocalNodeField(selectedNodeId!, {
      options: newOpts,
      routes: newRts
    });
  };

  const handleUpdateOptionTarget = (optionName: string, targetId: string) => {
    const newRts = {
      ...formRoutes,
      [optionName]: targetId
    };
    setFormRoutes(newRts);
    updateLocalNodeField(selectedNodeId!, { routes: newRts });
  };

  // Bezier curve layout helper
  const drawBezierCurve = (x1: number, y1: number, x2: number, y2: number) => {
    const deltaY = y2 - y1;
    const cpY = Math.max(60, Math.abs(deltaY) * 0.5);
    return `M ${x1} ${y1} C ${x1} ${y1 + cpY}, ${x2} ${y2 - cpY}, ${x2} ${y2}`;
  };

  // Traversal Grab cursor mapping
  const getCanvasCursor = () => {
    if (isPanning) return "grabbing";
    if (isSpacePressed) return "grab";
    if (draggingNodeId) return "grabbing";
    return "default";
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative select-none">
      {/* AI Generating Loading Overlay */}
      {isAiLoading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white border border-slate-100 rounded-3xl p-8 max-w-sm shadow-2xl flex flex-col items-center text-center space-y-5 animate-pulse-soft">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center animate-spin">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-slate-800 text-sm tracking-wide">Flow Architect compiling...</h3>
              <p className="text-[11px] text-orange-600 font-semibold font-mono tracking-wider uppercase min-h-[16px]">
                {loadingMessages[loadingMessageIdx]}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1">
              <div
                className="bg-orange-50 h-1 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((loadingMessageIdx + 1) / loadingMessages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Header Tab Panel Actions */}
      <header className="h-16 border-b border-orange-100 bg-white px-6 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-600/10">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-slate-800">Visual Bot Builder</h1>
            <p className="text-[10px] text-slate-400">Architect conversational routing with visual nodes and Groq LLMs</p>
          </div>
        </div>

        {/* Sync & Layout Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAutoLayout()}
            className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 bg-white px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-sm"
            title="Clean canvas alignment"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clean Alignment</span>
          </button>

          <button
            onClick={handleSaveAllFlow}
            disabled={isSaving}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-md select-none ${
              saveSuccess
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10"
                : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/10 active:scale-95"
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : saveSuccess ? "Saved Flow!" : "Save & Publish"}</span>
          </button>
        </div>
      </header>

      {/* Left Canvas vs Right Inspector Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT CANVAS WORKSPACE */}
        <div
          className="flex-1 overflow-hidden bg-slate-50 relative border-r border-slate-100"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          style={{ cursor: getCanvasCursor() }}
        >
          {/* Zoom Overlay Control buttons */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button
              onClick={() => setZoom((prev) => Math.min(1.5, prev + 0.1))}
              className="w-9 h-9 border border-slate-200 hover:border-slate-300 bg-white rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((prev) => Math.max(0.6, prev - 0.1))}
              className="w-9 h-9 border border-slate-200 hover:border-slate-300 bg-white rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                handleAutoLayout();
              }}
              className="w-9 h-9 border border-slate-200 hover:border-slate-300 bg-white rounded-xl shadow-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-all"
              title="Reset Zoom & Pan"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Friendly Traversal Tips Helper */}
          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/80 border border-slate-200 rounded-xl text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur-sm pointer-events-none select-none">
            <span className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded text-[8px] font-mono text-slate-700">SPACE + DRAG</span>
            <span>to traverse canvas pan</span>
          </div>

          {/* Quick Node Add Toolbar Overlay */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <button
              onClick={() => handleAddNode("message")}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-blue-500" />
              <span>Add Message</span>
            </button>
            <button
              onClick={() => handleAddNode("question")}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-pink-500" />
              <span>Add Question</span>
            </button>
            <button
              onClick={() => handleAddNode("delay")}
              className="flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Add Delay</span>
            </button>
          </div>

          {/* Canvas Blueprint Grid */}
          <div
            className="w-[2000px] h-[2000px] bg-slate-50 absolute"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0"
            }}
          >
            {/* SVG Connecting Flowlines Behind Nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#94a3b8" />
                </marker>
              </defs>

              {localNodes.map((node) => {
                const startPos = positions[node.id];
                if (!startPos) return null;

                const cardWidth = 260;
                const cardHeight = 160;

                // Message & Delay & Trigger connections
                if (node.type !== "question" && node.nextId) {
                  const endPos = positions[node.nextId];
                  if (endPos) {
                    const x1 = startPos.x + cardWidth / 2;
                    const y1 = startPos.y + cardHeight;
                    const x2 = endPos.x + cardWidth / 2;
                    const y2 = endPos.y;

                    let strokeColor = "#94a3b8";
                    if (node.type === "trigger") strokeColor = "#f97316";
                    if (node.type === "message") strokeColor = "#3b82f6";
                    if (node.type === "delay") strokeColor = "#f59e0b";

                    return (
                      <g key={`${node.id}-to-${node.nextId}`}>
                        <path
                          d={drawBezierCurve(x1, y1, x2, y2)}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="2.5"
                          strokeDasharray="5 5"
                          className="animate-dash"
                          style={{
                            strokeDashoffset: 100,
                            animation: "dash 4s linear infinite"
                          }}
                          markerEnd="url(#arrow)"
                        />
                      </g>
                    );
                  }
                }

                // Question multiple option path curves
                if (node.type === "question" && node.options && node.routes) {
                  const opts = node.options;
                  const totalOpts = opts.length;

                  return opts.map((opt, idx) => {
                    const targetId = node.routes?.[opt];
                    if (!targetId) return null;

                    const endPos = positions[targetId];
                    if (endPos) {
                      // Space output points horizontally across bottom of question card
                      const spacingX = totalOpts > 1 ? (cardWidth - 60) / (totalOpts - 1) : 0;
                      const startOffset = totalOpts > 1 ? 30 : cardWidth / 2;
                      
                      const x1 = startPos.x + startOffset + idx * spacingX;
                      const y1 = startPos.y + cardHeight;
                      const x2 = endPos.x + cardWidth / 2;
                      const y2 = endPos.y;

                      return (
                        <g key={`${node.id}-${opt}-to-${targetId}`}>
                          <path
                            d={drawBezierCurve(x1, y1, x2, y2)}
                            fill="none"
                            stroke="#ec4899"
                            strokeWidth="2.5"
                            strokeDasharray="5 5"
                            className="animate-dash"
                            style={{
                              strokeDashoffset: 100,
                              animation: "dash 4s linear infinite"
                            }}
                            markerEnd="url(#arrow)"
                          />
                        </g>
                      );
                    }
                    return null;
                  });
                }

                return null;
              })}
            </svg>

            {/* Render Node Cards */}
            {localNodes.map((node) => {
              const pos = positions[node.id] || { x: 100, y: 150 };
              const isSelected = selectedNodeId === node.id;

              // Choose color & icon styles
              let themeColor = "border-blue-200 bg-blue-50/10 text-blue-700 ring-blue-500/10";
              let badgeColor = "bg-blue-50 text-blue-700 border-blue-200/50";
              let NodeIcon = MessageSquare;

              if (node.type === "trigger") {
                themeColor = "border-orange-200 bg-orange-50/10 text-orange-700 ring-orange-500/10";
                badgeColor = "bg-orange-50 text-orange-700 border-orange-200/50";
                NodeIcon = Play;
              } else if (node.type === "question") {
                themeColor = "border-pink-200 bg-pink-50/10 text-pink-700 ring-pink-500/10";
                badgeColor = "bg-pink-50 text-pink-700 border-pink-200/50";
                NodeIcon = HelpCircle;
              } else if (node.type === "delay") {
                themeColor = "border-amber-200 bg-amber-50/10 text-amber-700 ring-amber-500/10";
                badgeColor = "bg-amber-50 text-amber-700 border-amber-200/50";
                NodeIcon = Clock;
              }

              return (
                <div
                  key={node.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    width: 260,
                    height: 160,
                    zIndex: isSelected ? 30 : 10
                  }}
                  className={`backdrop-blur-md rounded-2xl p-4 cursor-grab active:cursor-grabbing border-2 flex flex-col justify-between transition-all select-none shadow-sm ${
                    isSelected
                      ? "border-orange-500 bg-white ring-4 ring-orange-500/10 shadow-lg shadow-orange-500/5 scale-[1.02]"
                      : "border-slate-200/80 bg-white/90 hover:border-slate-300 hover:shadow-md"
                  }`}
                >
                  {/* Top Input Connection Port */}
                  <div className="absolute -top-1.5 left-[125px] w-3.5 h-3.5 bg-slate-100 rounded-full border border-slate-300 shadow-inner flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  </div>

                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`p-1 rounded-lg border ${badgeColor}`}>
                        <NodeIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wide font-mono text-slate-500">
                        {node.id}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${badgeColor}`}>
                      {node.type}
                    </span>
                  </div>

                  {/* Card Main Body */}
                  <div className="flex-1 flex flex-col justify-center my-2 text-left">
                    <h4 className="font-extrabold text-[12px] text-slate-800 line-clamp-1 mb-0.5">
                      {node.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                      {node.type === "delay" ? `Delay: ${node.delayTime}s` : node.content}
                    </p>
                  </div>

                  {/* Option Pills visual rendering */}
                  {node.type === "question" && node.options && (
                    <div className="flex gap-1 overflow-hidden shrink-0 mt-1 pb-1">
                      {node.options.slice(0, 3).map((opt) => (
                        <span
                          key={opt}
                          className="text-[8px] font-extrabold bg-slate-50 text-slate-500 border border-slate-200/60 px-1.5 py-0.5 rounded-md truncate max-w-[70px]"
                        >
                          {opt}
                        </span>
                      ))}
                      {node.options.length > 3 && (
                        <span className="text-[8px] font-bold bg-pink-50 text-pink-600 px-1 py-0.5 rounded-md">
                          +{node.options.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Output Port(s) Bottom Visual */}
                  <div className="absolute -bottom-1.5 left-0 right-0 flex justify-center">
                    {node.type === "question" && node.options ? (
                      <div className="flex justify-between w-full px-[30px]">
                        {node.options.map((_, oIdx) => (
                          <div
                            key={oIdx}
                            className="w-3 h-3 bg-pink-100 rounded-full border border-pink-300 shadow-inner flex items-center justify-center"
                          >
                            <span className="w-1 h-1 rounded-full bg-pink-500" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="w-3 h-3 bg-slate-100 rounded-full border border-slate-300 shadow-inner flex items-center justify-center">
                        <span className="w-1 h-1 rounded-full bg-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANEL INSPECTOR & AI CONVERSATIONAL FLOW ARCHITECT */}
        <aside className="w-[380px] shrink-0 border-l border-slate-100 bg-white flex flex-col justify-between select-text overflow-hidden h-full">
          {/* Top Form Edit Inspector Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {selectedNodeId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold font-mono text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                      {selectedNodeId}
                    </span>
                    <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                      Edit Node Attributes
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDeleteNode(selectedNodeId)}
                    disabled={selectedNodeId === "n1"}
                    className={`p-1.5 rounded-lg border text-red-500 transition-all cursor-pointer ${
                      selectedNodeId === "n1"
                        ? "opacity-30 cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                        : "border-red-100 hover:border-red-200 hover:bg-red-50"
                    }`}
                    title="Delete step"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Node Title input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    Step Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-semibold text-slate-700"
                  />
                </div>

                {/* Node Content body textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    {selectedNodeId === "n1" ? "Trigger Hook Phrase" : "Message Body"}
                  </label>
                  <textarea
                    rows={4}
                    value={formContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={selectedNodeId === "n1" ? "e.g., inbound 'Hi' or 'Start'" : "Write message content here..."}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-xs font-semibold text-slate-600 leading-relaxed resize-none"
                  />
                </div>

                {/* Specific field for Delay Node */}
                {localNodes.find((n) => n.id === selectedNodeId)?.type === "delay" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Wait Time (Seconds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={900}
                      value={formDelayTime}
                      onChange={(e) => handleDelayTimeChange(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm font-semibold text-slate-700 font-mono"
                    />
                  </div>
                )}

                {/* Question Option builder */}
                {localNodes.find((n) => n.id === selectedNodeId)?.type === "question" && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Quick Reply Options & Routes
                      </label>
                      <button
                        onClick={handleAddOption}
                        className="flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:text-pink-700 bg-pink-50 border border-pink-100 hover:border-pink-200 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formOptions.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-3 space-y-2"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOptionText(oIdx, e.target.value)}
                              className="flex-1 border border-slate-200 rounded-xl px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-xs font-semibold text-slate-600"
                            />
                            <button
                              onClick={() => handleRemoveOption(oIdx)}
                              className="p-1.5 border border-red-100 hover:border-red-200 text-red-500 rounded-xl hover:bg-red-50 cursor-pointer transition-all shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-500">
                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
                              Route Target:
                            </span>
                            <select
                              value={formRoutes[opt] || ""}
                              onChange={(e) => handleUpdateOptionTarget(opt, e.target.value)}
                              className="flex-1 border border-slate-200 rounded-xl px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 text-[10px] font-semibold text-slate-600"
                            >
                              <option value="">-- Terminate Flow --</option>
                              {localNodes
                                .filter((n) => n.id !== selectedNodeId)
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.id} ({n.title})
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-Question next destination routes */}
                {localNodes.find((n) => n.id === selectedNodeId)?.type !== "question" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                      Destination Step (nextId)
                    </label>
                    <select
                      value={formNextId}
                      onChange={(e) => handleNextIdChange(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-xs font-semibold text-slate-600"
                    >
                      <option value="">-- Terminate Flow --</option>
                      {localNodes
                        .filter((n) => n.id !== selectedNodeId)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.id} ({n.title})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Friendly hint explaining the visual auto-apply flow */}
                <div className="flex items-start gap-2 bg-amber-50/80 border border-orange-200/40 rounded-2xl p-3.5 text-[10px] text-amber-800 leading-relaxed font-semibold">
                  <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>💡 Edits apply to the visual canvas instantly. Click "Save & Publish" at the top header toolbar when you're ready to persist your full conversational tree to WappFlow's PostgreSQL sandbox.</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-slate-200 rounded-3xl space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                  <Info className="w-6 h-6 animate-pulse-soft" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-700">No Step Selected</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-[220px]">
                    Click on any visual card in the blueprint canvas to inspect and configure its conversational routing properties.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Conversational AI Architect prompt box */}
          <div className="p-5 bg-gradient-to-b from-orange-50/20 to-amber-50/20 border-t border-orange-100/60 space-y-4 select-text">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-100 border border-orange-200 text-orange-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs tracking-tight text-slate-800">AI Flow Architect</h3>
                <p className="text-[9px] text-slate-400 font-mono">Powered by Groq & Llama 3.1</p>
              </div>
            </div>

            {/* Error alerts */}
            {aiError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-2.5 text-[10px] text-red-600 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="space-y-2">
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe your branching routing goals... e.g., 'Make an onboarding tree asking for their language, wait 5s...'"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-xs font-semibold text-slate-600 leading-relaxed resize-none"
              />

              {/* Quick Template Prompt chips */}
              <div className="flex flex-wrap gap-1">
                {promptTemplates.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiPrompt(item.prompt);
                      setAiError(null);
                    }}
                    className="text-[8px] font-extrabold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-100 hover:border-orange-200 rounded-lg px-2 py-1 cursor-pointer transition-all"
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateAiFlow}
                disabled={!aiPrompt.trim()}
                className={`w-full font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                  aiPrompt.trim()
                    ? "bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-600/10 hover:shadow-lg hover:shadow-orange-600/20 active:scale-95"
                    : "bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed shadow-none"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Architect Routing Flow</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
        .animate-dash {
          stroke-dasharray: 6, 6;
          animation: dash 5s linear infinite;
        }
      `}</style>
    </div>
  );
};
