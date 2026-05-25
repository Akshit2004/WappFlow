import { prisma } from "./prisma";
import { getGroqChatCompletion } from "./groq";
import { sendWhatsAppMessage } from "./whatsapp";

// Helper: Extract valid JSON from LLM string output
function extractJsonFromString(str: string): any {
  try {
    // Strip markdown formatting if present
    const cleanStr = str.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanStr);
  } catch (err) {
    console.error("JSON Extraction failed from response:", str, err);
    // Find text between braces as fallback
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        console.error("Nested JSON parsing fallback also failed:", nestedErr);
      }
    }
    return null;
  }
}

// Structured CRM & Escalation Agent Analysis
async function analyzeConversationAgent(recentMessages: any[]): Promise<{
  purchaseIntent: boolean;
  budget: string | null;
  interests: string[] | null;
  frustrated: boolean;
  needsEscalation: boolean;
} | null> {
  try {
    const analysisPrompt = [
      {
        role: "system",
        content: `You are an expert CRM Data & Escalation Agent for WappFlow.
Analyze the latest customer message and overall chat history. Your task is to determine customer attributes and return a structured analysis.

Specifically:
1. purchaseIntent: (boolean) Does the customer show a strong, active intent to buy our service, subscribe, or place an order?
2. budget: (string or null) If the user mentions any budget limit, amount, or price constraints (e.g. "$500", "50k INR", "1000 dollars"), extract and format it cleanly as "budget:[amount]" (e.g. "budget:$500"). If not mentioned, return null.
3. interests: (string[] or null) Did they mention any specific integrations, systems, or product interests? Extract them as lowercase formatted values e.g., "interest:shopify", "interest:woocommerce", "interest:api". If not mentioned, return null.
4. frustrated: (boolean) Does the customer display high frustration, impatience, anger, negative sentiment, or specifically mock the assistant?
5. needsEscalation: (boolean) Is this a complex technical support query, complaint, refund request, or custom requirement that an automated customer sales bot cannot resolve?

You MUST return a valid JSON object matching this schema:
{
  "purchaseIntent": boolean,
  "budget": string | null,
  "interests": string[] | null,
  "frustrated": boolean,
  "needsEscalation": boolean
}
Do not include any explanation, code fences, or markdown wrapping. Return ONLY the raw JSON string.`
      },
      {
        role: "user",
        content: `Conversation Transcript:\n${recentMessages
          .map((m) => `${m.role === "assistant" ? "Bot" : "Customer"}: ${m.content}`)
          .join("\n")}`
      }
    ];

    const resultString = await getGroqChatCompletion(analysisPrompt);
    const parsed = extractJsonFromString(resultString);
    if (parsed) {
      return {
        purchaseIntent: !!parsed.purchaseIntent,
        budget: parsed.budget || null,
        interests: Array.isArray(parsed.interests) ? parsed.interests : null,
        frustrated: !!parsed.frustrated,
        needsEscalation: !!parsed.needsEscalation
      };
    }
    return null;
  } catch (err) {
    console.error("Error in analyzeConversationAgent:", err);
    return null;
  }
}

