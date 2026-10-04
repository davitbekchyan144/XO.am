import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import "../styles.css";

export const metadata: Metadata = {
  title: "XO.am | Arena",
  description: "Play tic-tac-toe against the AI, locally, or live with friends.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" data-theme={user?.darkMode === false ? "light" : "dark"}>
      <body>{children}</body>
    </html>
  );
}