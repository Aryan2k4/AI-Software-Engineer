"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>Something interrupted the workspace.</h1>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
