/**
 * Settings form to unlock Gemini features with the owner-issued access code.
 */

"use client";

import { useState } from "react";
import { Button, Card, CardContent, Label } from "@ui/components";
import { useAuth } from "@/contexts/AuthContext";
import { userHasAiAccess } from "@/lib/ai-access";
import { unlockAi } from "@/lib/api/auth";
import { PasswordInput } from "@/components/password-input";
import { CARD_PADDING_COMPACT } from "@/lib/layout";

export function UnlockAiForm() {
  const { user, setUser } = useAuth();
  const unlocked = userHasAiAccess(user);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (unlocked) {
    return (
      <Card variant="default">
        <CardContent className={CARD_PADDING_COMPACT}>
          <p className="text-sm text-foreground">
            AI features are unlocked on this account (summaries, resume parse, and tailor).
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await unlockAi(password);
      if (user) {
        setUser({
          ...user,
          aiEnabled: updated.aiEnabled,
        });
      }
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unlock AI");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card variant="default">
      <CardContent className={CARD_PADDING_COMPACT}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You are in preview mode. Enter an access code to enable AI summaries, resume parsing, and resume tailoring.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ai-access-code">Access code</Label>
            <PasswordInput
              id="ai-access-code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
              autoComplete="off"
              placeholder="Access code"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting || !password.trim()}>
            {submitting ? "Unlocking…" : "Unlock AI"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
