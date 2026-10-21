"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  Plus,
  Sun,
  Moon,
  Folder,
  LayoutDashboard,
  GitBranch,
  Columns3,
  Files,
  Activity,
  Settings,
  Terminal,
  Download,
  Check,
  Play,
  Trash2,
  Search,
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { ProjectAssistant } from "./project-assistant";
import {
  applyRun,
  checkArtifacts,
  demoOutput,
  newProject,
  seed,
  workspaceSchema,
  type Workspace,
  type Project,
  type Run,
} from "@/lib/domain";
type View =
  | "overview"
  | "runs"
  | "files"
  | "changes"
  | "board"
  | "context"
  | "settings"
  | "assistant";
type Config = {
  auth: boolean;
  signedIn: boolean;
  provider: string;
  storage: string;
};
const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["runs", "Agent runs", Activity],
  ["files", "Repository", Files],
  ["changes", "Changes", GitBranch],
  ["board", "Task board", Columns3],
  ["context", "Project context", Terminal],
  ["assistant", "Assistant", Terminal],
  ["settings", "Settings", Settings],
] as const;
const storageKey = "ase-workspace-v3";
export default function Workbench() {
  const [guide, setGuide] = useState(false);
  const guideDialog = useRef<HTMLDialogElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (guide) guideDialog.current?.showModal();
    else guideDialog.current?.close();
  }, [guide]);
  const [data, setData] = useState<Workspace>({ projects: [] }),
    [ready, setReady] = useState(false),
    [config, setConfig] = useState<Config>({
      auth: false,
      signedIn: false,
      provider: "demo",
      storage: "browser",
    }),
    [selected, setSelected] = useState(""),
    [view, setView] = useState<View>("overview"),
    [theme, setTheme] = useState("dark"),
    [query, setQuery] = useState(""),
    [modal, setModal] = useState(false),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [prompt, setPrompt] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [phase, setPhase] = useState(-1),
    [file, setFile] = useState(""),
    [runId, setRunId] = useState(""),
    [saving, setSaving] = useState(false),
    [demo, setDemo] = useState(true);
  const revision = useRef(0),
    loaded = useRef(false),
    saveQueue = useRef(Promise.resolve()),
    dataRef = useRef(data),
    controller = useRef<AbortController | null>(null);
  dataRef.current = data;
  const project = data.projects.find((p) => p.id === selected);
  const run = project?.runs.find((r) => r.id === runId) ?? project?.runs[0];
  const currentFile =
    project?.files.find((f) => f.path === file) ?? project?.files[0];
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const c = await fetch("/api/config").then((r) => r.json());
        if (!active) return;
        setConfig(c);
        setDemo(!c.signedIn || c.provider === "demo");
        let workspace: Workspace;
        if (c.signedIn) {
          const res = await fetch("/api/workspace");
          if (!res.ok)
            throw new Error("Could not load your database workspace.");
          const body = await res.json();
          workspace = workspaceSchema.parse(body.data);
          revision.current = body.revision;
        } else {
          const raw = localStorage.getItem(storageKey);
          workspace = raw ? workspaceSchema.parse(JSON.parse(raw)) : seed();
        }
        if (!active) return;
        setData(workspace);
        setTheme(localStorage.getItem("ase-theme") ?? "dark");
        setGuide(localStorage.getItem("ase-guide-v1") !== "dismissed");
        loaded.current = true;
        setReady(true);
      } catch (e) {
        if (active) {
          setError(
            `Loading failed: ${e instanceof Error ? e.message : "unknown error"}. Your saved data has not been overwritten.`,
          );
          setReady(true);
        }
      }
    }
    load();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    function route() {
      const params = new URLSearchParams(location.hash.slice(1));
      setSelected(params.get("project") ?? "");
      const v = params.get("view");
      setView(nav.some((n) => n[0] === v) ? (v as View) : "overview");
    }
    route();
    addEventListener("hashchange", route);
    return () => removeEventListener("hashchange", route);
  }, []);
  function navigate(v: View, id = selected) {
    location.hash = new URLSearchParams({
      view: v,
      ...(id ? { project: id } : {}),
    }).toString();
    setView(v);
    setSelected(id);
    setFile("");
    setRunId("");
  }
  function commit(next: Workspace) {
    setData(next);
    dataRef.current = next;
    if (!loaded.current) return;
    setError("");
    if (!config.signedIn) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setNotice("Saved in this browser");
      } catch {
        setError(
          "Browser storage is full or disabled. Export your workspace before closing.",
        );
      }
      return;
    }
    setSaving(true);
    saveQueue.current = saveQueue.current
      .then(async () => {
        const res = await fetch("/api/workspace", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: next, revision: revision.current }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        revision.current = body.revision;
        setNotice("Saved to PostgreSQL");
      })
      .catch((e) =>
        setError(
          `Save failed: ${e.message}. Export your changes before reloading.`,
        ),
      )
      .finally(() => setSaving(false));
  }
  function update(p: Project) {
    commit({
      projects: dataRef.current.projects.map((old) =>
        old.id === p.id ? p : old,
      ),
    });
  }
  function create(e: React.FormEvent) {
    e.preventDefault();
    const p = newProject(name.trim(), description.trim());
    commit({ projects: [p, ...dataRef.current.projects] });
    setModal(false);
    setName("");
    setDescription("");
    navigate("overview", p.id);
  }
  async function start() {
    if (!project || prompt.trim().length < 10 || busy) return;
    const target = project;
    const text = prompt.trim();
    setBusy(true);
    setPhase(0);
    setError("");
    navigate("runs", target.id);
    const abort = new AbortController();
    controller.current = abort;
    try {
      let result: {
        mode: Run["mode"];
        output: Run["output"];
        checks: Run["checks"];
      };
      if (demo) {
        const output = demoOutput(text);
        result = { mode: "demo", output, checks: checkArtifacts(output) };
      } else {
        setPhase(1);
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            context: target.context,
            files: target.files
              .slice(0, 20)
              .map(({ path, content }) => ({ path, content })),
          }),
          signal: abort.signal,
        });
        result = await res.json();
        if (!res.ok)
          throw new Error((result as unknown as { error: string }).error);
      }
      setPhase(2);
      const created: Run = {
        id: crypto.randomUUID(),
        prompt: text,
        createdAt: new Date().toISOString(),
        ...result,
      };
      const latest = dataRef.current.projects.find((p) => p.id === target.id);
      if (latest) update(applyRun(latest, created));
      setRunId(created.id);
      setPrompt("");
      setPhase(3);
      setNotice(
        demo
          ? "Demo artifacts created. No model or application tests were run."
          : "Model artifacts saved. Structural checks executed; application tests require a runner.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
      setPhase(-1);
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  function download(content: string, filename: string, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const totalTasks = data.projects.reduce((n, p) => n + p.tasks.length, 0),
    totalRuns = data.projects.reduce((n, p) => n + p.runs.length, 0);
  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <a href="#view=overview" className="brand">
          <span className="brand-mark">
            se<span>↗</span>
          </span>
          <span>
            AI SOFTWARE
            <br />
            <b>ENGINEER</b>
          </span>
        </a>
        <span className="edition">WORKSPACE / VOL. 03</span>
        <div className="top-actions">
          <button ref={helpButton} className="btn btn-outline" onClick={() => setGuide(true)}>
            Help
          </button>
          <span className="mode-label">
            {config.signedIn ? "CONNECTED WORKSPACE" : "LOCAL DEMO"}
          </span>
          <Button
            variant="ghost"
            aria-label="Toggle theme"
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              localStorage.setItem("ase-theme", next);
            }}
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </Button>
          {config.signedIn ? (
            <Button variant="outline" onClick={() => signOut()}>
              Sign out
            </Button>
          ) : config.auth ? (
            <Button variant="outline" onClick={() => signIn("github")}>
              Sign in with GitHub
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("settings")}>
              Setup
            </Button>
          )}
        </div>
      </header>
      <aside className="sidebar">
        <p className="micro">YOUR WORKSPACE</p>
        <button
          className={`nav-link ${!selected ? "active" : ""}`}
          onClick={() => navigate("overview", "")}
        >
          <Folder size={17} />
          All projects<span>{data.projects.length}</span>
        </button>
        <div className="side-rule" />
        <p className="micro">{project ? project.name : "PROJECT TOOLS"}</p>
        {nav.map(([id, label, Icon]) => (
          <button
            key={id}
            disabled={!selected && id !== "settings" && id !== "overview"}
            onClick={() => navigate(id)}
            className={`nav-link ${view === id && Boolean(selected || id === "settings") ? "active" : ""}`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
        <div className="side-note">
          <span className="tiny-square" />
          <b>
            Small steps.
            <br />
            Real progress.
          </b>
          <p>
            {config.signedIn
              ? "Your projects sync to your account."
              : "Demo work is saved in this browser. Export it to take it with you."}
          </p>
          <span className="micro">
            {saving
              ? "SAVING…"
              : config.signedIn
                ? "POSTGRESQL"
                : "BROWSER STORAGE"}
          </span>
        </div>
      </aside>
      <main className="main">
        <dialog ref={guideDialog} className="help-dialog" aria-label="Getting started" onCancel={()=>setGuide(false)} onClose={()=>{setGuide(false);helpButton.current?.focus();}}>
        {guide && (
          <section
            className="panel getting-started"
            onClick={e=>{if((e.target as HTMLElement).closest('button')) setGuide(false);}}
            aria-label="Getting started"
          >
            <div className="panel-top">
              <h2>Start here. Build one useful thing.</h2>
              <Button
                variant="ghost"
                onClick={() => {
                  setGuide(false);
                  localStorage.setItem("ase-guide-v1", "dismissed");
                }}
              >
                Dismiss guide
              </Button>
            </div>
            <p>
              Live mode uses your account and Groq. Local demo uses templates
              saved in this browser. Neither mode currently executes generated
              tests or deploys your code.
            </p>
            <ol>
              <li>
                <b>Create or open a project.</b> Give it a clear name.{" "}
                <Button
                  variant="ghost"
                  onClick={() => navigate("overview", "")}
                >
                  Open projects
                </Button>
              </li>
              <li>
                <b>Set the context.</b> Describe your stack, constraints and
                acceptance criteria.{" "}
                <Button
                  variant="ghost"
                  disabled={!project}
                  onClick={() => navigate("context")}
                >
                  Open project context
                </Button>
              </li>
              <li>
                <b>Request a small feature.</b> Example: “Create a
                dependency-free JavaScript email validator with node:test
                tests.”{" "}
                <Button
                  variant="ghost"
                  disabled={!project}
                  onClick={() => navigate("overview")}
                >
                  Open feature composer
                </Button>
              </li>
              <li>
                <b>Inspect the result.</b> Read the run review, then inspect
                files and proposed changes. Structural checks do not mean
                application tests passed.{" "}
                <Button
                  variant="ghost"
                  disabled={!project}
                  onClick={() => navigate("files")}
                >
                  Inspect files
                </Button>
              </li>
              <li>
                <b>Track your work.</b> Move tasks as you finish them. Download
                and review code before running it in an isolated environment.
                Never run unfamiliar generated code with secrets available.{" "}
                <Button
                  variant="ghost"
                  disabled={!project}
                  onClick={() => navigate("board")}
                >
                  Open task board
                </Button>
              </li>
              <li>
                <b>Ask for help.</b> The assistant explains code and next steps;
                it cannot execute or deploy.{" "}
                <Button
                  variant="ghost"
                  disabled={!project}
                  onClick={() => navigate("assistant")}
                >
                  Ask the assistant
                </Button>
              </li>
            </ol>
            <p className="muted">
              Project actions unlock after you open a project. Reopen this guide
              anytime using Help. Never paste passwords or API keys into
              prompts.
            </p>
          </section>
        )}
        </dialog>
        <div className="breadcrumb">
          <span>Workspace</span>
          <span>/</span>
          <span>{project?.name ?? "Projects"}</span>
          <span className="breadcrumb-end">
            {new Date().toLocaleDateString("en", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {error && (
          <div role="alert" className="alert">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {!ready ? (
          <div className="empty">Loading your workspace…</div>
        ) : view === "settings" ? (
          <>
            <Title
              eyebrow="WORKSPACE SETTINGS"
              title="Make yourself at home."
            />
            <section className="panel">
              <h2>Connection status</h2>
              <div className="settings-grid">
                <Setting
                  name="Authentication"
                  value={
                    config.auth ? "GitHub OAuth configured" : "Not configured"
                  }
                />
                <Setting
                  name="Storage"
                  value={
                    config.signedIn
                      ? "PostgreSQL, scoped to your GitHub identity"
                      : "Local browser storage"
                  }
                />
                <Setting name="Model provider" value={config.provider} />
                <Setting
                  name="Runtime"
                  value="Next.js server + route handlers"
                />
              </div>
              <p className="muted">
                Demo mode creates labeled example artifacts. Live generation
                requires sign-in and a server provider. Configure environment
                variables using web/.env.example.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  download(
                    JSON.stringify(data, null, 2),
                    "workspace.json",
                    "application/json",
                  )
                }
              >
                <Download size={16} />
                Export workspace
              </Button>
            </section>
            <section className="panel">
              <h2>About checks and deployment</h2>
              <p>
                Runs validate artifact structure and paths. Generated
                application code is not executed on this server. Deployment
                status remains “not deployed” until you deploy your exported
                project.
              </p>
              <a
                href="https://github.com/Aryan2k4/AI-Software-Engineer"
                target="_blank"
                rel="noreferrer"
              >
                Source and setup instructions ↗
              </a>
            </section>
          </>
        ) : !selected ? (
          <>
            <Title
              eyebrow="THE ENGINEERING DESK"
              title={
                <>
                  Less busywork.
                  <br />
                  <span>More building.</span>
                </>
              }
              description="Your ideas, working files, and next steps. All in one place."
              action={
                <Button onClick={() => setModal(true)}>
                  <Plus size={17} />
                  New project
                </Button>
              }
            />
            <div className="metrics">
              <Metric n={data.projects.length} label="Projects on the desk" />
              <Metric n={totalRuns} label="Saved engineering runs" />
              <Metric n={totalTasks} label="Tasks mapped out" />
              <Metric
                n={data.projects.reduce(
                  (n, p) =>
                    n + p.tasks.filter((t) => t.status === "Done").length,
                  0,
                )}
                label="Tasks completed"
              />
            </div>
            <div className="section-heading">
              <h2>
                On your desk <span>({data.projects.length})</span>
              </h2>
              <label className="search">
                <Search size={16} />
                <input
                  aria-label="Search projects"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a project"
                />
              </label>
            </div>
            <div className="projects">
              {data.projects
                .filter((p) =>
                  (p.name + " " + p.description)
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((p, i) => (
                  <button
                    className={`project-card color-${i % 3}`}
                    key={p.id}
                    onClick={() => navigate("overview", p.id)}
                  >
                    <div className="card-top">
                      <span className="micro">
                        PROJECT / {String(i + 1).padStart(2, "0")}
                      </span>
                      <ArrowUpRight size={22} />
                    </div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.description ||
                        "A fresh start. Open this project to describe your first feature."}
                    </p>
                    <div className="card-footer">
                      <span>{p.runs.length} runs</span>
                      <span>
                        {p.tasks.filter((t) => t.status === "Done").length}/
                        {p.tasks.length} tasks done
                      </span>
                    </div>
                  </button>
                ))}
            </div>
            {!data.projects.length && (
              <div className="empty">
                Your desk is clear. Create a project to begin.
              </div>
            )}
            {query &&
              !data.projects.some((p) =>
                (p.name + " " + p.description)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              ) && <div className="empty">No projects match “{query}”.</div>}
            <div className="desk-note">
              <span>↳</span>
              <p>
                <b>A place for unfinished ideas.</b>
                <br />
                Open a project, describe a feature, and work through the next
                step.
              </p>
              <span className="micro">PLAN → IMPLEMENT → CHECK → REVIEW</span>
            </div>
          </>
        ) : !project ? (
          <div className="empty">
            This project does not exist.{" "}
            <Button onClick={() => navigate("overview", "")}>
              Back to projects
            </Button>
          </div>
        ) : (
          <>
            <button className="back" onClick={() => navigate("overview", "")}>
              <ArrowLeft size={14} />
              All projects
            </button>
            <Title
              eyebrow={`PROJECT / ${nav.find((n) => n[0] === view)?.[1].toUpperCase()}`}
              title={project.name}
              description={project.description}
            />
            {view === "overview" && (
              <>
                <div className="metrics">
                  <Metric n={project.runs.length} label="Runs recorded" />
                  <Metric n={project.files.length} label="Working files" />
                  <Metric
                    n={project.tasks.filter((t) => t.status === "Done").length}
                    label="Tasks completed"
                  />
                  <Metric
                    n={project.messages.length}
                    label="Conversation entries"
                  />
                </div>
                <section className="composer">
                  <div className="panel-top">
                    <b>What are we building next?</b>
                    <span className="micro">
                      {demo ? "DEMO TEMPLATE" : "SERVER INFERENCE"}
                    </span>
                  </div>
                  <textarea
                    aria-label="Feature request"
                    value={prompt}
                    maxLength={6000}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a feature, the people using it, and what should happen…"
                  />
                  <div className="composer-footer">
                    <span>At least 10 characters. {prompt.length}/6000</span>
                    <Button
                      disabled={prompt.trim().length < 10 || busy}
                      onClick={start}
                    >
                      <Play size={16} />
                      {busy ? "Working…" : "Start engineering run"}
                    </Button>
                  </div>
                  {config.signedIn && config.provider !== "demo" && (
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={demo}
                        onChange={(e) => setDemo(e.target.checked)}
                      />
                      Use demo templates instead of the model
                    </label>
                  )}
                </section>
                <div className="two-col">
                  <section className="panel">
                    <h2>Recent work</h2>
                    {project.runs.length ? (
                      project.runs.slice(0, 3).map((r) => (
                        <button
                          className="list-row"
                          key={r.id}
                          onClick={() => {
                            navigate("runs");
                            setRunId(r.id);
                          }}
                        >
                          <span>
                            {r.prompt.slice(0, 80)}
                            <small>
                              {r.mode} ·{" "}
                              {new Date(r.createdAt).toLocaleString()}
                            </small>
                          </span>
                          <ArrowUpRight size={17} />
                        </button>
                      ))
                    ) : (
                      <p className="muted">
                        No runs yet. Start with a feature above.
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Delivery status</h2>
                    <p className="status-pill">Not deployed</p>
                    <p className="muted">
                      Review generated files and run application tests before
                      releasing. Structural validation is recorded per run.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate("changes")}
                    >
                      Review changes <ArrowUpRight size={15} />
                    </Button>
                  </section>
                </div>
              </>
            )}
            {view === "runs" && (
              <>
                <div className="timeline">
                  {["Plan", "Implement", "Check", "Review"].map((step, i) => (
                    <div
                      key={step}
                      className={
                        busy && i === phase ? "current" : run ? "complete" : ""
                      }
                    >
                      <span>
                        {run && !busy ? (
                          <Check size={16} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <b>{step}</b>
                      <small>
                        {busy
                          ? i === phase
                            ? "Working…"
                            : "Pending"
                          : run
                            ? i === 2
                              ? "Structural checks"
                              : "Artifact available"
                            : "Waiting"}
                      </small>
                    </div>
                  ))}
                </div>
                {busy && (
                  <div className="panel" role="status">
                    Generating artifacts…{" "}
                    <Button
                      variant="outline"
                      onClick={() => controller.current?.abort()}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <div className="two-col">
                  <section className="panel">
                    <h2>Run history</h2>
                    {project.runs.map((r) => (
                      <button
                        className={`list-row ${r.id === run?.id ? "selected" : ""}`}
                        onClick={() => setRunId(r.id)}
                        key={r.id}
                      >
                        <span>
                          {r.prompt.slice(0, 90)}
                          <small>
                            {r.mode} · {new Date(r.createdAt).toLocaleString()}
                          </small>
                        </span>
                      </button>
                    ))}
                    {!run && (
                      <p>No runs yet. Start from the project overview.</p>
                    )}
                  </section>
                  {run && (
                    <section className="panel">
                      <div className="panel-top">
                        <h2>Feature specification</h2>
                        <span className="status-pill">{run.mode}</span>
                      </div>
                      <pre className="prose-pre">{run.output.summary}</pre>
                      <h3>Review</h3>
                      <p className="prose-pre">{run.output.review}</p>
                      <h3>Checks actually performed</h3>
                      {run.checks.map((c) => (
                        <p key={c.name} className="check-row">
                          {c.passed ? "✓" : "×"} {c.name}
                          <small>{c.detail}</small>
                        </p>
                      ))}
                      <p className="muted">
                        Application test execution: not run. Deployment: not
                        run.
                      </p>
                      <Button onClick={() => navigate("changes")}>
                        Inspect generated code <ArrowUpRight size={16} />
                      </Button>
                    </section>
                  )}
                </div>
              </>
            )}
            {view === "files" && (
              <section className="panel">
                <div className="panel-top">
                  <h2>Working files</h2>
                  <Button
                    variant="outline"
                    disabled={!currentFile}
                    onClick={() =>
                      currentFile &&
                      download(
                        currentFile.content,
                        currentFile.path.split("/").pop()!,
                      )
                    }
                  >
                    <Download size={15} />
                    Download file
                  </Button>
                </div>
                {!currentFile ? (
                  <div className="empty">
                    No files yet. Run a feature to create artifacts.
                  </div>
                ) : (
                  <div className="file-layout">
                    <nav aria-label="Files">
                      {project.files.map((f) => (
                        <button
                          key={f.path}
                          className={
                            currentFile.path === f.path ? "selected" : ""
                          }
                          onClick={() => setFile(f.path)}
                        >
                          <Files size={14} />
                          {f.path}
                        </button>
                      ))}
                    </nav>
                    <div>
                      <div className="file-caption">{currentFile.path}</div>
                      <pre className="code">
                        {currentFile.content.split("\n").map((line, i) => (
                          <div key={i}>
                            <span className="line-number">{i + 1}</span>
                            {line || " "}
                          </div>
                        ))}
                      </pre>
                      <p className="muted">{currentFile.explanation}</p>
                    </div>
                  </div>
                )}
              </section>
            )}
            {view === "changes" && (
              <section className="panel">
                <div className="panel-top">
                  <h2>Latest proposed changes</h2>
                  <Button
                    variant="outline"
                    disabled={!run}
                    onClick={() =>
                      run &&
                      download(
                        JSON.stringify(run.output, null, 2),
                        "artifacts.json",
                        "application/json",
                      )
                    }
                  >
                    <Download size={15} />
                    Export artifacts
                  </Button>
                </div>
                {run ? (
                  run.output.files.map((f) => {
                    const previous = project.runs[1]?.output.files.find(
                      (old) => old.path === f.path,
                    );
                    return (
                      <article className="diff" key={f.path}>
                        <h3>
                          {f.path}
                          <span>{previous ? "Modified" : "New file"}</span>
                        </h3>
                        <p>{f.explanation}</p>
                        {previous && (
                          <pre className="removed">
                            {previous.content.split("\n").map((line, i) => (
                              <div key={i}>− {line}</div>
                            ))}
                          </pre>
                        )}
                        <pre className="added">
                          {f.content.split("\n").map((line, i) => (
                            <div key={i}>+ {line}</div>
                          ))}
                        </pre>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty">No changes to inspect yet.</div>
                )}
              </section>
            )}
            {view === "board" && (
              <>
                <form
                  className="task-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const title = new FormData(form)
                      .get("task")
                      ?.toString()
                      .trim();
                    if (title) {
                      update({
                        ...project,
                        tasks: [
                          ...project.tasks,
                          { id: crypto.randomUUID(), title, status: "Backlog" },
                        ],
                      });
                      form.reset();
                    }
                  }}
                >
                  <input
                    name="task"
                    required
                    maxLength={500}
                    placeholder="Add a task to the backlog"
                    aria-label="New task"
                  />
                  <Button>
                    <Plus size={16} />
                    Add task
                  </Button>
                </form>
                <div className="kanban">
                  {(["Backlog", "In progress", "Done"] as const).map(
                    (status) => (
                      <section className="kanban-column" key={status}>
                        <h2>
                          {status}
                          <span>
                            {
                              project.tasks.filter((t) => t.status === status)
                                .length
                            }
                          </span>
                        </h2>
                        {project.tasks
                          .filter((t) => t.status === status)
                          .map((t) => (
                            <article className="task" key={t.id}>
                              <p>{t.title}</p>
                              <div>
                                <select
                                  aria-label={`Status for ${t.title}`}
                                  value={status}
                                  onChange={(e) =>
                                    update({
                                      ...project,
                                      tasks: project.tasks.map((old) =>
                                        old.id === t.id
                                          ? {
                                              ...old,
                                              status: e.target
                                                .value as typeof status,
                                            }
                                          : old,
                                      ),
                                    })
                                  }
                                >
                                  {["Backlog", "In progress", "Done"].map(
                                    (s) => (
                                      <option key={s}>{s}</option>
                                    ),
                                  )}
                                </select>
                                <button
                                  aria-label={`Delete task ${t.title}`}
                                  onClick={() =>
                                    update({
                                      ...project,
                                      tasks: project.tasks.filter(
                                        (old) => old.id !== t.id,
                                      ),
                                    })
                                  }
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </article>
                          ))}
                        {!project.tasks.some((t) => t.status === status) && (
                          <p className="muted">Nothing here yet.</p>
                        )}
                      </section>
                    ),
                  )}
                </div>
              </>
            )}
            {view === "assistant" && (
              <>
                <ProjectAssistant
                  key={project.id}
                  project={project}
                  enabled={config.signedIn && config.provider === "groq"}
                  onReply={(question, reply) => {
                    const latest = dataRef.current.projects.find(
                      (p) => p.id === project.id,
                    );
                    if (!latest) return;
                    const at = new Date().toISOString();
                    update({
                      ...latest,
                      messages: [
                        ...latest.messages,
                        {
                          id: crypto.randomUUID(),
                          role: "user" as const,
                          text: question,
                          at,
                        },
                        {
                          id: crypto.randomUUID(),
                          role: "assistant" as const,
                          text: reply,
                          at,
                        },
                      ].slice(-100),
                    });
                  }}
                />
                <section className="panel">
                  <h2>Project conversation</h2>
                  {project.messages.map((m) => (
                    <article className={`message ${m.role}`} key={m.id}>
                      <span className="micro">
                        {m.role === "user" ? "YOU" : "ENGINEER"}
                      </span>
                      <p className="prose-pre">{m.text}</p>
                    </article>
                  ))}
                  {!project.messages.length && (
                    <p>No messages yet. Ask your first question above.</p>
                  )}
                </section>
              </>
            )}
            {view === "context" && (
              <>
                <section className="panel">
                  <h2>Project memory</h2>
                  <p className="muted">
                    Architecture decisions, constraints, conventions, and
                    context included in the next model request.
                  </p>
                  <form
                    key={project.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      update({
                        ...project,
                        context: new FormData(e.currentTarget)
                          .get("context")!
                          .toString(),
                      });
                    }}
                  >
                    <textarea
                      name="context"
                      aria-label="Project context"
                      defaultValue={project.context}
                      maxLength={12000}
                      placeholder="What should the engineer know about this project?"
                    />
                    <Button>Save context</Button>
                  </form>
                </section>
                <section className="panel">
                  <h2>Conversation history</h2>
                  {project.messages.map((m) => (
                    <article className={`message ${m.role}`} key={m.id}>
                      <span className="micro">
                        {m.role === "user" ? "YOU" : "ENGINEER"} ·{" "}
                        {new Date(m.at).toLocaleString()}
                      </span>
                      <p className="prose-pre">{m.text}</p>
                    </article>
                  ))}
                  {!project.messages.length && (
                    <p className="muted">
                      Your feature requests and specifications will appear here.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}
        <footer>
          AI SOFTWARE ENGINEER <span>Built one decision at a time.</span>
          <span>
            {config.signedIn ? "Account workspace" : "Demo · no API charges"}
          </span>
        </footer>
      </main>
      {modal && (
        <div
          className="modal-backdrop"
          onKeyDown={(e) => e.key === "Escape" && setModal(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
            className="modal"
          >
            <span className="micro">A FRESH START</span>
            <h2 id="create-title">Put it on the desk.</h2>
            <form onSubmit={create}>
              <label>
                Project name
                <input
                  autoFocus
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Team issue tracker"
                />
              </label>
              <label>
                A little context
                <textarea
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Who is it for? What problem does it solve?"
                />
              </label>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModal(false)}
                >
                  Cancel
                </Button>
                <Button disabled={!name.trim()}>
                  Create project <ArrowUpRight size={16} />
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Title({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="micro eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="subtitle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Metric({ n, label }: { n: number; label: string }) {
  return (
    <div className="metric">
      <strong>{String(n).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}
function Setting({ name, value }: { name: string; value: string }) {
  return (
    <div>
      <span className="micro">{name}</span>
      <p>{value}</p>
    </div>
  );
}
