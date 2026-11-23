// Screenshot dell'anteprima (CLAUDE.md §13): 390 × 844 e 1440 × 900 per ogni angolo (?a=famiglia, terreno, investo).
// Se l'anteprima non è già avviata, la avvia da solo e la chiude alla fine.
// Browser, in ordine: Chromium di Playwright (PLAYWRIGHT_BROWSERS_PATH), Chromium o Chrome di sistema; senza browser salta.
// Controlla: errori di console, scroll orizzontale a 390 px, variante giusta del titolo per angolo, primo schermo,
// logo e tema dell'header, la parete che si ricompone scorrendo, la barra mobile, una sola CTA primaria per schermata,
// la riduzione del movimento a 390 e 1440 px.
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
    // CLS del caricamento (§9 ≤ 0,05): somma dei layout-shift senza input recente, dall'inizio della pagina
    await pagina.addInitScript(() => {
      window.__bdCls = 0
      try {
        new PerformanceObserver((lista) => {
          for (const voce of lista.getEntries()) if (!voce.hadRecentInput) window.__bdCls += voce.value
        }).observe({ type: 'layout-shift', buffered: true })
      } catch {
        window.__bdCls = -1
      }
    })
    await pagina.goto(`${BASE}/?a=${angolo}`, { waitUntil: 'networkidle' })
    // Da 1024 px il titolo si rivela per righe (bd-rivela): si aspetta la fine prima della foto del primo schermo
    await pagina.waitForFunction(() => !document.documentElement.classList.contains('bd-rivela'), null, { timeout: 4000 }).catch(() => {})
    await pagina.waitForTimeout(1000)
    // Primo schermo com'è all'apertura, prima di scorrere
    await pagina.screenshot({ path: join(USCITA, `${angolo}-${vista.width}.png`) })

    const stato = await pagina.evaluate(() => {
      const visibile = (el) => !!el && getComputedStyle(el).display !== 'none'
      const varianti = [...document.querySelectorAll('h1 .bd-v')].filter(visibile).map((el) => el.className)
      const titolo = document.querySelector('h1')
      const cta = document.querySelector('#inizio .bd-cta--primaria')
      // Contrasto WCAG tra testo e fondo della CTA primaria dell'hero
      const rgb = (c) => {
        let m = c.match(/^rgba?\(([^)]+)\)/)
        if (m) return m[1].split(/[\s,/]+/).slice(0, 3).map(Number)
        m = c.match(/^color\(srgb ([^)]+)\)/)
        return m ? m[1].split(/[\s/]+/).slice(0, 3).map((v) => Number(v) * 255) : null
      }
      const luce = (c) => {
        const v = rgb(c)
        if (!v) return null
        const [r, g, b] = v.map((x) => x / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const stileCta = cta ? getComputedStyle(cta) : null
      const l1 = stileCta ? luce(stileCta.color) : null
      const l2 = stileCta ? luce(stileCta.backgroundColor) : null
      return {
        cls: Math.round((window.__bdCls ?? -1) * 1000) / 1000,
        contrastoCta: l1 !== null && l2 !== null ? Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 10) / 10 : null,
        larghezza: document.documentElement.scrollWidth,
        varianti,
        h1: document.querySelectorAll('h1').length,
        titoloFine: titolo ? Math.round(titolo.getBoundingClientRect().bottom) : null,
        titoloOpacita: titolo ? Number(getComputedStyle(titolo).opacity) : 0,
        ctaFine: cta ? Math.round(cta.getBoundingClientRect().bottom) : null,
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
    esito(stato.cls >= 0 && stato.cls <= 0.05, `CLS al caricamento ${etichetta}`, `${stato.cls} (massimo 0,05)`)
    esito(stato.contrastoCta !== null && stato.contrastoCta >= 4.5, `contrasto della CTA primaria ${etichetta}`, `${stato.contrastoCta}:1 (minimo 4,5:1)`)
    // §6.2: in un solo schermo chi sei, per chi, cosa fare — titolo e CTA primaria visibili senza scorrere
    esito(
      stato.ctaFine !== null && stato.ctaFine <= vista.height && stato.titoloOpacita === 1,
      `primo schermo ${etichetta}`,
      `titolo fino a ${stato.titoloFine} px (opacità ${stato.titoloOpacita}), CTA primaria fino a ${stato.ctaFine} px su ${vista.height}`,
    )

    // Step 2 e 4: nell'header il logo impilato alto 44 px fino a 1023 px, l'orizzontale alto 34 px da 1024 px;
    // con STILE «Misto» negativo sopra l'hero (header scuro), positivo dopo (header chiaro).
    const leggiHeader = () =>
      pagina.evaluate(() => {
        const header = document.querySelector('.bd-header')
        const loghi = [...header.querySelectorAll('.bd-logo--header')]
        const visibile = loghi.find((l) => Number(getComputedStyle(l).opacity) > 0.5) ?? loghi[0]
        const img = visibile?.querySelector('img')
        const footer = document.querySelector('img.bd-logo--footer')
        return {
          tema: header.dataset.bdTema ?? 'unico',
          file: img ? img.currentSrc.split('/').pop() : '?',
          altezza: img ? Math.round(img.getBoundingClientRect().height) : 0,
          caricato: !!img && img.complete && img.naturalWidth > 0,
          altezzaFooter: footer ? Math.round(footer.getBoundingClientRect().height) : 0,
        }
      })
    const logoAtteso = (tema) =>
      new RegExp(`^bd-logo-${vista.width >= 1024 ? 'orizzontale-' : ''}${tema === 'scuro' ? 'negativo-' : ''}[A-Za-z0-9_-]{8}\\.svg$`)
    const altezzaLogo = vista.width >= 1024 ? 34 : 44

    if (angolo === 'famiglia') {
      const logo = await leggiHeader()
      const ok = logo.caricato && logoAtteso(logo.tema).test(logo.file) && logo.altezza === altezzaLogo && logo.altezzaFooter === 48
      esito(
        ok && logo.tema !== 'chiaro',
        `logo nell'header e nel footer ${vista.width}px`,
        `header ${logo.tema}: ${logo.file} alto ${logo.altezza} px${logo.caricato ? '' : ' (non caricato)'}, footer ${logo.altezzaFooter} px`,
      )

      // Step 4: giro della pagina. Parete esplosa all'apertura e ricomposta scorrendo; header chiaro dopo l'hero;
      // su mobile la barra compare dopo l'hero e sparisce sul modulo.
      const leggiStato = () =>
        pagina.evaluate(() => {
          const svg = document.querySelector('#inizio [data-bd-parete] svg')
          const barra = document.querySelector('.bd-barra-mobile')
          const esplodi = parseFloat(svg ? getComputedStyle(svg).getPropertyValue('--bd-esplodi') : '')
          const stileBarra = barra ? getComputedStyle(barra) : null
          return {
            esplodi: Number.isNaN(esplodi) ? 1 : Math.round(esplodi * 100) / 100,
            barra: !!stileBarra && stileBarra.display !== 'none' && stileBarra.visibility === 'visible',
          }
        })
      const scorriA = async (calcola, ms) => {
        await pagina.evaluate(calcola)
        await pagina.waitForTimeout(ms)
      }
      const mobile = vista.width < 768

      const apertura = await leggiStato()

      // §5: --bd-dettaglio (rovere sul chiaro, lime sullo scuro) mai come colore di un testo visibile
      const testiDettaglio = await pagina.evaluate(() => {
        const esa = (h) => {
          const m = h.trim().match(/^#([0-9a-f]{6})$/i)
          return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(', ') : null
        }
        const trovati = []
        const giro = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        for (let nodo = giro.nextNode(); nodo; nodo = giro.nextNode()) {
          const el = nodo.parentElement
          if (!el || !nodo.textContent.trim() || el.closest('svg, script, style, noscript')) continue
          if (!el.getClientRects().length) continue
          const stile = getComputedStyle(el)
          if (stile.visibility !== 'visible') continue
          const dettaglio = esa(stile.getPropertyValue('--bd-dettaglio'))
          if (dettaglio && stile.color === `rgb(${dettaglio})`) trovati.push(`${el.tagName.toLowerCase()}.${el.className}: «${nodo.textContent.trim().slice(0, 30)}»`)
        }
        return trovati
      })
      esito(
        testiDettaglio.length === 0,
        `colore dei dettagli mai sui testi ${vista.width}px`,
        testiDettaglio.length ? testiDettaglio.slice(0, 4).join(' · ') : 'nessun testo visibile in --bd-dettaglio',
      )
      await scorriA(() => {
        const parete = document.querySelector('#inizio [data-bd-parete]')
        const r = parete.getBoundingClientRect()
        window.scrollTo(0, Math.max(320, window.scrollY + r.top + r.height / 2 - window.innerHeight * 0.25))
      }, 1300)
      const ricomposta = await leggiStato()
      await pagina.screenshot({ path: join(USCITA, `parete-composta-${vista.width}.png`) })
      esito(
        apertura.esplodi >= 0.95 && ricomposta.esplodi <= 0.05,
        `parete che si ricompone scorrendo ${vista.width}px`,
        `--bd-esplodi ${apertura.esplodi} all'apertura, ${ricomposta.esplodi} con il disegno al 25% dello schermo`,
      )

      // Il prompt dello step 4 chiede la barra visibile dopo 900 px di scorrimento a 390 × 844
      await scorriA(() => window.scrollTo(0, 900), 600)
      const a900 = await leggiStato()

      await scorriA(() => {
        const header = document.querySelector('.bd-header')
        window.scrollTo(0, window.scrollY + document.getElementById('per-chi').getBoundingClientRect().top - header.offsetHeight)
      }, 600)
      const dopoHero = { ...(await leggiStato()), ...(await leggiHeader()) }
      await pagina.screenshot({ path: join(USCITA, `dopo-hero-${vista.width}.png`) })
      esito(
        dopoHero.tema === 'chiaro' && logoAtteso('chiaro').test(dopoHero.file) && dopoHero.altezza === altezzaLogo,
        `header chiaro dopo l'hero ${vista.width}px`,
        `header ${dopoHero.tema}, logo ${dopoHero.file} alto ${dopoHero.altezza} px`,
      )

      await scorriA(() => {
        window.scrollTo(0, window.scrollY + document.getElementById('preventivo').getBoundingClientRect().top - 120)
      }, 600)
      const sulModulo = await leggiStato()
      esito(
        mobile
          ? !apertura.barra && a900.barra && dopoHero.barra && !sulModulo.barra
          : !apertura.barra && !a900.barra && !dopoHero.barra && !sulModulo.barra,
        `barra mobile ${vista.width}px`,
        `all'apertura ${apertura.barra ? 'visibile' : 'nascosta'}, a 900 px ${a900.barra ? 'visibile' : 'nascosta'}, su «Per chi è» ${dopoHero.barra ? 'visibile' : 'nascosta'}, sul modulo ${sulModulo.barra ? 'visibile' : 'nascosta'}${mobile ? '' : ' (da 768 px non c\'è)'}`,
      )
      await scorriA(() => window.scrollTo(0, 0), 900)

      // Salti istantanei (scroll programmato, ancore): l'header cambia tema anche senza passare per le posizioni intermedie
      await scorriA(() => window.scrollTo(0, document.documentElement.scrollHeight), 500)
      const inFondo = await leggiHeader()
      await scorriA(() => window.scrollTo(0, 0), 500)
      const inCima = await leggiHeader()
      const conAncora = await browser.newPage({ viewport: { width: vista.width, height: vista.height } })
      await conAncora.goto(`${BASE}/?a=famiglia#preventivo`, { waitUntil: 'networkidle' })
      await conAncora.waitForTimeout(500)
      const temaAncora = await conAncora.evaluate(() => document.querySelector('.bd-header').dataset.bdTema)
      await conAncora.close()
      esito(
        inFondo.tema === 'chiaro' && inCima.tema === 'scuro' && temaAncora === 'chiaro',
        `header con i salti di scroll ${vista.width}px`,
        `salto in fondo: ${inFondo.tema}; salto in cima: ${inCima.tema}; pagina aperta su #preventivo: ${temaAncora}`,
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

    if (angolo === 'famiglia') await pagina.screenshot({ path: join(USCITA, `pagina-intera-${vista.width}.png`), fullPage: true })
    await pagina.close()
  }
}

// Senza JavaScript (§3.8): header chiaro con il logo positivo, parete composta con le quote, titolo visibile, barra nascosta.
{
  const contesto = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })
  const pagina = await contesto.newPage()
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  const stato = await pagina.evaluate(() => {
    const header = document.querySelector('.bd-header')
    const positivo = header.querySelector('.bd-logo--positivo')
    const svg = document.querySelector('#inizio [data-bd-parete] svg')
    const strati = [...svg.querySelectorAll('.bd-strato')].map((s) => getComputedStyle(s).transform)
    return {
      js: document.documentElement.classList.contains('bd-js'),
      fondoHeader: getComputedStyle(header).backgroundColor,
      logoPositivo: positivo ? Number(getComputedStyle(positivo).opacity) : 0,
      composta: strati.length === 4 && strati.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)'),
      quote: Number(getComputedStyle(svg.querySelector('[class*="-quote"]')).opacity),
      titolo: Number(getComputedStyle(document.querySelector('h1')).opacity),
      barra: getComputedStyle(document.querySelector('.bd-barra-mobile')).visibility,
    }
  })
  await pagina.locator('#inizio .bd-hero__visuale').screenshot({ path: join(USCITA, 'senza-js-parete-390.png') })
  await pagina.screenshot({ path: join(USCITA, 'senza-js-390.png') })
  const ok = !stato.js && stato.fondoHeader === 'rgb(237, 236, 232)' && stato.logoPositivo === 1 && stato.composta && stato.quote === 1 && stato.titolo === 1 && stato.barra === 'hidden'
  esito(
    ok,
    'senza JavaScript 390px',
    `header ${stato.fondoHeader} con logo positivo ${stato.logoPositivo === 1 ? 'visibile' : 'nascosto'}, parete ${stato.composta ? 'composta' : 'staccata'} con quote a ${stato.quote}, titolo ${stato.titolo}, barra ${stato.barra}`,
  )
  await contesto.close()
}

