import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Message from '@/lib/models/Message';
import Chat from '@/lib/models/Chat';
import connectDB from '@/lib/db';

connectDB();

export async function POST(req: NextRequest) {
  try {
    const jwt =  (await cookies()).get('jwt')?.value;
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, role, content } = await req.json();
    
    // Verify chat exists and belongs to user
    const chat = await Chat.findOne({ _id: chatId, userId: jwt });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const newMessage = new Message({
      chatId,
      role,
      content
    });

    await newMessage.save();

    // Update chat's updatedAt
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' }, 
      { status: 500 }
    );
  }
}