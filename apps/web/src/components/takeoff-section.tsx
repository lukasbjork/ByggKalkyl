"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Wand2,
  FileSearch,
} from "lucide-react";

import { cn, formatNumber, formatSEK } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RunAll } from "@/components/run-all";

export interface TakeoffDoc {
  id: string;
  filnamn: string;
  typ: "IFC" | "PDF" | "EXCEL" | "OTHER";
  status: string;
}

export interface TakeoffItemPris {
  leverantor: string;
  benamning: string;
  brutto: number;
  netto: number;
  rabatt: number;
}

export interface TakeoffItemTid {
  yrke: string;
  timmarPerEnhet: number;
  timpris: number;
}

export interface TakeoffItemLite {
  id: string;
  kod: string | null;
  benamning: string;
  mangd: string;
  enhet: string;
  lageskod: string | null;
  kalla: "IFC" | "AI_PDF" | "MANUAL" | "EXCEL";
  konfidens: string | null;
  antagande: string | null;
  granskad: boolean;
  kopplatResourceId: string | null;
  pris: TakeoffItemPris | null;
  kopplatTimeNormId: string | null;
  tid: TakeoffItemTid | null;
}

interface TimeNormLite {
  id: string;
  aktivitet: string;
  enhet: string;
  timmarPerEnhet: number;
  kod: string | null;
  yrke: string;
  timpris: number;
  exempel: boolean;
}

interface PriceResultLite {
  resourceId: string;
  leverantor: string;
  artikelnr: string | null;
  benamning: string;
  enhet: string;
  bruttopris: number;
  nettopris: number;
  rabattProcent: number;
  provider: string;
}

const UNITS = ["st", "m", "m2", "m3", "kg", "h"] as const;

const KALLA_LABEL: Record<TakeoffItemLite["kalla"], string> = {
  IFC: "IFC",
  AI_PDF: "AI-förslag",
  MANUAL: "Manuell",
  EXCEL: "Excel",
};
const KALLA_VARIANT: Record<
  TakeoffItemLite["kalla"],
  "success" | "warning" | "secondary"
> = {
  IFC: "success",
  AI_PDF: "warning",
  MANUAL: "secondary",
  EXCEL: "secondary",
};

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function confidencePct(konfidens: string | null): string {
  if (konfidens == null) return "–";
  return `${Math.round(Number(konfidens) * 100)}%`;
}

