import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard"); // hub layout sends signed-out users to /login
}
