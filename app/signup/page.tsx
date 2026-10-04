import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="container">
      <nav className="nav-bar">
        <a className="nav-logo" href="/">XO.am</a>
        <div className="nav-links"><span className="nav-link">Join the arena</span></div>
      </nav>
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">XO.am Arena</span>
          <h1>Make your next move.</h1>
          <p>Create a persistent player profile for your score, settings, and match history.</p>
          <div className="auth-board" aria-hidden="true"><span>O</span><span /><span>X</span><span /><span>O</span><span /><span>X</span><span /><span>O</span></div>
        </section>
        <AuthForm mode="signup" />
      </main>
    </div>
  );
}