import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

// Testi usati solo dalle pagine statiche generate al build (privacy, cookie, grazie, 404: vedi src/entry-server.tsx).
// Restano in src/content/testi.json (§3.6), ma il JavaScript della landing non li porta: niente informativa
// e niente link a facebook.com nel bundle iniziale (§9; il controllo «Meta solo da bd-traccia» lo verifica).
const TESTI_SOLO_PAGINE = ['pagine', 'privacy', 'cookie', 'grazie', 'pagina404']

function bdTestiSoloLanding(): Plugin {
  return {
    name: 'bd-testi-solo-landing',
    enforce: 'pre',
    transform(codice, id, opzioni) {
      if (opzioni?.ssr || !id.replaceAll('\\', '/').endsWith('/src/content/testi.json')) return null
      const testi = JSON.parse(codice) as Record<string, unknown>
      for (const chiave of TESTI_SOLO_PAGINE) delete testi[chiave]
      return { code: JSON.stringify(testi), map: null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [bdTestiSoloLanding(), react(), tailwindcss()],
  build: {
    target: 'es2020',
  },
})
