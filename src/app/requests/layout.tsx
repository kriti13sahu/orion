import Nav from "@/components/nav";

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}
