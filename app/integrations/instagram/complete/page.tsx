import InstagramCompleteClient from "./complete-client";

export default async function InstagramCompletePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "error" } = await searchParams;
  return <InstagramCompleteClient status={status} />;
}
