"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import type { Project } from "@/lib/domain";
export function ProjectAssistant({
  project,
  enabled,
  onReply,
}: {
  project: Project;
  enabled: boolean;
  onReply: (question: string, reply: string) => void;
}) {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="panel" aria-label="Project assistant">
      <h2>Ask your engineer</h2>
      <p className="muted">
        Ask about this project or how to use the workspace. Replies are
        advice—not executed changes. Recent conversation, project context and up
        to five file excerpts are sent to Groq.
      </p>
      {!enabled && (
        <p>
          Sign in with a configured Groq connection to chat. Demo mode does not
          simulate assistant replies.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy || !question.trim()) return;
          setBusy(true);
          setError("");
          const text = question.trim();
          try {
            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: text,
                context: project.context,
                files: project.files
                  .slice(0, 5)
                  .map((f) => ({
                    path: f.path,
                    content: f.content.slice(0, 8000),
                  })),
                messages: project.messages
                  .slice(-8)
                  .map((m) => ({ role: m.role, text: m.text.slice(0, 4000) })),
              }),
              signal: AbortSignal.timeout(100000),
            });
            const body = await response.json();
            if (!response.ok) throw new Error(body.error || "Chat failed");
            onReply(text, body.reply);
            setQuestion("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Chat failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="assistant-question">Your question</label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={4000}
          placeholder="Explain the generated tests and what I should verify next."
          disabled={busy || !enabled}
        />
        <Button disabled={busy || !enabled || !question.trim()}>
          {busy ? "Thinking…" : "Send to assistant"}
        </Button>
        {busy && (
          <p role="status">
            Waiting for Groq. You can keep this view open while it responds.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
