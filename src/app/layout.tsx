import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ConditionalNavigation } from "@/components/conditional-navigation";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Project Management App",
  description: "Multi-user project management application with real-time collaboration",
  keywords: ["project management", "task management", "team collaboration", "kanban board"],
  authors: [{ name: "Project Management Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <Providers>
          <ConditionalNavigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <footer className="bg-gray-50 border-t">
            <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
              <div className="text-center text-gray-600 text-sm sm:text-base">
                <p>&copy; 2025 Project Management App. Built with Next.js. Made By Abdul.</p>
              </div>
            </div>
          </footer>
          <ToastProvider />
        </Providers>
      </body>
    </html>
  );
}
