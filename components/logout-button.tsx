"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // A full navigation, not router.push: the header reads the session
    // server-side, and a client-side transition (even with router.refresh())
    // leaves it showing the signed-in state until a manual reload.
    window.location.href = "/auth/login";
  };

  return <Button onClick={logout}>Logout</Button>;
}
