-- 001_bd_leads.sql · Contatti del modulo di preventivo (CLAUDE.md §4)
-- Scrive solo la funzione netlify/functions/bd-lead.mts, con la chiave segreta (ruolo service_role, che
-- non è soggetto a RLS). Il browser non legge e non scrive mai questa tabella.
-- Valori ammessi delle scelte: le chiavi di testi.json (modulo) e le fasce di dati.ts (fasceBudget).

create table if not exists public.bd_leads (
  id                 uuid        primary key default gen_random_uuid(),
  creato_il          timestamptz not null default now(),
  profilo            text        not null check (profilo in ('casa', 'investimento', 'altro')),
  terreno            text        not null check (terreno in ('si', 'cerco', 'no')),
  comune             text        not null check (char_length(comune) between 2 and 80),
  budget             text        not null check (budget in ('sotto-minimo', 'fascia-1', 'fascia-2', 'oltre', 'non-so')),
  tempistica         text        not null check (tempistica in ('entro-6', '6-12', 'oltre-12', 'valuto')),
  nome               text        not null check (char_length(nome) between 2 and 80),
  email              text        not null check (char_length(email) <= 254),
  telefono           text                 check (telefono is null or telefono ~ '^\+[0-9]{8,16}$'),
  messaggio          text                 check (messaggio is null or char_length(messaggio) <= 2000),
  angolo             text        not null default 'famiglia' check (angolo in ('famiglia', 'terreno', 'investo')),
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_content        text,
  fbclid             text,
  pagina             text,
  consenso_marketing boolean     not null default false,
  stato              text        not null default 'nuovo'
);

comment on table  public.bd_leads                    is 'Richieste di preventivo arrivate dal modulo della landing Biodomus.';
comment on column public.bd_leads.id                 is 'Codice della richiesta, lo stesso citato nell''email a Mirko.';
comment on column public.bd_leads.creato_il          is 'Data e ora di arrivo della richiesta.';
comment on column public.bd_leads.profilo            is 'Per cosa ci contatta: casa (per sé o per la famiglia), investimento, altro.';
comment on column public.bd_leads.terreno            is 'Ha già il terreno: si, cerco (lo sta cercando), no.';
comment on column public.bd_leads.comune             is 'Comune o zona del progetto, scritto dalla persona.';
comment on column public.bd_leads.budget             is 'Fascia di budget indicativa, calcolata da BUDGET_MIN (vedi dati.ts, fasceBudget).';
comment on column public.bd_leads.tempistica         is 'Quando vorrebbe iniziare: entro-6, 6-12, oltre-12 mesi, valuto (sta solo valutando).';
comment on column public.bd_leads.nome               is 'Nome e cognome.';
comment on column public.bd_leads.email              is 'Email, in minuscolo.';
comment on column public.bd_leads.telefono           is 'Telefono facoltativo, in formato internazionale (+39…).';
comment on column public.bd_leads.messaggio          is 'Messaggio facoltativo, senza HTML.';
comment on column public.bd_leads.angolo             is 'Angolo della campagna da cui è arrivata la persona (?a=famiglia, terreno, investo).';
comment on column public.bd_leads.utm_source         is 'Parametro utm_source della campagna.';
comment on column public.bd_leads.utm_medium         is 'Parametro utm_medium della campagna.';
comment on column public.bd_leads.utm_campaign       is 'Parametro utm_campaign della campagna.';
comment on column public.bd_leads.utm_content        is 'Parametro utm_content della campagna (di solito l''inserzione).';
comment on column public.bd_leads.fbclid             is 'Identificativo del clic di Meta (fbclid), se presente.';
comment on column public.bd_leads.pagina             is 'Indirizzo della pagina del modulo, senza parametri personali.';
comment on column public.bd_leads.consenso_marketing is 'true se la persona aveva accettato i cookie di marketing (Pixel e API Conversioni).';
comment on column public.bd_leads.stato              is 'Stato della richiesta per Mirko: nuovo, poi quello che serve (contattato, preventivo, chiuso…).';

create index if not exists bd_leads_creato_il_idx on public.bd_leads (creato_il desc);

-- RLS attiva e nessuna policy per anon o authenticated: con le chiavi pubbliche la tabella è chiusa.
-- Scrive e legge solo la chiave segreta della funzione (service_role, che salta la RLS).
alter table public.bd_leads enable row level security;
revoke all on table public.bd_leads from anon, authenticated;
