// Genera le illustrazioni SVG di CLAUDE.md §5 in src/assets/svg/ (step 2).
// Disegnate qui a mano, senza librerie né immagini esterne: tratto e retini da tavola tecnica.
// Colori dei token con ripiego esadecimale: inline seguono la palette attiva, come <img> restano corretti.
// Uso: node studio/svg/genera-svg.mjs

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'src', 'assets', 'svg')
mkdirSync(OUT, { recursive: true })

// Numeri a 2 decimali al massimo, senza zeri inutili.
const n = (v) => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}
const punti = (lista) => lista.map(([x, y]) => `${n(x)} ${n(y)}`).join(' ')
const linea = (x1, y1, x2, y2, c = '') => `<path${c ? ` class="${c}"` : ''} d="M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}"/>`
const pathPoligono = (lista) => 'M' + lista.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + 'Z'

function salva(nome, svg) {
  const pulito = svg.replace(/\s*\n\s*/g, '').replace(/>\s+</g, '><')
  writeFileSync(join(OUT, nome), pulito + '\n')
  console.log(`${nome.padEnd(28)} ${(Buffer.byteLength(pulito) / 1024).toFixed(1)} kB`)
}

// Stile comune: le classi hanno un prefisso per file, così inline non si scontrano tra loro.
const stile = (p, extra = '') => `<style>
.${p}l{fill:none;stroke:var(--bd-testo,#1F2326);stroke-width:1.5;stroke-linejoin:round}
.${p}f{stroke:var(--bd-testo-2,#595E62);stroke-width:.8;fill:none}
.${p}q{fill:none;stroke:var(--bd-legno,#A87B4F);stroke-width:1.25;stroke-linecap:round}
.${p}r{fill:var(--bd-ruggine,#B4542D);stroke:var(--bd-testo,#1F2326);stroke-width:1}
.${p}c{fill:var(--bd-carta,#F8F7F5)}
.${p}d{fill:var(--bd-testo-2,#595E62)}
${extra}</style>`

