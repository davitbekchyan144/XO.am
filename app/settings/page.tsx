import { SiteHeader } from "@/components/site-header";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return <div className="container">
    <SiteHeader userName={user.displayName} darkMode={user.darkMode} />
    <main className="settings-container">
      <SettingsForm initialSettings={{
        soundEnabled: user.soundEnabled,
        animationsEnabled: user.animationsEnabled,
        darkMode: user.darkMode,
        notifications: user.notifications,
        rememberDifficulty: user.rememberDifficulty,
        autoRematch: user.autoRematch,
        selectedDifficulty: user.selectedDifficulty,
      }} />
      <aside className="preview-card">
        <h3>Preview</h3>
        <div className="preview-content">
          <div className="opponent-card"><div className="opponent-avatar" aria-hidden="true" /><div className="opponent-name">{user.selectedOpponent}</div><div className="opponent-rank">Arena opponent</div></div>
        </div>
      </aside>
    </main>
  </div>;
}