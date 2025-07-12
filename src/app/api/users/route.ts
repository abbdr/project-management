import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  if (query.length < 2) {
    return NextResponse.json([]);
  }
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: query,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: 10,
  });
  return NextResponse.json(users);
}
