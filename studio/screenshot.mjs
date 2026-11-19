// Screenshot dell'anteprima (CLAUDE.md §13): 390 × 844 e 1440 × 900 per ogni angolo (?a=famiglia, terreno, investo).
// Se l'anteprima non è già avviata, la avvia da solo e la chiude alla fine.
// Browser, in ordine: Chromium di Playwright (PLAYWRIGHT_BROWSERS_PATH), Chromium o Chrome di sistema; senza browser salta.
// Controlla: errori di console, scroll orizzontale a 390 px, variante giusta del titolo per angolo.
// Screenshot in studio/report/screenshot/ (escluso da git), riepilogo in studio/report/screenshot/riepilogo.json.

import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const USCITA = join(ROOT, 'studio', 'report', 'screenshot')
const PORTA = Number(process.env.PORTA ?? 4321)
const BASE = `http://localhost:${PORTA}`
const ANGOLI = ['famiglia', 'terreno', 'investo']
const VISTE = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'desktop', width: 1440, height: 900 },
]

mkdirSync(USCITA, { recursive: true })

async function anteprimaAttiva() {
  try {
    return (await fetch(`${BASE}/`)).ok
  } catch {
    return false
  }
}

let server = null
if (!(await anteprimaAttiva())) {
  const tsx = createRequire(import.meta.url).resolve('tsx/cli')
  server = spawn(process.execPath, [tsx, join(ROOT, 'studio', 'anteprima-server.mts')], {
    cwd: ROOT,
    env: { ...process.env, PORTA: String(PORTA) },
    stdio: 'ignore',
  })
  for (let i = 0; i < 50 && !(await anteprimaAttiva()); i++) await new Promise((r) => setTimeout(r, 200))
  if (!(await anteprimaAttiva())) {
    server.kill()
    console.error('KO  anteprima — il server non è partito su', BASE)
    process.exit(1)
  }
}

async function apriBrowser() {
  try {
    return { browser: await chromium.launch(), origine: 'Chromium di Playwright' }
  } catch {
    for (const nome of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
      try {
        const percorso = execSync(`command -v ${nome}`, { encoding: 'utf8' }).trim()
        if (percorso) return { browser: await chromium.launch({ executablePath: percorso }), origine: percorso }
      } catch {
        // prova il prossimo
      }
    }
  }
  return { browser: null, origine: null }
}

const { browser, origine } = await apriBrowser()
if (!browser) {
  console.log('SALTATO  screenshot — nessun browser disponibile nell\'ambiente (scritto nel report)')
  server?.kill()
  process.exit(0)
}

const risultati = []
const esito = (ok, nome, nota) => {
  risultati.push({ ok, nome, nota })
  console.log(`${ok ? 'OK' : 'KO'}  ${nome} — ${nota}`)
}

