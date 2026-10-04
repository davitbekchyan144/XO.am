import { redirect } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <AuthPage
      mode="signup"
      topLabel="Join the arena"
      title="Make your next move."
      description="Create a persistent player profile for your score, settings, and match history."
      boardMarks={["O", "", "X", "", "O", "", "X", "", "O"]}
    />
  );
}