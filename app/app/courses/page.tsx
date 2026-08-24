import { redirect } from "next/navigation";

// Retired in M12 (SPEC §15.7 #24): My courses and the catalog moved to the
// home. Individual courses live on at /app/courses/[id].
export default function RetiredStudentCourses() {
  redirect("/app");
}
