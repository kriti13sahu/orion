import Nav from "@/components/nav";

export default function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
