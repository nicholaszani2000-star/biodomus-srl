// Preselezione del modulo dalle card di «Per chi è» (§6.3): un evento sulla finestra che BdModulo ascolta.
// Niente stato globale né librerie: chi clicca la card manda l'evento, poi BdCta scorre al modulo.
// Sceglie solo le risposte. Il campo nascosto «angolo» resta quello della campagna (?a=, §7): dice quale titolo
// ha visto la persona; cosa ha scelto lo dice già la risposta 1.

export type ProfiloCard = 'casa' | 'terreno' | 'investimento'

export interface Preselezione {
  profilo: 'casa' | 'investimento'
  /** «si» solo per la card «Hai già il terreno» */
  terreno?: 'si'
}

export const EVENTO_PRESELEZIONE = 'bd:preseleziona'

const PRESELEZIONI: Record<ProfiloCard, Preselezione> = {
  casa: { profilo: 'casa' },
  terreno: { profilo: 'casa', terreno: 'si' },
  investimento: { profilo: 'investimento' },
}

export function preseleziona(profilo: ProfiloCard): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Preselezione>(EVENTO_PRESELEZIONE, { detail: PRESELEZIONI[profilo] }))
}
