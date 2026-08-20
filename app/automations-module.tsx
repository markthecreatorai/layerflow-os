"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  Copy,
  ExternalLink,
  FileDown,
  Instagram,
  Link2,
  MessageCircleReply,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  TestTube2,
  Trash2,
  Users,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

type Automation = {
  id: number;
  name: string;
  templateType: string;
  status: string;
  triggerType: string;
  mediaId?: string | null;
  mediaLabel?: string | null;
  matchType: string;
  keywords: string;
  publicReplyEnabled: boolean;
  replyMode: string;
  replyScripts: string;
  dmMessage: string;
  dmButtonLabel: string;
  dmLink?: string | null;
  assetId?: number | null;
  cooldownHours: number;
  commentsCount: number;
  repliesSent: number;
  dmsSent: number;
  clicks: number;
  leads: number;
  lastRunAt?: string | null;
};

type AutomationEvent = {
  id: number;
  automationName: string;
  username: string;
  commentText: string;
  matchedKeyword?: string | null;
  publicReply?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
};

type AutomationData = {
  automations: Automation[];
  events: AutomationEvent[];
  assets: Array<{ id: number; title: string; format: string; status: string }>;
  media: Array<{ id: string; caption: string; mediaType: string; permalink: string; publishedAt: string }>;
  instagram: { username: string; status: string } | null;
  readiness: {
    connected: boolean;
    liveReady: boolean;
    mode: "live" | "test";
    webhookConfigured: boolean;
    webhookUrl: string;
    webhookVerifyToken?: string | null;
    requiredScopes: string[];
  };
};

type Draft = {
  id?: number;
  name: string;
  templateType: string;
  triggerType: "keywords" | "any_comment";
  mediaId: string;
  mediaLabel: string;
  matchType: "contains" | "exact";
  keywords: string;
  publicReplyEnabled: boolean;
  replyMode: "random" | "sequential";
  replyScripts: string[];
  dmMessage: string;
  dmButtonLabel: string;
  dmLink: string;
  assetId: string;
  cooldownHours: number;
};

const templates = [
  { id: "lead_magnet", title: "Entregar isca digital", description: "Comentou uma palavra, recebe o material no direct.", icon: FileDown, keyword: "GUIA", message: "Oi, {{first_name}}! Aqui está o {{lead_magnet_title}} que você pediu: {{link}}" },
  { id: "link", title: "Enviar um link", description: "Leve a pessoa para uma página, aula ou produto.", icon: Link2, keyword: "LINK", message: "Oi, {{first_name}}! Este é o link que você pediu: {{link}}" },
  { id: "waitlist", title: "Lista de espera", description: "Direcione interessados para uma página de cadastro.", icon: Users, keyword: "LISTA", message: "Oi, {{first_name}}! Você pode entrar na lista por aqui: {{link}}" },
  { id: "service", title: "Interesse em serviço", description: "Envie apresentação e o próximo passo comercial.", icon: Sparkles, keyword: "QUERO", message: "Oi, {{first_name}}! Vi seu interesse. Aqui está o próximo passo para conversarmos: {{link}}" },
];

const defaultDraft: Draft = {
  name: "Entrega automática",
  templateType: "lead_magnet",
  triggerType: "keywords",
  mediaId: "",
  mediaLabel: "Todas as publicações",
  matchType: "contains",
  keywords: "GUIA",
  publicReplyEnabled: true,
  replyMode: "random",
  replyScripts: [
    "Acabei de te enviar no direct, {{first_name}}!",
    "Pode conferir suas mensagens 👀",
    "O material já está no seu direct.",
  ],
  dmMessage: "Oi, {{first_name}}! Aqui está o {{lead_magnet_title}} que você pediu: {{link}}",
  dmButtonLabel: "Acessar material",
  dmLink: "",
  assetId: "",
  cooldownHours: 24,
};

function parseList(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}

