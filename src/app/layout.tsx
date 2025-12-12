import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COD Camo Tracker",
  description: "Manual Call of Duty camo and prestige tracker.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
