import type { NextApiRequest, NextApiResponse } from 'next';
import { database } from '../../../../lib/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: photoId } = req.query;
    
    if (!photoId || typeof photoId !== 'string') {
      return res.status(400).json({ error: 'Photo ID is required' });
    }

    const newLikesCount = await database.incrementLikes(photoId);
    
    return res.status(200).json({ 
      success: true, 
      likes: newLikesCount 
    });
  } catch (error) {
    console.error('Like photo error:', error);
    return res.status(500).json({ error: 'Failed to like photo' });
  }
}