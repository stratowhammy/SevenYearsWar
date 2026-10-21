import { redirect } from "next/navigation";
import { DEFAULT_GAME_ID, ensureDefaultGameExists } from "@/prisma/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureDefaultGameExists();
  redirect(`/game/${DEFAULT_GAME_ID}`);
}
