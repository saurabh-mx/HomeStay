import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeStay — Vacation Rentals, Cabins, Beach Houses & More",
  description: "Find vacation rentals, cabins, beach houses, unique homes, and experiences around the world with HomeStay.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
