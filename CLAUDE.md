# CLAUDE.md · Landing Biodomus

Brief master del progetto. Vale per ogni step. Se uno step e questo file si contraddicono, vale questo file e lo segnali nel report.

## §0 Chi sei e qual è l'obiettivo

Lavori come tre ruoli insieme:
- sviluppatore senior React + Vite su Netlify: build statica prerenderizzata, Netlify Functions, Supabase;
- creative technologist: GSAP, Lenis, SVG animati, prestazioni su telefoni medi;
- copywriter CRO per servizi ad alto valore: chi ti legge sta decidendo una spesa da centinaia di migliaia di euro.

Obiettivo: una landing in italiano che trasforma il traffico delle campagne Meta (Instagram e Facebook) in richieste di preventivo qualificate per Mirko Lanzafame, fondatore e referente unico di Biodomus.

Pubblico, in ordine di importanza:
1. coppie e famiglie che vogliono costruire una casa indipendente;
2. chi ha già un terreno e cerca chi costruisce;
3. chi investe in villette o piccoli complessi residenziali.
Zona: provincia di Varese, Milano e Como. Arrivano quasi tutti da telefono, spesso dal browser interno di Instagram o Facebook, con connessione mobile.

Cosa fa Biodomus: non costruisce. Ascolta il progetto, lo porta alle aziende partner, rivede con il cliente preventivo e contratto, segue tempi e cantiere, e resta il suo unico referente. Il contratto di costruzione il cliente lo firma con l'impresa. La pagina lo dice in modo chiaro: è il motivo per cui ci si fida.

Criterio per ogni scelta: più richieste di preventivo qualificate, con informazioni vere. A parità di risultato, la soluzione più semplice e più leggera. Pagina pulita, poche cose per schermata, frasi corte.

Avvio dei lavori (step 0): 15 novembre 2026. Pubblicazione e lancio delle campagne: 11 gennaio 2027.

Regola di lavoro: esegui solo lo step richiesto, fai il report di §12, FERMATI. Non anticipare parti degli step successivi.

## §1 Il repository

- Repository GitHub: biodomus-srl. Branch di lavoro: lavoro. Il branch main cambia solo con la pull request dello step 8.
- Struttura:

```
/                      progetto Vite: index.html, package.json, vite.config.ts, netlify.toml, CLAUDE.md
src/
  content/             testi.json (tutti i testi) e dati.ts (i dati di §2): unica fonte dei contenuti
  components/          componenti condivisi, prefisso Bd
  sections/            una sezione per file, prefisso Bd
  lib/                 movimento, consenso, tracciamento, angolo, utilità
  styles/              bd-tokens.css e bd-base.css
  assets/              immagini ottimizzate, svg, loghi autorizzati
netlify/functions/     bd-lead.mts (modulo) e bd-keepalive.mts (Supabase sveglio)
supabase/migrations/   SQL della tabella dei contatti
scripts/               prerender.mjs
public/                favicon, og-image, robots.txt, sitemap.xml, grazie.html, privacy.html, cookie.html
studio/                foto originali, script, anteprima simulata, controlli, report
```

- studio/ è escluso da build, deploy e linter: Vite non lo importa, ESLint e TypeScript lo ignorano, Netlify pubblica solo dist/.
- In studio/originali/ io carico foto e loghi dal sito di GitHub. Non cancellarli e non modificarli: lavori su copie.
- Netlify, Supabase, Brevo e Meta si collegano solo allo step 8. Fino ad allora tutto si verifica in locale con l'anteprima simulata di §13.

## §2 Dati del progetto (unica fonte di verità)

Questi valori vanno in src/content/dati.ts e da lì in tutta la pagina. Nessun componente scrive un dato a mano. I testi in testi.json usano segnaposti come {ZONA} che si risolvono da dati.ts al momento del build.

Se un valore è «[DA COMPILARE: …]» non inventarlo: usa un testo neutro o nascondi l'elemento, e segnalalo nel report. In pagina non deve mai comparire «DA COMPILARE».

Progetto
- REPO: biodomus-srl
- BRANCH: lavoro
- NETLIFY_SITO: biodomus
- DOMINIO (già registrato da noi): biodomussrls.it
- DATA_AVVIO (step 0): 15 novembre 2026
- DATA_ONLINE (pubblicazione e lancio delle campagne): 11 gennaio 2027

