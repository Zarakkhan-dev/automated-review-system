"use client";
import React, { useState, useEffect } from "react";
import { Providers } from "../providers";
import { Provider } from "react-redux";
import { store } from "../store";
import { Inter } from "next/font/google";
import "../../styles/index.css";

const inter = Inter({ subsets: ["latin"] });

interface Chat {
  _id: string;
  title: string;
}

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <html suppressHydrationWarning lang="en">
        <head />
        <body className={`bg-[#FCFCFC] dark:bg-black ${inter.className}`}>
          <Providers>
            <Provider store={store}>{children}</Provider>
          </Providers>
        </body>
      </html>
    </>
  );
};

export default ChatLayout;
