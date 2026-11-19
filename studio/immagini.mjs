// Pipeline delle immagini (CLAUDE.md §5, §9, §10.7, §10.10 · step 2). Uso: npm run immagini
//
// Legge studio/originali/ e scrive:
//   src/assets/img/          foto autorizzate in AVIF e WebP, 480 · 768 · 1200 · 1600 px, senza metadati
//   src/assets/svg/          bd-logo.svg e bd-logo-orizzontale.svg dal kit (mai payoff né 3D)
//   src/assets/partner/      loghi dei partner con autorizzazione «sì»
//   public/                  favicon, icone, site.webmanifest, og-image.jpg
//   src/content/immagini.json  manifesto: file, larghezze, width/height, alt, credito, dove, autorizzazione
//   studio/report/contact-sheet.jpg  tutte le immagini esportate, con nome e peso
//
// Le foto e i loghi di un partner con autorizzazione «no» restano in studio/ e non entrano nel manifesto.
// Le illustrazioni AI del kit (biodomus-asset/illustrazioni/) restano fuori dalla pagina (§2).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGINALI = join(ROOT, 'studio', 'originali')
const KIT = join(ORIGINALI, 'biodomus-asset')
const OUT_IMG = join(ROOT, 'src', 'assets', 'img')
const OUT_SVG = join(ROOT, 'src', 'assets', 'svg')
const OUT_PARTNER = join(ROOT, 'src', 'assets', 'partner')
const PUBLIC = join(ROOT, 'public')
const MANIFESTO = join(ROOT, 'src', 'content', 'immagini.json')
const CONTACT_SHEET = join(ROOT, 'studio', 'report', 'contact-sheet.jpg')

export const LARGHEZZE = [480, 768, 1200, 1600]
export const LIMITE_KB = { hero: 160, altre: 120 } // a 1200 px (§9)
const QUALITA = { avif: { da: 60, min: 40 }, webp: { da: 75, min: 40 } }
const ASPETTO = { hero: 3 / 2, realizzazione: 4 / 3 }

const kB = (byte) => byte / 1024
const slug = (testo) =>
  testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// ---------- dati di §2, letti da dati.ts (studio/ non importa codice TypeScript) ----------

function leggiDati() {
  const testo = readFileSync(join(ROOT, 'src', 'content', 'dati.ts'), 'utf8')
  const stringa = (chiave) => (testo.match(new RegExp(`\\b${chiave}:\\s*'([^']*)'`)) ?? [])[1] ?? null
  const booleano = (chiave) => (testo.match(new RegExp(`\\b${chiave}:\\s*(true|false)`)) ?? [])[1] === 'true'
  return {
    BRAND: stringa('BRAND') ?? 'Biodomus',
    STILE: stringa('STILE') ?? 'Cemento',
    LOGO: stringa('LOGO'),
    P1_NOME: stringa('P1_NOME'),
    P2_NOME: stringa('P2_NOME'),
    P1_OK: booleano('P1_OK'),
    P2_OK: booleano('P2_OK'),
  }
}

// ---------- foto ----------

