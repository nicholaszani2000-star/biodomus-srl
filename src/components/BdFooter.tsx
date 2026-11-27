import { contatti, emailPubblica } from '../content/dati.ts'
import { t, tt } from '../content/bd-testi.ts'
import BdWordmark from './BdWordmark.tsx'

// Aree di tocco di almeno 44 × 44 px (§9): ogni link è un blocco in linea alto 44 px che non va a capo al suo interno.
// Testo, colore e sottolineatura restano quelli dei link: cambia solo l'area che si può toccare.
const LINK = 'inline-flex min-h-11 items-center whitespace-nowrap'

/**
 * Footer (§6.12 e §10.1): contatti, dati legali completi, nota sul ruolo, privacy e cookie.
 * Telefono e WhatsApp come testo con link (tel: e wa.me), gli stessi di BdChiusura: gli unici due posti dove compaiono (§2).
 */
export default function BdFooter() {
  const canali = contatti()
  const email = emailPubblica()
  const legaliExtra = [t('footer.rea'), t('footer.capitale'), t('footer.pec')].filter((riga): riga is string => riga !== null)

  // Il banner dei cookie arriva allo step 7: questo evento lo riaprirà.
  const apriCookie = () => window.dispatchEvent(new CustomEvent('bd:apri-cookie'))

  return (
    <footer className="bd-footer border-t border-linea bg-carta">
      <div className="bd-wrap grid gap-6 py-12 text-[0.9375rem] text-testo-2">
        <BdWordmark posizione="footer" />
        {/* Contatti di §8 su una riga che va a capo tra una voce e l'altra, mai dentro un link. Tra le voci lo spazio
            di una parola (0,28em), come quando erano testo continuo; -my-2.5 riporta il testo dov'era: i 10 px in più
            sopra e sotto dei link finiscono nello spazio vuoto tra i blocchi del footer. */}
        <p className="-my-2.5 flex flex-wrap items-center gap-x-[0.28em]">
          {canali ? (
            <>
              <span>{tt(canali.whatsapp ? 'footer.contattiTelefonoWhatsapp' : 'footer.contattiTelefono')}</span>{' '}
              <a className={LINK} href={canali.tel}>
                {canali.telefono}
              </a>{' '}
              <span aria-hidden="true">·</span>{' '}
              {canali.whatsapp ? (
                <>
                  <a className={LINK} href={canali.whatsapp} target="_blank" rel="noopener">
                    {tt('footer.whatsapp')}
                    <span className="bd-sr-only"> {tt('comuni.nuovaScheda')}</span>
                  </a>{' '}
                  <span aria-hidden="true">·</span>{' '}
                </>
              ) : null}
            </>
          ) : null}
          <a className={LINK} href={`mailto:${email}`}>
            {email}
          </a>
        </p>

        <div className="grid gap-1">
          <p className="m-0">{tt('footer.legale')}</p>
          {legaliExtra.length ? <p className="m-0">{legaliExtra.join(' · ')}</p> : null}
        </div>

        <p className="bd-misura m-0">{tt('footer.ruolo')}</p>

        <nav aria-label="Informazioni legali" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a className={LINK} href="/privacy.html">
            {tt('footer.privacy')}
          </a>
          <a className={LINK} href="/cookie.html">
            {tt('footer.cookie')}
          </a>
          <button
            type="button"
            onClick={apriCookie}
            className="min-h-11 cursor-pointer bg-transparent p-0 text-accento underline decoration-1 underline-offset-[3px]"
          >
            {tt('footer.gestisciCookie')}
          </button>
        </nav>
      </div>
    </footer>
  )
}
