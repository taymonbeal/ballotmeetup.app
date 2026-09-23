import Link from "next/link";
import { Suspense } from "react";

import { SocialLinks } from "@/components/social-links";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/meetup";
import { createClient } from "@/lib/supabase/server";

async function HeaderUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  if (!userId) {
    return (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth/sign-up">Sign up</Link>
        </Button>
      </div>
    );
  }

  const profile = await getProfile(supabase, userId);

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href="/meetup" className="hover:underline">
        Meetup
      </Link>
      {profile?.is_admin && (
        <Link href="/admin" className="hover:underline">
          Moderator
        </Link>
      )}
      <span className="hidden text-muted-foreground sm:inline">
        {profile?.display_name}
      </span>
      <LogoutButton />
    </div>
  );
}

export function SiteHeader() {
  return (
    <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
      <div className="flex w-full max-w-5xl items-center justify-between gap-3 p-3 px-5 text-sm">
        <Link href="/" className="font-semibold">
          Ballot Meetup
        </Link>
        <div className="flex items-center gap-4">
          <Suspense fallback={null}>
            <HeaderUser />
          </Suspense>
          <div className="flex items-center">
            <SocialLinks />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
}
