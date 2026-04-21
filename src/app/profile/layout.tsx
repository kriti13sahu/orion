import Nav from "@/components/nav";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