function draftFromAutomation(automation: Automation): Draft {
  return {
    id: automation.id,
    name: automation.name,
    templateType: automation.templateType,
    triggerType: automation.triggerType === "any_comment" ? "any_comment" : "keywords",
    mediaId: automation.mediaId ?? "",
    mediaLabel: automation.mediaLabel ?? "Todas as publicações",
    matchType: automation.matchType === "exact" ? "exact" : "contains",
    keywords: parseList(automation.keywords).join(", "),
    publicReplyEnabled: automation.publicReplyEnabled,
    replyMode: automation.replyMode === "sequential" ? "sequential" : "random",
    replyScripts: parseList(automation.replyScripts),
    dmMessage: automation.dmMessage,
    dmButtonLabel: automation.dmButtonLabel,
    dmLink: automation.dmLink ?? "",
    assetId: automation.assetId ? String(automation.assetId) : "",
    cooldownHours: automation.cooldownHours,
  };
}

function fillPreview(value: string, link = "seu material") {
  return value
    .replaceAll("{{first_name}}", "Lucas")
    .replaceAll("{{username}}", "lucas.criativo")
    .replaceAll("{{keyword}}", "GUIA")
    .replaceAll("{{lead_magnet_title}}", "Mapa da Marca Criativa")
    .replaceAll("{{link}}", link);
}

