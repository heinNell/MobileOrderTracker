import { Toaster } from "react-hot-toast";

// Public tracking layout - NO SIDEBAR, clean standalone page
// This prevents the root layout's sidebar from appearing
export default function PublicTrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* No sidebar - just the content */}
      {children}
      <Toaster position="top-right" />
    </div>
  );
}

export const metadata = {
  title: "Live Tracking - Mobile Order Tracker",
  description: "Real-time order tracking",
};
