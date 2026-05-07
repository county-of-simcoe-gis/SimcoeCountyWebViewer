import { NextRequest, NextResponse } from 'next/server';
import { MyMapsService, computeJsonHash } from '@/lib/myMaps';
import { isHostAllowed } from '@/lib/common';

/**
 * POST /api/public/mymaps
 * Save My Maps drawing (public / non-authenticated).
 * Uses SHA-256 hash deduplication: if an identical JSON payload already
 * exists in the database, the existing record's ID is returned instead
 * of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if the host is allowed
    const host = request.headers.get('host');
    if (!isHostAllowed(host ?? undefined)) {
      console.log('Unauthorized Domain!', host);
      return NextResponse.json(
        { error: 'Unauthorized Domain!' },
        { status: 403 }
      );
    }

    // Parse the JSON body
    const body = await request.json();

    // Compute hash for deduplication
    const jsonString = JSON.stringify(body);
    const hash = computeJsonHash(jsonString);

    // Check if an identical record already exists
    const existing = await MyMapsService.findByHash(hash);
    if (existing) {
      return NextResponse.json({ id: existing.id });
    }

    // No duplicate — insert a new record
    const id = await MyMapsService.insertMyMaps(body);
    
    return NextResponse.json({ id });

  } catch (error) {
    console.error('Error saving MyMaps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
