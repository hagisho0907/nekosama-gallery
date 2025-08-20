import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { r2Storage } from '@/lib/r2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete from database first to get photo info
    const success = database.deletePhoto(id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Photo not found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}