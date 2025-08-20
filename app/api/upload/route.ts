import { NextRequest, NextResponse } from 'next/server';
import { r2Storage } from '@/lib/r2';
import { database } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;

    if (!file || !folderId) {
      return NextResponse.json(
        { error: 'File and folderId are required' },
        { status: 400 }
      );
    }

    // Check if folder exists
    const folder = database.getFolder(folderId);
    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${extension}`;

    // Upload to R2
    const url = await r2Storage.uploadPhoto(buffer, filename, file.type);

    // Save to database
    const photo = database.addPhoto({
      folderId,
      filename,
      originalName: file.name,
      url,
    });

    return NextResponse.json({ 
      success: true, 
      photo: {
        id: photo.id,
        url: photo.url,
        originalName: photo.originalName,
        uploadedAt: photo.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}