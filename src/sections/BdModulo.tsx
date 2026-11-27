import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import { emailPubblica, fasceBudget } from '../content/dati.ts'
import { riempi, tt } from '../content/bd-testi.ts'
import { leggiAngolo, type Angolo } from '../lib/bd-angolo.ts'
import { useIdratato } from '../lib/bd-idratato.ts'
import { EVENTO_PRESELEZIONE, type Preselezione } from '../lib/bd-preselezione.ts'
import { leggiConsenso } from '../lib/bd-consenso.ts'
import {
  CAMPI_PER_PASSO,
  CAMPO_HONEYPOT,
  LIMITI,
  PROFILI,
  TEMPISTICHE,
  TERRENI,
  passoDi,
  valida,
  type CampoValidato,
  type DatiModulo,
  type Errori,
} from '../lib/bd-lead-regole.ts'
import { leggiUtm } from '../lib/bd-utm.ts'

type Passo = 1 | 2 | 3
type Stato = 'modulo' | 'invio' | 'successo' | 'errore'
type CampoScelta = 'profilo' | 'terreno' | 'budget' | 'tempistica'
type CampoTesto = 'comune' | 'nome' | 'email' | 'telefono' | 'messaggio'

const PASSI: readonly Passo[] = [1, 2, 3]

/** Risposte preselezionate dall'angolo della campagna (§7). */
const PRESCELTE: Record<Angolo, { profilo: string; terreno?: string }> = {
  famiglia: { profilo: 'casa' },
  terreno: { profilo: 'casa', terreno: 'si' },
  investo: { profilo: 'investimento' },
}

const id = (campo: string, opzione?: string) => (opzione ? `bd-m-${campo}-${opzione}` : `bd-m-${campo}`)
const idErrore = (campo: string) => `bd-m-errore-${campo}`
const idSuggerimento = (campo: string) => `bd-m-suggerimento-${campo}`

function nuovoEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/** Primo elemento da mettere a fuoco per un campo con errore (il primo radio, per le scelte). */
function idDaFocalizzare(campo: CampoValidato): string {
  if (campo === 'profilo') return id('profilo', PROFILI[0])
  if (campo === 'terreno') return id('terreno', TERRENI[0])
  if (campo === 'tempistica') return id('tempistica', TEMPISTICHE[0])
  if (campo === 'budget') return id('budget', fasceBudget()[0].valore)
  return id(campo)
}

const ETICHETTE: Record<CampoValidato, string> = {
  profilo: 'modulo.passo1.domandaProfilo',
  terreno: 'modulo.passo1.domandaTerreno',
  comune: 'modulo.passo2.comune',
  budget: 'modulo.passo2.budget',
  tempistica: 'modulo.passo2.tempistica',
  nome: 'modulo.passo3.nome',
  email: 'modulo.passo3.email',
  telefono: 'modulo.passo3.telefono',
}

/** «Comune o zona: Scrivi…», ma «Hai già il terreno? Scegli…» (niente «?:»). */
const voceRiepilogo = (domanda: string, errore: string) => (/[?:]$/.test(domanda) ? `${domanda} ${errore}` : `${domanda}: ${errore}`)

function Errore({ campo, errori }: { campo: CampoValidato; errori: Errori }) {
  const chiave = errori[campo]
  if (!chiave) return null
  return (
    <p id={idErrore(campo)} className="bd-m-errore">
      {tt(`modulo.errori.${chiave}`)}
    </p>
  )
}

interface SceltaProps {
  campo: CampoScelta
  domanda: string
  opzioni: { valore: string; etichetta: string }[]
  scelto: string
  errori: Errori
  onScegli: (valore: string) => void
  suggerimento?: string
  /** il radio scelto riceve il focus quando una CTA porta al modulo (bd-scorri) */
  focusIniziale?: boolean
  /** risposte brevi: due colonne già a 390 px */
  brevi?: boolean
}

