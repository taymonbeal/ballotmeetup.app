"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Binary toggle following https://lea.verou.me/blog/2026/dark-mode-toggles/:
// the underlying preference still has three states (light/dark/system), but
// the control only ever shows two, and only stores an explicit override when
// that override actually differs from the OS setting. This is evaluated
// solely on click, never in response to the OS setting changing on its own.
const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, systemTheme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const toggleTheme = () => {
    const target = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(target === systemTheme ? "system" : target);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={
        resolvedTheme === "dark"
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
    >
      {resolvedTheme === "dark" ? (
        <Moon size={ICON_SIZE} className="text-muted-foreground" />
      ) : (
        <Sun size={ICON_SIZE} className="text-muted-foreground" />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
