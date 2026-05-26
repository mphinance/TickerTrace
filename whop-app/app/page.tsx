import { redirect } from "next/navigation";

/**
 * Root path. Outside of Whop's iframe context there's nothing to show,
 * so we send curious visitors to /discover (the app-store pitch).
 * Inside Whop, the user lands on /experiences/[experienceId] directly
 * because the dashboard maps experience paths there — they never hit /.
 */
export default function Home() {
  redirect("/discover");
}
