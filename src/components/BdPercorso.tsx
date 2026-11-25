import { useEffect, useRef } from 'react'
import fase1Avif from '../assets/illustrazioni/bd-percorso-1-progetto-332.avif'
import fase1Webp from '../assets/illustrazioni/bd-percorso-1-progetto-332.webp'
import fase2Avif from '../assets/illustrazioni/bd-percorso-2-fondazioni-332.avif'
import fase2Webp from '../assets/illustrazioni/bd-percorso-2-fondazioni-332.webp'
import fase3Avif from '../assets/illustrazioni/bd-percorso-3-casseri-332.avif'
import fase3Webp from '../assets/illustrazioni/bd-percorso-3-casseri-332.webp'
import fase4Avif from '../assets/illustrazioni/bd-percorso-4-impianti-332.avif'
import fase4Webp from '../assets/illustrazioni/bd-percorso-4-impianti-332.webp'
import fase5Avif from '../assets/illustrazioni/bd-percorso-5-casa-finita-332.avif'
import fase5Webp from '../assets/illustrazioni/bd-percorso-5-casa-finita-332.webp'
import { tt } from '../content/bd-testi.ts'
import immagini from '../content/immagini.json'
import testi from '../content/testi.json'

// File generati da studio/immagini.mjs (PERCORSO_AI): cinque riquadri verticali 2:3, AVIF con ripiego WebP.
const FASI = [
  { id: 'percorso-1-progetto', avif: fase1Avif, webp: fase1Webp },
  { id: 'percorso-2-fondazioni', avif: fase2Avif, webp: fase2Webp },
  { id: 'percorso-3-casseri', avif: fase3Avif, webp: fase3Webp },
  { id: 'percorso-4-impianti', avif: fase4Avif, webp: fase4Webp },
  { id: 'percorso-5-casa-finita', avif: fase5Avif, webp: fase5Webp },
]

/**
 * Il percorso del cantiere in «Come funziona» (§2, §6.4): cinque illustrazioni AI, dal progetto alla casa finita.
 * La terza mostra il sistema di §2 (pareti in casseri isolanti con il calcestruzzo armato dentro), non il laterizio.
 * Su mobile una striscia che si scorre di lato, con i bordi che sfumano nella pagina; da 1024 px cinque colonne.
 * La striscia si raggiunge anche da tastiera (tabIndex 0, con un nome) e la dicitura «Illustrazioni» è sempre visibile.
 */
export default function BdPercorso() {
  const striscia = useRef<HTMLDivElement>(null)

  // Il lazy loading del browser guarda solo in verticale: i riquadri fuori schermo a destra si caricherebbero solo
  // scorrendo, con un attimo di vuoto. Quando la striscia si avvicina li carica tutti (cinque AVIF, circa 80 kB).
  useEffect(() => {
    const elemento = striscia.current
    if (!elemento || typeof IntersectionObserver === 'undefined') return
    const osservatore = new IntersectionObserver(
      ([voce]) => {
        if (!voce.isIntersecting) return
        elemento.querySelectorAll('img').forEach((img) => {
          img.loading = 'eager'
        })
        osservatore.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    osservatore.observe(elemento)
    return () => osservatore.disconnect()
  }, [])

  const voci = FASI.map((fase) => ({ ...fase, voce: immagini.immagini.find((v) => v.id === fase.id) }))
  if (voci.some((v) => !v.voce)) return null

  return (
    <div className="bd-percorso">
      <h3 className="bd-percorso__titolo">{tt('comeFunziona.percorso.titolo')}</h3>
      <figure className="bd-percorso__figura" data-bd-illustrazione="">
        <div ref={striscia} className="bd-percorso__scorri" tabIndex={0} role="region" aria-label={tt('comeFunziona.percorso.regione')}>
          <ol className="bd-percorso__elenco">
            {voci.map(({ id, avif, webp, voce }, i) => (
              <li key={id} className="bd-percorso__fase">
                <span className="bd-percorso__immagine">
                  <picture>
                    <source type="image/avif" srcSet={avif} />
                    <img src={webp} width={voce?.width} height={voce?.height} alt={voce?.alt ?? ''} loading="lazy" decoding="async" />
                  </picture>
                </span>
                <span className="bd-percorso__etichetta">
                  <span className="bd-percorso__numero" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {testi.comeFunziona.percorso.fasi[i] ? tt(`comeFunziona.percorso.fasi.${i}`) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <figcaption className="bd-percorso__nota">{tt('comeFunziona.percorso.nota')}</figcaption>
      </figure>
    </div>
  )
}
