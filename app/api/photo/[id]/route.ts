import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/db';
import { r2Storage } from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find photo by ID in all folders
    const folders = database.getFolders();
    let photo = null;
    
    for (const folder of folders) {
      const photos = database.getPhotos(folder.id);
      photo = photos.find(p => p.id === id);
      if (photo) break;
    }
    
    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // For now, return the photo URL as-is
    // In the future, we could proxy the image through this endpoint
    return NextResponse.json({
      id: photo.id,
      url: photo.url,
      originalName: photo.originalName,
      uploadedAt: photo.uploadedAt
    });

  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}