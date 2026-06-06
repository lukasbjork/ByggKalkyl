# ByggKalkyl

Webbapplikation där ett byggföretag laddar upp projektunderlag (IFC/PDF/Excel) och får ut en
**kalkyl**: materialkostnad, arbetskostnad, omkostnader/påslag och uppskattad genomförandetid –
summerat per byggdel och totalt.

> **Byggd ärligt.** AI tar fram *förslag* på mängder som du granskar innan kalkyl. Priser ligger
> bakom ett `PriceProvider`-interface med en intern, seedbar prislista – **inga skrapade
> grossistpriser, inga hårdkodade avtalspriser**. Enhetstider ligger i en egen, redigerbar
> tidsnormstabell seedad med tydligt märkta EXEMPEL-värden (**ingen Wikells/MAP-data**).

---

## Arkitektur

Monorepo (pnpm workspaces):

```
apps/web        Next.js 14 (App Router, TS) – UI, API-routes, kalkylmotor, pris-/tidslager, export
services/ifc    Python FastAPI – IFC-mängduttag (ifcopenshell) + PDF-rasterisering (PyMuPDF)
samples/        Exempelunderlag (EDI-CSV, rumslista, minimal IFC)
```

- **Databas:** PostgreSQL via Prisma. I denna miljö körs **Neon** (moln) eftersom Docker saknas.
  `docker-compose.yml` ingår för dem som vill köra Postgres lokalt.
- **AI (gratis):** Google Gemini (gratis nivå, inget kreditkort) för vision-mängdning av PDF-ritningar
  och tolkning av rumslistor, bakom ett utbytbart `LLMProvider`-interface (`src/lib/ai/`). Nyckel läses
  från `GEMINI_API_KEY` (aldrig i koden). AI är **valfri** – IFC, Excel och manuell inmatning funkar utan.
- **Fillagring:** `StorageService` – lokal disk i dev, objektlagring (Netlify Blobs/S3) i moln.

---

## Förutsättningar

- **Node ≥ 20** och **pnpm 9** (`npm install -g pnpm`).
- **Python 3.12** för `services/ifc`. `ifcopenshell`/`PyMuPDF` saknar ofta wheels för nyare Python.
  Rekommenderas: [`uv`](https://docs.astral.sh/uv/) som hanterar Python-version automatiskt.
- En **PostgreSQL-databas**. Enklast: gratis [Neon](https://neon.tech). (Eller Docker, se nedan.)
- (Valfritt) En **gratis Gemini-nyckel** för AI-mängdning av PDF/rumslista (Steg 2):
  https://aistudio.google.com/apikey – inget kreditkort. Utan nyckel: IFC/Excel/manuellt funkar ändå.

---

## Kom igång (lokalt)

### 1. Miljövariabler
```bash
cp .env.example .env
```
Fyll i `.env`:
- `DATABASE_URL` + `DIRECT_URL` från ditt Neon-projekt (pooled resp. direkt anslutning).
- (Valfritt) `GEMINI_API_KEY` för AI-mängdning (+ ev. `GEMINI_MODEL`, default `gemini-2.5-flash`).
- `IFC_SERVICE_URL` (default `http://localhost:8000`).

### 2. Webben (apps/web)
```bash
pnpm install
pnpm prisma:migrate     # skapar tabeller i Neon (kör en gång)
pnpm seed               # fyller DB med EXEMPELDATA (yrken, material, rabatter, tidsnormer)
pnpm dev                # startar Next.js på http://localhost:3000
```

### 3. IFC/PDF-tjänsten (services/ifc)
```bash
cd services/ifc
uv venv --python 3.12
uv pip install -r requirements.txt
uv run uvicorn app.main:app --reload --port 8000   # http://localhost:8000/health
```
> Utan `uv`: skapa en venv med en Python 3.12-tolk och `pip install -r requirements.txt`.
> Webben fungerar även om tjänsten är nere – då sker mängdning manuellt eller via Excel.

### Alternativ: Postgres via Docker
```bash
docker compose up -d
# sätt DATABASE_URL/DIRECT_URL till localhost:5432 enligt .env.example
```

---

## Byggsteg & status

| Steg | Innehåll | Status |
|------|----------|--------|
| 0 | Skelett: monorepo, Next.js, FastAPI, Prisma-schema, seed, config | ✅ |
| 1 | Projekt & uppladdning (StorageService) | ✅ |
| 2 | Mängdning: IFC (auto), PDF (AI-förslag/Gemini), Excel/rumslista, granskningstabell | ✅ |
| 3 | Prislager (PriceProvider, rabattbrev, EDI-import, prislista-sida) | ✅ |
| 4 | Tids- & kalkylmotor, tidsnorm-koppling/auto-match (+ Vitest, 9 tester) | ✅ |
| 5 | Resultatvy per byggdel & export (xlsx + PDF) | ✅ |
| 6 | Molndeploy (Netlify + Render + Neon) | ⏳ |

---

## Byta exempeldata mot egna värden

All seed-data är **EXEMPEL** och tydligt märkt. Så ersätter du den:

- **Priser:** redigera `Resource`-raderna (via Prisma Studio: `pnpm prisma:studio`, eller importera
  en leverantörskatalog i Steg 3 via `EdiCatalogProvider`). Sätt dina verkliga bruttopriser.
- **Rabattbrev:** redigera `DiscountRule` (leverantör + ev. varugrupp + rabatt%). Nettopris räknas
  som `bruttopris × (1 − rabatt%)`.
- **Tidsnormer:** redigera `TimeNorm` och sätt `exempel = false` på dina egna normtider. Fyll i
  `timmarPerEnhet` från egen historik/erfarenhet.
- **Yrken/timpriser:** redigera `Trade`.

Seed-scriptet (`apps/web/prisma/seed.ts`) är idempotent (upsert på fasta id:n) och skriver bara över
seed-raderna – dina egna tillagda rader rörs inte.

## Koppla en riktig PriceProvider senare

`apps/web/src/lib/price/` definierar `PriceProvider`-interfacet. Tre implementationer:

- `InternalPriceProvider` – läser `Resource` från DB (standard).
- `FinfoProvider` *(stub)* – kräver Finfo-abonnemang (GS1-Validoo/GDSN). TODO-kommentarer visar var
  credentials läggs. Bygg signaturen, inte integrationen, tills avtal finns.
- `EdiCatalogProvider` – importerar en leverantörs e-katalog (CSV/XML) till `Resource`.

> **Juridik:** skrapa aldrig en grossists inloggade webbshop och bädda aldrig in Wikells/MAP-data.
> Riktig prisåtkomst kräver kundavtal via EDI/Punchout/e-katalog eller kommersiell datakälla.

---

## Molndeploy (Steg 6)

- **Frontend + API:** Netlify (`@netlify/plugin-nextjs`, **ej** static export). Se `netlify.toml`.
- **IFC/PDF-tjänst:** Render via `render.yaml` (Docker, Python 3.12).
- **Databas:** Neon (pooled `DATABASE_URL` för app, `DIRECT_URL` för migrationer).
- **Fillagring:** sätt `STORAGE_DRIVER=blobs` (Netlify Blobs) – serverless-disk är inte beständig.

---

## Tester

```bash
pnpm test     # Vitest: kalkylmotor + rabattlogik (Steg 4)
pnpm e2e      # Playwright happy-path (Steg 5)
```