// ---------------------------------------------------------------- la sezione della parete
// Parete in prospettiva cavaliera (§5, stile «Misto»): quattro blocchi con faccia in sezione, faccia superiore e fianco.
// Lo stacco tra gli strati lo governa una sola variabile CSS, --bd-esplodi (1 = staccati, 0 = parete ricomposta):
// senza la variabile (niente JavaScript) la parete è composta con le quote; con JavaScript il CSS della pagina la mette a 1
// (.bd-js) e GSAP la riporta a 0 mentre scorri; con la riduzione del movimento è già composta.
// Le classi e gli id hanno il prefisso «bds»: chi la mette inline più volte lo sostituisce (BdParete), così gli stili non si scontrano.
// Gli strati sono gruppi con classe bd-strato e data-strato (niente id: la stessa parete può comparire due volte nella pagina).
function sezione() {
  const p = 'bds'
  const spessori = [30, 72, 30, 9] // isolante esterno, calcestruzzo armato, isolante interno, intonaco (non in scala)
  const stacchi = [-36, -12, 12, 36] // spostamento di ogni strato quando la parete è staccata
  const H = 176
  const [dx, dy] = [64, -40] // profondità della prospettiva cavaliera
  const x0 = 48
  const yTop = 52
  const yBot = yTop + H
  const bordi = spessori.reduce((acc, t) => [...acc, acc[acc.length - 1] + t], [x0])
  const retini = ['eps', 'cls', 'eps', 'int']
  const facciaSopra = (x, t) => pathPoligono([[x, yTop], [x + t, yTop], [x + t + dx, yTop + dy], [x + dx, yTop + dy]])
  const fianco = (x, t) => pathPoligono([[x + t, yTop], [x + t + dx, yTop + dy], [x + t + dx, yBot + dy], [x + t, yBot]])

  const strati = spessori
    .map((t, i) => {
      const x = bordi[i]
      const tondini =
        retini[i] === 'cls'
          ? `<g class="${p}-luce">${[0.28, 0.72]
              .map((fx) =>
                [0, 1, 2, 3, 4].map((r) => `<circle cx="${n(x + t * fx)}" cy="${n(yTop + 22 + r * 33)}" r="3.6" class="${p}-tondino"/>`).join(''),
              )
              .join('')}</g>`
          : ''
      return `<g class="bd-strato bd-strato-${i + 1}" data-strato="${i + 1}">
<path d="${facciaSopra(x, t)}" class="${p}-pieno"/><path d="${facciaSopra(x, t)}" class="${p}-ombra1"/>
<path d="${fianco(x, t)}" class="${p}-pieno"/><path d="${fianco(x, t)}" class="${p}-ombra2"/>
<rect x="${n(x)}" y="${yTop}" width="${t}" height="${H}" class="${p}-pieno"/>
<rect x="${n(x)}" y="${yTop}" width="${t}" height="${H}" fill="url(#${p}-${retini[i]})"/>
${tondini}
<path d="${facciaSopra(x, t)}" class="${p}-l"/><path d="${fianco(x, t)}" class="${p}-l"/>
<rect x="${n(x)}" y="${yTop}" width="${t}" height="${H}" class="${p}-l"/>
</g>`
    })
    .join('')

  const yq = yBot + 24
  const tick = (cx, cy) => linea(cx - 4, cy + 4, cx + 4, cy - 4, `${p}-q`)
  const quote = `<g class="${p}-quote ${p}-luce">
${bordi.map((xi) => linea(xi, yBot + 8, xi, yq + 8, `${p}-q`)).join('')}
${linea(bordi[0], yq, bordi[bordi.length - 1], yq, `${p}-q`)}${bordi.map((xi) => tick(xi, yq)).join('')}
</g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 301 272" width="301" height="272" role="img" aria-labelledby="${p}t" class="${p}">
<title id="${p}t">Parete in prospettiva: isolante esterno, calcestruzzo armato, isolante interno, intonaco</title>
<style>
.${p}-l{fill:none;stroke:var(--bd-testo,#1F2326);stroke-width:1.3;stroke-linejoin:round}
.${p}-pieno{fill:var(--bd-carta,#F8F7F5)}
.${p}-ombra1{fill:var(--bd-testo,#1F2326);fill-opacity:.07}
.${p}-ombra2{fill:var(--bd-testo,#1F2326);fill-opacity:.15}
.${p}-retino{fill:none;stroke:var(--bd-testo-2,#595E62);stroke-width:.9}
.${p}-punto{fill:var(--bd-testo-2,#595E62)}
.${p}-tondino{fill:var(--bd-tondino,#B4542D);stroke:var(--bd-testo,#1F2326);stroke-width:.8}
.${p}-q{fill:none;stroke:var(--bd-dettaglio,#A87B4F);stroke-width:1.4;stroke-linecap:round}
.${p} .bd-strato{transform:translateX(calc(var(--bd-esplodi,0) * var(--bd-stacco,0px)))}
.${p} .bd-strato-1{--bd-stacco:${stacchi[0]}px}.${p} .bd-strato-2{--bd-stacco:${stacchi[1]}px}.${p} .bd-strato-3{--bd-stacco:${stacchi[2]}px}.${p} .bd-strato-4{--bd-stacco:${stacchi[3]}px}
.${p}-quote{opacity:calc(1 - var(--bd-esplodi,0))}
.bd-tema-scuro .${p}-luce{filter:url(#${p}-alone)}
@media (prefers-reduced-motion:reduce){.${p} .bd-strato{transform:none}.${p}-quote{opacity:1}}
</style>
<defs>
<pattern id="${p}-eps" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6Q3 0 6 6T12 6" class="${p}-retino" opacity=".6"/></pattern>
<pattern id="${p}-cls" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" class="${p}-punto" opacity=".6"/><path d="M9 8.5l2.4 3.9H6.6Z" class="${p}-retino" opacity=".55"/><circle cx="11.5" cy="2.5" r=".6" class="${p}-punto" opacity=".55"/></pattern>
<pattern id="${p}-int" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".55" class="${p}-punto" opacity=".7"/></pattern>
<filter id="${p}-alone" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
${strati}
${quote}
</svg>`
}

