import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { orgId } = await params;
    const userId = (session.user as any).id;

    // 1. Verify User has active tenancy/membership in requested organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access forbidden. You do not belong to this workspace." },
        { status: 403 }
      );
    }

    // 2. Fetch org members (users with membership in this org)
    const memberships = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const members = (memberships as { user: { id: string; name: string | null; email: string }; role: string }[]).map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email.split("@")[0],
      email: m.user.email,
      role: m.role,
    }));

    // 3. Fetch scoped relational assets from local PostgreSQL
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
    });

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    const templates = await prisma.template.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, body: true, category: true,
        buttons: true, mediaType: true, metaStatus: true, metaId: true,
        organizationId: true, createdAt: true,
      },
    });

    const chatbotNodes = await prisma.chatbotNode.findMany({
      where: { organizationId: orgId },
      orderBy: { id: "asc" },
    });

    const integrations = await prisma.integration.findMany({
      where: { organizationId: orgId },
      orderBy: { id: "asc" },
    });

    const systemLogs = await prisma.systemLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const messages = await prisma.message.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });

    // 3. Assemble relational Message rows into dynamic ChatHistory map structure
    const chatHistory: Record<string, any[]> = {};
    
    // Initialize contact buckets
    contacts.forEach((c: any) => {
      chatHistory[c.id] = [];
    });

    messages.forEach((m: any) => {
      if (!chatHistory[m.contactId]) {
        chatHistory[m.contactId] = [];
      }
      chatHistory[m.contactId].push({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        status: m.status,
        buttons: m.buttons,
      });
    });

    // 4. Return unified JSON payloads
    return NextResponse.json({
      contacts,
      campaigns,
      templates,
      chatbotNodes,
      integrations,
      systemLogs,
      chatHistory,
      members,
    });
  } catch (err: any) {
    console.error("❌ Scoped Data Fetch API failed:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during database hydration." },
      { status: 500 }
    );
  }
}
