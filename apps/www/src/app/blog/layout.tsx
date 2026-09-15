import PageWrapper from "@/components/Container/PageWrapper";

export default function BlogLayout({
  children,
}: { children: React.ReactNode }) {
  return <PageWrapper>{children}</PageWrapper>;
}
