import { redirect } from "next/navigation";

// Retired in M12 (SPEC §15.7 #24): the home's course cards and each
// course's rail carry what this page listed.
export default function RetiredStudentAssignments() {
  redirect("/app");
}
