import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DemoNav } from "@/components/DemoNav";

export const metadata: Metadata = {
  title: "St Thomas OPC -- Patient Queue",
  description:
    "Sign in on arrival and track your queue position at St Thomas Outpatient Clinic.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6e4f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="pb-14">
        {children}
        <DemoNav />
      </body>
    </html>
  );
}
