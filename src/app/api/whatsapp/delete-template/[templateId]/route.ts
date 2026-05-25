import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { templateId } = await params;

    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    // 1. Fetch template from database
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // 2. Perform Meta Graph API Deletion if it is a real template and config exists
    const isMock = template.metaId?.startsWith("mock-meta-") || !template.metaId;
    
    if (!isMock) {
      const config = getWhatsAppConfig();
      const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

      if (config && wabaId) {
        const { accessToken, apiVersion } = config;
        const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${template.name}`;
        
        try {
          console.log(`[Meta API Deletion] Sending delete request for template name '${template.name}' to WABA ${wabaId}...`);
          const metaRes = await fetch(url, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${accessToken}`
            }
          });

          const metaData = await metaRes.json();
          if (metaRes.ok) {
            console.log(`[Meta API Deletion Success] Deleted template '${template.name}' from WABA ${wabaId}`);
          } else {
            // Log warning but proceed with local deletion so we don't trap the user
            console.warn(`[Meta API Deletion Warning] Meta returned error during deletion:`, metaData.error?.message);
          }
        } catch (apiErr) {
          console.error(`[Meta API Deletion Exception] Failed to reach Meta Graph API:`, apiErr);
        }
      }
    } else {
      console.log(`[Sandbox Mock Deletion] Bypassing Meta Graph API delete call for mock template '${template.name}'`);
    }

    // 3. Delete from local PostgreSQL database
    await prisma.template.delete({
      where: { id: templateId }
    });

    // 4. Create system log trace
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Permanently deleted template: "${template.name}" from WappFlow${!isMock ? " and Meta Business Manager" : ""}.`,
        organizationId: template.organizationId
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete template endpoint error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
