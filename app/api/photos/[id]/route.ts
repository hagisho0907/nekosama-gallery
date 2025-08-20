import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { r2Storage } from '@/lib/r2';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get photo info before deleting
    const photos = await database.getPhotos(''); // We need to get the photo first
    const photo = photos.find(p => p.id === id);
    
    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Delete from R2 storage
    await r2Storage.deletePhoto(photo.url);

    // Delete from database
    const success = await database.deletePhoto(id);
    
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