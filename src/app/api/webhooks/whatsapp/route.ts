import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook, validateWebhookSignature, WhatsAppWebhookPayload } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { handleAutoResponder } from "@/lib/autoresponder";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const result = verifyWebhook(mode, token, challenge);

  if (result.verified) {
    return new NextResponse(result.challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256");
    const bodyText = await req.text();

    if (signature) {
      const isValid = validateWebhookSignature(signature, bodyText);
      if (!isValid) {
        console.warn("WhatsApp webhook: invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(bodyText);

    if (payload.object !== "whatsapp_business_account") {
      return NextResponse.json({ error: "Invalid webhook object" }, { status: 400 });
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        if (value.statuses) {
          for (const status of value.statuses) {
            console.log(`Message ${status.id} status: ${status.status}`);
          }
        }

        if (value.messages) {
          for (const msg of value.messages) {
            const waFrom = msg.from;
            const text = msg.text?.body || "";
            const timestamp = msg.timestamp;
            const profileName = value.contacts?.[0]?.profile?.name || `Customer ${waFrom.slice(-4)}`;

            console.log(`WhatsApp message from ${waFrom} (${profileName}): ${text}`);

            const org = await prisma.organization.findFirst({
              orderBy: { createdAt: "desc" },
            });

            if (!org) {
              console.warn("No organization found to store WhatsApp message");
              continue;
            }

            const phoneClean = waFrom.startsWith("+") ? waFrom : `+${waFrom}`;

            let contact = await prisma.contact.findFirst({
              where: {
                organizationId: org.id,
                phone: { contains: waFrom.slice(-10) },
              },
            });

            const d = new Date();
            const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

            if (contact) {
              contact = await prisma.contact.update({
                where: { id: contact.id },
                data: {
                  lastMessage: text,
                  lastMessageTime: timeStr,
                  unreadCount: { increment: 1 },
                },
              });
            } else {
              contact = await prisma.contact.create({
                data: {
                  name: profileName,
                  phone: phoneClean,
                  email: `${waFrom}@whatsapp.customer`,
                  source: "WhatsApp Inbound",
                  tags: ["WhatsApp", "Inbound"],
                  status: "Active",
                  lastMessage: text,
                  lastMessageTime: timeStr,
                  unreadCount: 1,
                  assignedAgent: "Bot",
                  organizationId: org.id,
                },
              });
            }

            await prisma.message.create({
              data: {
                sender: "user",
                text,
                timestamp: timeStr,
                contactId: contact.id,
                organizationId: org.id,
              },
            });

            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "chat",
                message: `WhatsApp from ${contact.name}: "${text.slice(0, 60)}"`,
                organizationId: org.id,
              },
            });

            if (contact.assignedAgent === "Bot") {
              // Trigger auto-responder asynchronously so webhook returns quickly
              handleAutoResponder(contact.id, org.id);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: any) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}