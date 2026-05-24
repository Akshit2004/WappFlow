import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, text, contactId, orgId } = await req.json();

    if (!to || !text || !contactId || !orgId) {
      return NextResponse.json({ error: "Missing required fields: to, text, contactId, orgId" }, { status: 400 });
    }

    const formattedPhone = formatPhoneNumber(to);
    
    // Save to local PostgreSQL database first so it never gets removed!
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const dbMsg = await prisma.message.create({
      data: {
        sender: "agent",
        text,
        timestamp: timeStr,
        contactId,
        organizationId: orgId
      }
    });

    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });

    const agentName = session.user?.name || "Agent";

    if (contact && contact.assignedAgent === "Bot") {
      // Human agent takeover
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          assignedAgent: agentName,
          lastMessage: text.length > 35 ? text.substring(0, 32) + "..." : text,
          lastMessageTime: timeStr
        }
      });

      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "crm",
          message: `Agent ${agentName} took over conversation from AI Bot for contact ${contact.name}`,
          organizationId: orgId
        }
      });
    } else {
      // Standard update last message in PostgreSQL
      await prisma.contact.update({
        where: { id: contactId },
        data: {
          lastMessage: text.length > 35 ? text.substring(0, 32) + "..." : text,
          lastMessageTime: timeStr
        }
      });
    }

    // Dispatch real message via Meta API if credentials are set
    const result = await sendWhatsAppMessage({ to: formattedPhone, text });

    if (!result.ok) {
      console.warn("WhatsApp dispatch skipped/failed:", result.error);
      
      // Still return success for PostgreSQL sandbox so the user can test live chat!
      await prisma.systemLog.create({
        data: {
          timestamp: timeStr,
          type: "chat",
          message: `Agent sent sandbox message: "${text.slice(0, 45)}" (Meta: ${result.error})`,
          organizationId: orgId
        }
      });

      return NextResponse.json({
        status: "sandbox_sent",
        message: dbMsg,
        metaStatus: "skipped",
        metaError: result.error
      });
    }

    console.log("WhatsApp message sent via Meta:", result.data?.messages?.[0]?.id);

    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "chat",
        message: `Agent sent WhatsApp message: "${text.slice(0, 50)}"`,
        organizationId: orgId
      }
    });

    return NextResponse.json({
      status: "sent",
      message: dbMsg,
      waMessageId: result.data?.messages?.[0]?.id || null,
    });
  } catch (err: any) {
    console.error("WhatsApp send API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}