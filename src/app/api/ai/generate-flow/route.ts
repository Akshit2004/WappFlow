import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getGroqChatCompletion } from "@/lib/groq";

// Helper: Extract valid JSON from LLM string output
function extractJsonFromString(str: string): any {
  try {
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    const match = str.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("Nested array JSON parsing fallback failed:", nestedErr);
      }
    }
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { userPrompt } = await request.json();

    if (!userPrompt) {
      return NextResponse.json({ error: "Missing conversational prompt" }, { status: 400 });
    }

    const systemInstruction = `You are a visual AI Chatbot Architect for WappFlow.
Your task is to analyze the user's conversational description of a chatbot flow and compile it into a fully connected, valid array of WappFlow ChatbotNode JSON structures.

WappFlow ChatbotNode Specifications:
1. Node Types:
   - "trigger" (Initiates flow. Usually matches words like "inbound 'Hi'", "starts when user sends 'hi'". The first node ID must always be "n1").
   - "message" (A standard reply bubble. Contains text inside 'content'. Has 'nextId' pointing to next node).
   - "question" (Presents options. Contains prompt text in 'content'. Must have 'options' string array of quick replies e.g. ["Shopify", "WooCommerce"]. Must have 'routes' JSON object mapping option titles to target node IDs e.g. {"Shopify": "n4", "WooCommerce": "n5"}).
   - "delay" (Wait block. Has 'delayTime' integer field in seconds. Has 'nextId' pointing to next node).

2. Structural Rules:
   - The first node MUST start with id "n1" and type "trigger".
   - Assign unique IDs in sequence: "n1", "n2", "n3", "n4", etc.
   - All nodes must connect properly! If a node has a single outcome, set 'nextId' to the subsequent node ID. If it is a question node, set 'routes' keys mapping all quick replies options exactly to their target node IDs.
   - Keep flow length reasonable (usually 4 to 8 nodes).
   - Do not leave dead ends unless the flow naturally terminates.

You MUST return ONLY a raw JSON array matching this typescript interface:
Array<{
  id: string;
  type: "trigger" | "message" | "question" | "delay";
  title: string;
  content: string;
  options?: string[];
  delayTime?: number;
  nextId?: string;
  routes?: { [option: string]: string };
}>
Return ONLY the raw JSON string array. Do not include any explanations, markdown code blocks, or conversational warnings.`;

    const resultString = await getGroqChatCompletion([
      { role: "system", content: systemInstruction },
      { role: "user", content: `Conversational Prompt:\n"${userPrompt}"` }
    ]);

    const parsedNodes = extractJsonFromString(resultString);

    if (!parsedNodes || !Array.isArray(parsedNodes)) {
      return NextResponse.json({ 
        error: "AI failed to generate a valid connected nodes schema. Please try a different conversational prompt." 
      }, { status: 422 });
    }

    return NextResponse.json({ nodes: parsedNodes });
  } catch (err: any) {
    console.error("AI Flow Generator error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
