import { NextResponse } from "next/server";
import { GetAllRoles } from "@/lib/authorizeUser";
export async function GET() {
  const locations = await GetAllRoles();
  return NextResponse.json(locations, { status: 200 });
}
