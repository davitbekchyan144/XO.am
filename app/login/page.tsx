import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="container">
      <nav className="nav-bar">
        <a className="nav-logo" href="/">XO.am</a>
        <div className="nav-links"><span className="nav-link">Already in the arena?</span></div>
      </nav>
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">XO.am Arena</span>
          <h1>Ready for your next match?</h1>
          <p>Sign in to keep your profile, results, and game history with you across devices.</p>
          <div className="auth-board" aria-hidden="true"><span>X</span><span /><span>O</span><span /><span>X</span><span /><span>O</span><span /><span>X</span></div>
        </section>
        <AuthForm mode="login" />
      </main>
    </div>
  );
}