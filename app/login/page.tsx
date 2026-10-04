import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <AuthPage
      mode="login"
      topLabel="Already in the arena?"
      title="Ready for your next match?"
      description="Sign in to keep your profile, results, and game history with you across devices."
      boardMarks={["X", "", "O", "", "X", "", "O", "", "X"]}
    />
  );
}