"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "@/lib/preferences";
import SyncIndicator from "./SyncIndicator";

interface HeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  isSearchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}

export default function Header({ searchQuery, onSearchChange, isSearchOpen = false, onSearchOpenChange }: HeaderProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";
  const hasSearch = Boolean(onSearchChange);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  function handleClose() {
    inputRef.current?.blur();
    onSearchOpenChange?.(false);
    onSearchChange?.("");
    // iOS Safari safety net: force viewport reset after keyboard dismiss
    setTimeout(() => {
      window.scrollTo(0, window.scrollY);
    }, 100);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      handleClose();
    }
  }

  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border-subtle">
      <AnimatePresence mode="wait">
        {isSearchOpen ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, width: "40px" }}
            animate={{ opacity: 1, width: "100%" }}
            exit={{ opacity: 0, width: "40px" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2 flex-1 mr-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-subtle flex-shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // iOS Safari: reset viewport after keyboard dismiss
                setTimeout(() => window.scrollTo(0, window.scrollY), 100);
              }}
              placeholder={t("header_searchPlaceholder")}
              className="flex-1 bg-transparent text-forest text-sm placeholder:text-subtle"
            />
            <button
              onClick={handleClose}
              className="p-3 -mr-1 rounded-md hover:bg-forest/5 transition-colors text-subtle hover:text-muted"
              aria-label={t("header_closeSearch")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            {!isHome && (
              <button
                onClick={() => router.back()}
                className="p-3 -ml-3 rounded-lg hover:bg-forest/5 transition-colors text-forest"
                aria-label={t("header_back")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link
              href="/"
              className="font-serif text-2xl text-forest tracking-tight transition-opacity hover:opacity-70"
            >
              My Tsundoku
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-1">
        <SyncIndicator />
        {hasSearch && !isSearchOpen && (
          <button
            onClick={() => onSearchOpenChange?.(true)}
            className="p-3 rounded-lg hover:bg-forest/5 transition-colors"
            aria-label={t("header_search")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        )}
        <Link
          href="/settings"
          className="p-3 rounded-lg hover:bg-forest/5 transition-colors"
          aria-label={t("header_settings")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