/** Esporta una foto: rotazione da EXIF, niente metadati, ritaglio se serve, AVIF e WebP con qualità adattiva. */
export async function esportaFoto(sorgente, cartellaUscita, nome, ruolo = 'realizzazione') {
  const meta = await sharp(sorgente).metadata()
  const ruotata = (meta.orientation ?? 1) >= 5
  const W = ruotata ? meta.height : meta.width
  const H = ruotata ? meta.width : meta.height

  // Ritaglio intelligente solo se il formato si allontana più del 15% da quello della sezione
  let taglio = null
  const obiettivo = ASPETTO[ruolo] ?? ASPETTO.realizzazione
  if (Math.abs(W / H - obiettivo) / obiettivo > 0.15) {
    taglio = W / H > obiettivo ? { width: Math.round(H * obiettivo), height: H } : { width: W, height: Math.round(W / obiettivo) }
  }
  const larghezzaUtile = taglio?.width ?? W
  const altezzaUtile = taglio?.height ?? H
  const larghezze = LARGHEZZE.filter((l) => l <= larghezzaUtile)
  if (!larghezze.length) larghezze.push(larghezzaUtile) // mai oltre la risoluzione originale

  const limite = (ruolo === 'hero' ? LIMITE_KB.hero : LIMITE_KB.altre) * 1024
  const file = []
  for (const formato of ['avif', 'webp']) {
    let qualitaScelta = QUALITA[formato].da
    for (const larghezza of larghezze) {
      let qualita = larghezza > 1200 ? qualitaScelta : QUALITA[formato].da
      let buffer
      for (;;) {
        // orientamento da EXIF; l'uscita non porta metadati. Un solo resize: in sharp l'ultimo sostituisce i precedenti.
        const immagine = sharp(sorgente)
          .rotate()
          .resize(
            taglio
              ? { width: larghezza, height: Math.round(larghezza / obiettivo), fit: 'cover', position: sharp.strategy.attention }
              : { width: larghezza, withoutEnlargement: true },
          )
        buffer = await (formato === 'avif' ? immagine.avif({ quality: qualita, effort: 5 }) : immagine.webp({ quality: qualita, effort: 5 })).toBuffer()
        if (larghezza > 1200 || buffer.length <= limite || qualita - 5 < QUALITA[formato].min) break
        qualita -= 5
      }
      if (larghezza <= 1200) qualitaScelta = qualita
      const nomeFile = `${nome}-${larghezza}.${formato}`
      writeFileSync(join(cartellaUscita, nomeFile), buffer)
      const fuoriLimite = larghezza <= 1200 && buffer.length > limite
      if (fuoriLimite) console.warn(`ATTENZIONE: ${nomeFile} pesa ${kB(buffer.length).toFixed(1)} kB anche a qualità ${qualita}: oltre i ${limite / 1024} kB di §9`)
      file.push({ file: nomeFile, larghezza, formato, qualita, kB: Math.round(kB(buffer.length) * 10) / 10, fuoriLimite })
    }
  }
  const larghezzaMax = Math.max(...larghezze)
  return {
    file,
    larghezze,
    width: larghezzaMax,
    height: Math.round((larghezzaMax * altezzaUtile) / larghezzaUtile),
  }
}

function elencaFile(cartella, estensioni) {
  if (!existsSync(cartella)) return []
  const trovati = []
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const percorso = join(cartella, voce.name)
    if (voce.isDirectory()) trovati.push(...elencaFile(percorso, estensioni))
    else if (estensioni.includes(extname(voce.name).toLowerCase())) trovati.push(percorso)
  }
  return trovati.sort()
}

// ---------- programma ----------