function Wizard({ data, initial, onClose, onSaved }: { data: AutomationData; initial?: Draft; onClose: () => void; onSaved: (message: string) => void }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(initial ?? defaultDraft);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ publicReply: string; directMessage: string } | null>(null);
  const [error, setError] = useState("");
  const keywords = draft.keywords.split(",").map((item) => item.trim()).filter(Boolean);

  function selectTemplate(template: typeof templates[number]) {
    setDraft((current) => ({ ...current, templateType: template.id, name: template.title, keywords: template.keyword, dmMessage: template.message }));
  }

  function selectMedia(mediaId: string) {
    const media = data.media.find((item) => item.id === mediaId);
    setDraft((current) => ({ ...current, mediaId, mediaLabel: media ? media.caption.slice(0, 90) || `${media.mediaType} do Instagram` : "Todas as publicações" }));
  }

  function payload(status: "Rascunho" | "Ativa") {
    return {
      ...draft,
      accountId: undefined,
      status,
      keywords,
      assetId: draft.assetId ? Number(draft.assetId) : null,
      mediaId: draft.mediaId || null,
      dmLink: draft.dmLink || null,
    };
  }

  async function testFlow() {
    setTesting(true);
    setError("");
    try {
      const response = await fetch("/api/automations/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload("Rascunho"), accountId: (data as AutomationData & { accountId?: number }).accountId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível testar.");
      setTestResult(result);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Não foi possível testar.");
    } finally { setTesting(false); }
  }

  async function save(status: "Rascunho" | "Ativa") {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/automations", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload(status), accountId: (data as AutomationData & { accountId?: number }).accountId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      onSaved(result.mode === "test" || result.automation?.status === "Teste" ? "Automação salva em modo de teste. Conclua a configuração da Meta para ativar envios reais." : status === "Ativa" ? "Automação ativada." : "Rascunho salvo.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Não foi possível salvar.");
    } finally { setSaving(false); }
  }

  const canContinue = step === 1 ? Boolean(draft.name.trim() && (draft.triggerType === "any_comment" || keywords.length)) : step === 2 ? (!draft.publicReplyEnabled || draft.replyScripts.some((item) => item.trim())) : step === 3 ? Boolean(draft.dmMessage.trim()) : true;

  return (
    <div className="modal-backdrop automation-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="automation-wizard" role="dialog" aria-modal="true" aria-label="Criar automação" onMouseDown={(event) => event.stopPropagation()}>
        <header className="automation-wizard-head">
          <div><span className="section-kicker">Configuração simples</span><h2>{draft.id ? "Editar automação" : "Nova automação"}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>
        <div className="wizard-progress">{["Gatilho", "Comentário", "Direct", "Revisar"].map((label, index) => <button type="button" key={label} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} onClick={() => index + 1 < step && setStep(index + 1)}><i>{step > index + 1 ? <Check size={13} /> : index + 1}</i><span>{label}</span></button>)}</div>
        <div className="wizard-body">
          {step === 1 && <div className="wizard-section"><div className="wizard-title"><span>1</span><div><h3>O que inicia esta automação?</h3><p>Escolha um modelo e defina o comentário que deve acionar o funil.</p></div></div><div className="template-grid">{templates.map((template) => { const Icon = template.icon; return <button type="button" className={draft.templateType === template.id ? "selected" : ""} key={template.id} onClick={() => selectTemplate(template)}><span><Icon size={18} /></span><strong>{template.title}</strong><small>{template.description}</small></button>; })}</div><div className="wizard-form-grid"><label className="wide"><span>Nome da automação</span><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label><span>Publicação</span><select value={draft.mediaId} onChange={(event) => selectMedia(event.target.value)}><option value="">Todas as publicações</option>{data.media.map((media) => <option key={media.id} value={media.id}>{media.caption.slice(0, 72) || `${media.mediaType} de ${new Date(media.publishedAt).toLocaleDateString("pt-BR")}`}</option>)}</select></label><label><span>Tipo de comentário</span><select value={draft.triggerType} onChange={(event) => setDraft({ ...draft, triggerType: event.target.value as Draft["triggerType"] })}><option value="keywords">Contém palavras</option><option value="any_comment">Qualquer comentário</option></select></label>{draft.triggerType === "keywords" && <><label className="wide"><span>Palavras-chave, separadas por vírgula</span><input value={draft.keywords} onChange={(event) => setDraft({ ...draft, keywords: event.target.value })} placeholder="GUIA, AULA, COMUNIDADE" /><small>{keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</small></label><label><span>Correspondência</span><select value={draft.matchType} onChange={(event) => setDraft({ ...draft, matchType: event.target.value as Draft["matchType"] })}><option value="contains">Contém a palavra</option><option value="exact">Comentário exato</option></select></label></>}</div></div>}
          {step === 2 && <div className="wizard-section"><div className="wizard-title"><span>2</span><div><h3>Como responder ao comentário?</h3><p>Use variações para deixar a conversa natural.</p></div></div><label className="toggle-row"><input type="checkbox" checked={draft.publicReplyEnabled} onChange={(event) => setDraft({ ...draft, publicReplyEnabled: event.target.checked })} /><span><strong>Responder publicamente</strong><small>Avise que o material foi enviado no direct.</small></span></label>{draft.publicReplyEnabled && <><div className="reply-toolbar"><label><span>Alternar respostas</span><select value={draft.replyMode} onChange={(event) => setDraft({ ...draft, replyMode: event.target.value as Draft["replyMode"] })}><option value="random">Aleatoriamente</option><option value="sequential">Em sequência</option></select></label><button type="button" className="secondary-button compact" onClick={() => setDraft({ ...draft, replyScripts: [...draft.replyScripts, ""] })}><Plus size={14} /> Nova variação</button></div><div className="script-stack">{draft.replyScripts.map((script, index) => <label key={index}><span>Variação {index + 1}</span><div><input value={script} onChange={(event) => setDraft({ ...draft, replyScripts: draft.replyScripts.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} /><button type="button" onClick={() => setDraft({ ...draft, replyScripts: draft.replyScripts.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Remover"><X size={15} /></button></div></label>)}</div></>}</div>}
          {step === 3 && <div className="wizard-section dm-step"><div><div className="wizard-title"><span>3</span><div><h3>O que será enviado no direct?</h3><p>Escolha uma isca da biblioteca ou informe um link externo.</p></div></div><div className="wizard-form-grid"><label className="wide"><span>Mensagem privada</span><textarea rows={5} value={draft.dmMessage} onChange={(event) => setDraft({ ...draft, dmMessage: event.target.value })} /></label><label><span>Isca digital</span><select value={draft.assetId} onChange={(event) => setDraft({ ...draft, assetId: event.target.value, dmLink: event.target.value ? "" : draft.dmLink })}><option value="">Nenhuma</option>{data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.title} · {asset.format}</option>)}</select></label><label><span>Ou link externo</span><input type="url" value={draft.dmLink} disabled={Boolean(draft.assetId)} onChange={(event) => setDraft({ ...draft, dmLink: event.target.value })} placeholder="https://..." /></label><label><span>Chamada do link</span><input value={draft.dmButtonLabel} onChange={(event) => setDraft({ ...draft, dmButtonLabel: event.target.value })} /></label><label><span>Limite por pessoa</span><select value={draft.cooldownHours} onChange={(event) => setDraft({ ...draft, cooldownHours: Number(event.target.value) })}><option value={0}>Sem limite</option><option value={24}>Uma vez por dia</option><option value={168}>Uma vez por semana</option><option value={720}>Uma vez por mês</option></select></label></div><div className="variable-pills"><span>Variáveis:</span>{["{{first_name}}", "{{username}}", "{{keyword}}", "{{lead_magnet_title}}", "{{link}}"].map((variable) => <button type="button" key={variable} onClick={() => setDraft({ ...draft, dmMessage: `${draft.dmMessage}${draft.dmMessage.endsWith(" ") ? "" : " "}${variable}` })}>{variable}</button>)}</div></div><div className="phone-preview"><div className="phone-top"><Instagram size={16} /><strong>@{data.instagram?.username ?? "instagram"}</strong><MoreHorizontal size={16} /></div><div className="phone-chat"><span>Comentário: “{keywords[0] || "GUIA"}”</span><div>{fillPreview(draft.dmMessage, draft.assetId || draft.dmLink ? "layerflow.link/material" : "")}</div>{(draft.assetId || draft.dmLink) && <button type="button">{draft.dmButtonLabel || "Acessar"}<ExternalLink size={13} /></button>}</div></div></div>}
          {step === 4 && <div className="wizard-section review-step"><div className="wizard-title"><span>4</span><div><h3>Revise antes de ativar</h3><p>O teste não envia mensagens reais.</p></div></div><div className="review-grid"><article><span>Perfil</span><strong>@{data.instagram?.username ?? "não conectado"}</strong></article><article><span>Publicação</span><strong>{draft.mediaLabel}</strong></article><article><span>Gatilho</span><strong>{draft.triggerType === "any_comment" ? "Qualquer comentário" : keywords.join(", ")}</strong></article><article><span>Entrega</span><strong>{draft.assetId ? data.assets.find((asset) => String(asset.id) === draft.assetId)?.title : draft.dmLink ? "Link externo" : "Mensagem"}</strong></article></div><div className="test-panel"><div><TestTube2 size={18} /><span><strong>Teste seguro</strong><small>Simule o comentário antes de publicar.</small></span></div><button type="button" className="secondary-button compact" onClick={testFlow} disabled={testing}>{testing ? "Testando..." : "Testar automação"}</button>{testResult && <div className="test-result"><span><b>Comentário</b>{testResult.publicReply}</span><span><b>Direct</b>{testResult.directMessage}</span></div>}</div>{!data.readiness.liveReady && <div className="test-mode-note"><Zap size={17} /><div><strong>Será salvo em modo de teste</strong><span>A configuração está pronta, mas os envios reais só ficam disponíveis depois de concluir o App Meta, as permissões e o webhook.</span></div></div>}</div>}
          {error && <p className="form-error">{error}</p>}
        </div>
        <footer className="wizard-footer"><button type="button" className="text-button" onClick={() => step === 1 ? onClose() : setStep(step - 1)}>{step > 1 && <ChevronLeft size={16} />}{step === 1 ? "Cancelar" : "Voltar"}</button><div>{step === 4 && <button type="button" className="secondary-button" onClick={() => save("Rascunho")} disabled={saving}>Salvar rascunho</button>}{step < 4 ? <button type="button" className="primary-button" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continuar <ArrowRight size={16} /></button> : <button type="button" className="primary-button" disabled={saving} onClick={() => save("Ativa")}><Play size={15} /> {saving ? "Salvando..." : data.readiness.liveReady ? "Ativar automação" : "Salvar modo de teste"}</button>}</div></footer>
      </section>
    </div>
  );
}

export default function AutomationsModule({ activeAccountId, onNavigate }: { activeAccountId: number; onNavigate: (value: string) => void }) {
  const [data, setData] = useState<(AutomationData & { accountId: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/automations?accountId=${activeAccountId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar as automações.");
      setData({ ...result, accountId: activeAccountId });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as automações.");
    } finally { setLoading(false); }
  }, [activeAccountId]);

  useEffect(() => { if (activeAccountId) queueMicrotask(() => void load()); }, [activeAccountId, load]);

  const totals = useMemo(() => data?.automations.reduce((summary, automation) => ({ comments: summary.comments + automation.commentsCount, dms: summary.dms + automation.dmsSent, clicks: summary.clicks + automation.clicks, leads: summary.leads + automation.leads }), { comments: 0, dms: 0, clicks: 0, leads: 0 }) ?? { comments: 0, dms: 0, clicks: 0, leads: 0 }, [data]);

  async function action(id: number, status?: string, duplicate = false) {
    setError("");
    const response = await fetch("/api/automations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...(duplicate ? { action: "duplicate" } : { status }) }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Não foi possível atualizar."); return; }
    setNotice(duplicate ? "Automação duplicada como rascunho." : result.automation?.status === "Teste" ? "A automação permanece em modo de teste até a Meta ser configurada." : "Automação atualizada.");
    await load();
  }

  async function remove(id: number) {
    if (!window.confirm("Excluir esta automação e seu histórico?")) return;
    await fetch("/api/automations", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    setNotice("Automação excluída.");
    await load();
  }

  async function testExisting(automation: Automation) {
    const response = await fetch("/api/automations/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: automation.id, accountId: activeAccountId }) });
    const result = await response.json();
    setNotice(response.ok ? `Teste: “${result.publicReply}” → Direct preparado com sucesso.` : result.error || "Não foi possível testar.");
  }

  async function copyText(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice("Copiado para a área de transferência."); } catch { setNotice("Selecione e copie o valor manualmente."); }
  }

  function saved(message: string) { setWizard(null); setNotice(message); load(); }

  if (loading && !data) return <div className="page-shell module-page"><div className="automation-loading"><WandSparkles size={22} /><span>Preparando suas automações...</span></div></div>;
  if (!data) return <div className="page-shell module-page"><p className="form-error">{error || "Não foi possível carregar."}</p></div>;

  return (
    <div className="page-shell module-page automation-page">
      <section className="module-heading"><div><span className="section-kicker">Conversas que entregam valor</span><h1>Automações</h1><p>Transforme comentários em conversas, entregas e leads sem criar fluxos complicados.</p></div><button className="primary-button" type="button" onClick={() => setWizard({ ...defaultDraft })}><Plus size={17} /> Criar automação</button></section>
      <section className={`automation-readiness ${data.readiness.liveReady ? "ready" : "test"}`}><div className="readiness-icon">{data.readiness.liveReady ? <Check size={19} /> : <TestTube2 size={19} />}</div><div><strong>{data.readiness.liveReady ? `Envios ativos em @${data.instagram?.username}` : "Modo de teste disponível"}</strong><span>{!data.readiness.connected ? "Conecte o Instagram para selecionar publicações e preparar o envio." : data.readiness.liveReady ? "Comentários, respostas e mensagens serão processados pela API oficial da Meta." : "Você já pode montar e testar funis. Para envios reais, conclua o App Meta, as permissões de comentários e o webhook."}</span></div>{!data.readiness.connected ? <button type="button" className="secondary-button compact" onClick={() => onNavigate("Integrações")}>Conectar Instagram <ArrowRight size={15} /></button> : !data.readiness.liveReady ? <button type="button" className="secondary-button compact" onClick={() => onNavigate("Integrações")}>Ver integração <ArrowRight size={15} /></button> : null}</section>
      {!data.readiness.liveReady && data.readiness.connected && <section className="automation-setup-card"><div className="automation-section-head"><div><span className="section-kicker">Ativação dos envios reais</span><h2>Configuração da Meta</h2></div><span>3 passos</span></div><div className="automation-setup-steps"><article><b>1</b><div><strong>Permissões</strong><span>Reconecte a conta aceitando comentários e mensagens.</span><small>{data.readiness.requiredScopes.join(" · ")}</small></div></article><article><b>2</b><div><strong>URL do webhook</strong><span>{data.readiness.webhookUrl}</span></div><button type="button" onClick={() => copyText(data.readiness.webhookUrl)}><Copy size={14} /></button></article><article><b>3</b><div><strong>Token de verificação</strong><span>{data.readiness.webhookVerifyToken || "Será gerado após configurar o App Meta"}</span></div>{data.readiness.webhookVerifyToken && <button type="button" onClick={() => copyText(data.readiness.webhookVerifyToken!)}><Copy size={14} /></button>}</article></div></section>}
      {(notice || error) && <div className={error ? "automation-alert error" : "automation-alert"}><span>{error || notice}</span><button type="button" onClick={() => { setNotice(""); setError(""); }}><X size={14} /></button></div>}
      <section className="automation-metrics"><article><div><MessageCircleReply size={17} /><span>Comentários</span></div><strong>{totals.comments.toLocaleString("pt-BR")}</strong><small>identificados</small></article><article><div><Send size={17} /><span>Directs enviados</span></div><strong>{totals.dms.toLocaleString("pt-BR")}</strong><small>entregas realizadas</small></article><article><div><BarChart3 size={17} /><span>Cliques</span></div><strong>{totals.clicks.toLocaleString("pt-BR")}</strong><small>nos materiais</small></article><article><div><Users size={17} /><span>Leads</span></div><strong>{totals.leads.toLocaleString("pt-BR")}</strong><small>conversas iniciadas</small></article></section>
      <section className="automation-layout"><div className="automation-main-list"><div className="automation-section-head"><div><span className="section-kicker">Seus funis</span><h2>Automações configuradas</h2></div><span>{data.automations.length} {data.automations.length === 1 ? "automação" : "automações"}</span></div>{data.automations.length ? <div className="automation-list">{data.automations.map((automation) => { const keywords = parseList(automation.keywords); return <article className="automation-card" key={automation.id}><div className="automation-card-icon"><Zap size={18} /></div><div className="automation-card-copy"><div><strong>{automation.name}</strong><span className={`automation-status ${automation.status.toLowerCase()}`}>{automation.status}</span></div><p>{automation.triggerType === "any_comment" ? "Qualquer comentário" : `Palavras: ${keywords.join(", ")}`} · {automation.mediaLabel || "Todas as publicações"}</p><div className="automation-card-numbers"><span><b>{automation.commentsCount}</b> comentários</span><span><b>{automation.dmsSent}</b> directs</span><span><b>{automation.clicks}</b> cliques</span>{automation.lastRunAt && <span><Clock3 size={12} /> {new Date(automation.lastRunAt).toLocaleString("pt-BR")}</span>}</div></div><div className="automation-card-actions"><button type="button" title="Editar" onClick={() => setWizard(draftFromAutomation(automation))}><WandSparkles size={15} /></button><button type="button" title="Testar" onClick={() => testExisting(automation)}><TestTube2 size={15} /></button><button type="button" title="Duplicar" onClick={() => action(automation.id, undefined, true)}><Copy size={15} /></button><button type="button" title={automation.status === "Ativa" ? "Pausar" : "Ativar"} onClick={() => action(automation.id, automation.status === "Ativa" ? "Pausada" : "Ativa")} >{automation.status === "Ativa" ? <Pause size={15} /> : <Play size={15} />}</button><button type="button" className="danger" title="Excluir" onClick={() => remove(automation.id)}><Trash2 size={15} /></button></div></article>; })}</div> : <div className="automation-empty"><div><MessageSquareText size={24} /></div><h3>Seu primeiro funil começa por uma palavra</h3><p>Escolha “GUIA”, “AULA” ou outra palavra e entregue o material automaticamente no direct.</p><button type="button" className="primary-button" onClick={() => setWizard({ ...defaultDraft })}>Criar primeira automação <ArrowRight size={16} /></button></div>}</div><aside className="activity-panel"><div className="automation-section-head"><div><span className="section-kicker">Histórico</span><h2>Atividades recentes</h2></div><Activity size={17} /></div>{data.events.length ? <div className="activity-list">{data.events.slice(0, 10).map((event) => <article key={event.id}><i className={event.status === "Entregue" ? "success" : event.status === "Erro" ? "error" : "pending"} /><div><div><strong>@{event.username}</strong><span>{new Date(event.createdAt).toLocaleString("pt-BR")}</span></div><p>“{event.commentText.slice(0, 80)}”</p><small>{event.automationName} · {event.status}{event.error ? ` · ${event.error.slice(0, 90)}` : ""}</small></div></article>)}</div> : <div className="activity-empty"><Activity size={21} /><span>As entregas aparecerão aqui.</span></div>}</aside></section>
      {wizard && <Wizard key={wizard.id ?? "new"} data={data} initial={wizard} onClose={() => setWizard(null)} onSaved={saved} />}
    </div>
  );
}
