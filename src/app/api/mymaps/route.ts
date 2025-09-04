import { NextRequest, NextResponse } from 'next/server';
import { MyMapsService } from '@/lib/myMaps';
import { isHostAllowed } from '@/lib/common';

/**
 * POST /api/mymaps
 * Save My Maps drawing
 */
export async function POST(request: NextRequest) {
  try {
    // Check if the host is allowed
    const host = request.headers.get('host');
    if (!isHostAllowed(host)) {
      console.log('Unauthorized Domain!', host);
      return NextResponse.json(
        { error: 'Unauthorized Domain!' },
        { status: 403 }
      );
    }

    // Parse the JSON body
    const body = await request.json();
    
    // Insert the MyMaps record
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