// Riduzione del movimento: niente Lenis, parete già composta con le quote, titolo subito visibile, nessun errore.
for (const vista of VISTE) {
  const contesto = await browser.newContext({ viewport: { width: vista.width, height: vista.height }, reducedMotion: 'reduce' })
  const pagina = await contesto.newPage()
  const errori = []
  pagina.on('pageerror', (e) => errori.push(e.message))
  await pagina.goto(`${BASE}/`, { waitUntil: 'networkidle' })
  await pagina.waitForTimeout(300)
  const stato = await pagina.evaluate(() => {
    const svg = document.querySelector('#inizio [data-bd-parete] svg')
    const strati = [...(svg?.querySelectorAll('.bd-strato') ?? [])].map((s) => getComputedStyle(s).transform)
    // Il gruppo delle quote ha le classi «<prefisso>-quote <prefisso>-luce»
    const quote = svg?.querySelector('[class*="-quote"]')
    return {
      lenis: document.documentElement.classList.contains('lenis'),
      rivela: document.documentElement.classList.contains('bd-rivela'),
      titolo: Number(getComputedStyle(document.querySelector('h1')).opacity),
      composta: strati.length === 4 && strati.every((t) => t === 'none'),
      quote: quote ? Number(getComputedStyle(quote).opacity) : 0,
    }
  })
  await pagina.screenshot({ path: join(USCITA, `movimento-ridotto-${vista.width}.png`) })
  const ok = !stato.lenis && !stato.rivela && stato.titolo === 1 && stato.composta && stato.quote === 1 && errori.length === 0
  esito(
    ok,
    `riduzione del movimento ${vista.width}px`,
    `${stato.lenis ? 'Lenis attivo' : 'niente Lenis'}, titolo opacità ${stato.titolo}, parete ${stato.composta ? 'già composta' : 'esplosa'}, quote opacità ${stato.quote}${errori.length ? `, errori: ${errori.join(' | ')}` : ''}`,
  )
  await contesto.close()
}

await browser.close()
server?.kill()

const ko = risultati.filter((r) => !r.ok).length
writeFileSync(join(USCITA, 'riepilogo.json'), JSON.stringify({ browser: origine, data: new Date().toISOString(), risultati }, null, 2))
console.log(`\nBrowser: ${origine}. ${risultati.length - ko} OK, ${ko} KO. Screenshot in studio/report/screenshot/`)
process.exit(ko ? 1 : 0)
