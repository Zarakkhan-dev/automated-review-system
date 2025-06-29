"use client";

import React, { useState } from "react";
import { useFetchMeQuery } from "@/app/store/authApi";

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

interface SidebarProps {
  chats: Chat[];
  onNewChat: () => Promise<void>;
  onChatSelected: (chatId: string) => void;
  onDeleteChat: (chatId: string) => Promise<void>;
  activeChatId: string | null;
  isMobile?: boolean;
  sidebarOpen?: boolean;
  toggleSidebar?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  chats,
  onNewChat,
  onChatSelected,
  onDeleteChat,
  activeChatId,
  isMobile,
  sidebarOpen,
  toggleSidebar,
}) => {
  const { data: userData } = useFetchMeQuery();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createNewChat = async () => {
    try {
      setLoading(true);
      setError(null);
      await onNewChat();
    } catch (err) {
      console.error("Error creating chat:", err);
      setError("Failed to create new chat");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onDeleteChat(chatId);
    } catch (err) {
      console.error("Error deleting chat:", err);
      setError("Failed to delete chat");
    }
  };

  if (error) {
    return (
      <div className="h-full w-64 bg-gray-100 p-4">
        <div className="flex h-full flex-col items-center justify-center">
          <p className="mb-4 text-sm text-red-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? "fixed inset-0 z-50" : ""} ${sidebarOpen ? "block" : "hidden"} flex h-full w-64 flex-col border-r border-gray-200 bg-gray-100 md:block`}
    >
      {isMobile && (
        <div className="flex justify-end p-4">
          <button
            onClick={toggleSidebar}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
      <div className="p-4">
        <button
          onClick={createNewChat}
          className="flex w-full items-center justify-center rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating...
            </span>
          ) : (
            <>
              <span className="mr-2">+</span> New Chat
            </>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-2">
          <h2 className="mb-2 px-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Chat History
          </h2>
          <div className="space-y-1">
            {chats.map((chat) => (
              <div key={chat._id} className="group relative">
                <button
                  onClick={() => onChatSelected(chat._id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium ${
                    activeChatId === chat._id
                      ? "bg-blue-100 text-blue-800"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div
                    className="truncate pr-6"
                    dangerouslySetInnerHTML={{ __html: chat.title }}
                  ></div>
                </button>
                <button
                  onClick={(e) => handleDeleteChat(chat._id, e)}
                  className="absolute top-2 right-2 rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                  title="Delete chat"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
