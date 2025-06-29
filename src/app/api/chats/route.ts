import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import Chat from "@/lib/models/Chat";
import connectDB from "@/lib/db";

export async function GET() {
  try {
    await connectDB();
    const jwt = (await cookies()).get("jwt")?.value;
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chats = await Chat.find({ userId: jwt })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const jwt = (await cookies()).get("jwt")?.value;
    if (!jwt) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await req.json();
    const newChat = new Chat({
      userId: jwt,
      title: title || "New Chat",
    });

    await newChat.save();
    return NextResponse.json(newChat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