export async function handleAutoResponder(
  contactId: string,
  orgId: string
) {
  try {
    // 1. Fetch contact & org details
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: { organization: true },
    });

    if (!contact || contact.assignedAgent !== "Bot") {
      return;
    }

    const orgName = contact.organization.name;

    // 2. Fetch last 10 messages for conversation context
    const recentMessages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Reverse messages to chronological order
    recentMessages.reverse();

    // 3. Format messages for Groq API
    const botContextMessages = [
      {
        role: "system",
        content: `You are a helpful, professional AI customer assistant for the company: "${orgName}". 
Your goal is to answer customer queries over WhatsApp, help qualify leads, and provide information politely.
Keep your responses relatively brief, friendly, and formatted nicely for WhatsApp (you can use bullet points, bold text using *asterisks*, and emojis where appropriate).
If you do not know the answer, politely tell the customer that a human agent will get back to them shortly.`,
      },
      ...recentMessages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      })),
    ];

    // 4. Get response from Groq
    const botReplyText = await getGroqChatCompletion(botContextMessages);

    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    // 5. Save bot reply to PostgreSQL
    await prisma.message.create({
      data: {
        sender: "agent", // Store as agent so it shows in the live chat stream
        text: botReplyText,
        timestamp: timeStr,
        contactId,
        organizationId: orgId,
      },
    });

    // 6. Update contact last message
    await prisma.contact.update({
      where: { id: contactId },
      data: {
        lastMessage: botReplyText.length > 35 ? botReplyText.substring(0, 32) + "..." : botReplyText,
        lastMessageTime: timeStr,
      },
    });

    // 7. Update System Logs for active response
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "chat",
        message: `AI Bot replied to ${contact.name}: "${botReplyText.slice(0, 50)}"`,
        organizationId: orgId,
      },
    });

    // 8. Try sending message via real WhatsApp Meta API if configured
    const cleanPhone = contact.phone.replace(/[^0-9]/g, "");
    const result = await sendWhatsAppMessage({ to: cleanPhone, text: botReplyText });
    if (!result.ok) {
      console.warn("Auto-responder WhatsApp dispatch skipped/failed:", result.error);
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "chat",
          message: `AI Bot WhatsApp dispatch failed: ${result.error}`,
          organizationId: orgId,
        },
      });
    }

    // ==========================================
    // 9. AGENTIC CRM ANALYSIS & HUMAN ESCALATION
    // ==========================================
    // Re-package messages for the CRM analyzer agent
    const crmHistory = [
      ...recentMessages.map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text
      })),
      {
        role: "assistant" as const,
        content: botReplyText
      }
    ];

    console.log(`[Agentic CRM] Triggering background qualification audit for ${contact.name}...`);
    const analysis = await analyzeConversationAgent(crmHistory);

    if (analysis) {
      console.log(`[Agentic CRM] Audit results for ${contact.name}:`, analysis);

      // A. Self-Directed Tag updates
      let updatedTags = [...contact.tags];
      let tagChanged = false;

      if (analysis.purchaseIntent && !updatedTags.includes("Hot Prospect")) {
        updatedTags.push("Hot Prospect");
        tagChanged = true;
      }

      if (analysis.budget && !updatedTags.includes(analysis.budget)) {
        updatedTags.push(analysis.budget);
        tagChanged = true;
      }

      if (analysis.interests && Array.isArray(analysis.interests)) {
        analysis.interests.forEach((item: string) => {
          if (!updatedTags.includes(item)) {
            updatedTags.push(item);
            tagChanged = true;
          }
        });
      }

      if (tagChanged) {
        await prisma.contact.update({
          where: { id: contactId },
          data: { tags: updatedTags }
        });

        await prisma.systemLog.create({
          data: {
            timestamp: timeStr,
            type: "crm",
            message: `Autonomous CRM Agent updated tags for ${contact.name}: ${updatedTags.join(", ")}`,
            organizationId: orgId
          }
        });
      }

      // B. Autonomous human escalation
      if (analysis.frustrated || analysis.needsEscalation) {
        // Fetch first human agent in this workspace to escalate to
        const memberships = await prisma.membership.findMany({
          where: { organizationId: orgId },
          include: { user: true }
        });

        // Use the first team member's name, or fallback to Admin / Support Team
        const escalationAgent = memberships.length > 0 && memberships[0].user.name
          ? memberships[0].user.name
          : "Support Team";

        // Re-assign agent in DB
        await prisma.contact.update({
          where: { id: contactId },
          data: { assignedAgent: escalationAgent }
        });

        const reason = analysis.frustrated 
          ? "detected high customer frustration and negative sentiment" 
          : "a complex technical/unresolved support inquiry";

        // Log escalation event in System Logs
        await prisma.systemLog.create({
          data: {
            timestamp: timeStr,
            type: "crm",
            message: `[Escalation Alert] Lead ${contact.name} was autonomously re-assigned to agent '${escalationAgent}' due to ${reason}.`,
            organizationId: orgId
          }
        });

        // Insert a highly visual system message bubble inside CRM Chat!
        await prisma.message.create({
          data: {
            sender: "system",
            text: `[Autonomous Escalation: Chat re-assigned to human agent '${escalationAgent}' due to ${reason}]`,
            timestamp: timeStr,
            contactId,
            organizationId: orgId
          }
        });

        console.log(`[Agentic CRM] Autonomously escalated contact ${contact.name} to ${escalationAgent}.`);
      }
    }

  } catch (error: any) {
    console.error("Error in handleAutoResponder:", error);
    try {
      const d = new Date();
      const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "chat",
          message: `AI Bot Error: ${error.message || error}`,
          organizationId: orgId,
        },
      });
    } catch (logErr) {
      console.error("Failed to write error log to DB:", logErr);
    }
  }
}
