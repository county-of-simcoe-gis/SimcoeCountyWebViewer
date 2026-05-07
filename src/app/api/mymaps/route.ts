import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

/**
 * @deprecated Use POST /api/public/mymaps (public saves with hash dedup)
 * or POST /api/secure/mymaps (authenticated saves with upsert).
 *
 * POST /api/mymaps
 * Save a MyMaps drawing to the database.
 * Expects a JSON body which gets stored as-is in the `json` column.
 * Returns { id } of the newly created record.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const record = await prisma.tblMymaps.create({
      data: {
        json: JSON.stringify(body),
        date_created: new Date(),
      },
    });

    return Response.json({ id: record.id });
  } catch (error) {
    console.error("Error saving MyMaps:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
