import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "LLM Arena",
  description: "A platform for LLM debates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-center"
            toastOptions={{
              style: {
                background: '#0D0D0D',
                color: '#00FF00',
                border: '1px solid #004d00',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
