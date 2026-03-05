import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tax — AI Bookkeeping & Tax Prep",
  description: "Bank sync, AI categorization, and tax-ready reports for US freelancers.",
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
