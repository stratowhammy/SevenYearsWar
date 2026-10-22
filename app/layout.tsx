import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1756 Seven Years' War Simulator — Americas & Caribbean Theater",
  description:
    "Turn-based grand strategy RPG simulator across North America & the Caribbean (10°N–55°N, 55°W–100°W) with SQL event invalidation and hybrid DeepSeek AI seating.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