export function TakeoffSection({
  projectId,
  documents,
  items,
}: {
  projectId: string;
  documents: TakeoffDoc[];
  items: TakeoffItemLite[];
}) {
  const granskade = items.filter((i) => i.granskad).length;
  const mangdbara = documents.filter((d) => d.typ !== "OTHER");

  return (
    <div className="space-y-6">
      {/* Ett-klick: kör hela kalkylen */}
      <RunAll projectId={projectId} documents={documents} />

      {/* Automatisk mängdning per dokument */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mängda från underlag</CardTitle>
          <CardDescription>
            IFC ger automatiska mängder. PDF tolkas av AI (kräver gratis
            Gemini-nyckel). Excel läses från kolumner. Allt blir{" "}
            <strong>förslag</strong> som du granskar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mangdbara.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ladda upp en IFC-, PDF- eller Excel-fil ovan för att kunna mängda
              automatiskt.
            </p>
          ) : (
            mangdbara.map((doc) => (
              <DocTakeoffRow key={doc.id} projectId={projectId} doc={doc} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Rumslista (AI) + manuell rad */}
      <div className="grid gap-6 md:grid-cols-2">
        <RoomListCard projectId={projectId} />
        <AddManualCard projectId={projectId} />
      </div>

      {/* Granskningstabell */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              Granskningstabell ({items.length} poster)
            </CardTitle>
            <div className="flex items-center gap-2">
              <MatchTimeNormsButton projectId={projectId} />
              <Badge variant={granskade === items.length && items.length > 0 ? "success" : "secondary"}>
                {granskade}/{items.length} granskade
              </Badge>
            </div>
          </div>
          <CardDescription>
            Inget räknas i kalkylen förrän posten är markerad som granskad. Koppla pris
            och tidsnorm per post (eller matcha tidsnormer automatiskt).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Inga mängdposter ännu.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benämning</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead className="text-right">Mängd</TableHead>
                  <TableHead>Enhet</TableHead>
                  <TableHead>Läge</TableHead>
                  <TableHead>Källa</TableHead>
                  <TableHead className="text-right">Pris (netto)</TableHead>
                  <TableHead>Tid/enhet</TableHead>
                  <TableHead>Konf.</TableHead>
                  <TableHead className="text-center">Granskad</TableHead>
                  <TableHead className="text-right">Åtgärder</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TakeoffRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Auto-mängdning per dokument ─────────────────────────────────────────── */
function DocTakeoffRow({
  projectId,
  doc,
}: {
  projectId: string;
  doc: TakeoffDoc;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/documents/${doc.id}/takeoff`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Mängdningen misslyckades" });
      } else {
        setMsg({ ok: true, text: `${data.created} poster skapade. ${data.info ?? ""}` });
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Nätverksfel mot servern." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <FileSearch className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{doc.filnamn}</span>
      <Badge variant="outline">{doc.typ}</Badge>
      <Button size="sm" onClick={run} disabled={loading} className="ml-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Mängda
      </Button>
      {msg && (
        <p
          className={cn(
            "w-full text-xs",
            msg.ok ? "text-emerald-700" : "text-destructive",
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

/* ── Rumslista (AI) ──────────────────────────────────────────────────────── */
function RoomListCard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/takeoff/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? "Tolkningen misslyckades" });
      } else {
        setMsg({ ok: true, text: `${data.created} förslag skapade.` });
        setText("");
        router.refresh();
      }
    } catch {
      setMsg({ ok: false, text: "Nätverksfel." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tolka rumslista (AI)</CardTitle>
        <CardDescription>
          Klistra in en stökig rumslista/AMA-text. Kräver gratis Gemini-nyckel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Rum 201: gips vägg ca 18 kvm, 2 uttag..."
          rows={5}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={run} disabled={loading || text.trim().length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Tolka med AI
          </Button>
          {msg && (
            <span className={cn("text-xs", msg.ok ? "text-emerald-700" : "text-destructive")}>
              {msg.text}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Manuell rad ─────────────────────────────────────────────────────────── */
function AddManualCard({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [benamning, setBenamning] = useState("");
  const [mangd, setMangd] = useState("");
  const [enhet, setEnhet] = useState("st");
  const [kod, setKod] = useState("");
  const [lage, setLage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/takeoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benamning,
          mangd: Number(mangd),
          enhet,
          kod: kod || null,
          lageskod: lage || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunde inte lägga till");
      }
      setBenamning("");
      setMangd("");
      setEnhet("st");
      setKod("");
      setLage("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setLoading(false);
    }
  }

  const valid = benamning.trim().length > 0 && mangd !== "" && !Number.isNaN(Number(mangd));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lägg till manuell post</CardTitle>
        <CardDescription>Manuella poster markeras automatiskt som granskade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Input
          placeholder="Benämning"
          value={benamning}
          onChange={(e) => setBenamning(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            type="number"
            step="any"
            placeholder="Mängd"
            value={mangd}
            onChange={(e) => setMangd(e.target.value)}
          />
          <select className={inputCls} value={enhet} onChange={(e) => setEnhet(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <Input placeholder="Kod" value={kod} onChange={(e) => setKod(e.target.value)} />
        </div>
        <Input placeholder="Läge (valfritt)" value={lage} onChange={(e) => setLage(e.target.value)} />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={add} disabled={loading || !valid}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Lägg till
          </Button>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Redigerbar rad ──────────────────────────────────────────────────────── */
function TakeoffRow({ item }: { item: TakeoffItemLite }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    benamning: item.benamning,
    kod: item.kod ?? "",
    mangd: item.mangd,
    enhet: item.enhet,
    lageskod: item.lageskod ?? "",
  });

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch(`/api/takeoff/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    await patch({
      benamning: draft.benamning,
      kod: draft.kod || null,
      mangd: Number(draft.mangd),
      enhet: draft.enhet,
      lageskod: draft.lageskod || null,
    });
    setEditing(false);
  }

  async function remove() {
    if (!confirm("Ta bort posten?")) return;
    setBusy(true);
    try {
      await fetch(`/api/takeoff/${item.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <input
            className={inputCls}
            value={draft.benamning}
            onChange={(e) => setDraft({ ...draft, benamning: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            className={inputCls}
            value={draft.kod}
            onChange={(e) => setDraft({ ...draft, kod: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            type="number"
            step="any"
            className={cn(inputCls, "text-right")}
            value={draft.mangd}
            onChange={(e) => setDraft({ ...draft, mangd: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <select
            className={inputCls}
            value={draft.enhet}
            onChange={(e) => setDraft({ ...draft, enhet: e.target.value })}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </TableCell>
        <TableCell>
          <input
            className={inputCls}
            value={draft.lageskod}
            onChange={(e) => setDraft({ ...draft, lageskod: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <Badge variant={KALLA_VARIANT[item.kalla]}>{KALLA_LABEL[item.kalla]}</Badge>
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {item.pris ? formatSEK(item.pris.netto) : "–"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {item.tid ? `${item.tid.timmarPerEnhet} h (${item.tid.yrke})` : "–"}
        </TableCell>
        <TableCell>{confidencePct(item.konfidens)}</TableCell>
        <TableCell />
        <TableCell>
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" onClick={save} disabled={busy} aria-label="Spara">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-600" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
              aria-label="Avbryt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={item.granskad ? undefined : "bg-amber-50/40"}>
      <TableCell className="font-medium">{item.benamning}</TableCell>
      <TableCell className="text-muted-foreground">{item.kod ?? "–"}</TableCell>
      <TableCell className="text-right">{formatNumber(Number(item.mangd))}</TableCell>
      <TableCell>{item.enhet}</TableCell>
      <TableCell className="text-muted-foreground">{item.lageskod ?? "–"}</TableCell>
      <TableCell>
        <Badge variant={KALLA_VARIANT[item.kalla]}>{KALLA_LABEL[item.kalla]}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <PriceLinkDialog item={item} />
      </TableCell>
      <TableCell>
        <TimeNormLinkDialog item={item} />
      </TableCell>
      <TableCell>{confidencePct(item.konfidens)}</TableCell>
      <TableCell className="text-center">
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-emerald-600"
          checked={item.granskad}
          disabled={busy}
          onChange={(e) => patch({ granskad: e.target.checked })}
          aria-label="Granskad"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label="Redigera">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button size="icon" variant="ghost" onClick={remove} disabled={busy} aria-label="Ta bort">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ── Koppla pris ─────────────────────────────────────────────────────────── */
function PriceLinkDialog({ item }: { item: TakeoffItemLite }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(item.benamning);
  const [results, setResults] = useState<PriceResultLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/price/search?benamning=${encodeURIComponent(q)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sökning misslyckades");
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel");
    } finally {
      setLoading(false);
    }
  }

  async function link(resourceId: string | null) {
    await fetch(`/api/takeoff/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kopplatResourceId: resourceId }),
    });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && results.length === 0) search();
      }}
    >
      <DialogTrigger asChild>
        {item.pris ? (
          <button className="text-right text-sm hover:underline">
            <span className="font-medium">{formatSEK(item.pris.netto)}</span>
            <span className="block text-xs text-muted-foreground">
              {item.pris.rabatt > 0 ? `−${item.pris.rabatt}%` : "netto"}
            </span>
          </button>
        ) : (
          <Button size="sm" variant="outline">
            Koppla pris
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Koppla pris – {item.benamning}</DialogTitle>
          <DialogDescription>
            Sök i prislistan. Nettopris = brutto × (1 − rabatt enligt rabattbrev).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Sök benämning…"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sök"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {item.pris && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2 text-sm">
            <span>
              Kopplat: <strong>{item.pris.benamning}</strong> ({item.pris.leverantor}) –{" "}
              {formatSEK(item.pris.netto)} netto
            </span>
            <Button size="sm" variant="ghost" onClick={() => link(null)}>
              Ta bort koppling
            </Button>
          </div>
        )}

        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benämning</TableHead>
                <TableHead>Leverantör</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead className="text-right">Rabatt</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 && !loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Inga träffar.
                  </TableCell>
                </TableRow>
              ) : (
                results.map((r) => (
                  <TableRow key={r.resourceId}>
                    <TableCell className="font-medium">
                      {r.benamning}
                      <span className="block text-xs text-muted-foreground">
                        {r.enhet} · {r.provider}
                      </span>
                    </TableCell>
                    <TableCell>{r.leverantor}</TableCell>
                    <TableCell className="text-right">{formatSEK(r.bruttopris)}</TableCell>
                    <TableCell className="text-right">
                      {r.rabattProcent > 0 ? `−${r.rabattProcent}%` : "–"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatSEK(r.nettopris)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => link(r.resourceId)}>
                        Välj
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Auto-matcha tidsnormer ──────────────────────────────────────────────── */
function MatchTimeNormsButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/match-timenorms`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      setMsg(`${data.matched ?? 0} matchade, ${data.unmatched ?? 0} kvar`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button size="sm" variant="outline" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        Matcha tidsnormer
      </Button>
    </div>
  );
}

/* ── Koppla tidsnorm ─────────────────────────────────────────────────────── */
function TimeNormLinkDialog({ item }: { item: TakeoffItemLite }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [norms, setNorms] = useState<TimeNormLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/timenorms");
      setNorms(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function link(id: string | null) {
    await fetch(`/api/takeoff/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kopplatTimeNormId: id }),
    });
    setOpen(false);
    router.refresh();
  }

  const f = filter.toLowerCase();
  const filtered = norms.filter(
    (n) =>
      !f ||
      n.aktivitet.toLowerCase().includes(f) ||
      (n.kod ?? "").toLowerCase().includes(f) ||
      n.yrke.toLowerCase().includes(f),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && norms.length === 0) load();
      }}
    >
      <DialogTrigger asChild>
        {item.tid ? (
          <button className="text-left text-sm hover:underline">
            <span className="font-medium">{item.tid.timmarPerEnhet} h</span>
            <span className="block text-xs text-muted-foreground">{item.tid.yrke}</span>
          </button>
        ) : (
          <Button size="sm" variant="outline">
            Koppla tid
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Koppla tidsnorm – {item.benamning}</DialogTitle>
          <DialogDescription>
            Arbetstimmar = mängd × enhetstid. EXEMPEL-normer bör ersättas med egna.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrera aktivitet/kod/yrke…"
        />

        {item.tid && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2 text-sm">
            <span>
              Kopplat: <strong>{item.tid.yrke}</strong> – {item.tid.timmarPerEnhet} h/enhet ·{" "}
              {formatSEK(item.tid.timpris)}/h
            </span>
            <Button size="sm" variant="ghost" onClick={() => link(null)}>
              Ta bort koppling
            </Button>
          </div>
        )}

        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aktivitet</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Enhet</TableHead>
                <TableHead className="text-right">h/enhet</TableHead>
                <TableHead>Yrke</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Laddar…
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">
                      {n.aktivitet}
                      {n.exempel && (
                        <Badge variant="warning" className="ml-2">
                          EXEMPEL
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{n.kod ?? "–"}</TableCell>
                    <TableCell>{n.enhet}</TableCell>
                    <TableCell className="text-right">{n.timmarPerEnhet}</TableCell>
                    <TableCell>{n.yrke}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => link(n.id)}>
                        Välj
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
