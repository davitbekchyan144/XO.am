import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { getCurrentUser } from "@/lib/auth";
import "../styles.css";

export const metadata: Metadata = {
  title: "XO.am | Halloween Arena",
  description: "Enter the Halloween XO arena and play against the AI, locally, or live with friends.",
  verification: {
    google: "OvUGB_oxdhqnx05mt0eG9Lc8k27_AdW7s2-AFrRYs2U",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" data-theme={user?.darkMode === false ? "light" : "dark"}>
      <body>
        <div className="halloween-decor" aria-hidden="true">
          <span className="spider-web spider-web-left" />
          <span className="spider-web spider-web-right" />
          <span className="hanging-spider hanging-spider-left">8 legs</span>
          <span className="hanging-spider hanging-spider-right">8 legs</span>
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  );
}