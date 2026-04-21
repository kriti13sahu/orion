import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orion — UVA Darden Network",
  description: "The private professional network for the UVA Darden community.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans">{children}</body>
    </html>
  );
}
