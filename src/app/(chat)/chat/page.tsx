"use client";
import React, { useState, useEffect, useRef } from "react";
import { useFetchMeQuery } from "@/app/store/authApi";
import { useMediaQuery } from "react-responsive";
import Message from "@/components/Message";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";

interface Message {
  _id: string;
  role: "user" | "model";
  content: string;
  createdAt: Date;
}

interface Chat {
  _id: string;
  title: string;
  messages: Message[];
}

const ChatPage = () => {
  const { data: userData } = useFetchMeQuery();
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const fetchChats = async () => {
    try {
      const response = await fetch("/api/chats");
      if (!response.ok) throw new Error("Failed to fetch chats");
      const data = await response.json();
      setChats(data);
      if (data.length > 0) {
        setActiveChatId(data[0]._id);
      } else {
        setActiveChatId(null);
        setCurrentChat(null);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setError("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (!activeChatId) {
      setCurrentChat(null);
      return;
    }

    const fetchChatMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/chats/${activeChatId}`);
        if (!response.ok) throw new Error("Failed to fetch chat");
        const data = await response.json();
        setCurrentChat(data);
      } catch (error) {
        console.error("Error fetching chat:", error);
        setError("Failed to load chat");
      } finally {
        setLoading(false);
        if (isMobile) setSidebarOpen(false);
      }
    };

    fetchChatMessages();
  }, [activeChatId, isMobile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages, generating]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [textareaRef.current?.value]);

  const refreshChats = fetchChats;

  const generateAIResponse = async (prompt: string, history: string[] = []) => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history }),
      });
      if (!response.ok) throw new Error("Failed to generate AI response");
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("AI generation error:", error);
      return "I'm sorry, I couldn't process your request. Please try again.";
    }
  };

  const generateChatTitle = async (message: string) => {
    try {
      const title = await generateAIResponse(
        `Generate a concise 2-3 word title for this conversation based on: "${message}". Only respond with the title.`,
      );
      return title.replace(/["']/g, "").trim();
    } catch (error) {
      console.error("Failed to generate title:", error);
      return message.substring(0, 20) + (message.length > 20 ? "..." : "");
    }
  };

  const handleNewChat = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (!response.ok) throw new Error("Failed to create chat");
      const newChat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat._id);
      setCurrentChat({ ...newChat, messages: [] });
    } catch (error) {
      console.error("Error creating chat:", error);
      setError("Failed to create new chat");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
      await refreshChats();
    } catch (error) {
      console.error("Error deleting chat:", error);
      setError("Failed to delete chat");
    }
  };

const handleSendMessage = async (message: string) => {
  if (!message.trim()) return;

  try {
    setGenerating(true);

    let currentChatId = activeChatId;
    let isNewChat = false;
    let newChatTitle = '';

    // If this is a completely new chat (no activeChatId)
    if (!currentChatId) {
      newChatTitle = await generateChatTitle(message);
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChatTitle }),
      });
      const newChat = await response.json();
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat._id);
      setCurrentChat({ ...newChat, messages: [] });
      currentChatId = newChat._id;
      isNewChat = true;
    }
    // If this is an existing chat but has no proper title
    else if (!currentChat?.title || currentChat.title === "New Chat") {
      console.log("currentChat?.title",currentChat?.title);
      newChatTitle = await generateChatTitle(message);
      console.log("newChat Tile ", newChatTitle)
      // Update the chat on the server
      const updateResponse = await fetch(`/api/chats/${currentChat._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newChatTitle }),
      });
      
      if (updateResponse.ok) {
        // Update local state
        setCurrentChat(prev => prev ? {...prev, title: newChatTitle} : null);
        setChats(prev => prev.map(chat => 
          chat._id === currentChatId ? {...chat, title: newChatTitle} : chat
        ));
      }
    }

    const tempMessageId = Date.now().toString();
    setCurrentChat((prev) => ({
      ...prev!,
      messages: [
        ...(prev?.messages || []),
        {
          _id: tempMessageId,
          role: "user",
          content: message,
          createdAt: new Date(),
        },
      ],
    }));

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: currentChatId,
        role: "user",
        content: message,
        generateTitle: isNewChat || currentChat?.messages.length === 0,
      }),
    });

    const history =
      currentChat?.messages
        .filter((m) => m.role === "user")
        .map((m) => m.content) || [];

    // Add loading message
    const loadingMessageId = Date.now().toString() + "-loading";
    setCurrentChat((prev) => ({
      ...prev!,
      messages: [
        ...(prev?.messages || []),
        {
          _id: loadingMessageId,
          role: "model",
          content: "",
          createdAt: new Date(),
          isLoading: true,
        },
      ],
    }));

    const aiResponse = await generateAIResponse(message, history);

    // Update loading message with actual response
    setCurrentChat((prev) => ({
      ...prev!,
      messages: prev!.messages.map((m) =>
        m._id === loadingMessageId
          ? { ...m, content: aiResponse, isLoading: false }
          : m,
      ),
    }));

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: currentChatId,
        role: "model",
        content: aiResponse,
      }),
    });

    // Refresh chats to ensure all data is in sync
    await refreshChats();
  } catch (error) {
    console.error("Error sending message:", error);
    setError("Failed to send message");
    if (activeChatId) {
      const response = await fetch(`/api/chats/${activeChatId}`);
      if (response.ok) {
        const chatData = await response.json();
        setCurrentChat(chatData);
      }
    }
  } finally {
    setGenerating(false);
  }
};

  if (loading && !currentChat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-gray-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <p className="mb-4 text-red-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onChatSelected={setActiveChatId}
        onDeleteChat={handleDeleteChat}
        isMobile={isMobile}
        sidebarOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {isMobile && (
          <div className="flex items-center border-b border-gray-200 bg-white p-4">
            <button
              onClick={toggleSidebar}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h1 className="ml-4 text-lg font-medium text-gray-800">
             <div dangerouslySetInnerHTML={{ __html: currentChat?.title || "New Chat" }} />
            </h1>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white p-4">
          {!currentChat?.messages?.length ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-gray-700">
                Start a conversation
              </h1>
              <p className="max-w-md text-gray-500">
                Ask anything or share your thoughts. I&apos;m here to help!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentChat.messages.map((message) => (
                <Message
                  key={message._id}
                  role={message.role}
                  content={message.content}
                  isLoading={(message as any).isLoading}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={generating}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
};

export default ChatPage;
