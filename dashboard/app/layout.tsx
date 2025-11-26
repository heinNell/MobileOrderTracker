// app/layout.tsx
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />

        {/* LEAFLET CSS – THIS FIXES BLANK/GRAY MAP */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-sA+Zcx6K9F2wY1b0k4B1gY8Z1'Vhb7r3B9Qj6p3s4X8="
          crossOrigin=""
        />

        {/* Optional: Preload marker icons (faster first render) */}
        <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" as="image" />
        <link rel="preload" href="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png" as="image" />
      </head>

      <body suppressHydrationWarning className="antialiased">
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}