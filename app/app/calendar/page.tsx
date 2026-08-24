import { redirect } from "next/navigation";

// Retired in M12 (SPEC §15.7 #24): Calendar merged into /app/schedule.
export default function RetiredStudentCalendar() {
  redirect("/app/schedule");
}
