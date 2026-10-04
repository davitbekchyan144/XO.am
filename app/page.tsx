import { ArenaDashboard } from "@/components/arena-dashboard";
import { SiteHeader } from "@/components/site-header";
import { requireUser } from "@/lib/auth";

export default async function ArenaPage() {
  const user = await requireUser();

  return <><div className="container"><SiteHeader userName={user.displayName} darkMode={user.darkMode} /></div><ArenaDashboard user={user} /></>;
}