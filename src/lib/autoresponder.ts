import { prisma } from "./prisma";
import { getGroqChatCompletion } from "./groq";
import { sendWhatsAppMessage } from "./whatsapp";

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
    const messages = [
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
    const botReplyText = await getGroqChatCompletion(messages);

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

    // 7. Update System Logs
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
