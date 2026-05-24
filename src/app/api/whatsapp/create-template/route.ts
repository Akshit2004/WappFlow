import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { name, body, category, buttons, mediaType, organizationId } = await request.json();

    if (!name || !body || !organizationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ error: "WhatsApp API not configured" }, { status: 500 });
    }

    const components: any[] = [{ type: "BODY", text: body }];

    if (buttons && buttons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.map((btn: string) => ({
          type: "QUICK_REPLY",
          text: btn,
        })),
      });
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          language: "en",
          category: category.toUpperCase(),
          components,
        }),
      }
    );

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      return NextResponse.json(
        { error: metaData.error?.message || "Meta API error", metaData },
        { status: 400 }
      );
    }

    const metaId = metaData.id;

    const template = await prisma.template.create({
      data: {
        name,
        body,
        category,
        buttons,
        mediaType: mediaType || "none",
        metaStatus: "pending",
        metaId,
        organizationId,
      },
    });

    return NextResponse.json({ template, metaData });
  } catch (err: any) {
    console.error("Create template error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
