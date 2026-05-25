import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const { nodes = [] } = await request.json();

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: "Invalid nodes list payload" }, { status: 400 });
    }

    // 2. Perform Transaction to atomic upsert nodes layout
    await prisma.$transaction([
      // A. Purge all existing chatbot nodes for this organization
      prisma.chatbotNode.deleteMany({
        where: { organizationId: orgId }
      }),
      // B. Create the new node list
      prisma.chatbotNode.createMany({
        data: nodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          title: node.title,
          content: node.content,
          options: Array.isArray(node.options) ? node.options : [],
          delayTime: node.delayTime !== undefined ? parseInt(node.delayTime) : null,
          nextId: node.nextId || null,
          routes: node.routes ? node.routes : {},
          organizationId: orgId
        }))
      })
    ]);

    // 3. Log layout save action
    const d = new Date();
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    await prisma.systemLog.create({
      data: {
        timestamp: timeStr,
        type: "crm",
        message: `Chatbot Builder visual nodes layout updated: ${nodes.length} nodes saved successfully.`,
        organizationId: orgId
      }
    });

    return NextResponse.json({ success: true, count: nodes.length });
  } catch (err: any) {
    console.error("Save chatbot nodes endpoint error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
