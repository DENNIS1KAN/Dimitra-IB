import { redirect } from "next/navigation";

// Retired in M11 (SPEC §15.7 #23): pending requests live in the home's
// "Needs you" strip and in the students drawer.
export default function RetiredAdminRequests() {
  redirect("/admin");
}
