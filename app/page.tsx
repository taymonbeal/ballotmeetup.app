import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

async function HomeCallToAction() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  return data?.claims ? (
    <Button asChild size="lg">
      <Link href="/meetup">Go to the meetup</Link>
    </Button>
  ) : (
    <div className="flex gap-3">
      <Button asChild size="lg">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-5 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">
          Massachusetts 2026 General Election
        </h1>
        <p className="text-lg text-muted-foreground">
          A ballot meetup works through the ballot one contest at a time: the
          group discusses a race, then votes on whether to recommend each
          candidate. This app keeps everyone on the same candidate at the same
          time and shows the moderator who still needs to vote.
        </p>
      </div>
      <Suspense fallback={null}>
        <HomeCallToAction />
      </Suspense>
    </div>
  );
}
