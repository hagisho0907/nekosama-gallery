import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../../../lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const photoId = params.id;
    
    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
    }

    const newLikesCount = await database.incrementLikes(photoId);
    
    return NextResponse.json({ 
      success: true, 
      likes: newLikesCount 
    });
  } catch (error) {
    console.error('Like photo error:', error);
    return NextResponse.json({ error: 'Failed to like photo' }, { status: 500 });
  }
}