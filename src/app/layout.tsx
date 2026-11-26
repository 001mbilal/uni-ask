import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask Universities",
  description:
    "Ask about admissions, fees, programs and scholarships at Pakistani universities. Answers come from official university pages.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
