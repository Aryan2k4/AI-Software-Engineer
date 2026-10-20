import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "AI Software Engineer · Workspace",
  description:
    "Plan features, inspect generated code, and track engineering delivery.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
