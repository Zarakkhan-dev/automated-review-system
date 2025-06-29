import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import  connectDB  from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  await connectDB();
  const { email, password } = await req.json();

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d', algorithm: "HS256"});

  // Set secure HTTP-only cookie
  (await
    cookies()).set('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, 
    sameSite: 'strict',
  });

  return NextResponse.json({ user: { name: user.name, email: user.email } });
}