Brand e contatti
- BRAND: Biodomus
- REFERENTE: Mirko Lanzafame
- RUOLO_REFERENTE: fondatore e referente unico
- EMAIL_LEAD (dove arrivano le richieste): biodomus2025@libero.it
- EMAIL_PUBBLICA: biodomus2025@libero.it
- TELEFONO: +39 349 239 1107
- WHATSAPP (link https://wa.me/ generato da TELEFONO, solo cifre con 39 davanti): sì
- TEMPO_RISPOSTA: entro 2 giorni lavorativi
- ZONA: provincia di Varese, Milano e Como
- LOGO: nessun logo: wordmark tipografico

Dati legali
- TITOLARE (la società, titolare della partita IVA e del trattamento dei dati; il referente è REFERENTE): BIODOMUS SRLS
- FORMA: società a responsabilità limitata semplificata
- PIVA: 04059520124
- SEDE: Via Carlo Noè 45, 21013 Gallarate (VA)
- REA: VA-398965
- CAPITALE: 5.000 €
- PEC: biodomus@cgn.legalmail.it
- RUOLO_LEGALE: da definire con il commercialista
- COSTO_SERVIZIO: Il primo incontro conoscitivo è gratuito e senza impegno. Il cliente non sostiene costi per il servizio di consulenza: l'eventuale compenso viene riconosciuto direttamente dall'azienda partner, secondo accordi preventivamente definiti.

Partner
- P1_NOME: Edilnoma Building S.r.l.
- P1_RUOLO: impresa di costruzioni: ville e complessi residenziali chiavi in mano
- P1_SITO: https://www.edilnoma.it
- P1_OK (autorizzazione scritta a nome, logo e foto): no
- P2_NOME: Bioisotherm
- P2_RUOLO: produttore di sistemi costruttivi: casseri isolanti in EPS per pareti e solai in calcestruzzo armato
- P2_SITO: https://www.bioisotherm.it
- P2_OK (autorizzazione scritta a nome, logo e foto): no
- RAPPORTO_PARTNER (l'impresa costruisce con il sistema di P2?): da verificare

Offerta e dati tecnici (solo come li scrivono i partner)
- SISTEMA: pareti portanti in calcestruzzo armato gettato dentro casseri isolanti che restano nella parete
- SISTEMA_BREVE: Calcestruzzo armato in casseri isolanti
- TEMPI: circa 8 mesi dal rilascio del permesso di costruire
- GARANZIA: (vuoto: non citare garanzie)
- CLASSE: A4
- BUDGET_MIN: 250.000 €
- REALIZZAZIONI (una per riga: nome · comune · m² · anno · classe):
Villa Smeraldo · – · 282 · 2025 · A4
Villa Serena · – · 388 · 2024 · A4
Villa Mary · Carnago · 336 · 2020 · A4
Villa Alessia · Marnate · 208 · 2026 · A4
Villa a Cislago · Cislago · 363 · 2026 · A4
Villa Sara · – · 237 · 2017 · A

Design
- STILE: Cemento (chiaro, grigio caldo)
- COLORE_ACCENTO (antracite dei serramenti): #383E42

Servizi (si usano allo step 8)
- SUPABASE_URL: (arriva allo step 8)
- BREVO_MITTENTE (sempre un indirizzo sul dominio di DOMINIO, mai di posta gratuita): (arriva allo step 8)
- META_PIXEL: (vuoto: niente Pixel né API Conversioni finché non arriva)

Regole condizionali
- Partner con autorizzazione «no»: niente nome, logo, foto né realizzazioni di quell'azienda. Al loro posto «un'impresa partner» e le illustrazioni di §5.
- Un solo partner autorizzato, o nessuno: niente plurali sbagliati. «Le aziende partner» diventa «l'impresa partner» se ne resta una.
- Oggi l'impresa di costruzioni partner è una sola (P1; P2 produce il sistema costruttivo, non costruisce): tutti i testi dicono «l'impresa partner» o «l'impresa adatta», al singolare, mai «le imprese partner» né «imprese selezionate». Il plurale torna solo con almeno due imprese di costruzioni partner autorizzate.
- RAPPORTO_PARTNER diverso da «sì, confermato per iscritto»: non scrivere che l'impresa usa il sistema di P2. Descrivi solo SISTEMA, che è la descrizione comune ai due siti.
- GARANZIA vuota: nessuna riga sulla garanzia. CLASSE vuota: nessuna classe energetica. REALIZZAZIONI vuota o P1_OK «no»: sezione Realizzazioni nascosta.
- TELEFONO e WHATSAPP sono canali secondari: compaiono solo in BdChiusura (pulsanti secondari «Chiama» e «Scrivi su WhatsApp» sotto la CTA primaria) e nel footer, mai nell'hero, nella barra mobile o accanto al modulo. Il modulo resta l'unica CTA primaria. TELEFONO vuoto: niente «Chiama» e niente WhatsApp. WHATSAPP «no»: niente link WhatsApp.
- EMAIL_PUBBLICA vuota: si usa EMAIL_LEAD dove serve un'email visibile.
- Unità sempre: m², mesi, €, «classe energetica A4». Numeri in formato italiano: 250.000 €.
- Niente valori U, decibel, classi sismiche o prezzi al m² se non arrivano per iscritto dai partner.
- Fasce di budget del modulo, calcolate da BUDGET_MIN: «meno di BUDGET_MIN», «da BUDGET_MIN a BUDGET_MIN + 100.000 €», «da BUDGET_MIN + 100.000 € a BUDGET_MIN + 250.000 €», «oltre BUDGET_MIN + 250.000 €», «non lo so ancora».

## §3 Regole d'oro

1. File nuovi con prefisso del progetto: componenti, sezioni e funzioni Bd/bd (BdHero.tsx, bd-lead.mts, bd-tokens.css). I file dello scaffold Vite si toccano solo dove serve (index.html, src/main.tsx, src/App.tsx, vite.config.ts, eslint.config.js, package.json, tsconfig) e ogni modifica va nel report. I file di esempio dello scaffold (logo Vite, App.css, contatore) si eliminano allo step 1.
2. Alla fine di ogni step `npm run check` dà 0 errori: TypeScript strict, ESLint, build con prerender, studio/controlli.mjs.
3. Git: all'inizio dello step `git fetch origin`, `git checkout lavoro`, `git pull`. Alla fine un commit «step N: titolo» e `git push origin lavoro`. Ogni step deve potersi annullare con un solo revert.
4. L'ambiente può azzerarsi tra una sessione e l'altra. Se mancano node_modules, il browser di Playwright o altri strumenti, reinstallali (npm ci) senza chiedere.
5. Mobile first: progetti a 390 px, poi allarghi. A 390 px nessuno scroll orizzontale.
6. Ogni testo sta in src/content/testi.json, modificabile dal sito di GitHub senza toccare codice. I default sono il copy di §8.
7. Niente dati finti: niente recensioni inventate, contatori, «ultimi posti», countdown, loghi o foto di aziende senza autorizzazione, foto o render presentati come case costruite se non lo sono.
8. Ogni effetto ha un ripiego. Senza JavaScript la pagina si legge tutta (HTML prerenderizzato) e il modulo invia lo stesso (POST classico alla funzione, poi /grazie.html). Con prefers-reduced-motion niente smooth scroll, pin, parallasse né testi spezzati: solo dissolvenze brevi. WebGL non si usa.
9. Niente librerie superflue né CDN. Dipendenze ammesse: react, react-dom, gsap, @gsap/react, lenis, tailwindcss, @tailwindcss/vite, @fontsource-variable/bricolage-grotesque, @fontsource-variable/inter. Solo sviluppo: typescript, eslint e plugin dello scaffold, @netlify/functions, playwright, sharp, tsx. Ogni altra dipendenza va motivata nel report. Font self-hosted. Versioni esatte in package.json. TypeScript resta alla 6.0.x: typescript-eslint supporta solo versioni sotto la 6.1. Lo scaffold di create-vite 9 propone TypeScript 7 e oxlint: non usarli finché typescript-eslint non supporta la 7. Il linter è ESLint (eslint.config.js, con @eslint/js, globals, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh).
10. Dati di business (tempi, classi, garanzie, budget, nomi, contatti) solo da §2, mai scritti a mano nei componenti.
11. Non chiedermi ciò che puoi procurarti o generare da solo. Chiedi solo ciò che so io: dati mancanti di §2, autorizzazioni, account, chiavi.
12. Segreti (chiavi Supabase, Brevo, Meta) mai nel codice né nel repository: solo variabili d'ambiente di Netlify. I nomi stanno in .env.example.
13. Niente asserzioni ambientali generiche: «eco», «ecologica», «green», «sostenibile», «bio» (tranne nel nome Biodomus), «a impatto zero», «amica dell'ambiente» non compaiono nei testi. Dal 27 settembre 2026 il D.Lgs. 30/2026 le vieta se non c'è un'eccellenza ambientale riconosciuta e dimostrabile. Si scrivono fatti verificabili: classe energetica dell'APE, materiali, sistema costruttivo.
14. Ogni dato tecnico che non è in §2 o nella documentazione ufficiale lo verifichi prima di usarlo. Niente a memoria.

## §4 Architettura

File da creare, uno per riga:
- index.html — lang="it", viewport, title, description, Open Graph, preload del font dei titoli, script inline dell'angolo (§7) prima del CSS, div#root con l'HTML prerenderizzato.
- vite.config.ts — plugin React e Tailwind (@tailwindcss/vite), target es2020.
- src/main.tsx — hydrateRoot se #root ha contenuto, altrimenti createRoot. Movimento e tracciamento partono dopo l'hydration.
- src/entry-server.tsx — render() con renderToString per il prerender.
- scripts/prerender.mjs — dopo `vite build` e `vite build --ssr src/entry-server.tsx --outDir dist-ssr`, inserisce l'HTML renderizzato in dist/index.html.
- src/App.tsx — sezioni nell'ordine di §6.
- src/content/testi.json, src/content/dati.ts, src/content/bd-testi.ts (risolve i segnaposti {CHIAVE}), src/content/immagini.json (manifesto delle immagini).
- src/styles/bd-tokens.css, src/styles/bd-base.css.
- src/lib/bd-motion.ts — Lenis e ScrollTrigger sincronizzati, gsap.matchMedia per la riduzione del movimento. Solo nel browser.
- src/lib/bd-consenso.ts — consenso cookie in localStorage con try/catch, scadenza 6 mesi, evento al cambio.
- src/lib/bd-traccia.ts — carica il Pixel solo con consenso. track('Lead', {}, {eventID}) dopo l'invio del modulo; track('Contact') al clic su «Chiama» o «Scrivi su WhatsApp», senza dati personali. Senza consenso non fa nulla.
- src/lib/bd-angolo.ts — legge ?a= e data-angolo.
- src/lib/bd-utm.ts — salva utm_* e fbclid in sessionStorage alla prima visita.
- src/components/ — BdHeader, BdFooter, BdCta, BdBarraMobile, BdSezione, BdQuota (linea di quota), BdWordmark, BdBannerCookie.
- src/sections/ — BdHero, BdPerChi, BdComeFunziona, BdRuolo, BdSistema, BdRealizzazioni, BdPartner, BdModulo, BdFaq, BdChiusura.
- netlify/functions/bd-lead.mts — risponde a POST /api/lead (export const config = { path: "/api/lead" }). Accetta JSON e form-urlencoded. Validazione, honeypot, tempo minimo di compilazione 3 secondi, corpo massimo 10 kB. Ordine: 1) email a EMAIL_LEAD con Brevo; 2) email di conferma al cliente; 3) riga su Supabase via REST con la chiave segreta; 4) evento Lead all'API Conversioni solo se il cliente ha accettato i cookie di marketing. Un passaggio che fallisce va nei log e non blocca gli altri. Se falliscono sia l'email sia Supabase risponde 502 e la pagina mostra l'email pubblica come ripiego. Risposta JSON {ok, id}; se la richiesta non chiede JSON (invio senza JavaScript) risponde 303 verso /grazie.html. Con BD_MOCK=1 non chiama servizi esterni e scrive il contatto in studio/report/lead-mock.jsonl.
- netlify/functions/bd-keepalive.mts — schedule "@daily": una lettura sulla tabella dei contatti, così il progetto Supabase Free non va in pausa.
- supabase/migrations/001_bd_leads.sql — tabella bd_leads: id uuid, creato_il, profilo, terreno, comune, budget, tempistica, nome, email, telefono, messaggio, angolo, utm_source, utm_medium, utm_campaign, utm_content, fbclid, pagina, consenso_marketing, stato (default «nuovo»). RLS attiva e nessuna policy per anon: scrive solo la funzione.
- public/grazie.html, public/privacy.html, public/cookie.html, public/404.html — HTML statico con lo stesso stile.
- netlify.toml — build "npm run build", publish "dist", functions "netlify/functions", header di sicurezza (Content-Security-Policy, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy), cache lunga su /assets/*.
- .env.example — SUPABASE_URL, SUPABASE_SECRET_KEY, BREVO_API_KEY, BREVO_MITTENTE, EMAIL_LEAD, META_PIXEL_ID, META_CAPI_TOKEN, META_TEST_EVENT_CODE, BD_MOCK.
- studio/ — controlli.mjs, anteprima-server.mts, screenshot.mjs, immagini.mjs, report/.

Requisiti verificati e insidie:
- Netlify, piano Free: 300 crediti al mese con limite fisso. Production deploy 15 crediti; deploy preview e branch deploy 0; banda 20 crediti per GB; 2 crediti ogni 10.000 richieste; funzioni 10 crediti per GB-ora; Netlify Forms gratis. Finiti i crediti il sito va offline («Site not available») fino al passaggio a un piano a pagamento. Quindi: nessun deploy di produzione durante lo sviluppo, pagina leggera (§9).
- Netlify scheduled functions: girano solo sui deploy pubblicati, durano al massimo 30 secondi, il cron è in UTC, in locale si provano con `netlify functions:invoke`.
- Supabase Free: il progetto va in pausa dopo 7 giorni di bassa attività. Per questo la funzione manda prima l'email e c'è il keepalive.
- Brevo: POST https://api.brevo.com/v3/smtp/email con header api-key. Il mittente deve essere verificato in Brevo, altrimenti errore 400. Piano Free: 300 email al giorno. Brevo non può autenticare i domini di posta gratuita (libero.it, gmail.com, yahoo, hotmail, outlook, icloud): li sostituisce con un indirizzo brevosend.com e le email rischiano lo spam. Il mittente sta sul dominio di DOMINIO, autenticato in Brevo con codice Brevo, DKIM e DMARC nel DNS. EMAIL_LEAD può essere anche di posta gratuita: riceve soltanto.
- Meta: Pixel e API Conversioni si deduplicano se hanno lo stesso nome evento («Lead») e lo stesso ID (eventID nel Pixel, event_id nel server) entro 48 ore. L'ID lo genera il browser con crypto.randomUUID() e lo manda alla funzione. Endpoint: https://graph.facebook.com/VERSIONE/PIXEL_ID/events: controlla la versione attuale sulla documentazione (a febbraio 2026 era v25.0). Email e telefono normalizzati e hashati SHA-256; fbp e fbc dai cookie solo con consenso; action_source «website»; event_source_url senza dati personali.
- Prima di scriverli, verifica sulla documentazione ufficiale: SSR e prerender di Vite, formato attuale delle Netlify Functions (export default async (req: Request) => Response), Tailwind v4 con @tailwindcss/vite, installazione dei componenti React Bits e 21st.dev, opzioni di Lenis.

## §5 Design system

Atmosfera: «dal disegno alla casa». I materiali di una casa moderna: intonaco grigio, cemento, serramenti antracite, legno di rovere. Ordine da tavola tecnica, calore da casa finita. Molto spazio, poche cose per schermata. Niente colori accesi, niente gradienti: grigi caldi, un antracite deciso e il legno solo come dettaglio.

STILE scelto: Cemento (chiaro, grigio caldo). Se è «Cemento» usi la palette chiara, se è «Grafite» quella scura.

L'accento è l'antracite dei serramenti: pulsanti e link, deciso e sobrio. Il legno di rovere scalda i dettagli grafici (icone, numeri dei passaggi, linee di quota, sottolineature), mai il testo. Il «ruggine» dell'armatura compare solo nei disegni (tondini), mai sul testo.

Palette chiara (token in bd-tokens.css):
- --bd-fondo #EDECE8 (intonaco grigio), --bd-carta #F8F7F5 (card), --bd-testo #1F2326 (grafite), --bd-testo-2 #595E62, --bd-linea #D3D1CC (solo bordi e griglia), --bd-accento #383E42 (antracite: pulsanti con testo bianco, link), --bd-accento-hover #262B2E, --bd-legno #A87B4F (rovere: solo dettagli grafici), --bd-ruggine #B4542D (solo disegni), --bd-ok #4F6B58 (conferme).
Palette scura:
- --bd-fondo #1A1C1E, --bd-carta #232629, --bd-testo #ECEBE8, --bd-testo-2 #A9ADB0, --bd-linea #3A3E42, --bd-accento #E4E1DA (pulsanti con testo #1A1C1E, link), --bd-legno #C49A6C (solo dettagli grafici), --bd-ruggine #E08A62 (solo disegni), --bd-ok #9DB5A3.
Contrasti misurati (WCAG): chiara — testo su fondo 13,4:1, testo-2 su fondo 5,5:1, accento su fondo 9,2:1 (link), bianco su accento 10,8:1 (pulsanti), ok su carta 5,5:1, legno su fondo 3,2:1 (solo grafica, mai testo), ruggine su fondo 4,2:1 (solo disegni). Scura — testo su fondo 14,3:1, testo-2 su fondo 7,6:1, #1A1C1E su accento 13,1:1. Se COLORE_ACCENTO cambia, ricalcola: sotto 4,5:1 con il bianco usa il testo scuro sul pulsante o scurisci l'accento, e scrivilo nel report.

Tipografia: titoli Bricolage Grotesque Variable (pesi 600–800, interlinea 1,02, tracking −0,02em); testi Inter Variable (400, 500, 600). Scala: h1 clamp(2.5rem, 6vw + 1rem, 5.25rem); h2 clamp(1.9rem, 3.5vw + 1rem, 3.25rem); h3 1.375rem; testo 1.0625rem con interlinea 1,6; piccolo 0.875rem. Righe al massimo di 65 caratteri.

Spazi: scala 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px. Sezioni: 96 px sopra e sotto su mobile, 160 px su desktop. Griglia: 4 colonne su mobile, 12 su desktop, gutter 16/24 px. Raggi: 4 px per i dettagli tecnici, 20 px per le card, pill per le CTA.

CTA: primaria a pillola, piena di accento, altezza 56 px, testo 600, freccia che scorre di 4 px all'hover. Secondaria con bordo. Una sola primaria per schermata: la CTA dell'header è sempre secondaria (con bordo, compatta) e BdBarraMobile si nasconde quando un'altra CTA primaria è nello schermo. Lo verifica studio/screenshot.mjs.

Movimento: GSAP con ScrollTrigger e Lenis (duration 1.1, syncTouch false, sincronizzato con gsap.ticker). Ingressi: y da 24 a 0 con autoAlpha, 0,7 s, ease «power3.out», stagger 0,08. Titoli h1 e h2 rivelati per righe con SplitText solo da 1024 px in su. Nessuna animazione blocca la lettura per più di 0,8 s.

Dettaglio firma, «la sezione»: un disegno al tratto in SVG della parete (strato isolante esterno, calcestruzzo con armatura, strato isolante interno, intonaco) con i retini da tavola tecnica e le linee di quota. Mentre scorri si compone strato per strato e le quote si disegnano. Grande in BdSistema e nell'hero; in piccolo, come linea di quota numerata (BdQuota), separa le sezioni. Sullo sfondo una griglia da tavolo tecnico: linee di 1 px in --bd-linea al 60% di opacità, ogni 32 px (all'8% sul fondo cemento non si vedeva).

Immagini: foto reali di case finite e cantieri, solo da fonti autorizzate (§2), con il credito. Se mancano: illustrazioni al tratto in SVG (sezione, pianta, assonometria) etichettate «Illustrazione». Mai foto di stock né render generati presentati come case costruite.

Riduzione del movimento: niente Lenis, pin né SplitText; la sezione appare già composta; dissolvenze al massimo di 200 ms.

Componenti: per effetti di testo e microinterazioni guarda React Bits (BlurText, Magnet sulla CTA desktop); per accordion delle FAQ e passaggi del modulo guarda 21st.dev. Si installano con la CLI shadcn indicata nella pagina del componente. Se il registro non risponde, ricrei l'effetto con GSAP e CSS e lo scrivi nel report. Mai React Bits Pro.

## §6 Struttura e strategia

Sezioni in ordine, ognuna con il suo scopo:
1. BdHeader — wordmark o logo, link «Come funziona», CTA «Richiedi un preventivo» secondaria (con bordo). Scopo: CTA sempre a un tocco, senza fare concorrenza alla primaria della sezione.
2. BdHero — occhiello con ZONA, titolo e sottotitolo per angolo (§7), CTA primaria e secondaria, tre fatti brevi (TEMPI, CLASSE, SISTEMA_BREVE, solo quelli presenti), la sezione animata. Scopo: in 5 secondi chi sei, per chi, cosa fare.
3. BdPerChi — tre card: «Vuoi costruire casa», «Hai già il terreno», «Vuoi investire». Ogni card porta al modulo con il profilo già scelto. Scopo: riconoscersi e fare il primo clic.
4. BdComeFunziona — 4 passaggi con linea di quota animata. Scopo: togliere la paura di un processo lungo.
5. BdRuolo — chi fa cosa: Biodomus, l'impresa, il cliente; quanto costa il servizio. Scopo: fiducia verso un intermediario.
6. BdSistema — la sezione grande, ogni strato si apre al tocco con una frase. Scopo: qualità tangibile senza gergo.
7. BdRealizzazioni — solo con P1_OK «sì» e REALIZZAZIONI piena: card con foto, nome, comune, m², anno, classe e «Realizzata da P1_NOME». Scopo: prova concreta.
8. BdPartner — partner autorizzati: logo, nome, una riga, link al sito (rel="noopener"). Scopo: credibilità.
9. BdModulo (#preventivo) — modulo in 3 passaggi (§8). Scopo: la conversione.
10. BdFaq — 8 domande. Scopo: rispondere alle obiezioni prima della chiamata.
11. BdChiusura — CTA finale con TEMPO_RISPOSTA; sotto, i canali secondari «Chiama» e «Scrivi su WhatsApp» (regole condizionali di §2).
12. BdFooter — contatti (telefono e WhatsApp, email pubblica, PEC), dati legali completi, privacy, cookie, «Gestisci cookie», nota sul ruolo.
In più BdBarraMobile: barra fissa in basso solo su mobile, appare dopo l'hero e sparisce quando il modulo o un'altra CTA primaria è nello schermo.

CTA: 6 punti (header, hero, card di BdPerChi, dopo BdComeFunziona, dopo BdRealizzazioni o BdSistema, BdChiusura) più la barra mobile. Tutte portano a #preventivo con scroll morbido e focus sul primo campo del passaggio 1.

## §7 Varianti per campagna

Parametro URL ?a= con valori famiglia, terreno, investo. Valore assente o sconosciuto: famiglia.
Senza sfarfallio: tutte le varianti di titolo e sottotitolo sono nell'HTML prerenderizzato, con classi bd-v-famiglia, bd-v-terreno, bd-v-investo. Lo script inline nel head, prima del CSS, imposta document.documentElement.dataset.angolo; il CSS mostra solo la variante attiva. Nessuna modifica al DOM prima dell'hydration. Senza JavaScript si vede famiglia.
Angolo, utm_source, utm_medium, utm_campaign, utm_content e fbclid entrano nel modulo come campi nascosti e nella tabella. L'angolo preseleziona anche la risposta 1 del modulo.

Titoli per angolo (in testi.json):
- famiglia — H1: «La casa che vuoi, con un solo referente dal progetto alle chiavi.» Sottotitolo: «{BRAND} ti mette in contatto con l'impresa adatta in {ZONA} e segue il tuo progetto passo per passo.»
- terreno — H1: «Hai il terreno. Ora serve chi lo trasforma in casa.» Sottotitolo: «Raccontaci lotto e idea: {BRAND} porta il progetto all'impresa partner e ti segue fino alla consegna.»
- investo — H1: «Costruire per investire, con un solo interlocutore.» Sottotitolo: «Villette e piccoli complessi in {ZONA}: {BRAND} coordina impresa, tempi e cantiere.»

## §8 Copy

Tono: tu, frasi corte, concrete, verificabili. Niente superlativi vuoti («unico», «migliore», «eccellenza»), niente asserzioni ambientali generiche (§3.13), niente promesse che dipendono dal Comune o dalla banca. I segnaposti {CHIAVE} si risolvono da dati.ts.

Header: link «Come funziona»; CTA «Richiedi un preventivo».

Hero
- Occhiello: «Costruzione di case in {ZONA}»
- H1 e sottotitolo: §7
- CTA primaria: «Richiedi un preventivo» · secondaria: «Come funziona»
- Sotto la CTA: «Ti risponde {REFERENTE}, {TEMPO_RISPOSTA}.»
- Fatti: «Consegna: {TEMPI}» · «Classe energetica {CLASSE} nelle ultime realizzazioni» (solo con P1_OK «sì») · «{SISTEMA_BREVE}»

Per chi è
- H2: «Per chi è {BRAND}»
- «Vuoi costruire casa» — «Hai un'idea e un budget. Ti aiutiamo a capire cosa si può fare, dove e con chi.» CTA «Parti dal tuo progetto»
- «Hai già il terreno» — «Portaci i dati del lotto: verifichiamo con l'impresa cosa si può costruire e a che costo.» CTA «Parti dal terreno»
- «Vuoi investire» — «Villette o piccoli complessi residenziali: un solo interlocutore per impresa, tempi e cantiere.» CTA «Parliamo del progetto»

Come funziona
- H2: «Come funziona» · intro: «Quattro passaggi. In ognuno sai chi fa cosa.»
1. «Ci racconti il progetto» — «Compili il modulo. {REFERENTE} ti richiama, ascolta idea, zona, terreno e budget e ti dice con franchezza cosa è realistico.»
2. «Progetto e preventivo» — «L'impresa partner prepara progetto e preventivo dettagliato. Puoi anche partire dal progetto del tuo tecnico. {REFERENTE} li rivede con te, voce per voce.»
3. «Contratto e permessi» — «Firmi il contratto con l'impresa. Si avviano le pratiche per il permesso di costruire.»
4. «Cantiere e chiavi» — «{REFERENTE} resta il tuo riferimento durante il cantiere, fino alla consegna. Tempi indicativi: {TEMPI}.»
- CTA: «Richiedi un preventivo»

Un solo referente
- H2: «Un solo referente, dall'inizio alla fine»
- Testo: «{BRAND} non è un'impresa di costruzioni. Sceglie l'impresa, coordina il lavoro e ti segue. Parli con una persona sola, non con dieci.»
- «Cosa fa {BRAND}»: «Ascolta il progetto» · «Lo porta all'impresa adatta» · «Rivede con te preventivo e contratto» · «Segue tempi e cantiere»
- «Cosa fa l'impresa»: «Progetta e costruisce» · «Firma il contratto con te e ne risponde»
- «Cosa fai tu»: «Decidi» · «Firmi» · «Entri in casa»
- «Quanto costa il servizio»: {COSTO_SERVIZIO}

Sistema
- H2: «Com'è fatta la casa, dentro le pareti»
- Testo: «{SISTEMA}. Struttura e isolamento nascono insieme.»
- Strati: «Strato isolante esterno» — «Il cassero isolante resta nella parete e fa da isolamento.» · «Calcestruzzo armato» — «La struttura che porta la casa, con l'armatura in acciaio dentro il getto.» · «Strato isolante interno» — «Chiude l'isolamento verso l'interno.» · «Intonaco e finiture» — «Quello che vedi e tocchi ogni giorno.»
- Fatti, solo se presenti: «Classe energetica {CLASSE} nelle ultime realizzazioni di {P1_NOME}» (con P1_OK «sì») · «{GARANZIA}»
- Nota sotto il disegno: «Illustrazione schematica, non in scala.»

Realizzazioni (solo con P1_OK «sì»)
- H2: «Alcune case realizzate da {P1_NOME}»
- Card: nome, comune, «{m²} m²», anno, «classe {classe}»
- Nota: «Foto e dati forniti da {P1_NOME}.»
- CTA: «Voglio una casa così»

Partner
- H2: «Le aziende con cui lavoriamo»
- Per ogni partner autorizzato: nome, P*_RUOLO, link «Sito ufficiale»

Modulo (#preventivo)
- H2: «Richiedi un preventivo» · intro: «Tre passaggi, un minuto. Ti risponde {REFERENTE}, {TEMPO_RISPOSTA}.»
- Avanzamento: «Passo 1 di 3»
- Passo 1 «Il progetto»
  - «Per cosa ci contatti?»: «Una casa per me o per la mia famiglia» · «Un investimento (villette, piccoli complessi)» · «Altro»
  - «Hai già il terreno?»: «Sì» · «Lo sto cercando» · «No»
- Passo 2 «Dove e quando»
  - «Comune o zona» (obbligatorio) · suggerimento: «Seguiamo progetti in {ZONA}.»
  - «Budget indicativo»: fasce di §2 · suggerimento: «Serve solo a capire cosa è realistico. Non ti vincola.»
  - «Quando vorresti iniziare?»: «Entro 6 mesi» · «Tra 6 e 12 mesi» · «Oltre 12 mesi» · «Sto solo valutando»
- Passo 3 «I tuoi contatti»
  - «Nome e cognome» (obbligatorio) · «Email» (obbligatoria) · «Telefono» (facoltativo, suggerimento: «Se lo lasci ti chiamiamo: si fa prima.») · «Messaggio» (facoltativo, segnaposto: «Superficie, stile, domande…»)
  - Nota privacy, senza casella: «Usiamo questi dati solo per risponderti e preparare il preventivo con l'impresa partner. Dettagli nell'informativa privacy.»
- Pulsanti: «Avanti» · «Indietro» · «Invia la richiesta» · in invio: «Invio in corso…»
- Errori: «Scrivi il tuo nome e cognome» · «Controlla l'email: sembra incompleta» · «Il telefono deve avere almeno 9 cifre» · «Scegli una risposta» · «Scrivi il comune o la zona»
- Successo: «Richiesta ricevuta. {REFERENTE} ti scrive {TEMPO_RISPOSTA}. Ti abbiamo mandato una copia via email: controlla anche lo spam.»
- Errore di invio: «Non siamo riusciti a inviare la richiesta. Riprova tra un minuto oppure scrivi a {EMAIL_PUBBLICA}.»
- Email a {REFERENTE}: oggetto «Nuova richiesta · {profilo} · {comune} · {budget}»; corpo con tutti i campi, angolo, UTM, data e ora.
- Email al cliente: oggetto «Abbiamo ricevuto la tua richiesta · {BRAND}»; corpo: «Ciao {nome}, grazie per averci scritto. {REFERENTE} ti risponde {TEMPO_RISPOSTA}. Ecco cosa ci hai inviato: […]. Per aggiungere qualcosa rispondi a questa email.» Reply-to: EMAIL_LEAD.

FAQ
1. «Quanto costa costruire una casa?» — «Dipende da superficie, finiture, terreno e impianti. Nel modulo indichi un budget indicativo: alla prima chiamata ti diciamo se è realistico per quello che vuoi.»
2. «Quanto tempo serve?» — «I tempi indicati dall'impresa partner sono {TEMPI}. Prima ci sono progetto e permessi, che dipendono anche dal Comune.»
3. «Devo avere già il terreno?» — «No. Scrivici anche senza: partiamo da zona e budget.»
4. «Con chi firmo il contratto?» — «Con l'impresa che costruisce. {BRAND} ti affianca nella lettura di preventivo e contratto e resta il tuo riferimento.»
5. «Quanto costa il servizio di {BRAND}?» — «{COSTO_SERVIZIO}»
6. «Posso portare il progetto del mio architetto?» — «Sì. L'impresa partner può partire da un progetto già fatto o prepararne uno con te.»
7. «In che zona lavorate?» — «{ZONA}. Se sei fuori zona scrivici lo stesso: ti diciamo se possiamo aiutarti.»
8. «Com'è fatta la struttura?» — «{SISTEMA}.»

Chiusura
- H2: «Parliamo della tua casa.» · testo: «Tre passaggi, un minuto. Ti risponde {REFERENTE}, {TEMPO_RISPOSTA}.» · CTA «Richiedi un preventivo»
- Sotto la CTA, piccolo: «Preferisci parlarne subito?» · pulsanti secondari «Chiama {TELEFONO}» (tel:) e «Scrivi su WhatsApp» (https://wa.me/…, target _blank, rel noopener)

Footer
- Contatti: «Telefono e WhatsApp {TELEFONO} · {EMAIL_PUBBLICA}»
- «{TITOLARE} · {FORMA} · Sede: {SEDE} · P.IVA {PIVA}», più REA, capitale sociale e PEC se presenti.
- «{BRAND} non esegue lavori edili: progettazione e costruzione sono affidate e contrattualizzate con l'impresa partner.»
- Link: «Privacy» · «Cookie» · «Gestisci cookie»

Banner cookie
- «Usiamo cookie tecnici per far funzionare il sito. Con il tuo consenso usiamo anche il pixel di Meta per misurare le campagne.» · pulsanti «Rifiuta» e «Accetta» con la stessa evidenza · X di chiusura che vale come rifiuto · link «Cookie policy».

## §9 Performance e accessibilità

Obiettivi su Lighthouse mobile (4G simulato):
- LCP ≤ 2,5 s (obiettivo 2,0 s), CLS ≤ 0,05, TBT ≤ 200 ms; INP sul campo ≤ 200 ms.
- Punteggi: Performance ≥ 90, Accessibilità 100, Best Practices ≥ 95, SEO ≥ 95.
Pesi massimi:
- JavaScript iniziale ≤ 160 kB gzip; CSS ≤ 30 kB gzip; font ≤ 120 kB in totale (solo sottoinsieme latin, preload solo del font dei titoli, font-display swap).
- Immagine dell'hero ≤ 160 kB a 1200 px (AVIF, ripiego WebP); altre immagini ≤ 120 kB; primo caricamento totale ≤ 900 kB.
- Sotto la piega: loading="lazy", decoding="async", width e height sempre dichiarate.
Accessibilità:
- contrasto AA (4,5:1 testo, 3:1 testo grande e controlli); focus visibile (contorno 2 px accento, offset 3 px); aree touch di almeno 44 × 44 px;
- etichette su tutti i campi, errori collegati con aria-describedby e annunciati con aria-live; link «Vai al contenuto»; un solo h1; titoli in ordine; alt su ogni immagine informativa.

## §10 Regole legali applicate

1. Footer: titolare, sede e partita IVA (art. 35 DPR 633/1972); per le società anche REA, capitale sociale e PEC (art. 2250 c.c.). Con TITOLARE, PIVA o SEDE «[DA COMPILARE …]» lo step 8 non pubblica.
2. Ruolo: la pagina dice che Biodomus non esegue lavori e che il contratto si firma con l'impresa. Il ruolo giuridico (RUOLO_LEGALE) va definito con il commercialista prima delle campagne: chi fa mediazione deve essere iscritto alla sezione REA e assicurato (L. 39/1989).
3. Privacy (art. 13 GDPR) in /privacy.html: titolare, finalità (rispondere e preparare il preventivo), base giuridica (misure precontrattuali su richiesta, art. 6.1.b), destinatari (l'impresa partner che prepara il preventivo; fornitori Netlify, Supabase, Brevo; Meta solo con consenso), trasferimenti fuori UE, conservazione 24 mesi dall'ultimo contatto, diritti, reclamo al Garante. Nessun uso per newsletter o promozioni: niente casella marketing.
4. Cookie (linee guida del Garante del 10 giugno 2021): prima del consenso solo cookie tecnici; «Accetta» e «Rifiuta» con la stessa evidenza; la X chiude e vale come rifiuto; lo scroll non è consenso; niente cookie wall; la scelta resta valida 6 mesi; «Gestisci cookie» nel footer; cookie policy con i cookie del Pixel (_fbp, _fbc). Pixel e API Conversioni solo con consenso.
5. Asserzioni ambientali: §3.13. Solo dati specifici e dimostrabili, con la fonte.
6. Pratiche commerciali (Codice del Consumo, artt. 20–23): niente urgenza finta, niente recensioni non verificabili, niente obblighi di legge presentati come vantaggi (per esempio «progettata secondo le norme antisismiche»).
7. Partner: nomi, loghi e foto solo con autorizzazione scritta (P1_OK, P2_OK). Il credito delle foto è visibile.
8. Prezzi: nessun prezzo al m² o «a partire da» senza un documento del partner che dica cosa comprende.
9. Illustrazioni e immagini non reali hanno la dicitura «Illustrazione».
10. Le foto passano senza metadati EXIF (niente coordinate GPS delle case dei clienti).

## §11 Elenco degli step

- STEP 0 — Brief, ambiente e base del progetto
- STEP 1 — Fondamenta: token, layout, movimento, prerender, anteprima e controlli
- STEP 2 — Asset: immagini, illustrazioni, favicon, immagine di condivisione
- STEP 3 — Modulo di preventivo e funzione bd-lead
- STEP 4 — Hero, Per chi è e barra mobile
- STEP 5 — Come funziona, Un solo referente, Sistema
- STEP 6 — Realizzazioni, Partner, FAQ, Chiusura
- STEP 7 — Privacy, cookie, tracciamento, SEO
- STEP 8 — Controllo qualità, pull request e pubblicazione in due tempi

## §12 Report di fine step

Alla fine di ogni step scrivi, in italiano e in questo ordine:
1. File creati o modificati, una riga ciascuno con cosa fa.
2. Esito dei controlli: npm run check (errori e avvisi), controlli di studio/controlli.mjs con OK o KO, pesi di JS, CSS e immagini.
3. Cosa si vede nell'anteprima a 390 px e a 1440 px, con il percorso degli screenshot, ed errori di console.
4. Dati mancanti, dubbi e scelte fatte con il default dichiarato.
5. Comandi git eseguiti e hash del commit.
Poi commit, push e FERMATI.

## §13 Anteprima senza ambiente reale

- `npm run anteprima` avvia studio/anteprima-server.mts (con tsx): serve dist/ e manda POST /api/lead direttamente alla funzione bd-lead con BD_MOCK=1. Nessun servizio esterno.
- `npm run screenshot` usa Playwright: apre l'anteprima a 390 × 844 e 1440 × 900 per ogni angolo (?a=famiglia, terreno, investo), salva gli screenshot in studio/report/screenshot/ (escluso da git), registra gli errori di console e controlla che a 390 px document.documentElement.scrollWidth sia ≤ 390.
- Ripieghi del browser: prima il Chromium già presente nell'ambiente (variabile PLAYWRIGHT_BROWSERS_PATH, di solito /opt/pw-browsers): playwright è fissato alla stessa versione (1.63.0), quindi non serve scaricare nulla; poi `npx playwright install chromium`; se il download è bloccato, un Chromium di sistema (which chromium, chromium-browser, google-chrome) con executablePath; se non c'è nessun browser, salti screenshot e Lighthouse e lo scrivi nel report con il motivo.
- studio/controlli.mjs cresce a ogni step. Ogni controllo stampa OK o KO con una riga di spiegazione; un solo KO fa fallire npm run check.
