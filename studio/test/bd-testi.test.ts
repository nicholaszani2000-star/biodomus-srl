// Test di bd-testi.ts (step 1): segnaposti risolti da dati.ts, null per i dati vuoti, errori per i segnaposti inesistenti.
// Avvio: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { riempi, risolvi, t, tl, tt } from '../../src/content/bd-testi.ts'
import { dati, euro, fasceBudget, contatti } from '../../src/content/dati.ts'

test('sostituisce i dati di §2', () => {
  assert.equal(risolvi('Ciao da {BRAND}'), `Ciao da ${dati.BRAND}`)
  assert.equal(t('hero.occhiello'), `Costruzione di case in ${dati.ZONA}`)
})

test('formatta il budget in euro con il formato italiano', () => {
  assert.equal(euro(250_000), '250.000 €')
  assert.equal(risolvi('da {BUDGET_MIN}'), 'da 250.000 €')
  assert.equal(fasceBudget()[1].etichetta, 'Da 250.000 € a 350.000 €')
})

test('un dato vuoto rende null tutto il testo', () => {
  assert.equal(dati.GARANZIA, null)
  assert.equal(risolvi('Garanzia: {GARANZIA}'), null)
  assert.equal(t('sistema.fatti.garanzia'), null)
})

test('un testo che inizia con un dato inizia con la maiuscola', () => {
  const risposta = t('faq.voci.6.risposta')
  assert.ok(risposta?.startsWith('Provincia di Varese'))
})

test('i segnaposti minuscoli restano per il runtime', () => {
  assert.equal(risolvi('{mq} m²'), '{mq} m²')
  assert.equal(riempi('{mq} m²', { mq: 282 }), '282 m²')
})

test('un segnaposto inesistente fa fallire', () => {
  assert.throws(() => risolvi('{NON_ESISTE}'), /Segnaposto sconosciuto/)
  assert.throws(() => t('hero.non.esiste'), /Testo non trovato/)
})

test('tt e tl', () => {
  assert.equal(tt('header.cta'), 'Richiedi un preventivo')
  assert.deepEqual(tl('ruolo.colonne.2.voci'), ['Decidi', 'Firmi', 'Entri in casa'])
})

test('contatti generati da TELEFONO', () => {
  const c = contatti()
  assert.ok(c)
  assert.equal(c.tel, 'tel:+393492391107')
  assert.equal(c.whatsapp, 'https://wa.me/393492391107')
})

test('niente punto doppio quando il dato finisce con il punto (step 6: «S.r.l.»)', () => {
  // COSTO_SERVIZIO finisce con il punto: il punto del testo non si ripete
  const costo = risolvi('{COSTO_SERVIZIO}.')
  assert.ok(costo?.endsWith('definiti.') && !costo.endsWith('..'))
  // un dato che non finisce con il punto lo tiene
  assert.equal(risolvi('Zona: {ZONA}.'), `Zona: ${dati.ZONA}.`)
})
