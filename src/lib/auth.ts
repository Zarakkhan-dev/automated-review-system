import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import User from './models/User';

export async function getUserIdFromToken(req: NextRequest) {
  const token = req.cookies.get('jwt')?.value;
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return null;
    }

    return user._id;
  } catch (error) {
    return null;
  }
}