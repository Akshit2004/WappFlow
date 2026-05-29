import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { metaBusinessId: true, whatsappBusinessAccountId: true, whatsappPhoneNumberId: true }
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const systemToken = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
    const portfolios = [];

    if (systemToken && org.whatsappBusinessAccountId) {
      const wabaRes = await fetch(`https://graph.facebook.com/v25.0/${org.whatsappBusinessAccountId}?fields=id,name&access_token=${systemToken}`);
      if (wabaRes.ok) {
        const wabaData = await wabaRes.json();
        const phoneRes = await fetch(`https://graph.facebook.com/v25.0/${org.whatsappBusinessAccountId}/phone_numbers?access_token=${systemToken}`);
        const phoneNumbers = phoneRes.ok ? (await phoneRes.json()).data : [];
        portfolios.push({
          wabaId: wabaData.id,
          name: wabaData.name || `WABA (${wabaData.id})`,
          phoneNumbers: phoneNumbers || []
        });
      }
    }

    return NextResponse.json({
      activeWabaId: org.whatsappBusinessAccountId,
      activePhoneNumberId: org.whatsappPhoneNumberId,
      portfolios
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { orgId, wabaId, phoneNumberId } = body;

    if (!orgId || !wabaId || !phoneNumberId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        whatsappBusinessAccountId: wabaId,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappConnected: true,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
