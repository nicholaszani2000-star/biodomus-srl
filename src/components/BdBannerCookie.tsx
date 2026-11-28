import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent } from 'react'
import { tt } from '../content/bd-testi.ts'
import { alCambioConsenso, impostaConsenso, leggiConsenso, type StatoConsenso } from '../lib/bd-consenso.ts'
import { useIdratato } from '../lib/bd-idratato.ts'

// Lo apre anche il link della cookie policy («cambia la tua scelta»): /#gestisci-cookie
const ANCORA = '#gestisci-cookie'

const useConsenso = () => useSyncExternalStore(alCambioConsenso, leggiConsenso, (): StatoConsenso => 'nessuna-scelta')

/**
 * Banner dei cookie (§8, §10 punto 4, linee guida del Garante del 10 giugno 2021).
 * - Compare al primo accesso, in basso, e torna dopo 6 mesi (bd-consenso). Si monta solo dopo l'hydration:
 *   senza JavaScript non c'è nulla da accettare, quindi non sta nell'HTML prerenderizzato.
 * - «Rifiuta» e «Accetta» hanno la stessa misura e lo stesso aspetto; la X e il tasto Esc valgono come rifiuto;
 *   lo scroll non è consenso e la pagina resta usabile (niente cookie wall).
 * - «Gestisci cookie» nel footer lo riapre e gli porta il focus; alla chiusura il focus torna da dove era venuto.
 * - Sta subito dopo «Vai al contenuto», così da tastiera si incontra presto; sullo schermo è fisso in basso
 *   e la barra mobile sale sopra di lui (--bd-banner-h). Testo piccolo: non diventa l'elemento LCP.
 */
export default function BdBannerCookie() {
  const idratato = useIdratato()
  const stato = useConsenso()
  // Aperto dall'utente («Gestisci cookie» o il link della cookie policy), anche se una scelta c'è già
  const [riaperto, setRiaperto] = useState(() => typeof window !== 'undefined' && window.location.hash === ANCORA)
  const banner = useRef<HTMLDivElement>(null)
  const ritorno = useRef<HTMLElement | null>(null)
  const aperto = idratato && (riaperto || stato === 'nessuna-scelta')

  // «Gestisci cookie» (BdFooter) manda bd:apri-cookie; l'ancora #gestisci-cookie lo apre anche a pagina già aperta
  useEffect(() => {
    // L'ancora serve solo ad aprire il banner: si toglie dall'indirizzo, così ricaricando non si riapre
    const togliAncora = () => window.history.replaceState(null, '', window.location.pathname + window.location.search)
    const apri = () => {
      ritorno.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setRiaperto(true)
    }
    const daAncora = () => {
      if (window.location.hash !== ANCORA) return
      togliAncora()
      apri()
    }
    window.addEventListener('bd:apri-cookie', apri)
    window.addEventListener('hashchange', daAncora)
    if (window.location.hash === ANCORA) togliAncora()
    return () => {
      window.removeEventListener('bd:apri-cookie', apri)
      window.removeEventListener('hashchange', daAncora)
    }
  }, [])

  // Aperto dall'utente: il focus entra nel banner (il primo accesso invece non sposta il focus)
  useEffect(() => {
    if (aperto && riaperto) banner.current?.focus()
  }, [aperto, riaperto])

  // La barra mobile sale sopra il banner: l'altezza del banner va in --bd-banner-h (CSSOM, ammesso dalla CSP)
  useEffect(() => {
    const elemento = banner.current
    if (!aperto || !elemento) return
    const radice = document.documentElement
    const misura = () => radice.style.setProperty('--bd-banner-h', `${Math.ceil(elemento.getBoundingClientRect().height)}px`)
    misura()
    const osservatore = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(misura)
    osservatore?.observe(elemento)
    return () => {
      osservatore?.disconnect()
      radice.style.removeProperty('--bd-banner-h')
    }
  }, [aperto])

  if (!aperto) return null

  // Da dove arriva il focus quando entra nel banner da tastiera: lì torna alla chiusura
  const alFocus = (evento: FocusEvent<HTMLDivElement>) => {
    const da = evento.relatedTarget
    if (!ritorno.current && da instanceof HTMLElement && !evento.currentTarget.contains(da)) ritorno.current = da
  }

  const scegli = (scelta: 'accettato' | 'rifiutato') => {
    const conteneva = banner.current?.contains(document.activeElement) ?? false
    impostaConsenso(scelta)
    setRiaperto(false)
    if (conteneva) {
      const dove = ritorno.current?.isConnected ? ritorno.current : document.getElementById('contenuto')
      dove?.focus({ preventScroll: true })
    }
    ritorno.current = null
  }

  const alTasto = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key !== 'Escape') return
    evento.preventDefault()
    scegli('rifiutato')
  }

  return (
    <div
      ref={banner}
      className="bd-banner"
      role="dialog"
      aria-modal="false"
      aria-label={tt('bannerCookie.etichetta')}
      aria-describedby="bd-banner-testo"
      tabIndex={-1}
      onKeyDown={alTasto}
      onFocus={alFocus}
    >
      <p id="bd-banner-testo" className="bd-banner__testo">
        {tt('bannerCookie.testo')}
        {riaperto && stato !== 'nessuna-scelta' ? (
          <span className="bd-banner__stato"> {tt(stato === 'accettato' ? 'bannerCookie.statoAccettato' : 'bannerCookie.statoRifiutato')}</span>
        ) : null}
      </p>
      <div className="bd-banner__azioni">
        <a className="bd-banner__link" href="/cookie.html">
          {tt('bannerCookie.policy')}
        </a>
        <button type="button" className="bd-banner__scelta" onClick={() => scegli('rifiutato')}>
          {tt('bannerCookie.rifiuta')}
        </button>
        <button type="button" className="bd-banner__scelta" onClick={() => scegli('accettato')}>
          {tt('bannerCookie.accetta')}
        </button>
      </div>
      <button type="button" className="bd-banner__chiudi" aria-label={tt('bannerCookie.chiudi')} onClick={() => scegli('rifiutato')}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
