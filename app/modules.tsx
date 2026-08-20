"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  GripVertical,
  Instagram,
  KanbanSquare,
  LayoutGrid,
  Library,
  Lightbulb,
  ListFilter,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Twitter,
  UploadCloud,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import AutomationsModule from "./automations-module";

export type ContentItem = {
  id: number;
  accountId: number;
  title: string;
  kind: string;
  status: string;
  platform: string;
  pillar: string;
  hook: string;
  body: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  reach: number;
  saves: number;
  comments: number;
  createdAt?: string;
};

type Cascade = {
  id: number;
  title: string;
  sourceText: string;
  thesis: string;
  angles: string;
  proofs: string;
  objections: string;
  cta: string;
  status: string;
};

type Asset = {
  id: number;
  title: string;
  category: string;
  format: string;
  status: string;
  description: string;
  conversions: number;
  downloadUrl?: string | null;
  fileName?: string | null;
  fileSize?: number;
};

type InstagramStatus = {
  configured: boolean;
  connectionMode: "oauth" | "access_token" | null;
  redirectUri: string;
  requiredScopes: string[];
  connection: null | {
    id: number;
    username: string;
    accountType: string;
    profilePictureUrl?: string | null;
    tokenExpiresAt: string;
    status: string;
    followersCount: number;
    mediaCount: number;
    reach30d: number;
    views30d: number;
    profileViews30d: number;
    interactions30d: number;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  };
  topMedia: Array<{
    id: number;
    caption: string;
    mediaType: string;
    permalink: string;
    publishedAt: string;
    reach: number;
    views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    totalInteractions: number;
  }>;
};

async function loadInstagramStatus(accountId: number) {
  const response = await fetch(`/api/integrations/instagram/status?accountId=${accountId}`);
  if (!response.ok) throw new Error("Não foi possível consultar a conexão do Instagram.");
  return response.json() as Promise<InstagramStatus>;
}

type ModuleProps = {
  active: string;
  activeAccountId: number;
  items: ContentItem[];
  onCreate: (input: Partial<ContentItem> & { title: string }) => Promise<void>;
  onMove: (id: number, status: string) => Promise<void>;
  onSchedule: (id: number, date: string) => Promise<void>;
  onOpenNew: () => void;
  onNavigate: (value: string) => void;
};

const formatColors: Record<string, string> = {
  Reel: "#b8ff6a",
  Carrossel: "#d3b6ff",
  Newsletter: "#9cc7ff",
  Thread: "#ffd685",
  Stories: "#ffae9b",
  Ideia: "#e3e4de",
};

function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="module-heading">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function StatusDot({ color = "#b8ff6a" }: { color?: string }) {
  return <i className="status-dot" style={{ backgroundColor: color }} />;
}

