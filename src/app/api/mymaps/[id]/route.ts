import prisma from "@/lib/prisma";

/**
 * @deprecated Use GET /api/public/mymaps/[id] instead.
 *
 * GET /api/mymaps/[id]
 * Retrieve a MyMaps drawing by its UUID.
 * Returns the full record (id, json, date_created) or { error } if not found.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return Response.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const record = await prisma.tblMymaps.findUnique({
      where: { id },
    });

    if (!record) {
      return Response.json({ error: "ID Not Found" }, { status: 404 });
    }

    return Response.json(record);
  } catch (error) {
    console.error("Error retrieving MyMaps:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