/** Gruppo di scelte a card grandi: radio veri dentro la label, area di tocco di almeno 56 px. */
function Scelta({ campo, domanda, opzioni, scelto, errori, onScegli, suggerimento, focusIniziale = false, brevi = false }: SceltaProps) {
  const errore = errori[campo]
  const descrittoDa = [suggerimento ? idSuggerimento(campo) : null, errore ? idErrore(campo) : null].filter(Boolean).join(' ') || undefined
  return (
    <fieldset className="bd-m-gruppo" aria-describedby={descrittoDa}>
      <legend className="bd-m-domanda">{domanda}</legend>
      {suggerimento ? (
        <p id={idSuggerimento(campo)} className="bd-m-suggerimento">
          {suggerimento}
        </p>
      ) : null}
      <div className={brevi ? 'bd-m-scelte bd-m-scelte--brevi' : 'bd-m-scelte'}>
        {opzioni.map((o) => (
          <label key={o.valore} className="bd-m-scelta" htmlFor={id(campo, o.valore)}>
            <input
              type="radio"
              id={id(campo, o.valore)}
              name={campo}
              value={o.valore}
              checked={scelto === o.valore}
              onChange={() => onScegli(o.valore)}
              required
              aria-invalid={errore ? true : undefined}
              data-bd-focus={focusIniziale && scelto === o.valore ? '' : undefined}
            />
            <span>{o.etichetta}</span>
          </label>
        ))}
      </div>
      <Errore campo={campo} errori={errori} />
    </fieldset>
  )
}

interface CampoProps {
  campo: CampoTesto
  facoltativo?: boolean
  suggerimento?: string
  errori: Errori
  children: (descrittoDa: string | undefined, invalido: boolean) => ReactNode
}

/** Campo di testo con label vera, suggerimento ed errore collegati con aria-describedby. */
function Campo({ campo, facoltativo = false, suggerimento, errori, children }: CampoProps) {
  const errore = campo !== 'messaggio' ? errori[campo] : undefined
  const descrittoDa = [suggerimento ? idSuggerimento(campo) : null, errore ? idErrore(campo) : null].filter(Boolean).join(' ') || undefined
  const etichetta = campo === 'messaggio' ? tt('modulo.passo3.messaggio') : tt(ETICHETTE[campo])
  return (
    <div className="bd-m-campo">
      <label htmlFor={id(campo)} className="bd-m-etichetta">
        {etichetta}
        {facoltativo ? <span className="bd-m-facoltativo"> ({tt('modulo.passo3.facoltativo')})</span> : null}
      </label>
      {suggerimento ? (
        <p id={idSuggerimento(campo)} className="bd-m-suggerimento">
          {suggerimento}
        </p>
      ) : null}
      {children(descrittoDa, Boolean(errore))}
      {campo !== 'messaggio' ? <Errore campo={campo} errori={errori} /> : null}
    </div>
  )
}

/** Titolo del passaggio: riceve il focus quando il passaggio cambia. «Passo N di 3» solo con JavaScript. */
function PassoTitolo({ passo, idratato }: { passo: Passo; idratato: boolean }) {
  return (
    <h3 id={`bd-m-titolo-${passo}`} className="bd-m-titolo" tabIndex={-1}>
      {idratato ? <span className="bd-m-contatore">{riempi(tt('modulo.avanzamento'), { passo })}</span> : null}
      <span>{tt(`modulo.passo${passo}.titolo`)}</span>
    </h3>
  )
}

/**
 * Modulo di preventivo (§6.9, copy di §8). Dopo l'hydration: tre passaggi con validazione a ogni «Avanti».
 * Senza JavaScript: un vero form, tutti i campi in una pagina lunga, POST su /api/lead e poi /grazie.html.
 */
