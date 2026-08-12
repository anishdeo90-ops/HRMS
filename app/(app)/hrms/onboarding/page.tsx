import { redirect } from "next/navigation";

export default function OnboardingIndex() {
  redirect("/hrms/onboarding/candidate-approval");
}
