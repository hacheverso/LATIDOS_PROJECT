import LoginForm from "./LoginForm";
import { isFirstUsage } from "../actions/setup";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
    // FORCE CHECK: Is this the first time running the app?
    const isFirst = await isFirstUsage();

    if (isFirst) {
        // If no users exist, we just pass this flag to the UI
        // redirect("/register-admin"); // REMOVED: No more auto-redirect
    }

    // Otherwise, show normal login with prop
    return <LoginForm isFirstRun={isFirst} />;
}
