import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Chat from "@/lib/models/Chat";
import Message from "@/lib/models/Message";
import connectDB from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const { id } = await params;
    const jwt = (await cookies()).get("jwt")?.value;
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chat = await Chat.findOne({ _id: id, userId: jwt });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const messages = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      ...chat.toObject(),
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const { id } = await params;
    const jwt = (await cookies()).get("jwt")?.value;
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: id, userId: jwt },
      { title, updatedAt: new Date() },
      { new: true },
    );

    if (!updatedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json(updatedChat);
  } catch (error) {
    console.log("error", error)
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await connectDB();
    const { id } = await params;
    const jwt = (await cookies()).get("jwt")?.value;
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deletedChat = await Chat.findOneAndDelete({ _id: id, userId: jwt });
    if (!deletedChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Delete all messages associated with this chat
    await Message.deleteMany({ chatId: deletedChat._id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 },
    );
  }
}