function IdeasModule({ items, onCreate, activeAccountId, onNavigate }: ModuleProps) {
  const [query, setQuery] = useState("");
  const [quickIdea, setQuickIdea] = useState("");
  const [pillar, setPillar] = useState("Todos os pilares");
  const ideas = items.filter((item) => item.status === "Ideia");
  const filtered = ideas.filter((item) => {
    const matchesQuery = `${item.title} ${item.hook}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (pillar === "Todos os pilares" || item.pillar === pillar);
  });

  async function addIdea() {
    const title = quickIdea.trim();
    if (!title) return;
    await onCreate({ title, status: "Ideia", kind: "Ideia", pillar: "Criatividade", platform: "Instagram" });
    setQuickIdea("");
  }

  async function unfoldIdea(idea: ContentItem) {
    await fetch("/api/cascades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: idea.title, sourceText: `${idea.title}\n\n${idea.hook || "Base curta capturada no banco de ideias; precisa ser aprofundada antes de gerar peças."}`, accountId: activeAccountId }) }).catch(() => undefined);
    onNavigate("Cascatas");
  }

  return (
    <div className="page-shell module-page">
      <PageHeader
        kicker="Captura"
        title="Banco de ideias"
        description="Um lugar confiável para guardar observações antes que elas desapareçam."
        action={<button className="primary-button" type="button" onClick={() => document.getElementById("quick-idea")?.focus()}><Plus size={17} /> Capturar ideia</button>}
      />

      <section className="idea-capture-bar">
        <div className="idea-capture-icon"><Lightbulb size={20} /></div>
        <input id="quick-idea" value={quickIdea} onChange={(e) => setQuickIdea(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIdea()} placeholder="Anote uma observação, pergunta, incômodo ou frase..." />
        <button type="button" onClick={addIdea} disabled={!quickIdea.trim()}>Salvar ideia <ArrowRight size={16} /></button>
      </section>

      <section className="module-toolbar">
        <div className="inline-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no banco..." /></div>
        <div className="toolbar-right">
          <label className="select-control"><Filter size={15} /><select value={pillar} onChange={(e) => setPillar(e.target.value)}><option>Todos os pilares</option><option>Criatividade</option><option>Monetização</option><option>Marca pessoal</option><option>Renascentismo 2.0</option></select><ChevronDown size={14} /></label>
          <button type="button" className="view-toggle active"><LayoutGrid size={16} /></button>
          <button type="button" className="view-toggle"><ListFilter size={16} /></button>
        </div>
      </section>

      <section className="ideas-grid">
        {filtered.map((idea, index) => (
          <article className="idea-card" key={idea.id}>
            <div className="idea-card-top"><span className="number-label">IDEIA {String(index + 1).padStart(2, "0")}</span></div>
            <h3>{idea.title}</h3>
            <p>{idea.hook || "Ainda sem gancho. Aprofunde a ideia antes de escolher o formato."}</p>
            <div className="tag-row"><span>{idea.pillar}</span><span>{idea.platform}</span></div>
            <div className="idea-card-footer"><span><Clock3 size={13} /> capturada recentemente</span><button type="button" onClick={() => unfoldIdea(idea)}><WandSparkles size={15} /> Desdobrar</button></div>
          </article>
        ))}
        <button type="button" className="empty-idea-card" onClick={() => document.getElementById("quick-idea")?.focus()}><Plus size={20} /><strong>Adicionar nova ideia</strong><span>Pode ser curta e imperfeita</span></button>
      </section>
    </div>
  );
}

function safeArray<T>(value: string): T[] {
  try { return JSON.parse(value) as T[]; } catch { return []; }
}

function CascadesModule({ onCreate, activeAccountId }: ModuleProps) {
  const [cascades, setCascades] = useState<Cascade[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedBaseId, setExpandedBaseId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/cascades?accountId=${activeAccountId}`).then((res) => res.json()).then((data) => setCascades(data.cascades ?? [])).catch(() => undefined);
  }, [activeAccountId]);

  async function saveBase() {
    if (sourceText.trim().length < 20) return;
    setSaving(true);
    const response = await fetch("/api/cascades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceText, accountId: activeAccountId }) });
    const data = await response.json();
    if (data.cascade) setCascades((current) => [data.cascade, ...current]);
    setSourceText("");
    setShowNew(false);
    setSaving(false);
  }

  return (
    <div className="page-shell module-page">
      <PageHeader kicker="Desdobramento" title="Cascatas de conteúdo" description="Uma base densa, vários ângulos que funcionam sozinhos." action={<button className="primary-button" type="button" onClick={() => setShowNew(true)}><Plus size={17} /> Nova cascata</button>} />

      <section className="cascade-rules">
        <div><Sparkles size={18} /><strong>Critério da cascata</strong></div>
        <p>Cada peça precisa ter uma abertura própria, dizer algo diferente e defender uma ideia que alguém poderia contestar.</p>
        <span>4–8 ângulos reais por base</span>
      </section>

      {showNew && (
        <section className="new-base-card">
          <div className="new-base-copy"><span className="section-kicker">Texto-base</span><h2>Cole o material mais denso</h2><p>Rascunho, transcrição, aula, newsletter ou texto longo. Ideias curtas precisam ser aprofundadas antes.</p></div>
          <div className="new-base-editor"><textarea autoFocus value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Cole aqui o texto que carrega a ideia principal..." /><div><span>{sourceText.length} caracteres</span><button type="button" className="text-button" onClick={() => setShowNew(false)}>Cancelar</button><button type="button" className="primary-button" disabled={sourceText.trim().length < 20 || saving} onClick={saveBase}>{saving ? "Salvando..." : "Salvar e analisar"}<ArrowRight size={16} /></button></div></div>
        </section>
      )}

      {cascades.map((cascade) => {
        const angles = safeArray<{ title: string; format: string; hook: string }>(cascade.angles);
        const proofs = safeArray<string>(cascade.proofs);
        return (
          <article className="cascade-card" key={cascade.id}>
            <div className="cascade-side">
              <div className="cascade-status"><StatusDot /><span>{cascade.status}</span></div>
              <span className="section-kicker">Base principal</span>
              <h2>{cascade.title}</h2>
              <p>{cascade.sourceText}</p>
              <div className="thesis-box"><span>Tese invertida</span><strong>{cascade.thesis || "Esta base ainda precisa ter sua tese extraída."}</strong></div>
              <div className="proof-row"><span>Provas encontradas</span><strong>{proofs.length}</strong></div>
              {expandedBaseId === cascade.id && <div className="base-full-text">{cascade.sourceText}</div>}
              <button type="button" className="secondary-button" onClick={() => setExpandedBaseId((current) => current === cascade.id ? null : cascade.id)}><FileText size={15} /> {expandedBaseId === cascade.id ? "Fechar texto-base" : "Abrir texto-base"}</button>
            </div>
            <div className="angles-side">
              <div className="angles-heading"><div><span className="section-kicker">Mapa da cascata</span><h3>{angles.length || "—"} ângulos aprovados</h3></div></div>
              {angles.length ? angles.map((angle, index) => (
                <div className="angle-row" key={angle.title}>
                  <span className="angle-index">{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{angle.title}</strong><p>“{angle.hook}”</p></div>
                  <span className="format-pill" style={{ backgroundColor: formatColors[angle.format] ?? "#eee" }}>{angle.format}</span>
                  <button type="button" onClick={() => onCreate({ title: angle.title, hook: angle.hook, kind: angle.format, status: "Ideia", platform: angle.format === "Newsletter" ? "Substack" : angle.format === "Thread" ? "X" : "Instagram" })}>Criar peça <ArrowRight size={14} /></button>
                </div>
              )) : <div className="cascade-empty"><WandSparkles size={22} /><strong>Base salva para aprofundamento</strong><p>O motor de escrita será conectado na etapa de automação; por enquanto, a base permanece organizada sem gerar ângulos rasos.</p></div>}
              {angles.length > 0 && <div className="sequence-note"><CalendarDays size={16} /><span><strong>Sequência:</strong> publique a base primeiro; depois alterne formatos sem repetir o mesmo ângulo no mesmo dia.</span></div>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

const boardColumns = [
  { id: "Ideia", label: "Ideias", color: "#c7cac2" },
  { id: "Roteiro", label: "Escrevendo", color: "#d3b6ff" },
  { id: "Produção", label: "Produzindo", color: "#9cc7ff" },
  { id: "Revisão", label: "Revisar", color: "#ffd685" },
  { id: "Agendado", label: "Agendado", color: "#b8ff6a" },
];

function ProductionModule({ items, onMove, onOpenNew, onNavigate }: ModuleProps) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [instagramOnly, setInstagramOnly] = useState(false);
  const visibleItems = instagramOnly ? items.filter((item) => item.platform === "Instagram") : items;

  return (
    <div className="page-shell module-page production-page">
      <PageHeader kicker="Execução" title="Em produção" description="Visualize o trabalho, limite o excesso e mova cada peça até a publicação." action={<button className="primary-button" type="button" onClick={onOpenNew}><Plus size={17} /> Novo conteúdo</button>} />
      <section className="board-toolbar"><div><button type="button" className={viewMode === "board" ? "active" : ""} onClick={() => setViewMode("board")}><KanbanSquare size={16} /> Quadro</button><button type="button" className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")}><ListFilter size={16} /> Lista</button></div><div><button type="button" className={instagramOnly ? "active" : ""} onClick={() => setInstagramOnly((value) => !value)}><Filter size={15} /> {instagramOnly ? "Instagram" : "Filtrar"}</button><button type="button" onClick={() => onNavigate("Calendário")}><CalendarDays size={15} /> Prazos</button></div></section>
      {viewMode === "board" ? <section className="kanban-board">
        {boardColumns.map((column, columnIndex) => {
          const cards = visibleItems.filter((item) => item.status === column.id);
          return (
            <div className="kanban-column" key={column.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragged) onMove(dragged, column.id); setDragged(null); }}>
              <div className="column-head"><div><StatusDot color={column.color} /><strong>{column.label}</strong><span>{cards.length}</span></div><button type="button" onClick={onOpenNew}><Plus size={17} /></button></div>
              <div className="column-body">
                {cards.map((item) => (
                  <article className="kanban-card" key={item.id} draggable onDragStart={() => setDragged(item.id)} onDragEnd={() => setDragged(null)}>
                    <div className="kanban-card-top"><span className="format-pill" style={{ backgroundColor: formatColors[item.kind] ?? "#eee" }}>{item.kind}</span><GripVertical size={16} /></div>
                    <h3>{item.title}</h3>
                    {item.hook && <p>{item.hook}</p>}
                    <div className="tag-row"><span>{item.platform}</span><span>{item.pillar}</span></div>
                    <div className="kanban-card-footer"><span><Clock3 size={13} /> {item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "Sem data"}</span>{columnIndex < boardColumns.length - 1 && <button type="button" title="Avançar para a próxima etapa" onClick={() => onMove(item.id, boardColumns[columnIndex + 1].id)}><ChevronRight size={16} /></button>}</div>
                  </article>
                ))}
                <button type="button" className="add-column-card" onClick={onOpenNew}><Plus size={16} /> Adicionar</button>
              </div>
            </div>
          );
        })}
      </section> : <section className="production-list">{visibleItems.filter((item) => item.status !== "Publicado").map((item) => <article key={item.id}><span className="format-pill" style={{ backgroundColor: formatColors[item.kind] ?? "#eee" }}>{item.kind}</span><div><strong>{item.title}</strong><small>{item.platform} · {item.pillar}</small></div><select value={item.status} onChange={(event) => onMove(item.id, event.target.value)}>{boardColumns.map((column) => <option key={column.id}>{column.id}</option>)}</select><span>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleDateString("pt-BR") : "Sem prazo"}</span></article>)}</section>}
    </div>
  );
}

const calendarDays = [
  { iso: "2026-08-17", week: "SEG", day: "17" },
  { iso: "2026-08-18", week: "TER", day: "18" },
  { iso: "2026-08-19", week: "QUA", day: "19" },
  { iso: "2026-08-20", week: "QUI", day: "20" },
  { iso: "2026-08-21", week: "SEX", day: "21" },
  { iso: "2026-08-22", week: "SÁB", day: "22" },
  { iso: "2026-08-23", week: "DOM", day: "23" },
];

function CalendarModule({ items, onSchedule, onOpenNew }: ModuleProps) {
  const unscheduled = items.filter((item) => !item.scheduledAt && item.status !== "Publicado");
  const [selectedId, setSelectedId] = useState<number | "">(unscheduled[0]?.id ?? "");
  const [date, setDate] = useState("2026-08-24T12:00");
  const [calendarMode, setCalendarMode] = useState<"week" | "month">("week");

  async function schedule() {
    if (!selectedId || !date) return;
    await onSchedule(Number(selectedId), new Date(date).toISOString());
    setSelectedId("");
  }

  return (
    <div className="page-shell module-page">
      <PageHeader kicker="Distribuição" title="Calendário editorial" description="Datas, formatos e canais em uma visão única — inclusive quando a publicação precisar ser manual." action={<button className="primary-button" type="button" onClick={onOpenNew}><Plus size={17} /> Planejar conteúdo</button>} />
      <section className="calendar-toolbar"><button type="button" className="period-button">Agosto de 2026 <ChevronDown size={14} /></button><div><button type="button" onClick={() => setDate(new Date().toISOString().slice(0, 16))}>Hoje</button><button type="button" className={calendarMode === "week" ? "active" : ""} onClick={() => setCalendarMode("week")}>Semana</button><button type="button" className={calendarMode === "month" ? "active" : ""} onClick={() => setCalendarMode("month")}>Mês</button></div></section>
      {calendarMode === "week" ? <section className="week-calendar">
        {calendarDays.map((day) => {
          const dayItems = items.filter((item) => item.scheduledAt?.startsWith(day.iso));
          return (
            <div className={`calendar-day ${day.iso === "2026-08-20" ? "today" : ""}`} key={day.iso}>
              <div className="calendar-day-head"><span>{day.week}</span><strong>{day.day}</strong></div>
              <div className="calendar-day-body">
                {dayItems.map((item) => (
                  <article className="calendar-item" key={item.id} style={{ borderTopColor: formatColors[item.kind] ?? "#ddd" }}>
                    <span>{new Date(item.scheduledAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <strong>{item.title}</strong>
                    <div>{item.platform === "Instagram" ? <Instagram size={13} /> : item.platform === "X" ? <Twitter size={13} /> : <Mail size={13} />} {item.kind}</div>
                  </article>
                ))}
                {!dayItems.length && <button type="button" className="empty-calendar-slot" onClick={onOpenNew}><Plus size={15} /> Planejar</button>}
              </div>
            </div>
          );
        })}
      </section> : <section className="month-schedule-list"><div className="month-list-head"><strong>Conteúdos de agosto</strong><span>{items.filter((item) => item.scheduledAt?.startsWith("2026-08")).length} programados</span></div>{items.filter((item) => item.scheduledAt?.startsWith("2026-08")).sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))).map((item) => <article key={item.id}><div className="month-date"><strong>{new Date(item.scheduledAt!).getDate()}</strong><span>AGO</span></div><div><strong>{item.title}</strong><small>{item.kind} · {item.platform}</small></div><span>{new Date(item.scheduledAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></article>)}</section>}

      <section className="scheduler-strip">
        <div><CalendarDays size={20} /><div><strong>Agendamento rápido</strong><span>Guarde a data mesmo quando o canal exigir publicação manual.</span></div></div>
        <select value={selectedId} onChange={(e) => setSelectedId(Number(e.target.value))}><option value="">Escolha um conteúdo</option>{unscheduled.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <button type="button" className="primary-button" onClick={schedule} disabled={!selectedId}>Agendar</button>
      </section>
    </div>
  );
}

function LibraryModule({ active, activeAccountId }: ModuleProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tab, setTab] = useState(active === "Iscas digitais" ? "Isca digital" : active === "Roteiros" ? "Roteiro" : "Todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(active === "Roteiros" ? "Roteiro" : "Isca digital");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetch(`/api/library?accountId=${activeAccountId}`).then((res) => res.json()).then((data) => setAssets(data.assets ?? [])).catch(() => undefined);
  }, [activeAccountId]);

  const visible = tab === "Todos" ? assets : assets.filter((asset) => asset.category === tab);
  const heading = active === "Iscas digitais" ? "Iscas digitais" : active === "Roteiros" ? "Roteiros" : "Biblioteca";

  async function uploadAsset() {
    if (!file || !title.trim()) return;
    setUploading(true);
    setUploadError("");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title.trim());
    form.set("description", description.trim());
    form.set("category", category);
    form.set("accountId", String(activeAccountId));
    try {
      const response = await fetch("/api/library", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar o arquivo.");
      setAssets((current) => [data.asset, ...current]);
      setUploadOpen(false);
      setFile(null);
      setTitle("");
      setDescription("");
      setTab(category);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-shell module-page">
      <PageHeader kicker="Ativos da marca" title={heading} description="Centralize materiais reutilizáveis, ofertas de entrada e peças que já passaram pelo seu critério." action={<button className="primary-button" type="button" onClick={() => { setCategory(active === "Roteiros" ? "Roteiro" : "Isca digital"); setUploadOpen(true); }}><UploadCloud size={17} /> Enviar material</button>} />
      <section className="library-tabs"><button type="button" className={tab === "Todos" ? "active" : ""} onClick={() => setTab("Todos")}>Tudo</button><button type="button" className={tab === "Isca digital" ? "active" : ""} onClick={() => setTab("Isca digital")}>Iscas digitais</button><button type="button" className={tab === "Roteiro" ? "active" : ""} onClick={() => setTab("Roteiro")}>Roteiros</button><button type="button" className={tab === "Modelo" ? "active" : ""} onClick={() => setTab("Modelo")}>Modelos</button></section>
      <section className="library-grid">
        {visible.map((asset) => (
          <article className="asset-card" key={asset.id}>
            <div className={`asset-icon ${asset.category === "Isca digital" ? "lead" : asset.category === "Roteiro" ? "script" : "template"}`}>{asset.category === "Isca digital" ? <Target size={21} /> : asset.category === "Roteiro" ? <FileText size={21} /> : <Library size={21} />}</div>
            <div className="asset-card-top"><span>{asset.category}</span><span className="asset-file-size">{asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}</span></div>
            <h3>{asset.title}</h3>
            <p>{asset.description}</p>
            <div className="asset-meta"><span>{asset.format}</span><span className="asset-status"><StatusDot color={asset.status === "Rascunho" ? "#ffd685" : "#70d986"} /> {asset.status}</span></div>
            <div className="asset-footer">{asset.category === "Isca digital" ? <span><strong>{asset.conversions}</strong> conversões</span> : <span>{asset.fileName || "Sem arquivo anexado"}</span>}{asset.downloadUrl ? <a href={asset.downloadUrl}>Baixar <ArrowRight size={14} /></a> : <span className="asset-unavailable">Sem arquivo</span>}</div>
          </article>
        ))}
      </section>
      {uploadOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => !uploading && setUploadOpen(false)}><section className="content-modal upload-modal" role="dialog" aria-modal="true" aria-label="Enviar material" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">Biblioteca do perfil</span><h2>Enviar novo material</h2></div><button type="button" className="icon-button" onClick={() => setUploadOpen(false)} disabled={uploading}><X size={18} /></button></div><label><span>Título</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Guia da marca pessoal criativa" /></label><div className="modal-field-grid two"><label><span>Categoria</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Isca digital</option><option>Roteiro</option><option>Modelo</option></select></label><label><span>Descrição</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Para que serve este material?" /></label></div><label className={`upload-dropzone ${file ? "has-file" : ""}`}><input type="file" accept=".pdf,.zip,.doc,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><UploadCloud size={25} /><strong>{file ? file.name : "Escolha o arquivo"}</strong><span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, ZIP, DOCX, PPTX, TXT, MD, PNG ou JPG · até 25 MB"}</span></label>{uploadError && <p className="form-error">{uploadError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancelar</button><button type="button" className="primary-button" onClick={uploadAsset} disabled={!title.trim() || !file || uploading}>{uploading ? "Enviando..." : "Enviar arquivo"}<ArrowRight size={16} /></button></div></section></div>}
    </div>
  );
}

function ResultsModule({ items, onNavigate, activeAccountId }: ModuleProps) {
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [instagramError, setInstagramError] = useState("");
  const [period, setPeriod] = useState<30 | 90>(30);
  const published = items.filter((item) => item.status === "Publicado").sort((a, b) => b.reach - a.reach);
  const reach = published.reduce((sum, item) => sum + item.reach, 0);
  const saves = published.reduce((sum, item) => sum + item.saves, 0);
  const comments = published.reduce((sum, item) => sum + item.comments, 0);

  useEffect(() => {
    if (!activeAccountId) return;
    loadInstagramStatus(activeAccountId).then(setInstagram).catch(() => setInstagram(null));
  }, [activeAccountId]);

  async function refreshInstagram() {
    if (!instagram?.connection) { onNavigate("Integrações"); return; }
    setSyncing(true);
    setInstagramError("");
    try {
      const response = await fetch("/api/integrations/instagram/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: activeAccountId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível sincronizar.");
      setInstagram(await loadInstagramStatus(activeAccountId));
    } catch (error) {
      setInstagramError(error instanceof Error ? error.message : "Não foi possível sincronizar.");
    } finally {
      setSyncing(false);
    }
  }

  function exportReport() {
    const rows = [["Conteúdo", "Formato", "Pilar", "Alcance", "Salvamentos", "Comentários"], ...published.map((item) => [item.title, item.kind, item.pillar, item.reach, item.saves, item.comments])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "layerflow-resultados.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell module-page">
      <PageHeader kicker="Aprendizado" title="Resultados" description="Descubra quais ideias merecem voltar para o topo da cascata." action={<button className="secondary-button" type="button" onClick={refreshInstagram} disabled={syncing}><RefreshCw className={syncing ? "spin" : ""} size={16} /> {syncing ? "Sincronizando..." : instagram?.connection ? "Sincronizar Instagram" : "Conectar Instagram"}</button>} />
      {instagram?.connection ? <><section className="instagram-metrics-head"><div><span className="live-dot" /><div><strong>@{instagram.connection.username}</strong><small>Dados oficiais do Instagram · {instagram.connection.lastSyncedAt ? `atualizado em ${new Date(instagram.connection.lastSyncedAt).toLocaleString("pt-BR")}` : "pronto para sincronizar"}</small></div></div><span>{instagram.connection.followersCount.toLocaleString("pt-BR")} seguidores</span></section><section className="result-summary live-summary"><article><span>Alcance</span><strong>{instagram.connection.reach30d.toLocaleString("pt-BR")}</strong><small>últimos 30 dias</small></article><article><span>Visualizações</span><strong>{instagram.connection.views30d.toLocaleString("pt-BR")}</strong><small>últimos 30 dias</small></article><article><span>Visitas ao perfil</span><strong>{instagram.connection.profileViews30d.toLocaleString("pt-BR")}</strong><small>últimos 30 dias</small></article><article><span>Interações</span><strong>{instagram.connection.interactions30d.toLocaleString("pt-BR")}</strong><small>últimos 30 dias</small></article></section>{instagramError && <p className="form-error">{instagramError}</p>}{instagram.connection.lastError && <p className="integration-warning">{instagram.connection.lastError}</p>}{instagram.topMedia.length > 0 && <section className="panel ranking-panel instagram-ranking"><div className="panel-head"><div><span className="section-kicker">Instagram real</span><h2>Posts com melhor desempenho</h2></div><span className="period-button">Últimos posts</span></div><div className="ranking-table"><div className="ranking-row heading"><span>Publicação</span><span>Formato</span><span>Alcance</span><span>Salvos</span><span>Comentários</span></div>{instagram.topMedia.map((item, index) => <a className="ranking-row" href={item.permalink} target="_blank" rel="noreferrer" key={item.id}><span><b>{index + 1}</b><span><strong>{item.caption.slice(0, 72) || "Publicação sem legenda"}</strong><small>{new Date(item.publishedAt).toLocaleDateString("pt-BR")} · {item.views.toLocaleString("pt-BR")} visualizações</small></span></span><span><i style={{ backgroundColor: "#f1b6ce" }} />{item.mediaType}</span><strong>{item.reach.toLocaleString("pt-BR")}</strong><strong>{item.saves}</strong><strong>{item.comments}</strong></a>)}</div></section>}</> : <section className="instagram-connect-prompt"><div className="connector-icon instagram"><Instagram size={21} /></div><div><strong>Conecte o Instagram para ver métricas reais</strong><span>O Layerflow importará alcance, visualizações, visitas ao perfil, interações e desempenho dos posts.</span></div><button type="button" className="primary-button" onClick={() => onNavigate("Integrações")}>Configurar conexão <ArrowRight size={15} /></button></section>}
      <div className="internal-results-label"><span className="section-kicker">Dados editoriais internos</span><p>Resultados registrados manualmente no Layerflow.</p></div>
      <section className="result-summary">
        <article><span>Alcance total</span><strong>{reach.toLocaleString("pt-BR")}</strong><small>+18,4% no período</small></article>
        <article><span>Salvamentos</span><strong>{saves.toLocaleString("pt-BR")}</strong><small>{reach ? ((saves / reach) * 100).toFixed(1) : 0}% do alcance</small></article>
        <article><span>Comentários</span><strong>{comments.toLocaleString("pt-BR")}</strong><small>conversas geradas</small></article>
        <article><span>Peças publicadas</span><strong>{published.length}</strong><small>nos últimos 30 dias</small></article>
      </section>

      <section className="results-grid">
        <div className="panel result-chart-panel">
          <div className="panel-head"><div><span className="section-kicker">Por pilar</span><h2>O que mais chama atenção</h2></div><button type="button" className="period-button" onClick={() => setPeriod((value) => value === 30 ? 90 : 30)}>{period} dias <ChevronDown size={14} /></button></div>
          <div className="horizontal-bars">
            {[{ name: "Monetização", value: 92, amount: "18,2 mil" }, { name: "Marca pessoal", value: 68, amount: "12,5 mil" }, { name: "Renascentismo 2.0", value: 42, amount: "7,8 mil" }, { name: "Criação", value: 31, amount: "5,7 mil" }].map((bar) => <div key={bar.name}><span>{bar.name}</span><div><i style={{ width: `${bar.value}%` }} /></div><strong>{bar.amount}</strong></div>)}
          </div>
        </div>
        <div className="panel recycle-panel"><div className="recycle-icon"><RefreshCw size={22} /></div><span className="section-kicker">Segunda volta</span><h2>O melhor conteúdo vira base nova</h2><p>“Você não precisa de mais seguidores para vender conhecimento” superou sua média em 2,4×.</p><button type="button" className="primary-button" onClick={() => onNavigate("Cascatas")}>Criar nova cascata <ArrowRight size={16} /></button></div>
      </section>

      <section className="panel ranking-panel">
        <div className="panel-head"><div><span className="section-kicker">Ranking</span><h2>Conteúdos que mais performaram</h2></div><button type="button" className="text-button" onClick={exportReport}>Exportar relatório <ArrowRight size={14} /></button></div>
        <div className="ranking-table">
          <div className="ranking-row heading"><span>Conteúdo</span><span>Formato</span><span>Alcance</span><span>Salvos</span><span>Comentários</span></div>
          {published.map((item, index) => <div className="ranking-row" key={item.id}><span><b>{index + 1}</b><span><strong>{item.title}</strong><small>{item.pillar}</small></span></span><span><i style={{ backgroundColor: formatColors[item.kind] ?? "#eee" }} />{item.kind}</span><strong>{item.reach.toLocaleString("pt-BR")}</strong><strong>{item.saves}</strong><strong>{item.comments}</strong></div>)}
        </div>
      </section>
    </div>
  );
}

const connectorData = [
  { id: "instagram", name: "Instagram", icon: Instagram, color: "instagram", description: "Conexão de contas profissionais e coleta de métricas pela API oficial da Meta.", capabilities: ["Conectar contas profissionais", "Sincronizar métricas", "Importar posts"], state: "Pronto para configurar", note: "Exige conta profissional e app Meta" },
  { id: "x", name: "X / Twitter", icon: Twitter, color: "twitter", description: "Publicação de posts e threads, além de métricas públicas e privadas autorizadas.", capabilities: ["Publicar posts", "Criar threads", "Ler métricas"], state: "Pronto para configurar", note: "Exige projeto no portal do X" },
  { id: "substack", name: "Substack", icon: Mail, color: "substack", description: "Organização editorial com datas, checklist e acesso rápido ao rascunho para publicação.", capabilities: ["Planejar a data", "Guardar rascunho", "Checklist manual"], state: "Fluxo manual inicial", note: "Automação depende da liberação do seu acesso de desenvolvedor" },
];

function IntegrationsModule({ activeAccountId }: ModuleProps) {
  const [selected, setSelected] = useState("instagram");
  const [setupOpen, setSetupOpen] = useState(false);
  const [instagram, setInstagram] = useState<InstagramStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const connector = connectorData.find((item) => item.id === selected)!;
  const ConnectorIcon = connector.icon;

  useEffect(() => {
    if (!activeAccountId) return;
    loadInstagramStatus(activeAccountId).then(setInstagram).catch(() => setInstagram(null));
  }, [activeAccountId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("integration") !== "instagram") return;
    if (params.get("status") === "error") queueMicrotask(() => setError("O Instagram não concluiu a autorização. Confira o aplicativo Meta e tente novamente."));
    if (params.get("status") === "connected") {
      queueMicrotask(async () => {
        setSyncing(true);
        setError("");
        try {
          const response = await fetch("/api/integrations/instagram/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: activeAccountId }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Não foi possível sincronizar.");
          setInstagram(await loadInstagramStatus(activeAccountId));
        } catch (syncError) {
          setError(syncError instanceof Error ? syncError.message : "Não foi possível sincronizar.");
        } finally {
          setSyncing(false);
        }
      });
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [activeAccountId]);

  function connectInstagram() {
    if (!instagram?.configured) { setSetupOpen(true); return; }
    window.location.assign(`/api/integrations/instagram/connect?accountId=${activeAccountId}`);
  }

  async function syncInstagram() {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/instagram/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accountId: activeAccountId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível sincronizar.");
      setInstagram(await loadInstagramStatus(activeAccountId));
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Não foi possível sincronizar.");
    } finally { setSyncing(false); }
  }

  async function disconnectInstagram() {
    if (!window.confirm("Desconectar esta conta do Instagram? Os dados já importados serão removidos.")) return;
    await fetch(`/api/integrations/instagram/status?accountId=${activeAccountId}`, { method: "DELETE" });
    setInstagram(await loadInstagramStatus(activeAccountId));
  }

  const instagramState = instagram?.connection ? `@${instagram.connection.username}` : instagram?.connectionMode === "access_token" ? "Credencial recebida" : instagram?.configured ? "Pronto para conectar" : "App Meta pendente";

  return (
    <div className="page-shell module-page">
      <PageHeader kicker="Conexões" title="Integrações" description="Automatize apenas o que cada canal permite e mantenha o restante organizado com datas e próximos passos." />
      <section className="integration-notice"><Zap size={18} /><div><strong>O calendário funciona antes das conexões</strong><span>Você já pode organizar datas e responsáveis. As credenciais serão adicionadas em uma etapa separada e segura.</span></div></section>
      <section className="connector-grid">
        {connectorData.map((item) => { const Icon = item.icon; const itemState = item.id === "instagram" ? instagramState : item.state; return <button type="button" className={`connector-card ${selected === item.id ? "selected" : ""}`} key={item.id} onClick={() => setSelected(item.id)}><div className={`connector-icon ${item.color}`}><Icon size={22} /></div><div className="connector-card-head"><strong>{item.name}</strong><span><StatusDot color={item.id === "substack" || (item.id === "instagram" && !instagram?.connection) ? "#ffd685" : "#b8ff6a"} />{itemState}</span></div><p>{item.description}</p><div className="capability-list">{item.capabilities.map((cap) => <span key={cap}><Check size={13} /> {cap}</span>)}</div><small>{item.id === "instagram" && instagram?.connection?.lastSyncedAt ? `Sincronizado em ${new Date(instagram.connection.lastSyncedAt).toLocaleString("pt-BR")}` : item.note}</small></button>; })}
      </section>
      <section className="connection-setup">
        <div className={`connector-icon large ${connector.color}`}><ConnectorIcon size={26} /></div>
        <div className="connection-copy"><span className="section-kicker">Configuração</span><h2>{connector.id === "instagram" && instagram?.connection ? `@${instagram.connection.username}` : connector.name}</h2><p>{connector.id === "instagram" ? instagram?.connection ? `Conta ${instagram.connection.accountType.toLowerCase()} conectada. Importe as métricas mais recentes e acompanhe o desempenho em Resultados.` : instagram?.connectionMode === "access_token" ? "A credencial recebida está protegida e pronta para vincular esta conta ao perfil ativo. Depois da confirmação, a primeira sincronização começa automaticamente." : "Autorize uma conta profissional diretamente pelo Instagram. O Layerflow receberá apenas as permissões de perfil, posts e métricas." : connector.id === "x" ? "Conecte um projeto do portal do X com permissão de leitura e escrita. O agendador publica no horário definido pelo calendário." : "O sistema prepara o texto, registra a data e mantém o conteúdo em uma fila manual. A automação só será ativada depois de confirmar que seu acesso oficial de desenvolvedor inclui os recursos de publicação necessários."}</p>{connector.id === "instagram" && instagram?.connection && <div className="connected-account-stats"><span><strong>{instagram.connection.followersCount.toLocaleString("pt-BR")}</strong> seguidores</span><span><strong>{instagram.connection.mediaCount.toLocaleString("pt-BR")}</strong> posts</span><span><strong>{instagram.connection.reach30d.toLocaleString("pt-BR")}</strong> alcance 30d</span></div>}</div>
        {connector.id === "instagram" ? <div className="connection-actions">{instagram?.connection ? <><button type="button" className="primary-button" onClick={syncInstagram} disabled={syncing}><RefreshCw className={syncing ? "spin" : ""} size={16} />{syncing ? "Sincronizando..." : "Sincronizar métricas"}</button><button type="button" className="text-button danger" onClick={disconnectInstagram}>Desconectar</button></> : <button type="button" className="primary-button" onClick={connectInstagram}>{instagram?.connectionMode === "access_token" ? "Ativar conta recebida" : instagram?.configured ? "Conectar Instagram" : "Ver configuração necessária"}<ArrowRight size={16} /></button>}</div> : <button type="button" className={connector.id === "substack" ? "secondary-button" : "primary-button"} onClick={() => setSetupOpen(true)}>{connector.id === "substack" ? "Ativar fluxo manual" : "Iniciar configuração"}<ArrowRight size={16} /></button>}
      </section>
      {error && <p className="form-error">{error}</p>}
      {selected === "instagram" && instagram?.connection?.lastError && <p className="integration-warning">{instagram.connection.lastError}</p>}
      <section className="automation-flow"><span className="section-kicker">Como vai funcionar</span><div><span><b>1</b> Conteúdo aprovado</span><ArrowRight size={16} /><span><b>2</b> Data confirmada</span><ArrowRight size={16} /><span><b>3</b> Publicação ou lembrete</span><ArrowRight size={16} /><span><b>4</b> Métricas retornam</span></div></section>
      {setupOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSetupOpen(false)}><section className="content-modal integration-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">Configuração guiada</span><h2>{connector.name}</h2></div><button type="button" className="icon-button" onClick={() => setSetupOpen(false)}><X size={18} /></button></div><div className={`connector-icon large ${connector.color}`}><ConnectorIcon size={25} /></div><div className="setup-checklist">{connector.id === "instagram" ? <><span><b>1</b> Criar um aplicativo do tipo Business no Meta for Developers</span><span><b>2</b> Ativar Instagram API with Instagram Login e as permissões de perfil e métricas</span><span><b>3</b> Cadastrar esta URL de retorno: <code>{instagram?.redirectUri}</code></span><span><b>4</b> Adicionar o ID e o segredo do aplicativo às configurações protegidas do Layerflow</span></> : connector.id === "x" ? <><span><b>1</b> Criar um projeto com leitura e escrita</span><span><b>2</b> Autorizar o perfil no fluxo OAuth</span><span><b>3</b> Definir o limite de publicação do plano</span></> : <><span><b>1</b> O calendário do Layerflow guarda a data</span><span><b>2</b> O conteúdo fica na fila manual</span><span><b>3</b> Você agenda dentro do editor do Substack</span></>}</div><p className="setup-note">O Layerflow nunca recebe sua senha do Instagram. A Meta devolve uma autorização temporária, armazenada de forma criptografada e renovada antes de expirar.</p><div className="modal-actions"><button type="button" className="primary-button" onClick={() => setSetupOpen(false)}>Entendi <Check size={16} /></button></div></section></div>}
    </div>
  );
}

export function NewContentModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: ModuleProps["onCreate"] }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("Reel");
  const [platform, setPlatform] = useState("Instagram");
  const [status, setStatus] = useState("Ideia");
  if (!open) return null;

  async function submit() {
    if (!title.trim()) return;
    await onCreate({ title, kind, platform, status, pillar: "Criatividade" });
    setTitle("");
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="content-modal" role="dialog" aria-modal="true" aria-label="Novo conteúdo" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head"><div><span className="section-kicker">Nova peça</span><h2>Adicionar conteúdo</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div>
        <label><span>Título ou ideia</span><textarea autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Escreva do jeito que a ideia chegou..." /></label>
        <div className="modal-field-grid"><label><span>Formato</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option>Reel</option><option>Carrossel</option><option>Stories</option><option>Thread</option><option>Newsletter</option><option>Ideia</option></select></label><label><span>Canal</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}><option>Instagram</option><option>X</option><option>Substack</option></select></label><label><span>Etapa</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option>Ideia</option><option>Roteiro</option><option>Produção</option><option>Revisão</option><option>Agendado</option></select></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" onClick={submit} disabled={!title.trim()}>Salvar conteúdo <ArrowRight size={16} /></button></div>
      </section>
    </div>
  );
}

export function ModuleView(props: ModuleProps) {
  switch (props.active) {
    case "Banco de ideias": return <IdeasModule {...props} />;
    case "Cascatas": return <CascadesModule {...props} />;
    case "Em produção": return <ProductionModule {...props} />;
    case "Calendário": return <CalendarModule {...props} />;
    case "Biblioteca":
    case "Iscas digitais":
    case "Roteiros": return <LibraryModule key={props.active} {...props} />;
    case "Resultados": return <ResultsModule {...props} />;
    case "Automações": return <AutomationsModule activeAccountId={props.activeAccountId} onNavigate={props.onNavigate} />;
    case "Integrações": return <IntegrationsModule {...props} />;
    default: return null;
  }
}
