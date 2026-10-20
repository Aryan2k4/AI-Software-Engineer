import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowUpRight, Bot, Braces, ChevronRight, CircleDot, Cpu,
  FileCode2, FolderGit2, GitPullRequest, Layers3, Play, Plus, Radio,
  Server, ShieldCheck, Sparkles, Sun, Moon, TestTube2
} from "lucide-react";

type Run = { name: string; status: "ready" | "running" | "passed"; time: string };

const activity = [
  ["01", "ARCHITECT", "Mapped domain boundaries", "done"],
  ["02", "BUILDER", "Generated auth middleware", "done"],
  ["03", "TESTER", "Executing contract suite", "live"],
  ["04", "REVIEWER", "Queued for security pass", "queued"],
] as const;

const files = ["app", "  api", "    agents", "    projects", "  core", "  services", "tests", "docker-compose.yml"];

export function CommandCenterPage() {
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([
    { name: "identity-service", status: "passed", time: "12m ago" },
    { name: "billing-console", status: "passed", time: "47m ago" },
    { name: "agent-memory", status: "ready", time: "draft" },
  ]);
  const [activeTab, setActiveTab] = useState("overview");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const healthy = useMemo(() => runs.filter((run) => run.status === "passed").length, [runs]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("workbench-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  const toggleTheme = () => setTheme((currentTheme) => {
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    localStorage.setItem("workbench-theme", nextTheme);
    return nextTheme;
  });

  const launchRun = () => {
    if (!prompt.trim()) return;
    setIsRunning(true);
    const name = prompt.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "new-spec";
    setRuns((old) => [{ name, status: "running", time: "now" }, ...old]);
    window.setTimeout(() => {
      setRuns((old) => old.map((item, index) => index === 0 ? { ...item, status: "passed" } : item));
      setIsRunning(false);
      setPrompt("");
    }, 1800);
  };

  return (
    <div className={`command-shell neo-${theme}`}>
      <header className="command-header">
        <a className="brand" href="/" aria-label="Software engineer workbench"><span>SE</span><strong>THE<br />WORKBENCH</strong></a>
        <div className="system-pulse"><Radio size={14} /> YOUR SPACE IS READY <b>LOCAL-FIRST</b></div>
        <div className="header-actions"><button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><button className="plain-button" onClick={() => document.getElementById("recent-work")?.scrollIntoView({ behavior: "smooth" })}>NOTES <ArrowUpRight size={15} /></button><button className="square-button" onClick={() => document.getElementById("project-idea")?.focus()} aria-label="Create project"><Plus size={20} /></button></div>
      </header>

      <aside className="command-rail">
        <div className="rail-label">MY WORKSPACE / 01</div>
        {[[Layers3, "overview"], [Bot, "workbench"], [FolderGit2, "files"], [Activity, "activity"]].map(([Icon, name]) => (
          <button key={String(name)} className={`rail-item ${activeTab === name ? "active" : ""}`} onClick={() => setActiveTab(String(name))}>
            <Icon size={18} /><span>{String(name)}</span>
          </button>
        ))}
        <div className="rail-bottom"><div className="avatar">AK</div><span>MADE BY<br />A HUMAN</span></div>
      </aside>

      <main className="command-main">
        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">// A CALMER WAY TO BUILD SOFTWARE</p>
            <h1>MAKE GOOD<br /><em>STUFF.</em></h1>
            <p className="hero-description">A place to shape a fuzzy idea into a clear plan, keep the work moving, and leave a trail your future self will thank you for.</p>
            <div className="hero-facts"><span><b>07</b> SMALL STEPS</span><span><b>100%</b> YOUR MACHINE</span><span><b>{healthy}/3</b> THINGS FINISHED</span></div>
          </div>
          <div className="agent-orbit" aria-label="Agent orchestration visualization">
            <div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" />
            <div className="orbit-node core"><Bot size={28} /><small>YOUR PLAN</small></div>
            <div className="orbit-node n1"><Braces size={18} /><small>MAKE</small></div>
            <div className="orbit-node n2"><TestTube2 size={18} /><small>CHECK</small></div>
            <div className="orbit-node n3"><ShieldCheck size={18} /><small>SHARE</small></div>
          </div>
        </section>

        <section className="intent-panel">
          <div className="intent-top"><span><Sparkles size={16} /> START WITH A THOUGHT</span><kbd>⌘ ↵ TO MAKE A PLAN</kbd></div>
          <textarea id="project-idea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What would you like to make? Start messy — you can sharpen it as you go." aria-label="Project idea" />
          <div className="intent-bottom"><span>PRIVATE BY DEFAULT · <b>STAYS ON YOUR MACHINE</b></span><button onClick={launchRun} disabled={!prompt.trim() || isRunning}>{isRunning ? <><Cpu className="spin" size={16} /> PUTTING IT TOGETHER</> : <><Play size={16} fill="currentColor" /> MAKE A PLAN</>}</button></div>
        </section>

        <div className="console-grid">
          <section className="brutal-panel activity-panel"><div className="panel-heading"><span>WHAT'S HAPPENING</span><span className="live-dot">NOW</span></div>
            <div className="activity-list">{activity.map(([number, agent, copy, state]) => <div className="activity-row" key={number}><b>{number}</b><div className={`status-mark ${state}`} /> <div><strong>{agent}</strong><p>{copy}</p></div><ChevronRight size={16} /></div>)}</div>
          </section>
          <section className="brutal-panel code-panel"><div className="panel-heading"><span>THE FOLDER YOU'RE IN</span><FileCode2 size={16} /></div><div className="code-layout"><pre>{files.map((f, i) => <div key={i} className={f.trim() === "services" ? "selected-file" : ""}>{f}</div>)}</pre><div className="code-preview"><p><i>01</i> <b>class</b> ProjectNotebook:</p><p><i>02</i> &nbsp;&nbsp;<b>async def</b> make_a_plan(idea):</p><p><i>03</i> &nbsp;&nbsp;&nbsp;&nbsp;notes = await clarify(idea)</p><p><i>04</i> &nbsp;&nbsp;&nbsp;&nbsp;<b>return</b> build_with_care(notes)</p><p><i>05</i></p><p><i>06</i> <span># Small, useful, yours.</span></p></div></div></section>
        </div>

        <section id="recent-work" className="run-section"><div className="section-title"><span>THINGS YOU'VE BEEN MAKING</span><button onClick={() => document.getElementById("project-idea")?.focus()}>START ANOTHER <ArrowUpRight size={14} /></button></div><div className="runs-grid">{runs.map((run) => <article className="run-card" key={`${run.name}-${run.time}`}><div className="run-card-top"><span className={`run-status ${run.status}`}><CircleDot size={14} /> {run.status === "passed" ? "GOOD TO GO" : run.status === "running" ? "IN PROGRESS" : "SAVED IDEA"}</span><span>{run.time}</span></div><h3>{run.name}</h3><p>Think it through → make it → check it</p><div className="run-footer"><GitPullRequest size={15} /> 4 useful notes <ArrowUpRight size={15} /></div></article>)}</div></section>
      </main>

      <footer className="command-footer"><span>THE WORKBENCH / v2.0.0</span><span>DESIGNED WITH ROOM TO THINK</span><span><Server size={13} /> ALL GOOD HERE</span></footer>
    </div>
  );
}
