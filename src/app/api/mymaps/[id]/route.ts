import { NextRequest, NextResponse } from 'next/server';
import { MyMapsService } from '@/lib/myMaps';
import { isHostAllowed } from '@/lib/common';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/mymaps/[id]
 * Retrieve My Maps drawing by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
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

    // Get the ID from the URL parameters
    const { id } = await context.params;
    
    // Retrieve the MyMaps record
    const result = await MyMapsService.getMyMaps(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'ID Not Found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error retrieving MyMaps:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
