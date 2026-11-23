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
.${p}q{fill:none;stroke:var(--bd-dettaglio,#A87B4F);stroke-width:1.25;stroke-linecap:round}
.${p}r{fill:var(--bd-ruggine,#B4542D);stroke:var(--bd-testo,#1F2326);stroke-width:1}
.${p}c{fill:var(--bd-carta,#F8F7F5)}
.${p}d{fill:var(--bd-testo-2,#595E62)}
${extra}</style>`

// ---------------------------------------------------------------- la parete in prospettiva cavaliera
// Step 4 (CLAUDE.md §5, «la sezione»): quattro blocchi, da fuori a dentro isolante esterno, calcestruzzo armato,
// isolante interno, intonaco. Per ogni strato: faccia in sezione con il retino da tavola tecnica, faccia superiore
// e fianco (profondità a 45°, ridotta a 3/4). Disegnata composta: chi la anima (bd-motion) stacca i blocchi
// spostando i gruppi .bd-strato-1…4 lungo x e disegna le quote (pathLength="1").
// Niente id nei gruppi: il disegno va inline anche due volte nella stessa pagina (BdHero e BdSistema).
function sezione() {
  const p = 'bdw'
  const spessori = [58, 104, 46, 14]
  const H = 260
  const profondita = 150
  const dx = profondita * 0.75 * Math.SQRT1_2
  const dy = dx
  const X0 = 100
  const Y0 = 128
  const Y1 = Y0 + H
  const xs = spessori.reduce((acc, t) => [...acc, acc[acc.length - 1] + t], [X0])
  const W = 470
  const altezza = 440

  // retini, disegnati come tracciati (niente <pattern> con id)
  function zigzag(x, w, y0, h) {
    const passo = 9
    const pts = []
    for (let i = 0, y = y0 + 4; y <= y0 + h - 4; i++, y += passo) pts.push([i % 2 ? x + w - 4 : x + 4, y])
    return `<path class="${p}f" d="M${pts.map(([a, b]) => `${n(a)} ${n(b)}`).join('L')}"/>`
  }
  function diagonali(x0, x1, y0, y1, passo = 11) {
    let d = ''
    for (let c = x0 + y0 + passo / 2; c < x1 + y1; c += passo) {
      const xa = Math.max(x0, c - y1)
      const xb = Math.min(x1, c - y0)
      if (xb - xa > 1) d += `M${n(xa)} ${n(c - xa)}L${n(xb)} ${n(c - xb)}`
    }
    return `<path class="${p}f" d="${d}"/>`
  }
  function punti(x, w, y0, h, passo = 6) {
    let d = ''
    for (let y = y0 + passo / 2; y < y0 + h; y += passo) {
      for (let xx = x + passo / 2 - 1; xx < x + w - 1; xx += passo) d += `M${n(xx)} ${n(y)}h.01`
    }
    return `<path class="${p}d" d="${d}"/>`
  }

  function strato(i) {
    const xa = xs[i]
    const xb = xs[i + 1]
    const fronte = [[xa, Y0], [xb, Y0], [xb, Y1], [xa, Y1]]
    const sopra = [[xa, Y0], [xb, Y0], [xb + dx, Y0 - dy], [xa + dx, Y0 - dy]]
    const fianco = [[xb, Y0], [xb + dx, Y0 - dy], [xb + dx, Y1 - dy], [xb, Y1]]
    const retino = [
      () => zigzag(xa, xb - xa, Y0, H),
      () => diagonali(xa, xb, Y0, Y1),
      () => zigzag(xa, xb - xa, Y0, H),
      () => punti(xa, xb - xa, Y0, H),
    ][i]()

    let armatura = ''
    if (i === 1) {
      const barre = [xa + 20, xb - 20]
      const alto = 40
      let ferri = ''
      for (const xb0 of barre) {
        ferri += `M${n(xb0)} ${n(Y1 - 8)}V${n(Y0 - alto)}`
        for (const z of [0.45, 0.9]) ferri += `M${n(xb0 + z * dx)} ${n(Y0 - z * dy)}v${-alto}`
      }
      let tondini = ''
      for (let y = Y0 + 22; y < Y1 - 10; y += 43) {
        tondini += `<circle class="${p}r" cx="${n(barre[0] + 7)}" cy="${n(y)}" r="4.2"/><circle class="${p}r" cx="${n(barre[1] - 7)}" cy="${n(y)}" r="4.2"/>`
      }
      armatura = `<g class="${p}g"><path class="${p}b" d="${ferri}"/>${tondini}</g>`
    }

    return `<g class="bd-strato bd-strato-${i + 1}" data-strato="${i + 1}">
<path class="${p}s" d="${pathPoligono(fianco)}"/><path class="${p}t" d="${pathPoligono(sopra)}"/><path class="${p}c" d="${pathPoligono(fronte)}"/>
${retino}
<path class="${p}l" d="${pathPoligono(fianco)}${pathPoligono(sopra)}${pathPoligono(fronte)}"/>
${armatura}
</g>`
  }

  // quote: spessori sotto, altezza a sinistra; ogni quota è un tracciato con pathLength="1" per disegnarla
  const yq = Y1 + 26
  const xq = X0 - 30
  const tick = (cx, cy) => `M${n(cx - 5)} ${n(cy + 5)}L${n(cx + 5)} ${n(cy - 5)}`
  const quotaSotto =
    xs.map((x) => `M${n(x)} ${n(Y1 + 8)}V${n(yq + 8)}`).join('') + `M${n(X0)} ${n(yq)}H${n(xs[4])}` + xs.map((x) => tick(x, yq)).join('')
  const quotaLato = `M${n(X0 - 8)} ${n(Y0)}H${n(xq - 8)}M${n(X0 - 8)} ${n(Y1)}H${n(xq - 8)}M${n(xq)} ${n(Y0)}V${n(Y1)}${tick(xq, Y0)}${tick(xq, Y1)}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${altezza}" width="${W}" height="${altezza}" role="img" aria-labelledby="${p}t">
<title id="${p}t">Parete in prospettiva: isolante esterno, calcestruzzo armato, isolante interno, intonaco</title>
<style>
.${p}l{fill:none;stroke:var(--bd-testo,#1F2326);stroke-width:1.4;stroke-linejoin:round}
.${p}f{fill:none;stroke:var(--bd-testo-2,#595E62);stroke-width:.8;stroke-linejoin:round;opacity:.8}
.${p}d{fill:none;stroke:var(--bd-testo-2,#595E62);stroke-width:1.8;stroke-linecap:round;opacity:.8}
.${p}c{fill:var(--bd-carta,#F8F7F5)}
.${p}t{fill:#E2E1DC;fill:color-mix(in srgb,var(--bd-linea,#D3D1CC) 45%,var(--bd-fondo,#EDECE8))}
.${p}s{fill:#D7D5D0;fill:color-mix(in srgb,var(--bd-linea,#D3D1CC) 85%,var(--bd-fondo,#EDECE8))}
.${p}q{fill:none;stroke:var(--bd-dettaglio,#A87B4F);stroke-width:1.25;stroke-linecap:round}
.${p}b{fill:none;stroke:var(--bd-dettaglio,#A87B4F);stroke-width:2.2;stroke-linecap:round}
.${p}r{fill:var(--bd-dettaglio,#A87B4F)}
.${p}o{flood-color:var(--bd-dettaglio,#A87B4F);flood-opacity:.55}
</style>
<defs><filter id="${p}-alone" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow class="${p}o" dx="0" dy="0" stdDeviation="1.6"/></filter></defs>
${[0, 1, 2, 3].map(strato).join('\n')}
<g class="bd-quote ${p}g">
<path class="${p}q bd-quota-linea" pathLength="1" d="${quotaSotto}"/>
<path class="${p}q bd-quota-linea" pathLength="1" d="${quotaLato}"/>
</g>
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
  // --- icone di «Per chi è» (step 4) ---
  // casa con la porta: vuoi costruire casa
  'bd-icona-casa.svg': icona(
    'Casa',
    '<path d="M3 11.25 12 4l9 7.25"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.25h4V20"/><path d="M15.5 6.4V4.5h2v3.5"/>',
  ),
  // lotto in prospettiva con il picchetto: hai già il terreno
  'bd-icona-terreno.svg': icona(
    'Terreno',
    '<path d="M2.5 16.5 9 13.25l12.5 3.25-6.5 3.75Z"/><path d="M12.5 16.75V5"/><path d="M12.5 5.25h5.5l-1.75 2.25 1.75 2.25h-5.5"/><path d="M5.75 14.6l.9.25M17 16.95l.9.25" stroke-dasharray="1 2"/>',
  ),
  // due villette affiancate: vuoi investire
  'bd-icona-villette.svg': icona(
    'Villette',
    '<path d="M2 12.5 6.75 8.5l4.75 4"/><path d="M3.5 11.25V19.5h6.5v-8.25"/><path d="M12.5 10.5 17.25 6.5 22 10.5"/><path d="M14 9.25V19.5h6.5V9.25"/><path d="M1.5 19.5h21"/><path d="M5.75 19.5v-3h2v3M16.25 19.5v-3h2v3"/>',
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