export default function BdModulo() {
  // true solo dopo l'hydration: prima (e senza JavaScript) il modulo è un'unica pagina lunga.
  const idratato = useIdratato()
  const formRef = useRef<HTMLFormElement>(null)
  const avviatoIl = useRef(0)
  const eventId = useRef<string | null>(null)
  const focusDopo = useRef<string | null>(null)

  const [passo, setPasso] = useState<Passo>(1)
  const [stato, setStato] = useState<Stato>('modulo')
  const [errori, setErrori] = useState<Errori>({})
  const [scelte, setScelte] = useState<Partial<Record<CampoScelta, string>>>({})
  const [testo, setTesto] = useState<Partial<Record<CampoTesto, string>>>({})

  // Preselezione dall'angolo: solo dopo l'hydration (prima vale famiglia), finché la persona non sceglie.
  const angolo: Angolo = idratato ? leggiAngolo() : 'famiglia'
  const prescelte = PRESCELTE[angolo]
  const profilo = scelte.profilo ?? prescelte.profilo
  const terreno = scelte.terreno ?? prescelte.terreno ?? ''

  useEffect(() => {
    avviatoIl.current = Date.now()
    // Con JavaScript la validazione la fa il modulo, con i messaggi di §8 al posto di quelli del browser.
    if (formRef.current) formRef.current.noValidate = true
  }, [])

  // Card di «Per chi è» (§6.3): sceglie la risposta 1 (e «Sì» al terreno) e riporta al passaggio 1.
  useEffect(() => {
    const ascolta = (evento: Event) => {
      const { profilo: nuovoProfilo, terreno: nuovoTerreno } = (evento as CustomEvent<Preselezione>).detail
      setScelte((s) => ({ ...s, profilo: nuovoProfilo, ...(nuovoTerreno ? { terreno: nuovoTerreno } : {}) }))
      setErrori((e) => ({ ...e, profilo: undefined, ...(nuovoTerreno ? { terreno: undefined } : {}) }))
      setPasso(1)
    }
    window.addEventListener(EVENTO_PRESELEZIONE, ascolta)
    return () => window.removeEventListener(EVENTO_PRESELEZIONE, ascolta)
  }, [])

  // Focus dopo il cambio di passaggio, dopo un errore o sul messaggio finale.
  useEffect(() => {
    const destinazione = focusDopo.current
    if (!destinazione) return
    focusDopo.current = null
    document.getElementById(destinazione)?.focus()
  })

  const valori = (): DatiModulo => ({
    profilo,
    terreno,
    budget: scelte.budget ?? '',
    tempistica: scelte.tempistica ?? '',
    comune: testo.comune ?? '',
    nome: testo.nome ?? '',
    email: testo.email ?? '',
    telefono: testo.telefono ?? '',
    messaggio: testo.messaggio ?? '',
  })

  const vaiAlCampo = (campo: CampoValidato) => {
    setPasso(passoDi(campo))
    focusDopo.current = idDaFocalizzare(campo)
  }

  const mostraErrori = (trovati: Errori) => {
    setErrori(trovati)
    const primo = [...CAMPI_PER_PASSO[1], ...CAMPI_PER_PASSO[2], ...CAMPI_PER_PASSO[3]].find((c) => trovati[c])
    if (primo) vaiAlCampo(primo)
  }

  const vaiAlPasso = (nuovo: Passo) => {
    setErrori({})
    setPasso(nuovo)
    focusDopo.current = `bd-m-titolo-${nuovo}`
  }

  const avanti = () => {
    const trovati = valida(valori(), passo)
    if (Object.keys(trovati).length) return mostraErrori(trovati)
    if (passo < 3) vaiAlPasso((passo + 1) as Passo)
  }

  const invia = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (stato === 'invio') return
    if (passo < 3) return avanti() // «Invio» da tastiera nei primi passaggi vale «Avanti»

    const trovati = valida(valori())
    if (Object.keys(trovati).length) return mostraErrori(trovati)
    setErrori({})

    eventId.current ??= nuovoEventId()
    const honeypot = formRef.current ? new FormData(formRef.current).get(CAMPO_HONEYPOT) : null
    const utm = Object.entries(leggiUtm()).filter((voce): voce is [string, string] => typeof voce[1] === 'string')
    const corpo: Record<string, string> = {
      ...valori(),
      ...Object.fromEntries(utm),
      angolo,
      // Solo origine e percorso: niente querystring, niente dati personali nell'URL.
      pagina: `${window.location.origin}${window.location.pathname}`,
      event_id: eventId.current,
      avviato_il: String(avviatoIl.current),
      consenso_marketing: leggiConsenso() === 'accettato' ? 'si' : 'no',
      [CAMPO_HONEYPOT]: typeof honeypot === 'string' ? honeypot : '',
    }

    setStato('invio')
    try {
      const risposta = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (risposta.ok) {
        // «Lead» con lo stesso ID mandato alla funzione: Pixel e API Conversioni si deduplicano (§4).
        // Import dinamico: bd-traccia resta un file a parte e senza consenso non fa nulla.
        const eventID = corpo.event_id
        void import('../lib/bd-traccia.ts').then((modulo) => modulo.track('Lead', {}, { eventID }))
        setStato('successo')
        focusDopo.current = 'bd-m-successo'
        return
      }
      if (risposta.status === 400) {
        const dati = (await risposta.json().catch(() => null)) as { errori?: Errori } | null
        if (dati?.errori && Object.keys(dati.errori).length) {
          setStato('modulo')
          return mostraErrori(dati.errori)
        }
      }
      setStato('errore')
    } catch {
      setStato('errore')
    }
  }

  const scegli = (campo: CampoScelta) => (valore: string) => {
    setScelte((s) => ({ ...s, [campo]: valore }))
    setErrori((e) => ({ ...e, [campo]: undefined }))
  }
  const scrivi = (campo: CampoTesto) => (valore: string) => setTesto((t) => ({ ...t, [campo]: valore }))
  const testoCampo = (campo: CampoTesto) => testo[campo] ?? ''

  const nascosto = (p: Passo) => idratato && p !== passo
  const elencoErrori = (Object.keys(errori) as CampoValidato[]).filter((c) => errori[c])
  const daRiepilogo = (campo: CampoValidato) => (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault()
    vaiAlCampo(campo)
  }

  // Errore di invio: l'email pubblica diventa un link (ripiego di §4).
  const email = emailPubblica()
  const [primaEmail, dopoEmail = ''] = tt('modulo.erroreInvio').split(email)

  return (
    <section id="preventivo" className="bd-sezione" aria-labelledby="preventivo-titolo" data-bd-ingresso="">
      <div className="bd-wrap bd-m">
        <div className="bd-m-intro">
          <h2 id="preventivo-titolo" className="m-0">
            {tt('modulo.titolo')}
          </h2>
          <p className="m-0 text-testo-2">{tt('modulo.intro')}</p>
        </div>

        {stato === 'successo' ? (
          <div id="bd-m-successo" className="bd-m-scheda bd-m-successo" role="status" tabIndex={-1}>
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
              <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 16.5l4 4 8.5-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="m-0">{tt('modulo.successo')}</p>
          </div>
        ) : (
          <form ref={formRef} className="bd-m-scheda bd-m-form" action="/api/lead" method="post" onSubmit={invia}>
            {idratato ? (
              <div className="bd-m-avanzamento" aria-hidden="true">
                {PASSI.map((p) => (
                  <span key={p} className={p <= passo ? 'bd-m-tacca bd-m-tacca--fatta' : 'bd-m-tacca'} />
                ))}
              </div>
            ) : null}

            {/* Passo 1 · Il progetto */}
            <div className="bd-m-passo" role="group" aria-labelledby="bd-m-titolo-1" hidden={nascosto(1)}>
              <PassoTitolo passo={1} idratato={idratato} />
              <Scelta
                campo="profilo"
                domanda={tt('modulo.passo1.domandaProfilo')}
                opzioni={PROFILI.map((v) => ({ valore: v, etichetta: tt(`modulo.passo1.profili.${v}`) }))}
                scelto={profilo}
                errori={errori}
                onScegli={scegli('profilo')}
                focusIniziale
              />
              <Scelta
                campo="terreno"
                domanda={tt('modulo.passo1.domandaTerreno')}
                opzioni={TERRENI.map((v) => ({ valore: v, etichetta: tt(`modulo.passo1.terreno.${v}`) }))}
                scelto={terreno}
                errori={errori}
                onScegli={scegli('terreno')}
              />
            </div>

            {/* Passo 2 · Dove e quando */}
            <div className="bd-m-passo" role="group" aria-labelledby="bd-m-titolo-2" hidden={nascosto(2)}>
              <PassoTitolo passo={2} idratato={idratato} />
              <Campo campo="comune" suggerimento={tt('modulo.passo2.comuneSuggerimento')} errori={errori}>
                {(descrittoDa, invalido) => (
                  <input
                    id={id('comune')}
                    name="comune"
                    type="text"
                    className="bd-m-input"
                    autoComplete="address-level2"
                    maxLength={LIMITI.comune}
                    required
                    value={testoCampo('comune')}
                    onChange={(e) => scrivi('comune')(e.target.value)}
                    aria-describedby={descrittoDa}
                    aria-invalid={invalido || undefined}
                  />
                )}
              </Campo>
              <Scelta
                campo="budget"
                domanda={tt('modulo.passo2.budget')}
                suggerimento={tt('modulo.passo2.budgetSuggerimento')}
                opzioni={fasceBudget()}
                scelto={scelte.budget ?? ''}
                errori={errori}
                onScegli={scegli('budget')}
              />
              <Scelta
                campo="tempistica"
                domanda={tt('modulo.passo2.tempistica')}
                opzioni={TEMPISTICHE.map((v) => ({ valore: v, etichetta: tt(`modulo.passo2.tempistiche.${v}`) }))}
                scelto={scelte.tempistica ?? ''}
                errori={errori}
                onScegli={scegli('tempistica')}
                brevi
              />
            </div>

            {/* Passo 3 · I tuoi contatti */}
            <div className="bd-m-passo" role="group" aria-labelledby="bd-m-titolo-3" hidden={nascosto(3)}>
              <PassoTitolo passo={3} idratato={idratato} />
              <Campo campo="nome" errori={errori}>
                {(descrittoDa, invalido) => (
                  <input
                    id={id('nome')}
                    name="nome"
                    type="text"
                    className="bd-m-input"
                    autoComplete="name"
                    maxLength={LIMITI.nome}
                    required
                    value={testoCampo('nome')}
                    onChange={(e) => scrivi('nome')(e.target.value)}
                    aria-describedby={descrittoDa}
                    aria-invalid={invalido || undefined}
                  />
                )}
              </Campo>
              <Campo campo="email" errori={errori}>
                {(descrittoDa, invalido) => (
                  <input
                    id={id('email')}
                    name="email"
                    type="email"
                    className="bd-m-input"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={LIMITI.email}
                    required
                    value={testoCampo('email')}
                    onChange={(e) => scrivi('email')(e.target.value)}
                    aria-describedby={descrittoDa}
                    aria-invalid={invalido || undefined}
                  />
                )}
              </Campo>
              <Campo campo="telefono" facoltativo suggerimento={tt('modulo.passo3.telefonoSuggerimento')} errori={errori}>
                {(descrittoDa, invalido) => (
                  <input
                    id={id('telefono')}
                    name="telefono"
                    type="tel"
                    className="bd-m-input"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={LIMITI.telefono}
                    value={testoCampo('telefono')}
                    onChange={(e) => scrivi('telefono')(e.target.value)}
                    aria-describedby={descrittoDa}
                    aria-invalid={invalido || undefined}
                  />
                )}
              </Campo>
              <Campo campo="messaggio" facoltativo errori={errori}>
                {() => (
                  <textarea
                    id={id('messaggio')}
                    name="messaggio"
                    className="bd-m-input bd-m-area"
                    rows={4}
                    maxLength={LIMITI.messaggio}
                    placeholder={tt('modulo.passo3.messaggioSegnaposto')}
                    value={testoCampo('messaggio')}
                    onChange={(e) => scrivi('messaggio')(e.target.value)}
                  />
                )}
              </Campo>
              <p className="bd-m-privacy">
                {tt('modulo.passo3.privacy')}
                <a href="/privacy.html">{tt('modulo.passo3.privacyLink')}</a>
                {tt('modulo.passo3.privacyFine')}
              </p>
            </div>

            {/* Trappola per i bot: fuori dallo schermo, fuori dal tab, ignorata dai lettori di schermo */}
            <div className="bd-hp" aria-hidden="true">
              <label htmlFor="bd-m-sito-web">Sito web</label>
              <input id="bd-m-sito-web" type="text" name={CAMPO_HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* Campi nascosti (§7). Senza JavaScript la funzione li completa dal Referer; con JavaScript li manda l'invio. */}
            <input type="hidden" name="angolo" value={angolo} />
            <input type="hidden" name="utm_source" value="" />
            <input type="hidden" name="utm_medium" value="" />
            <input type="hidden" name="utm_campaign" value="" />
            <input type="hidden" name="utm_content" value="" />
            <input type="hidden" name="fbclid" value="" />
            <input type="hidden" name="pagina" value="" />
            <input type="hidden" name="event_id" value="" />
            <input type="hidden" name="avviato_il" value="" />
            <input type="hidden" name="consenso_marketing" value="no" />

            <div className="bd-m-riepilogo" aria-live="polite">
              {elencoErrori.length ? (
                <div className="bd-m-riepilogo-box">
                  <p className="m-0 font-semibold">{tt('modulo.errori.riepilogo')}</p>
                  <ul>
                    {elencoErrori.map((c) => (
                      <li key={c}>
                        <a href={`#${idDaFocalizzare(c)}`} onClick={daRiepilogo(c)}>
                          {voceRiepilogo(tt(ETICHETTE[c]), tt(`modulo.errori.${errori[c] ?? 'scelta'}`))}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {stato === 'errore' ? (
              <p className="bd-m-errore-invio" role="alert">
                {primaEmail}
                <a href={`mailto:${email}`}>{email}</a>
                {dopoEmail}
              </p>
            ) : null}

            <div className="bd-m-pulsanti">
              {idratato && passo > 1 ? (
                <button type="button" className="bd-cta bd-cta--secondaria" onClick={() => vaiAlPasso((passo - 1) as Passo)}>
                  {tt('modulo.pulsanti.indietro')}
                </button>
              ) : null}
              {idratato && passo < 3 ? (
                <button type="button" className="bd-cta bd-cta--primaria" onClick={avanti}>
                  {tt('modulo.pulsanti.avanti')}
                </button>
              ) : null}
              {/* Sempre nel DOM: senza JavaScript invia il form; con JavaScript nei passi 1 e 2 resta nascosto
                  e fa da pulsante predefinito, così «Invio» sulla tastiera vale «Avanti». */}
              <button type="submit" className="bd-cta bd-cta--primaria" hidden={idratato && passo < 3} disabled={stato === 'invio'}>
                {stato === 'invio' ? tt('modulo.pulsanti.invio') : tt('modulo.pulsanti.invia')}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
