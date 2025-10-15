import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import ConditionalLayout from "./components/ConditionalLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mobile Order Tracker - Dashboard",
  description: "Logistics management and order tracking system",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16", type: "image/x-icon" },
      { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
