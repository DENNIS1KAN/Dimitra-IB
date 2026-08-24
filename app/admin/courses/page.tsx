import { redirect } from "next/navigation";

// The old course list retired in M11 (SPEC §15.7 #23): the cards live on
// the home, the create form at /admin/courses/new, per-course editing in
// /admin/courses/[id].
export default function RetiredAdminCourses() {
  redirect("/admin");
}
