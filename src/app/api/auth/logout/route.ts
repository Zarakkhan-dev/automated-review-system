import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  (await cookies()).delete('jwt');
  return NextResponse.json({ message: 'Logged out' });
}
