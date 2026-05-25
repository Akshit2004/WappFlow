import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { 
      name, 
      category, 
      body, 
      buttons = [], 
      mediaType = "none", 
      organizationId 
    } = await request.json();

    if (!name || !category || !body || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Standardize template name: Meta requires lowercase snake_case, alphanumeric only
    const formattedName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");

    if (!formattedName) {
      return NextResponse.json({ error: "Invalid template name format" }, { status: 400 });
    }

    // Try Meta Graph API Submission if configured
    const config = getWhatsAppConfig();
    let metaId: string | null = null;
    let metaStatus = "pending";

    if (config) {
      const { accessToken, apiVersion } = config;
      const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

      if (wabaId) {
        try {
          // Parse variables from body text (Meta strictly requires example body_text values)
          const varRegex = /\{\{(\d+)\}\}/g;
          const matches = Array.from(body.matchAll(varRegex)).map((m: any) => parseInt(m[1]));
          const uniqueVarCount = new Set(matches).size;

          const bodyComponent: any = {
            type: "BODY",
            text: body
          };

          if (uniqueVarCount > 0) {
            // Generate mock example values e.g., ["Sample 1", "Sample 2"]
            // Meta strictly requires these sample values to allow variable approval!
            const sampleValues = Array.from({ length: uniqueVarCount }, (_, i) => `[Sample ${i + 1}]`);
            bodyComponent.example = {
              body_text: [sampleValues]
            };
          }

          const components: any[] = [];

          // 1. Add HEADER component first (if media is configured)
          if (mediaType && mediaType !== "none") {
            components.push({
              type: "HEADER",
              format: mediaType.toUpperCase()
            });
          }

          // 2. Add BODY component next
          components.push(bodyComponent);

          // 3. Add BUTTONS component last (if quick replies are configured)
          if (buttons && buttons.length > 0) {
            components.push({
              type: "BUTTONS",
              buttons: buttons.map((text: string) => ({
                type: "QUICK_REPLY",
                text
              }))
            });
          }

          const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
          const metaRes = await fetch(url, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: formattedName,
              category: category.toUpperCase(),
              language: "en_US",
              components
            })
          });

          const metaData = await metaRes.json();
          if (metaRes.ok && metaData.id) {
            metaId = metaData.id;
            metaStatus = metaData.status?.toLowerCase() || "pending";
            console.log(`[Meta API Success] Template submitted with variables: WABA ID ${wabaId}, Meta ID ${metaId}`);
          } else {
            console.warn("[Meta API Warn] Submission failed, falling back to sandbox simulator:", metaData.error?.message);
          }
        } catch (apiErr) {
          console.error("[Meta API Exception] Error during Graph API submit:", apiErr);
        }
      }
    }

    // Sandbox Mock Fallback if Meta API is absent/failed
    if (!metaId) {
      metaId = `mock-meta-${Date.now()}`;
      metaStatus = "pending";
      console.log(`[Sandbox Mock] Local template scheduled: Mock ID ${metaId}`);
    }

    // Save in Prisma DB
    const template = await prisma.template.create({
      data: {
        name: formattedName,
        body,
        category,
        buttons,
        mediaType,
        metaStatus,
        metaId,
        organizationId
      }
    });

    // Write system log trace
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Template submitted for approval: "${formattedName}" (${category}) - Status: ${metaStatus}`,
        organizationId
      }
    });

    return NextResponse.json({ template });
  } catch (err: any) {
    console.error("Create template endpoint error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