// ---------------------------------------------------------------- la pianta
function pianta() {
  const p = 'bdp'
  const u = 24
  const ox = 52
  const oy = 52
  const W = 14
  const H = 10
  const t = 0.5 // muri esterni
  const s = 0.22 // tramezzi
  const X = (v) => ox + v * u
  const Y = (v) => oy + v * u
  const muri = []
  const finestre = []
  const porte = []

  // segmenti di muro orizzontale (y da ya a yb) tra x0 e x1, con aperture [a, b]
  function muroO(ya, yb, x0, x1, aperture = []) {
    let da = x0
    for (const [a, b] of [...aperture].sort((m, k) => m[0] - k[0])) {
      if (a > da) muri.push([da, ya, a - da, yb - ya])
      da = b
    }
    if (x1 > da) muri.push([da, ya, x1 - da, yb - ya])
  }
  function muroV(xa, xb, y0, y1, aperture = []) {
    let da = y0
    for (const [a, b] of [...aperture].sort((m, k) => m[0] - k[0])) {
      if (a > da) muri.push([xa, da, xb - xa, a - da])
      da = b
    }
    if (y1 > da) muri.push([xa, da, xb - xa, y1 - da])
  }

  // Muri esterni con finestre e porta d'ingresso
  const fSopra = [[1.2, 3.2], [6.9, 7.7], [9.6, 12.4]]
  const fSotto = [[1, 7.4], [9.8, 12.6]]
  const fSinistra = [[5.4, 8.6]]
  const fDestra = [[1.6, 3.6], [6.6, 8.6]]
  const ingresso = [4.5, 5.5]
  muroO(0, t, 0, W, [...fSopra, ingresso])
  muroO(H - t, H, 0, W, fSotto)
  muroV(0, t, t, H - t, fSinistra)
  muroV(W - t, W, t, H - t, fDestra)
  for (const [a, b] of fSopra) finestre.push(['o', a, b, 0, t])
  for (const [a, b] of fSotto) finestre.push(['o', a, b, H - t, H])
  for (const [a, b] of fSinistra) finestre.push(['v', a, b, 0, t])
  for (const [a, b] of fDestra) finestre.push(['v', a, b, W - t, W])

  // Tramezzi: cucina | ingresso | bagno sopra, zona giorno sotto, due camere a destra
  // i tramezzi si fermano dove ne incontrano un altro, così gli incroci restano puliti
  muroV(4 - s / 2, 4 + s / 2, t, 4 - s / 2)
  muroV(6 - s / 2, 6 + s / 2, t, 4 - s / 2, [[2.4, 3.3]])
  muroO(4 - s / 2, 4 + s / 2, t, 8.5 - s / 2, [[1, 3.4], [4.25, 5.75]])
  muroV(8.5 - s / 2, 8.5 + s / 2, t, H - t, [[2.9, 3.8], [6.1, 7]])
  muroO(5 - s / 2, 5 + s / 2, 8.5 + s / 2, W - t)

  // Porte: [cardine x, cardine y, larghezza, verso dell'anta (x, y), verso della chiusura (x, y)]
  porte.push([4.5, t, 1, [0, 1], [1, 0]]) // ingresso
  porte.push([6 + s / 2, 2.4, 0.9, [1, 0], [0, 1]]) // bagno
  porte.push([8.5 + s / 2, 2.9, 0.9, [1, 0], [0, 1]]) // camera 1
  porte.push([8.5 + s / 2, 7, 0.9, [1, 0], [0, -1]]) // camera 2

  const rect = ([x, y, w, h]) => `M${n(X(x))} ${n(Y(y))}h${n(w * u)}v${n(h * u)}h${n(-w * u)}Z`
  const dMuri = muri.map(rect).join('')

  const dFinestre = finestre
    .map(([o, a, b, c0, c1]) => {
      if (o === 'o') {
        const ym = (c0 + c1) / 2
        return `${rect([a, c0, b - a, c1 - c0])}M${n(X(a))} ${n(Y(ym))}H${n(X(b))}`
      }
      const xm = (c0 + c1) / 2
      return `${rect([c0, a, c1 - c0, b - a])}M${n(X(xm))} ${n(Y(a))}V${n(Y(b))}`
    })
    .join('')

  const dPorte = porte
    .map(([cx, cy, l, [ax, ay], [bx, by]]) => {
      const fx = cx + ax * l
      const fy = cy + ay * l
      const ex = cx + bx * l
      const ey = cy + by * l
      const sweep = ax * by - ay * bx > 0 ? 1 : 0
      return `M${n(X(cx))} ${n(Y(cy))}L${n(X(fx))} ${n(Y(fy))}M${n(X(ex))} ${n(Y(ey))}A${n(l * u)} ${n(l * u)} 0 0 ${sweep} ${n(X(fx))} ${n(Y(fy))}`
    })
    .join('')

  // Quote: sopra (0 · 8,5 · 14) e a sinistra (0 · 4 · 10), senza numeri
  const qy = Y(-1.15)
  const qx = X(-1.15)
  const tickO = (xx, yy) => `M${n(xx - 4)} ${n(yy + 4)}L${n(xx + 4)} ${n(yy - 4)}`
  const sopra = [0, 8.5, W]
  const sinistra = [0, 4, H]
  const dQuote =
    sopra.map((v) => `M${n(X(v))} ${n(Y(-0.25))}V${n(qy - 5)}${tickO(X(v), qy)}`).join('') +
    `M${n(X(0))} ${n(qy)}H${n(X(W))}` +
    sinistra.map((v) => `M${n(X(-0.25))} ${n(Y(v))}H${n(qx - 5)}${tickO(qx, Y(v))}`).join('') +
    `M${n(qx)} ${n(Y(0))}V${n(Y(H))}`

  // Piano di lavoro della cucina, lungo i muri
  const dCucina = `M${n(X(t))} ${n(Y(t + 0.6))}H${n(X(3.9))}M${n(X(t + 0.6))} ${n(Y(t + 0.6))}V${n(Y(3.8))}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 412 316" width="412" height="316" role="img" aria-labelledby="${p}t">
<title id="${p}t">Pianta schematica di una casa su un piano</title>
${stile(p, `.${p}s{fill:none;stroke:var(--bd-testo,#1F2326);stroke-width:1}.${p}k{fill:none;stroke:var(--bd-testo-2,#595E62);stroke-width:1;stroke-dasharray:4 3}`)}
<defs><pattern id="${p}-45" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" class="${p}f"/></pattern></defs>
<g id="bd-pianta-muri"><path class="${p}c" d="${dMuri}"/><path fill="url(#${p}-45)" d="${dMuri}"/><path class="${p}l" d="${dMuri}"/></g>
<g id="bd-pianta-aperture"><path class="${p}c" d="${dFinestre}"/><path class="${p}s" d="${dFinestre}"/><path class="${p}s" d="${dPorte}"/><path class="${p}k" d="${dCucina}"/></g>
<g id="bd-quote"><path class="${p}q" d="${dQuote}"/></g>
</svg>`
}

// ---------------------------------------------------------------- l'assonometria
function assonometria() {
  const p = 'bda'
  const u = 16
  const X0 = 172
  const Y0 = 144
  const c = Math.cos(Math.PI / 6)
  const P = (x, y, z) => [X0 + (x - y) * u * c, Y0 + (x + y) * u * 0.5 - z * u]
  const faccia = (pts) => pathPoligono(pts.map((q) => P(...q)))

  // Facce visibili di un volume: sopra (z1), fronte sinistra (y1), fronte destra (x1)
  function volume([x0, x1], [y0, y1], [z0, z1]) {
    return {
      sopra: faccia([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]),
      sinistra: faccia([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]),
      destra: faccia([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]),
    }
  }
  // Rettangolo su una faccia: piano y = costante (sinistra) o x = costante (destra)
  const suSinistra = (y, [xa, xb], [za, zb]) => faccia([[xa, y, za], [xb, y, za], [xb, y, zb], [xa, y, zb]])
  const suDestra = (x, [ya, yb], [za, zb]) => faccia([[x, ya, za], [x, yb, za], [x, yb, zb], [x, ya, zb]])
  const seg = (a, b) => {
    const [x1, y1] = P(...a)
    const [x2, y2] = P(...b)
    return `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`
  }

  const A = volume([0, 14], [0, 10], [0, 6]) // piano terra
  const B = volume([5, 14], [0, 10], [6, 11]) // primo piano

  const ombra = faccia([[-0.6, -0.6, 0], [14.9, -0.6, 0], [14.9, 10.9, 0], [-0.6, 10.9, 0]])

  // Vetrate (vetro + montanti antracite) e porta d'ingresso antracite
  const vetri = [
    suSinistra(10, [6, 13.4], [0, 5.2]),
    suSinistra(10, [3.4, 5], [1.6, 4.6]),
    suDestra(14, [2, 8], [1.4, 4.6]),
    suSinistra(10, [9.6, 13.4], [7, 10.2]),
    suDestra(14, [1.2, 8.8], [7.4, 9.8]),
    suSinistra(10, [0, 5], [6, 6.9]), // parapetto in vetro della terrazza
  ].join('')
  const montanti =
    seg([8.5, 10, 0], [8.5, 10, 5.2]) +
    seg([11, 10, 0], [11, 10, 5.2]) +
    seg([14, 5, 1.4], [14, 5, 4.6]) +
    seg([11.5, 10, 7], [11.5, 10, 10.2]) +
    seg([14, 5, 7.4], [14, 5, 9.8])
  const porta = suSinistra(10, [1.2, 2.8], [0, 4.6])

  // Rivestimento in doghe di legno sul primo piano
  const legno = suSinistra(10, [5, 9], [6, 11])
  let doghe = ''
  for (let x = 5.5; x < 9; x += 0.5) doghe += seg([x, 10, 6], [x, 10, 11])

  // Quote isometriche: lunghezza sul fronte sinistro, altezza sullo spigolo destro
  const tick = (q) => {
    const [x, y] = P(...q)
    return `M${n(x - 4)} ${n(y + 4)}L${n(x + 4)} ${n(y - 4)}`
  }
  const quote =
    seg([0, 10.3, 0], [0, 12, 0]) +
    seg([14, 10.3, 0], [14, 12, 0]) +
    seg([0, 11.6, 0], [14, 11.6, 0]) +
    tick([0, 11.6, 0]) +
    tick([14, 11.6, 0]) +
    seg([14.3, 0, 0], [16, 0, 0]) +
    seg([14.3, 0, 11], [16, 0, 11]) +
    seg([15.6, 0, 0], [15.6, 0, 11]) +
    tick([15.6, 0, 0]) +
    tick([15.6, 0, 11])

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 360" width="400" height="360" role="img" aria-labelledby="${p}t">
<title id="${p}t">Assonometria schematica di una casa moderna su due piani</title>
${stile(p, `.${p}o{fill:var(--bd-linea,#D3D1CC);opacity:.6}.${p}s{fill:var(--bd-carta,#F8F7F5)}.${p}a{fill:#E4E2DD}.${p}b{fill:#D6D3CD}.${p}v{fill:#C9CED0;stroke:var(--bd-accento,#383E42);stroke-width:1.5}.${p}m{fill:none;stroke:var(--bd-accento,#383E42);stroke-width:1.5}.${p}x{fill:var(--bd-accento,#383E42)}.${p}w{fill:var(--bd-legno,#A87B4F)}.${p}g{fill:none;stroke:#7E5A37;stroke-width:.8}`)}
<path class="${p}o" d="${ombra}"/>
<g id="bd-volume-terra"><path class="${p}s" d="${A.sopra}"/><path class="${p}a" d="${A.sinistra}"/><path class="${p}b" d="${A.destra}"/><path class="${p}l" d="${A.sopra}${A.sinistra}${A.destra}"/></g>
<g id="bd-volume-primo"><path class="${p}s" d="${B.sopra}"/><path class="${p}a" d="${B.sinistra}"/><path class="${p}b" d="${B.destra}"/><path class="${p}w" d="${legno}"/><path class="${p}g" d="${doghe}"/><path class="${p}l" d="${B.sopra}${B.sinistra}${B.destra}"/></g>
<g id="bd-serramenti"><path class="${p}v" d="${vetri}"/><path class="${p}m" d="${montanti}"/><path class="${p}x" d="${porta}"/></g>
<g id="bd-quote"><path class="${p}q" d="${quote}"/></g>
</svg>`
}

// ---------------------------------------------------------------- icone di «Come funziona»
const icona = (titolo, corpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${titolo}">${corpo}</svg>`

const icone = {
  // due fumetti: ci racconti il progetto
  'bd-icona-conversazione.svg': icona(
    'Conversazione',
    '<path d="M4 4.75h10.5a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5H8.5L5.25 16v-2.75H4a1.5 1.5 0 0 1-1.5-1.5v-5.5A1.5 1.5 0 0 1 4 4.75Z"/><path d="M18.5 9.25H20a1.5 1.5 0 0 1 1.5 1.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-1.25V20.5l-3.25-2.75h-4a1.5 1.5 0 0 1-1.5-1.5v-.5"/>',
  ),
  // tavola di progetto con una pianta e la quota
  'bd-icona-tavola.svg': icona(
    'Tavola di progetto',
    '<path d="M3 4.5h18v12.5H3Z"/><path d="M6.5 7.75h11v6h-11Z"/><path d="M12 7.75v3.25M6.5 10.75h3"/><path d="M8.5 17l-2 3.5M15.5 17l2 3.5"/>',
  ),
  // documento con firma
  'bd-icona-firma.svg': icona(
    'Firma del contratto',
    '<path d="M6 2.75h8.5l4 4v14.5H6Z"/><path d="M14.5 2.75v4h4"/><path d="M8.5 9.5h6M8.5 12.25h4"/><path d="M8.5 17.25c1-1.75 1.75-1.75 2.25-.5s1.25 1.25 2-.25 1.5-1 2.25.25"/>',
  ),
  // chiave di casa
  'bd-icona-chiave.svg': icona(
    'Chiavi di casa',
    '<circle cx="8" cy="8" r="4.75"/><circle cx="8" cy="8" r="1.25"/><path d="M11.4 11.4 20.5 20.5"/><path d="M15.75 15.75l2-2M18.25 18.25l1.5-1.5"/>',
  ),
}

salva('bd-sezione.svg', sezione())
salva('bd-pianta.svg', pianta())
salva('bd-assonometria.svg', assonometria())
for (const [nome, svg] of Object.entries(icone)) salva(nome, svg)
