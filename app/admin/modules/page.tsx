import { redirect } from "next/navigation";

// Retired in M11 (SPEC §15.7 #23): modules are created and listed inside
// their course.
export default function RetiredAdminModules() {
  redirect("/admin");
}
