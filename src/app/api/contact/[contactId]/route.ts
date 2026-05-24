import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await params;

    await prisma.contact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ status: "ok" });
  } catch (err: any) {
    console.error("Delete contact error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = await params;
    const body = await request.json();

    const allowedFields = ["name", "email", "status", "tags", "assignedAgent"];
    const updates: Record<string, any> = {};

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: contactId },
      data: updates,
    });

    return NextResponse.json({ status: "ok", contact: updatedContact });
  } catch (err: any) {
    console.error("Update contact error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
