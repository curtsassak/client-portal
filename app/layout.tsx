import type { Metadata } from "next";
import "@fontsource/league-spartan/500.css";
import "@fontsource/league-spartan/600.css";
import "@fontsource/league-spartan/700.css";
import "./globals.css";

export const metadata: Metadata = { title: "Next Move Portal", description: "Curt Sassak · Career Strategy" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
