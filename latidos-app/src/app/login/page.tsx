import LoginForm from "./LoginForm";
import { isFirstUsage } from "../actions/setup";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
    // FORCE CHECK: Is this the first time running the app?
    const isFirst = await isFirstUsage();

    if (isFirst) {
        // If no users exist, force redirection to Admin Setup
        redirect("/register-admin");
    }

    // Otherwise, show normal login
    return <LoginForm />;
}
