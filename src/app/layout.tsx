import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "@/components/TopNav";
import VoiceAssistant from "@/components/VoiceAssistant";
import FollowUpModal from "@/components/FollowUpModal";
import ClientProviders from "./ClientProviders";
import MainWrapper from "@/components/MainWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Krushi Sarathi - Crop Health",
  description: "AI-powered crop disease detection and farming advisory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        <ClientProviders>
          <TopNav />
          <MainWrapper>
            {children}
          </MainWrapper>
          <VoiceAssistant />
          <FollowUpModal />
        </ClientProviders>
      </body>
    </html>
  );
}
