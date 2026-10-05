import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";

type AuthPageProps = {
  mode: "login" | "signup";
  topLabel: string;
  title: string;
  description: string;
  boardMarks: string[];
};

export function AuthPage({ mode, topLabel, title, description, boardMarks }: AuthPageProps) {
  return (
    <div className="container">
      <nav className="nav-bar">
        <Link className="nav-logo" href="/" aria-label="XO.am home">
          <Image
            src="/xo-am-logo.svg"
            alt="XO.am tic-tac-toe arena"
            width={190}
            height={68}
            priority
          />
        </Link>
        <div className="nav-links">
          <span className="nav-link">{topLabel}</span>
        </div>
      </nav>
      <main className="auth-layout">
        <section className="auth-intro">
          <span className="eyebrow">XO.am Arena</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="auth-board" aria-hidden="true">
            {boardMarks.map((mark, index) => <span key={index}>{mark}</span>)}
          </div>
        </section>
        <AuthForm mode={mode} />
      </main>
    </div>
  );
}