"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  Command,
  FileText,
  GitBranch,
  Instagram,
  KanbanSquare,
  LayoutDashboard,
  Library,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { ContentItem, ModuleView, NewContentModal } from "./modules";

export type BrandAccount = {
  id: number;
  name: string;
  handle: string;
  platform: string;
  initials: string;
  accent: string;
  connectionStatus: string;
};

const navigation = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Banco de ideias", icon: Lightbulb },
  { label: "Cascatas", icon: GitBranch },
  { label: "Em produção", icon: KanbanSquare },
  { label: "Calendário", icon: CalendarDays },
  { label: "Biblioteca", icon: Library },
  { label: "Resultados", icon: BarChart3 },
];

const workspace = [
  { label: "Automações", icon: Bot },
  { label: "Iscas digitais", icon: Target },
  { label: "Roteiros", icon: MessageSquareText },
  { label: "Integrações", icon: Zap },
];

const weekData = [36, 58, 44, 78, 64, 88, 52];

function BrandMark() {
  return <div className="brand-mark" aria-label="Layerflow"><span /><span /><span /></div>;
}

function Sidebar({
  active,
  onSelect,
  open,
  onClose,
  accounts,
  activeAccount,
  onAccountChange,
  onAddAccount,
  contentCount,
}: {
  active: string;
  onSelect: (value: string) => void;
  open: boolean;
  onClose: () => void;
  accounts: BrandAccount[];
  activeAccount?: BrandAccount;
  onAccountChange: (account: BrandAccount) => void;
  onAddAccount: () => void;
  contentCount: number;
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const renderItem = (item: (typeof navigation)[number]) => {
    const Icon = item.icon;
    const selected = active === item.label;
    const badge = item.label === "Banco de ideias" ? contentCount : undefined;
    return (
      <button type="button" className={`nav-item ${selected ? "active" : ""}`} key={item.label} onClick={() => { onSelect(item.label); onClose(); }}>
        <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{badge !== undefined && <small>{badge}</small>}
      </button>
    );
  };

  return (
    <>
      <div className={`sidebar-backdrop ${open ? "visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head"><div className="brand-lockup"><BrandMark /><strong>Layerflow</strong></div><button className="icon-button mobile-close" type="button" onClick={onClose} aria-label="Fechar menu"><X size={19} /></button></div>

        <div className="profile-switcher-wrap">
          <button type="button" className={`profile-switcher ${accountMenuOpen ? "expanded" : ""}`} onClick={() => setAccountMenuOpen((value) => !value)} aria-expanded={accountMenuOpen}>
            <div className="avatar" style={{ backgroundColor: activeAccount?.accent ?? "#ece5d8" }}>{activeAccount?.initials ?? "IG"}</div>
            <div><strong>{activeAccount?.name ?? "Carregando..."}</strong><span>{activeAccount?.handle ?? "@instagram"}</span></div>
            <ChevronDown size={16} />
          </button>
          {accountMenuOpen && (
            <div className="account-menu">
              <span>Perfis gerenciados</span>
              {accounts.map((account) => (
                <button type="button" className={`account-option ${account.id === activeAccount?.id ? "active" : ""}`} key={account.id} onClick={() => { onAccountChange(account); setAccountMenuOpen(false); }}>
                  <div className="avatar tiny" style={{ backgroundColor: account.accent }}>{account.initials}</div>
                  <div><strong>{account.name}</strong><small>{account.handle}</small></div>
                  {account.id === activeAccount?.id && <Check className="account-check" size={15} />}
                </button>
              ))}
              <button type="button" className="account-add" onClick={() => { setAccountMenuOpen(false); onAddAccount(); }}><Plus size={16} /> Adicionar Instagram</button>
            </div>
          )}
        </div>

        <nav className="nav-block" aria-label="Navegação principal"><p>Conteúdo</p>{navigation.map(renderItem)}</nav>
        <nav className="nav-block second" aria-label="Recursos"><p>Recursos</p>{workspace.map(renderItem)}</nav>
        <div className="sidebar-spacer" />
        <div className="weekly-card"><div className="weekly-icon"><Sparkles size={18} /></div><div><strong>Ritmo da semana</strong><span>{contentCount} conteúdos neste perfil</span></div><div className="progress-track"><i style={{ width: `${Math.min(100, contentCount * 12)}%` }} /></div></div>
        <button type="button" className="settings-row" onClick={onAddAccount}><div className="avatar tiny" style={{ backgroundColor: activeAccount?.accent }}>{activeAccount?.initials ?? "IG"}</div><div><strong>Gerenciar perfis</strong><span>{accounts.length} {accounts.length === 1 ? "perfil" : "perfis"}</span></div><MoreHorizontal size={18} /></button>
      </aside>
    </>
  );
}

type Viewer = {
  displayName: string;
  email: string;
  fullName: string | null;
};

function getInitials(value: string) {
  return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "LC";
}

function Header({ onMenu, onNew, onSearch, onNotifications, notificationsOpen, viewer, signOutPath }: { onMenu: () => void; onNew: () => void; onSearch: () => void; onNotifications: () => void; notificationsOpen: boolean; viewer: Viewer; signOutPath: string }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" type="button" onClick={onMenu} aria-label="Abrir menu"><Menu size={20} /></button>
      <button type="button" className="search-button" onClick={onSearch}><Search size={17} /><span>Buscar ideias, conteúdos ou arquivos...</span><kbd><Command size={12} /> K</kbd></button>
      <div className="topbar-actions">
        <span className="sync-state"><i /> Tudo sincronizado</span>
        <div className="notification-wrap">
          <button className={`icon-button ${notificationsOpen ? "active" : ""}`} type="button" aria-label="Notificações" onClick={onNotifications}><Bell size={18} /><b /></button>
          {notificationsOpen && <div className="notification-popover"><strong>Próximos passos · 2 pendências</strong><div className="notification-item"><span /><CalendarDays size={16} /><span><strong>Conteúdo programado para hoje</strong><small>Confira o calendário antes da publicação.</small></span></div><div className="notification-item"><span /><Target size={16} /><span><strong>Complete sua primeira isca</strong><small>Envie o arquivo e deixe o download centralizado.</small></span></div></div>}
        </div>
        <div className="auth-user-wrap">
          <button type="button" className={`auth-user-button ${viewerOpen ? "active" : ""}`} onClick={() => setViewerOpen((value) => !value)} aria-expanded={viewerOpen} aria-label="Abrir conta">
            <span>{getInitials(viewer.fullName ?? viewer.email)}</span>
            <div><strong>{viewer.fullName ?? viewer.displayName}</strong><small>Conta segura</small></div>
            <ChevronDown size={15} />
          </button>
          {viewerOpen && <div className="auth-popover"><div className="viewer-details"><span><ShieldCheck size={16} /></span><div><strong>{viewer.fullName ?? viewer.displayName}</strong><small>{viewer.email}</small></div></div><p>Sua sessão protege todos os perfis, conteúdos e arquivos deste espaço.</p><a href={signOutPath}><LogOut size={15} /> Sair com segurança</a></div>}
        </div>
        <button className="primary-button small" type="button" onClick={onNew}><Plus size={17} /> Novo conteúdo</button>
      </div>
    </header>
  );
}

function Overview({ items, account, onCapture, onNavigate }: { items: ContentItem[]; account?: BrandAccount; onCapture: (value: string) => Promise<void>; onNavigate: (value: string) => void }) {
  const [idea, setIdea] = useState("");
  const [captured, setCaptured] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const today = useMemo(() => new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date()), []);
  const published = items.filter((item) => item.status === "Publicado");
  const metrics = [
    { label: "Ideias no banco", value: items.filter((item) => item.status === "Ideia").length, note: "prontas para aprofundar", tone: "lime" },
    { label: "Em produção", value: items.filter((item) => ["Roteiro", "Produção", "Revisão"].includes(item.status)).length, note: "no quadro atual", tone: "violet" },
    { label: "Agendados", value: items.filter((item) => item.status === "Agendado").length, note: "com data definida", tone: "blue" },
    { label: "Publicados", value: published.length, note: "neste perfil", tone: "orange" },
  ];
  const pipeline = [
    { label: "Capturar", target: "Banco de ideias", value: metrics[0].value, icon: Lightbulb, color: "#b8ff6a" },
    { label: "Desdobrar", target: "Cascatas", value: "abrir", icon: GitBranch, color: "#d3b6ff" },
    { label: "Produzir", target: "Em produção", value: metrics[1].value, icon: KanbanSquare, color: "#9cc7ff" },
    { label: "Agendar", target: "Calendário", value: metrics[2].value, icon: CalendarDays, color: "#ffd685" },
    { label: "Aprender", target: "Resultados", value: metrics[3].value, icon: BarChart3, color: "#ffae9b" },
  ];
  const activeItems = items.filter((item) => item.status !== "Publicado").slice(0, 3);
  const reach = published.reduce((sum, item) => sum + item.reach, 0);

  async function captureIdea() {
    if (!idea.trim()) return;
    setCaptured(true);
    await onCapture(idea.trim());
    setIdea("");
    setTimeout(() => setCaptured(false), 1200);
  }

  async function pasteText() {
    try { const text = await navigator.clipboard.readText(); if (text) setIdea(text); } catch { /* navegador sem permissão: mantém o campo disponível */ }
  }

  async function importDraft(file?: File) {
    if (!file) return;
    const text = await file.text();
    setIdea(text.slice(0, 50000));
  }

  return (
    <div className="page-shell">
      <section className="page-heading"><div><p className="eyebrow">{today}</p><h1>Bom dia, {account?.name.split(" ")[0] ?? "Lucas"}.</h1><p>Você está gerenciando {account?.handle ?? "seu perfil"}.</p></div><button className="secondary-button" type="button" onClick={() => onNavigate("Calendário")}><CalendarDays size={17} /> Ver calendário</button></section>
      <section className="capture-card"><div className="capture-copy"><span className="capture-label"><WandSparkles size={15} /> Comece por uma ideia</span><h2>O que está ocupando sua cabeça hoje?</h2><p>Cole um texto, uma anotação ou uma ideia. O sistema guarda a base no perfil ativo.</p></div><div className="capture-input-wrap"><textarea value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Ex.: todo mundo está tentando produzir mais, mas talvez o problema seja produzir sem uma mensagem..." aria-label="Nova ideia ou texto-base" /><div className="capture-footer"><div className="input-hints"><button type="button" onClick={pasteText}><FileText size={15} /> Colar texto</button><button type="button" onClick={() => fileInput.current?.click()}><BookOpen size={15} /> Importar rascunho</button><input ref={fileInput} type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={(event) => importDraft(event.target.files?.[0])} /></div><button type="button" className="primary-button" onClick={captureIdea} disabled={!idea.trim()}>{captured ? <><Check size={17} /> Base salva</> : <>Criar cascata <ArrowRight size={17} /></>}</button></div></div></section>
      <section className="metric-grid" aria-label="Resumo do conteúdo">{metrics.map((card) => <button type="button" onClick={() => onNavigate(card.label === "Ideias no banco" ? "Banco de ideias" : card.label === "Em produção" ? "Em produção" : card.label === "Agendados" ? "Calendário" : "Resultados")} className={`metric-card ${card.tone}`} key={card.label}><div><span>{card.label}</span><ArrowUpRight size={16} /></div><strong>{card.value}</strong><small>{card.note}</small></button>)}</section>
      <section className="section-block"><div className="section-title-row"><div><span className="section-kicker">Seu fluxo</span><h2>Da ideia ao aprendizado</h2></div><button type="button" className="text-button" onClick={() => onNavigate("Em produção")}>Abrir produção <ChevronRight size={16} /></button></div><div className="pipeline-card">{pipeline.map((step, index) => { const Icon = step.icon; return <button type="button" className="pipeline-step" key={step.label} onClick={() => onNavigate(step.target)}><div className="pipeline-icon" style={{ backgroundColor: step.color }}><Icon size={19} /></div><div><strong>{step.label}</strong><span>{step.value} {typeof step.value === "number" ? "itens" : ""}</span></div>{index < pipeline.length - 1 && <ArrowRight className="pipeline-arrow" size={17} />}</button>; })}</div></section>
      <div className="dashboard-grid"><section className="panel content-panel"><div className="panel-head"><div><span className="section-kicker">Prioridade</span><h2>Em movimento</h2></div><button className="icon-button" type="button" aria-label="Abrir quadro" onClick={() => onNavigate("Em produção")}><MoreHorizontal size={18} /></button></div><div className="content-list">{activeItems.length ? activeItems.map((item) => <button type="button" className="content-row" key={item.id} onClick={() => onNavigate("Em produção")}><span className="content-dot" style={{ backgroundColor: item.kind === "Reel" ? "#b8ff6a" : item.kind === "Carrossel" ? "#d3b6ff" : "#9cc7ff" }} /><div className="content-main"><strong>{item.title}</strong><span>{item.kind} · {item.platform}</span></div><span className="stage-pill">{item.status}</span><span className="row-date"><Clock3 size={14} /> {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString("pt-BR") : "Sem data"}</span><ChevronRight size={17} /></button>) : <div className="dashboard-empty"><Lightbulb size={20} /><span>Nenhum conteúdo em movimento neste perfil.</span></div>}</div><button type="button" className="panel-footer-button" onClick={() => onNavigate("Em produção")}>Ver todos os conteúdos <ArrowRight size={16} /></button></section><section className="panel performance-panel"><div className="panel-head"><div><span className="section-kicker">Conteúdo publicado</span><h2>Alcance acumulado</h2></div><button className="period-button" type="button" onClick={() => onNavigate("Resultados")}>Ver resultados <ChevronRight size={14} /></button></div><div className="performance-number"><strong>{reach.toLocaleString("pt-BR")}</strong><span>{published.length} peças</span></div><div className="mini-chart" aria-label="Gráfico ilustrativo de alcance">{weekData.map((value, index) => <div className="bar-column" key={index}><div className="bar-track"><i style={{ height: `${value}%` }} /></div><span>{["S","T","Q","Q","S","S","D"][index]}</span></div>)}</div><div className="platform-row"><div className="platform-icon instagram"><Instagram size={16} /></div><div><strong>{account?.handle ?? "Instagram"}</strong><span>perfil ativo</span></div><strong>{reach ? "Ativo" : "Novo"}</strong></div></section></div>
      <section className="focus-strip"><div className="focus-icon"><CircleDot size={19} /></div><div><span>Próxima ação recomendada</span><strong>{activeItems[0]?.title ?? "Capture a primeira ideia deste perfil"}</strong></div><button type="button" className="secondary-button compact" onClick={() => onNavigate(activeItems.length ? "Em produção" : "Banco de ideias")}>Abrir <ArrowRight size={16} /></button></section>
    </div>
  );
}

function AddAccountModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, handle: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  async function submit() { if (!name.trim() || !handle.trim()) return; setSaving(true); await onAdd(name, handle); setSaving(false); setName(""); setHandle(""); onClose(); }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="content-modal account-modal" role="dialog" aria-modal="true" aria-label="Adicionar perfil" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">Múltiplas marcas</span><h2>Adicionar Instagram</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div><p>Crie um espaço separado para o conteúdo, calendário, cascatas e arquivos deste perfil.</p><div className="account-form-grid"><label><span>Nome do perfil ou cliente</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Layerflow" /></label><label><span>Usuário do Instagram</span><div className="handle-input"><b>@</b><input value={handle} onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))} placeholder="layerflow" /></div></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" disabled={!name.trim() || !handle.trim() || saving} onClick={submit}>{saving ? "Adicionando..." : "Adicionar perfil"}<ArrowRight size={16} /></button></div></section></div>;
}

function SearchModal({ open, items, onClose, onNavigate }: { open: boolean; items: ContentItem[]; onClose: () => void; onNavigate: (value: string) => void }) {
  const [query, setQuery] = useState("");
  if (!open) return null;
  const results = items.filter((item) => `${item.title} ${item.hook} ${item.pillar}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  return <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={onClose}><section className="search-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="search-modal-input"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque em todo o perfil ativo..." /><button type="button" onClick={onClose}>ESC</button></div><div className="search-results"><span>{query ? "Resultados" : "Acessos rápidos"}</span>{query ? results.map((item) => <button type="button" className="search-result" key={item.id} onClick={() => { onNavigate(item.status === "Publicado" ? "Resultados" : "Em produção"); onClose(); }}><div className="search-result-icon"><FileText size={16} /></div><span><strong>{item.title}</strong><small>{item.kind} · {item.status}</small></span><ChevronRight size={16} /></button>) : navigation.concat(workspace).slice(0, 7).map((entry) => { const Icon = entry.icon; return <button type="button" className="search-result" key={entry.label} onClick={() => { onNavigate(entry.label); onClose(); }}><div className="search-result-icon"><Icon size={16} /></div><span><strong>{entry.label}</strong><small>Abrir módulo</small></span><ChevronRight size={16} /></button>; })}{query && !results.length && <div className="search-empty">Nenhum conteúdo encontrado neste perfil.</div>}</div></section></div>;
}

export default function LayerflowClient({ viewer, signOutPath, initialActive }: { viewer: Viewer; signOutPath: string; initialActive: string }) {
  const [active, setActive] = useState(initialActive);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newContentOpen, setNewContentOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accounts, setAccounts] = useState<BrandAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number>(0);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [contentLoadError, setContentLoadError] = useState("");
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0];

  useEffect(() => {
    fetch("/api/accounts").then((response) => response.json()).then((data) => {
      const loaded = data.accounts ?? [];
      setAccounts(loaded);
      const stored = Number(localStorage.getItem("layerflow-active-account"));
      const nextId = loaded.some((account: BrandAccount) => account.id === stored) ? stored : loaded[0]?.id ?? 1;
      setActiveAccountId(nextId);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!activeAccountId) return;
    fetch(`/api/content?accountId=${activeAccountId}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os conteúdos.");
      setItems(data.items ?? []);
      setContentLoadError("");
    }).catch((error) => setContentLoadError(error instanceof Error ? error.message : "Não foi possível carregar os conteúdos."));
  }, [activeAccountId]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } if (event.key === "Escape") { setSearchOpen(false); setNotificationsOpen(false); } }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  function changeAccount(account: BrandAccount) { setActiveAccountId(account.id); localStorage.setItem("layerflow-active-account", String(account.id)); setActive("Visão geral"); }

  async function addAccount(name: string, handle: string) {
    const response = await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, handle }) });
    const data = await response.json();
    if (data.account) { setAccounts((current) => [...current, data.account]); changeAccount(data.account); }
  }

  async function createContent(input: Partial<ContentItem> & { title: string }) {
    const optimistic: ContentItem = { id: Date.now(), accountId: activeAccountId, title: input.title, kind: input.kind ?? "Ideia", status: input.status ?? "Ideia", platform: input.platform ?? "Instagram", pillar: input.pillar ?? "Criatividade", hook: input.hook ?? "", body: input.body ?? "", scheduledAt: input.scheduledAt ?? null, publishedAt: null, reach: 0, saves: 0, comments: 0 };
    setItems((current) => [optimistic, ...current]);
    try { const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, accountId: activeAccountId }) }); const data = await response.json(); if (data.item) setItems((current) => current.map((item) => item.id === optimistic.id ? data.item : item)); } catch { /* item continua visível */ }
  }

  async function moveContent(id: number, status: string) { setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item)); await fetch("/api/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }).catch(() => undefined); }
  async function scheduleContent(id: number, scheduledAt: string) { setItems((current) => current.map((item) => item.id === id ? { ...item, scheduledAt, status: "Agendado" } : item)); await fetch("/api/content", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "Agendado", scheduledAt }) }).catch(() => undefined); }
  async function createCascade(sourceText: string) { await fetch("/api/cascades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceText, accountId: activeAccountId }) }).catch(() => undefined); setActive("Cascatas"); }

  return (
    <main className="app-shell">
      <Sidebar active={active} onSelect={setActive} open={menuOpen} onClose={() => setMenuOpen(false)} accounts={accounts} activeAccount={activeAccount} onAccountChange={changeAccount} onAddAccount={() => setAddAccountOpen(true)} contentCount={items.length} />
      <div className="app-main"><Header onMenu={() => setMenuOpen(true)} onNew={() => setNewContentOpen(true)} onSearch={() => setSearchOpen(true)} onNotifications={() => setNotificationsOpen((value) => !value)} notificationsOpen={notificationsOpen} viewer={viewer} signOutPath={signOutPath} />{contentLoadError ? <div className="app-data-warning" role="alert"><strong>Não foi possível carregar seus conteúdos.</strong><span>{contentLoadError}</span><button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></div> : null}{active === "Visão geral" ? <Overview items={items} account={activeAccount} onCapture={createCascade} onNavigate={setActive} /> : <ModuleView active={active} items={items} activeAccountId={activeAccountId} onCreate={createContent} onMove={moveContent} onSchedule={scheduleContent} onOpenNew={() => setNewContentOpen(true)} onNavigate={setActive} />}</div>
      <NewContentModal open={newContentOpen} onClose={() => setNewContentOpen(false)} onCreate={createContent} />
      <AddAccountModal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} onAdd={addAccount} />
      <SearchModal key={searchOpen ? "search-open" : "search-closed"} open={searchOpen} items={items} onClose={() => setSearchOpen(false)} onNavigate={setActive} />
    </main>
  );
}
