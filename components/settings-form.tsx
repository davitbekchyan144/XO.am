"use client";

import { useState, type FormEvent } from "react";

export type PlayerSettings = {
  soundEnabled: boolean;
  animationsEnabled: boolean;
  darkMode: boolean;
  notifications: boolean;
  rememberDifficulty: boolean;
  autoRematch: boolean;
  selectedDifficulty: string;
};

export function SettingsForm({ initialSettings }: { initialSettings: PlayerSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function setBoolean(key: keyof PlayerSettings, value: boolean) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save settings.");
      document.documentElement.dataset.theme = settings.darkMode ? "dark" : "light";
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return <form className="settings-panel" onSubmit={save}>
    <h2>Player settings</h2>
    <div className="settings-group">
      <h3>Audio & motion</h3>
      <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(value) => setBoolean("soundEnabled", value)} />
      <Toggle label="Animations" checked={settings.animationsEnabled} onChange={(value) => setBoolean("animationsEnabled", value)} />
    </div>
    <div className="settings-group">
      <h3>Display preferences</h3>
      <Toggle label="Dark mode" checked={settings.darkMode} onChange={(value) => setBoolean("darkMode", value)} />
      <Toggle label="Notifications" checked={settings.notifications} onChange={(value) => setBoolean("notifications", value)} />
    </div>
    <div className="settings-group">
      <h3>Gameplay</h3>
      <Toggle label="Remember AI difficulty" checked={settings.rememberDifficulty} onChange={(value) => setBoolean("rememberDifficulty", value)} />
      <Toggle label="Auto-rematch" checked={settings.autoRematch} onChange={(value) => setBoolean("autoRematch", value)} />
      <div className="toggle-item">
        <label htmlFor="settingsDifficulty">Default AI difficulty</label>
        <select id="settingsDifficulty" value={settings.selectedDifficulty} onChange={(event) => setSettings((current) => ({ ...current, selectedDifficulty: event.target.value }))}>
          <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
        </select>
      </div>
    </div>
    <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save settings"}</button>
    <p className="settings-save-message" role="status" aria-live="polite">{message}</p>
  </form>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = `setting-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return <div className="toggle-item">
    <label htmlFor={id}>{label}</label>
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </div>;
}