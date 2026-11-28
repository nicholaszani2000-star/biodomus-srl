// Parametri della campagna (CLAUDE.md §7): letti dall'indirizzo al momento dell'invio, senza salvare nulla nel browser.
// Salvarli nella memoria del browser senza consenso non è strettamente necessario (art. 122 del Codice privacy), e non serve:
// la landing è una pagina sola, quindi i parametri restano nell'indirizzo mentre la persona scorre e compila.
// fbclid identifica il clic su un annuncio di Meta e serve solo alla misurazione: solo con il consenso «accettato» (§10.4).

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const MASSIMO = 200

export type ChiaveParametro = (typeof UTM)[number] | 'fbclid'
export type Parametri = Partial<Record<ChiaveParametro, string>>

export function leggiParametri(consensoMarketing: boolean): Parametri {
  const indirizzo = new URLSearchParams(window.location.search)
  const parametri: Parametri = {}
  for (const chiave of UTM) {
    const valore = indirizzo.get(chiave)
    if (valore) parametri[chiave] = valore.slice(0, MASSIMO)
  }
  const fbclid = indirizzo.get('fbclid')
  if (consensoMarketing && fbclid) parametri.fbclid = fbclid.slice(0, MASSIMO)
  return parametri
}
