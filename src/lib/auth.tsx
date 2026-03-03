"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "./supabase";
import { db } from "./db";
import { fullSync, startSyncListeners, flushQueue } from "./sync";
import type { User } from "@supabase/supabase-js";
import MigrationPrompt from "@/components/MigrationPrompt";

interface AuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtpCode: (email: string, code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMigration, setShowMigration] = useState(false);
  const [localBookCount, setLocalBookCount] = useState(0);
  const syncCleanupRef = useRef<(() => void) | null>(null);
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setIsLoading(false);
      if (sessionUser) {
        initSync(sessionUser);
      }
    });

    // Listen for auth changes (only act on sign-in/sign-out, not token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUser = session?.user ?? null;
        setUser(newUser);
        if (!newUser) {
          syncCleanupRef.current?.();
          syncCleanupRef.current = null;
          syncedUserRef.current = null;
        } else if (event === "SIGNED_IN") {
          initSync(newUser);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      syncCleanupRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function initSync(currentUser: User) {
    if (!supabase || !db) return;

    // Skip if already initialized for this user
    if (syncedUserRef.current === currentUser.id) return;
    syncedUserRef.current = currentUser.id;

    // Start sync listeners (online/offline, periodic)
    syncCleanupRef.current?.();
    syncCleanupRef.current = startSyncListeners();

    // Check if this is a first sign-in (no sync_metadata for this user)
    const { data: syncMeta } = await supabase
      .from("sync_metadata")
      .select("last_synced_at")
      .eq("user_id", currentUser.id)
      .single();

    const isFirstSync = !syncMeta;
    const count = await db.books.count();

    if (isFirstSync && count > 0) {
      // Local books exist and never synced before — show migration prompt
      setLocalBookCount(count);
      setShowMigration(true);
    } else {
      // Returning user or no local books — just sync
      fullSync();
    }
  }

  const migrationInProgressRef = useRef(false);

  async function handleMigrationUpload() {
    if (migrationInProgressRef.current || !supabase || !db) return;
    migrationInProgressRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Batch-add all books to sync queue, then flush once
      const localBooks = await db.books.toArray();
      for (const book of localBooks) {
        await db.sync_queue.add({
          bookId: book.id,
          operation: "upsert" as const,
          payload: book,
          createdAt: Date.now(),
        });
      }
      const { failed } = await flushQueue();
      if (failed > 0) {
        console.warn(`Migration: ${failed} book(s) failed to sync — they will sync when edited`);
      }
      setShowMigration(false);
    } finally {
      migrationInProgressRef.current = false;
    }
  }

  function handleMigrationSkip() {
    setShowMigration(false);
    fullSync();
  }

  const signInWithOtp = useCallback(async (email: string) => {
    if (!supabase) return { error: "Not available on server" };
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtpCode = useCallback(async (email: string, code: string) => {
    if (!supabase) return { error: "Not available on server" };
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext value={{
      user,
      isSignedIn: !!user,
      isLoading,
      signInWithOtp,
      verifyOtpCode,
      signOut,
    }}>
      {children}
      {showMigration && (
        <MigrationPrompt
          bookCount={localBookCount}
          onUpload={handleMigrationUpload}
          onSkip={handleMigrationSkip}
        />
      )}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
