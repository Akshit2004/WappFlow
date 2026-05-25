import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      name, 
      targetTag, 
      templateName, 
      organizationId,
      variables = [], // Array<{ key: string; type: 'contact_field' | 'static'; value: string }>
      delay = 1,      // Message spacing delay in seconds
      scheduledAt     // Optional Date-time string for future scheduling
    } = await request.json();

    if (!name || !targetTag || !templateName || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get matching contacts in DB
    const contacts = await prisma.contact.findMany({
      where: {
        organizationId,
        tags: { has: targetTag }
      }
    });

    const recipientCount = contacts.length;
    const isScheduled = !!scheduledAt;

    // Create the campaign in DB
    // If scheduled, initial status is "Scheduled" and date stores the scheduled timestamp
    // If immediate, initial status is "Sending"
    const campaign = await prisma.campaign.create({
      data: {
        name,
        targetTag,
        templateName,
        sent: recipientCount,
        delivered: 0,
        read: 0,
        clicked: 0,
        status: isScheduled ? "Scheduled" : "Sending",
        date: isScheduled 
          ? new Date(scheduledAt).toLocaleString() 
          : new Date().toISOString().split("T")[0],
        organizationId
      }
    });

    // Fire off asynchronous background campaign worker!
    // This allows WappFlow to instantly return the created campaign to the frontend UI
    (async () => {
      try {
        const timeHelper = () => {
          const d = new Date();
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        };

        // Sandbox Simulation: If scheduled, sleep for 8 seconds to demonstrate transition from Scheduled -> Sending
        if (isScheduled) {
          console.log(`[Campaign Scheduler] Campaign ${campaign.id} is scheduled for ${scheduledAt}. Simulating scheduling wait...`);
          await new Promise((resolve) => setTimeout(resolve, 8000));
          
          // Update status to Sending
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { 
              status: "Sending",
              date: new Date().toISOString().split("T")[0] // set to actual run date
            }
          });
          
          await prisma.systemLog.create({
            data: {
              timestamp: timeHelper(),
              type: "campaign",
              message: `Scheduled broadcast '${name}' has commenced sending.`,
              organizationId
            }
          });
        }

        let deliveredCount = 0;

        // Process message sending sequentially with user-defined delay
        for (const contact of contacts) {
          const phone = formatPhoneNumber(contact.phone);
          console.log(`[Broadcast Engine] Sending template message to ${phone}`);

          // Formulate parameters dynamically
          const parameters = variables.map((v: any) => {
            if (v.type === "contact_field") {
              if (v.value === "name") return { type: "text", text: contact.name };
              if (v.value === "email") return { type: "text", text: contact.email };
              if (v.value === "phone") return { type: "text", text: contact.phone };
            }
            return { type: "text", text: v.value || "" };
          });

          // Meta-compliant template payload
          const templatePayload: any = {
            name: templateName,
            language: { code: "en_US" }
          };

          if (parameters.length > 0) {
            templatePayload.components = [
              {
                type: "body",
                parameters: parameters
              }
            ];
          }

          const result = await sendWhatsAppMessage({
            to: phone,
            template: templatePayload
          });

          const timeStr = timeHelper();

          if (!result.ok) {
            console.error(`Failed to send campaign message to ${phone}:`, result.error);
            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Broadcast delivery failed to ${contact.name} (${phone}): ${result.error}`,
                organizationId
              }
            });
          } else {
            console.log(`Successfully sent template to ${phone}`);
            deliveredCount++;

            // Create a successful log in system logs
            await prisma.systemLog.create({
              data: {
                timestamp: timeStr,
                type: "campaign",
                message: `Broadcast successfully sent to ${contact.name} (${phone})`,
                organizationId
              }
            });

            // Reconstruct text body with parameter values for the Inbox/CRM preview
            let previewText = `[Template Message: ${templateName}]`;
            if (parameters.length > 0) {
              previewText = `[Template: ${templateName}] | Params: ${parameters.map((p: any) => p.text).join(", ")}`;
            }

            // Add a message bubble in their chat history so they can see it in CRM inbox!
            await prisma.message.create({
              data: {
                sender: "agent",
                text: previewText,
                timestamp: timeStr,
                contactId: contact.id,
                organizationId
              }
            });
          }

          // Update metrics progressively after each recipient
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
              delivered: deliveredCount
            }
          });

          // Custom anti-blocking / rate limiting spacing delay
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        // Simulating the conversion funnel metrics progressive growth (opens -> clicks) over next several seconds
        // This simulates natural WhatsApp recipient engagement over time
        if (deliveredCount > 0) {
          const funnelStages = [
            { readPercent: 0.35, clickPercent: 0.05 },
            { readPercent: 0.65, clickPercent: 0.15 },
            { readPercent: 0.85, clickPercent: 0.28 },
            { readPercent: 0.95, clickPercent: 0.42 }
          ];

          for (let step = 0; step < funnelStages.length; step++) {
            await new Promise((resolve) => setTimeout(resolve, 3000)); // 3 seconds interval

            const stage = funnelStages[step];
            const activeRead = Math.min(deliveredCount, Math.round(deliveredCount * stage.readPercent));
            const activeClicked = Math.min(activeRead, Math.round(deliveredCount * stage.clickPercent));

            await prisma.campaign.update({
              where: { id: campaign.id },
              data: {
                read: activeRead,
                clicked: activeClicked
              }
            });
          }
        }

        // Finalize Campaign
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: "Completed"
          }
        });

        await prisma.systemLog.create({
          data: {
            timestamp: timeHelper(),
            type: "campaign",
            message: `Broadcast campaign '${name}' processing completely finalized.`,
            organizationId
          }
        });

      } catch (workerErr: any) {
        console.error("[Broadcast Background Worker Error]:", workerErr);
      }
    })();

    return NextResponse.json({ campaign });
  } catch (err: any) {
    console.error("Launch campaign error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
