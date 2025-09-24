import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/app/context/AuthContext";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "AirdropzAlpha",
  description: "AirdropzAlpha - A Next.js and Electron application",
  icons: {
    icon: "./favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className="antialiased"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <AuthProvider>
          {children}
          <Toaster 
            position="top-center"
            expand={true}
            richColors={true}
            closeButton={false}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
