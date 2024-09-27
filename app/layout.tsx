import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  title: "EmailSpy",
  description: "Find public email addresses associated with a domain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <Analytics />
      <head />
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
