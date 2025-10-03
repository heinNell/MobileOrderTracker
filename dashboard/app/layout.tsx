import "./globals.css";

export const metadata = {
  title: "Mobile Order Tracker - Dashboard",
  description: "Logistics management and order tracking system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
