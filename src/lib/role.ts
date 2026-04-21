export type Role = "student" | "alumni";

export function getRole(graduation_year: number): Role {
  const now = new Date();
  const graduationDate = new Date(`${graduation_year}-05-01`);
  return now < graduationDate ? "student" : "alumni";
}
