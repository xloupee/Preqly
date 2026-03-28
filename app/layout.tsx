import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "preqly",
  description: "Real-time knowledge graphs for every lecture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
