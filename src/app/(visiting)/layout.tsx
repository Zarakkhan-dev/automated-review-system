"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { Inter } from "next/font/google";
import "../../styles/index.css";
import { ToastContainer } from "react-toastify";
const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />

      <body className={`bg-[#FCFCFC] dark:bg-black ${inter.className}`}>
        <Providers>
          <Provider store={store}>
            <Header />
            {children}
            <Footer />
          </Provider>
          <ScrollToTop />
        </Providers>
        <ToastContainer />
      </body>
    </html>
  );
}

import { Providers } from "../providers";
import { Provider } from "react-redux";
import { store } from "../store";
