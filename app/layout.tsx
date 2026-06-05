import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Smart Learning Assistant | Your Personal Smart Tutor",
  description:
    "An advanced, full-stack AI-Based Smart Learning Assistant featuring personalized Explain, Summary, Quiz, and Revision modes to maximize student exam preparation and learning efficiency.",
  keywords: [
    "AI Smart Learning",
    "Smart Learning Assistant",
    "AI study tool",
    "automated quiz generator",
    "student revision helper",
    "NP Coders"
  ]
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