for (const vista of VISTE) {
  for (const angolo of ANGOLI) {
    const pagina = await browser.newPage({ viewport: { width: vista.width, height: vista.height } })
    const errori = []
    pagina.on('console', (m) => {
      if (m.type() === 'error') errori.push(m.text())
    })
    pagina.on('pageerror', (e) => errori.push(e.message))
    await pagina.goto(`${BASE}/?a=${angolo}`, { waitUntil: 'networkidle' })
    await pagina.waitForTimeout(400)

    const stato = await pagina.evaluate(() => {
      const visibile = (el) => !!el && getComputedStyle(el).display !== 'none'
      const varianti = [...document.querySelectorAll('h1 .bd-v')].filter(visibile).map((el) => el.className)
      return {
        larghezza: document.documentElement.scrollWidth,
        varianti,
        h1: document.querySelectorAll('h1').length,
      }
    })

    const etichetta = `${angolo} ${vista.width}px`
    esito(errori.length === 0, `console ${etichetta}`, errori.length ? errori.join(' | ') : 'nessun errore')
    esito(
      stato.varianti.length === 1 && stato.varianti[0].includes(`bd-v-${angolo}`),
      `variante ${etichetta}`,
      `visibile: ${stato.varianti.join(', ') || 'nessuna'}`,
    )
    if (vista.width === 390) {
      esito(stato.larghezza <= 390, `scroll orizzontale ${etichetta}`, `larghezza documento ${stato.larghezza} px`)
    }

    // Step 2: nell'header il logo impilato alto 44 px fino a 1023 px, l'orizzontale alto 34 px da 1024 px.
    if (angolo === 'famiglia') {
      const logo = await pagina.evaluate(() => {
        const img = document.querySelector('.bd-logo--header img')
        const footer = document.querySelector('img.bd-logo--footer')
        if (!img) return null
        return {
          file: img.currentSrc.split('/').pop(),
          altezza: Math.round(img.getBoundingClientRect().height),
          caricato: img.complete && img.naturalWidth > 0,
          altezzaFooter: footer ? Math.round(footer.getBoundingClientRect().height) : 0,
        }
      })
      const atteso = vista.width >= 1024 ? { file: /^bd-logo-orizzontale-/, altezza: 34 } : { file: /^bd-logo-(?!orizzontale)/, altezza: 44 }
      const ok = !!logo && logo.caricato && atteso.file.test(logo.file) && logo.altezza === atteso.altezza && logo.altezzaFooter === 48
      esito(
        ok,
        `logo nell'header e nel footer ${vista.width}px`,
        logo ? `${logo.file} alto ${logo.altezza} px${logo.caricato ? '' : ' (non caricato)'}, footer ${logo.altezzaFooter} px` : 'logo non trovato',
      )
    }

    // §5: una sola CTA primaria per schermata, al caricamento e scorrendo tutta la pagina.
    const affollate = await pagina.evaluate(async () => {
      const visibiliNelloSchermo = () =>
        [...document.querySelectorAll('.bd-cta--primaria')].filter((el) => {
          if (el.closest('[hidden]')) return false
          const stile = getComputedStyle(el)
          if (stile.display === 'none' || stile.visibility === 'hidden' || Number(stile.opacity) === 0) return false
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
        }).length
      const problemi = []
      const altezza = document.documentElement.scrollHeight
      for (let y = 0; y < altezza; y += Math.round(window.innerHeight * 0.75)) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
        const n = visibiliNelloSchermo()
        if (n > 1) problemi.push(`${n} a ${Math.round(window.scrollY)} px`)
      }
      window.scrollTo(0, 0)
      await new Promise((r) => setTimeout(r, 120))
      return problemi
    })
    esito(affollate.length === 0, `una CTA primaria per schermata ${etichetta}`, affollate.length ? affollate.join(', ') : 'mai più di una')

    await pagina.screenshot({ path: join(USCITA, `${angolo}-${vista.width}.png`) })
    if (angolo === 'famiglia') await pagina.screenshot({ path: join(USCITA, `pagina-intera-${vista.width}.png`), fullPage: true })
    await pagina.close()
  }
}

// Riduzione del movimento: la pagina resta leggibile e senza errori.
{
  const contesto = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const pagina = await contesto.newPage()
  const errori = []
  pagina.on('pageerror', (e) => errori.push(e.message))
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const lenis = await pagina.evaluate(() => document.documentElement.classList.contains('lenis'))
  esito(!lenis && errori.length === 0, 'riduzione del movimento', lenis ? 'Lenis attivo anche con reduce' : 'niente Lenis, nessun errore')
  await contesto.close()
}

await browser.close()
server?.kill()

const ko = risultati.filter((r) => !r.ok).length
writeFileSync(join(USCITA, 'riepilogo.json'), JSON.stringify({ browser: origine, data: new Date().toISOString(), risultati }, null, 2))
console.log(`\nBrowser: ${origine}. ${risultati.length - ko} OK, ${ko} KO. Screenshot in studio/report/screenshot/`)
process.exit(ko ? 1 : 0)
