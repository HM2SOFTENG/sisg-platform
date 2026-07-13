import { Redirect } from "expo-router";
import { useAuth } from "../lib/auth";

export default function IndexRoute() {
  const { hydrated, session } = useAuth();

  if (!hydrated) {
    return null;
  }

  return <Redirect href={session ? "/(tabs)/home" : "/sign-in"} />;
}
