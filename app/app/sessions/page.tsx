import { redirect } from "next/navigation";

// Retired in M12 (SPEC §15.7 #24): Sessions merged into /app/schedule.
export default function RetiredStudentSessions() {
  redirect("/app/schedule");
}
