import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: true,
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: true,
  display: 'swap',
});

const system = createSystem(defaultConfig);

export const metadata: Metadata = {
  title: "拝啓ねこ様フォトギャラリー",
  description: "阿佐ヶ谷の誇る名所、拝啓ねこ様のねこちゃん達の写真ギャラリー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ChakraProvider value={system}>
          {children}
        </ChakraProvider>
      </body>
    </html>
  );
}
