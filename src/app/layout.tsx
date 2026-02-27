import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "VERITAS NEWS",
  description: "Truth-scored news intelligence platform",
  icons: {
    icon:     "/icon.png",
    shortcut: "/icon.png",
    apple:    "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="scanline-overlay min-h-screen pb-20 lg:pb-0 lg:pl-20">
        <Providers>
          <NavBar />
          <main className="relative z-10 max-w-7xl mx-auto px-4 pt-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
