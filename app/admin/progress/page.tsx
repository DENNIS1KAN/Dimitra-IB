import { redirect } from "next/navigation";

// Retired in M11 (SPEC §15.7 #23): the matrix lives in each course's
// Progress tab.
export default function RetiredAdminProgress() {
  redirect("/admin");
}
