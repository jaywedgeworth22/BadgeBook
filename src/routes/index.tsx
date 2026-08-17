import { createFileRoute } from "@tanstack/react-router";
import { CrestApp } from "@/components/crest-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <CrestApp />;
}