async function main() {
  const d = leggiDati()
  const report = { foto: [], fotoEscluse: [], partner: [], partnerEsclusi: [], logo: [], favicon: [], og: null, note: [] }
  const voci = []

  // 1. Foto delle case: sono dell'impresa partner P1 (studio/originali/LEGGIMI.md)
  rmSync(OUT_IMG, { recursive: true, force: true })
  mkdirSync(OUT_IMG, { recursive: true })
  const foto = elencaFile(join(ORIGINALI, 'foto'), ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.tif', '.tiff'])
  if (!foto.length) report.note.push('studio/originali/foto/ è vuota: nessuna foto da esportare, si usano le illustrazioni SVG.')
  for (const sorgente of foto) {
    if (!d.P1_OK) {
      report.fotoEscluse.push(relative(ROOT, sorgente))
      continue
    }
    const casa = basename(dirname(sorgente)) === 'foto' ? '' : basename(dirname(sorgente))
    const ruolo = /hero/i.test(basename(sorgente)) ? 'hero' : 'realizzazione'
    const nome = slug(`${casa}-${basename(sorgente, extname(sorgente))}`)
    let esito
    try {
      esito = await esportaFoto(sorgente, OUT_IMG, nome, ruolo)
    } catch (err) {
      throw new Error(`${relative(ROOT, sorgente)}: impossibile leggerla (${err.message}). Se è HEIC, caricala in JPG.`)
    }
    report.foto.push({ sorgente: relative(ROOT, sorgente), ...esito })
    voci.push({
      id: nome,
      tipo: 'foto',
      file: `src/assets/img/${nome}`,
      formati: ['avif', 'webp'],
      larghezze: esito.larghezze,
      width: esito.width,
      height: esito.height,
      alt: `${casa ? casa.replace(/-/g, ' ') : 'Casa realizzata'}: foto della casa finita`,
      alt_da_verificare: true,
      credito: `Foto: ${d.P1_NOME}`,
      dove: ruolo === 'hero' ? 'BdHero, immagine principale' : `BdRealizzazioni, card «${casa || nome}»`,
      autorizzazione: 'P1_OK: sì',
    })
  }

  // 2. Loghi dei partner: solo con autorizzazione «sì»
  rmSync(OUT_PARTNER, { recursive: true, force: true })
  for (const sorgente of elencaFile(join(ORIGINALI, 'loghi-partner'), ['.svg', '.png'])) {
    const nomeFile = basename(sorgente).toLowerCase()
    const autorizzato = (/edilnoma/.test(nomeFile) && d.P1_OK) || (/bioisotherm/.test(nomeFile) && d.P2_OK)
    if (!autorizzato) {
      report.partnerEsclusi.push(relative(ROOT, sorgente))
      continue
    }
    mkdirSync(OUT_PARTNER, { recursive: true })
    copyFileSync(sorgente, join(OUT_PARTNER, slug(basename(nomeFile, extname(nomeFile))) + extname(nomeFile)))
    report.partner.push(nomeFile)
  }

  // 3. Logo: dal kit, solo positivo senza payoff (§2). Mai le versioni con payoff né quelle 3D.
  const kitSvg = join(KIT, 'logo', 'svg')
  const logoSito = [
    ['biodomus-logo-positivo.svg', 'bd-logo.svg', 'impilato'],
    ['biodomus-logo-orizzontale-positivo.svg', 'bd-logo-orizzontale.svg', 'orizzontale'],
  ]
  const logo = {}
  if (existsSync(kitSvg)) {
    for (const [da, a, chiave] of logoSito) {
      const svg = readFileSync(join(kitSvg, da), 'utf8').replace(/\s*\n\s*/g, ' ').replace(/>\s+</g, '><').trim()
      if (/payoff|COSTRUZIONI/i.test(svg)) throw new Error(`${da} contiene il payoff: non va sul sito`)
      writeFileSync(join(OUT_SVG, a), svg + '\n')
      const [, , larghezza, altezza] = (svg.match(/viewBox="([^"]+)"/) ?? [])[1].split(/\s+/).map(Number)
      logo[chiave] = { file: `src/assets/svg/${a}`, width: Math.round(larghezza * 100) / 100, height: Math.round(altezza * 100) / 100 }
      report.logo.push(`${da} → src/assets/svg/${a}`)
    }
  } else {
    report.note.push('Kit del logo assente: resta BdWordmark (testo HTML).')
  }

  // 4. Favicon e icone dal kit, più la 192 ricavata dalla 512
  const kitFavicon = join(KIT, 'favicon')
  if (existsSync(kitFavicon)) {
    for (const nome of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icona-512.png', 'icona-512-maskable.png']) {
      copyFileSync(join(kitFavicon, nome), join(PUBLIC, nome))
      report.favicon.push(nome)
    }
    await sharp(join(kitFavicon, 'icona-512.png')).resize(192, 192).png({ compressionLevel: 9 }).toFile(join(PUBLIC, 'icona-192.png'))
    report.favicon.push('icona-192.png (ricavata da icona-512.png)')
  }
  const colori = { Cemento: '#EDECE8', Grafite: '#1A1C1E' }
  const manifestWeb = {
    name: d.BRAND,
    short_name: d.BRAND,
    lang: 'it',
    start_url: '/',
    display: 'browser',
    background_color: colori[d.STILE] ?? colori.Cemento,
    theme_color: colori[d.STILE] ?? colori.Cemento,
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icona-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
  writeFileSync(join(PUBLIC, 'site.webmanifest'), JSON.stringify(manifestWeb, null, 2) + '\n')

  // 5. Immagine di condivisione: quella del kit così com'è; altrimenti composta con sharp (senza testo)
  const ogKit = join(KIT, 'condivisione', 'og-image-scuro.jpg') // STILE «Misto»: primo schermo scuro
  const ogOut = join(PUBLIC, 'og-image.jpg')
  if (existsSync(ogKit)) {
    copyFileSync(ogKit, ogOut)
    report.og = 'copiata dal kit (condivisione/og-image-scuro.jpg)'
  } else {
    const fondo = { create: { width: 1200, height: 630, channels: 3, background: colori[d.STILE] ?? colori.Cemento } }
    const strati = [{ input: await sharp(join(OUT_SVG, 'bd-assonometria.svg'), { density: 150 }).resize({ height: 520 }).png().toBuffer(), left: 640, top: 55 }]
    if (existsSync(join(OUT_SVG, 'bd-logo.svg'))) strati.push({ input: await sharp(join(OUT_SVG, 'bd-logo.svg'), { density: 300 }).resize({ height: 140 }).png().toBuffer(), left: 80, top: 80 })
    await sharp(fondo).composite(strati).jpeg({ quality: 82, mozjpeg: true }).toFile(ogOut)
    report.og = 'composta con sharp: assonometria e logo, senza testo (il kit non c\'è)'
  }
  const ogMeta = await sharp(ogOut).metadata()
  if (ogMeta.width !== 1200 || ogMeta.height !== 630) throw new Error(`og-image ${ogMeta.width}×${ogMeta.height}: servono 1200×630`)

  // 6. Manifesto: illustrazioni SVG disegnate per il progetto (§5) e foto autorizzate
  const svg = (nome) => {
    const testo = readFileSync(join(OUT_SVG, nome), 'utf8')
    const [, , w, h] = (testo.match(/viewBox="([^"]+)"/) ?? [])[1].split(/\s+/).map(Number)
    return { width: w, height: h }
  }
  const illustrazioni = [
    {
      id: 'sezione',
      file: 'src/assets/svg/bd-sezione.svg',
      alt: "Disegno in sezione della parete: strato isolante esterno, calcestruzzo armato con i tondini d'acciaio, strato isolante interno e intonaco.",
      dove: 'BdSistema, disegno grande con gli strati bd-strato-1…4 che si aprono al tocco; BdHero, la sezione animata',
      dicitura: 'Illustrazione schematica, non in scala.',
    },
    {
      id: 'assonometria',
      file: 'src/assets/svg/bd-assonometria.svg',
      alt: 'Assonometria schematica di una casa moderna su due piani, con vetrate, serramenti antracite e rivestimento in legno.',
      dove: 'ripiego per BdRealizzazioni se mancano foto autorizzate; oggi non usata',
      dicitura: 'Illustrazione',
    },
    {
      id: 'pianta',
      file: 'src/assets/svg/bd-pianta.svg',
      alt: 'Pianta schematica di una casa su un piano, con muri, porte, finestre e quote.',
      dove: 'BdRealizzazioni, al posto delle foto finché P1_OK è «no» (oggi la sezione è nascosta)',
      dicitura: 'Illustrazione',
    },
  ]
  const vociIllustrazioni = illustrazioni.map((ill) => {
    const { width, height } = svg(basename(ill.file))
    return {
      id: ill.id,
      tipo: 'illustrazione',
      file: ill.file,
      formati: ['svg'],
      larghezze: [width],
      width,
      height,
      alt: ill.alt,
      credito: 'Illustrazione',
      dicitura: ill.dicitura,
      dove: ill.dove,
      autorizzazione: 'non serve: disegno originale del progetto',
    }
  })
  voci.unshift(...vociIllustrazioni)

  const manifesto = {
    nota: 'Generato da studio/immagini.mjs (npm run immagini). Alt, credito e «dove» si cambiano lì, non qui.',
    logo,
    immagini: voci,
  }
  writeFileSync(MANIFESTO, JSON.stringify(manifesto, null, 2) + '\n')

  // 7. Contact sheet
  await contactSheet(d)

  // Riepilogo
  console.log('Foto esportate:', report.foto.length ? report.foto.map((f) => f.sorgente).join(', ') : 'nessuna')
  if (report.fotoEscluse.length) console.log(`Foto escluse (P1_OK «no»): ${report.fotoEscluse.length}, restano in studio/`)
  console.log('Loghi partner:', report.partner.length ? report.partner.join(', ') : 'nessuno (cartella vuota o autorizzazione «no»)')
  console.log('Logo:', report.logo.join(' · ') || 'nessuno')
  console.log('Favicon:', report.favicon.join(', '))
  console.log('og-image:', report.og)
  for (const nota of report.note) console.log('Nota:', nota)
  console.log(`Manifesto: src/content/immagini.json (${voci.length} immagini)`)
}

// ---------- contact sheet: tutte le immagini esportate, con nome e peso ----------

function fileEsportati() {
  const voci = []
  const aggiungi = (cartella, filtro) => {
    if (!existsSync(cartella)) return
    for (const nome of readdirSync(cartella).sort()) {
      const percorso = join(cartella, nome)
      if (statSync(percorso).isFile() && filtro(nome)) voci.push(percorso)
    }
  }
  aggiungi(OUT_IMG, (n) => /\.(avif|webp)$/.test(n))
  aggiungi(OUT_SVG, (n) => n.endsWith('.svg'))
  aggiungi(OUT_PARTNER, (n) => /\.(svg|png)$/.test(n))
  aggiungi(PUBLIC, (n) => /\.(svg|png|ico|jpg)$/.test(n))
  return voci
}

async function contactSheet(d) {
  const voci = fileEsportati()
  const html = `<!doctype html><html lang="it"><meta charset="utf-8"><style>
    body{margin:0;padding:32px;background:#EDECE8;font:14px/1.35 system-ui,sans-serif;color:#1F2326}
    h1{font-size:20px;margin:0 0 4px} p{margin:0 0 20px;color:#595E62}
    .g{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    figure{margin:0;background:#F8F7F5;border:1px solid #D3D1CC;border-radius:8px;overflow:hidden}
    .i{height:200px;display:grid;place-items:center;padding:12px;background-image:linear-gradient(45deg,#e4e2dd 25%,transparent 25%,transparent 75%,#e4e2dd 75%),linear-gradient(45deg,#e4e2dd 25%,transparent 25%,transparent 75%,#e4e2dd 75%);background-size:16px 16px;background-position:0 0,8px 8px}
    .i img{max-width:100%;max-height:176px;min-height:96px;object-fit:contain}
    figcaption{padding:8px 10px;border-top:1px solid #D3D1CC}
    figcaption b{display:block;font-weight:600;word-break:break-all} figcaption span{color:#595E62}
  </style>
  <h1>${d.BRAND} · contact sheet dello step 2</h1>
  <p>${voci.length} file esportati · ${new Date().toISOString().slice(0, 10)} · fondo a scacchi = trasparenza</p>
  <div class="g">${voci
    .map((p) => {
      const info = `${(statSync(p).size / 1024).toFixed(1)} kB`
      // data URI: una pagina creata con setContent non può leggere file locali
      const tipo = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp', '.avif': 'image/avif' }[extname(p)]
      const src = `data:${tipo};base64,${readFileSync(p).toString('base64')}`
      return `<figure><div class="i"><img src="${src}"></div><figcaption><b>${relative(ROOT, p)}</b><span>${info}</span></figcaption></figure>`
    })
    .join('')}</div></html>`

  try {
    const { chromium } = await import('playwright')
    const browser = await chromium.launch()
    const pagina = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 })
    await pagina.setContent(html, { waitUntil: 'load' })
    await pagina.screenshot({ path: CONTACT_SHEET, fullPage: true, type: 'jpeg', quality: 82 })
    await browser.close()
    console.log(`Contact sheet: ${relative(ROOT, CONTACT_SHEET)} (${voci.length} file)`)
  } catch (err) {
    console.log(`Contact sheet non creato: browser non disponibile (${String(err.message).split('\n')[0]})`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
