import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const { isNew } = await request.json();
    
    if (typeof isNew !== 'boolean') {
      return NextResponse.json(
        { error: 'isNew must be a boolean' },
        { status: 400 }
      );
    }

    const params = await context.params;
    const success = await database.toggleNewBadge(params.id, isNew);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Folder not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error toggling new badge:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}