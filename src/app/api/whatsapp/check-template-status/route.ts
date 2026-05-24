import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
    }

    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template || !template.metaId) {
      return NextResponse.json({ error: "Template not found or not sent to Meta" }, { status: 404 });
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    if (!accessToken) {
      return NextResponse.json({ error: "WhatsApp API not configured" }, { status: 500 });
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${template.metaId}?fields=status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      return NextResponse.json({ error: metaData.error?.message || "Meta API error" }, { status: 400 });
    }

    const metaStatus = metaData.status?.toLowerCase() || "pending";
    const dbStatus = metaStatus === "approved" ? "approved" : metaStatus === "rejected" ? "rejected" : "pending";

    if (dbStatus !== template.metaStatus) {
      await prisma.template.update({
        where: { id: templateId },
        data: { metaStatus: dbStatus },
      });
    }

    return NextResponse.json({ metaStatus: dbStatus, metaData });
  } catch (err: any) {
    console.error("Check template status error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
