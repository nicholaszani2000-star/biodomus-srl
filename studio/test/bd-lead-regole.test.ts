// Test delle regole del modulo (src/lib/bd-lead-regole.ts), le stesse per pagina e funzione:
// validazione, honeypot, tempo minimo, normalizzazione di email, telefono e testo, mascheramento.
// Avvio: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BUDGET,
  PROFILI,
  TEMPISTICHE,
  TERRENI,
  emailValida,
  honeypotPieno,
  mascheraEmail,
  mascheraTelefono,
  normalizza,
  normalizzaEmail,
  normalizzaTelefono,
  passoDi,
  telefonoValido,
  testoPulito,
  troppoVeloce,
  valida,
  type DatiModulo,
} from '../../src/lib/bd-lead-regole.ts'

const valido: DatiModulo = {
  profilo: 'casa',
  terreno: 'si',
  comune: 'Gallarate',
  budget: 'fascia-1',
  tempistica: '6-12',
  nome: 'Mario Rossi',
  email: 'mario.rossi@esempio.it',
  telefono: '349 123 4567',
  messaggio: 'Villa di 180 m²',
}

test('le scelte ammesse vengono da testi.json e da BUDGET_MIN', () => {
  assert.deepEqual([...PROFILI], ['casa', 'investimento', 'altro'])
  assert.deepEqual([...TERRENI], ['si', 'cerco', 'no'])
  assert.deepEqual([...TEMPISTICHE], ['entro-6', '6-12', 'oltre-12', 'valuto'])
  assert.deepEqual([...BUDGET], ['sotto-minimo', 'fascia-1', 'fascia-2', 'oltre', 'non-so'])
})

test('validazione: un modulo completo non ha errori', () => {
  assert.deepEqual(valida(valido), {})
})

test('validazione: modulo vuoto, un errore per ogni campo obbligatorio', () => {
  assert.deepEqual(valida({}), {
    profilo: 'scelta',
    terreno: 'scelta',
    comune: 'comune',
    budget: 'scelta',
    tempistica: 'scelta',
    nome: 'nome',
    email: 'email',
  })
})

test('validazione per passaggio: solo i campi di quel passaggio', () => {
  assert.deepEqual(valida({ profilo: 'casa' }, 1), { terreno: 'scelta' })
  assert.deepEqual(valida({ comune: 'G' }, 2), { comune: 'comune', budget: 'scelta', tempistica: 'scelta' })
  assert.deepEqual(valida({ nome: 'Mario Rossi', email: 'mario@esempio.it', telefono: '12345' }, 3), { telefono: 'telefono' })
  assert.equal(passoDi('terreno'), 1)
  assert.equal(passoDi('budget'), 2)
  assert.equal(passoDi('email'), 3)
})

test('validazione: valori fuori elenco, nome senza lettere, email incompleta', () => {
  const errori = valida({ ...valido, profilo: 'villa', budget: '1000000', nome: '12', email: 'mario@esempio' })
  assert.deepEqual(errori, { profilo: 'scelta', budget: 'scelta', nome: 'nome', email: 'email' })
})

test('email: forme valide e non valide', () => {
  for (const e of ['a@b.it', 'nome.cognome+casa@dominio.co.uk', ' MARIO@ESEMPIO.IT ']) assert.ok(emailValida(e), e)
  for (const e of ['', 'mario', 'mario@', '@esempio.it', 'mario@esempio', 'mario rossi@esempio.it', `${'a'.repeat(250)}@b.it`]) {
    assert.ok(!emailValida(e), e)
  }
})

test('telefono: facoltativo, almeno 9 cifre, solo caratteri da telefono', () => {
  assert.ok(telefonoValido(''))
  assert.ok(telefonoValido('349 123 456'))
  assert.ok(telefonoValido('+39 (349) 123-4567'))
  assert.ok(!telefonoValido('12345678'), '8 cifre')
  assert.ok(!telefonoValido('349 abc 4567'), 'lettere')
  assert.ok(!telefonoValido('1234567890123456'), '16 cifre')
})

test('honeypot: pieno se il campo sito_web ha un valore', () => {
  assert.ok(!honeypotPieno({}))
  assert.ok(!honeypotPieno({ sito_web: '  ' }))
  assert.ok(honeypotPieno({ sito_web: 'https://spam.example' }))
})

test('tempo minimo: meno di 3 secondi è troppo veloce; senza avviato_il il controllo si salta', () => {
  const adesso = 1_800_000_000_000
  assert.ok(troppoVeloce({ avviato_il: String(adesso - 1000) }, adesso))
  assert.ok(troppoVeloce({ avviato_il: String(adesso - 2999) }, adesso))
  assert.ok(!troppoVeloce({ avviato_il: String(adesso - 3000) }, adesso))
  assert.ok(!troppoVeloce({ avviato_il: String(adesso - 60_000) }, adesso))
  assert.ok(!troppoVeloce({}, adesso), 'invio senza JavaScript')
  assert.ok(!troppoVeloce({ avviato_il: '' }, adesso))
  assert.ok(!troppoVeloce({ avviato_il: 'abc' }, adesso))
})

test('normalizzazione del telefono: solo cifre, +39 se manca il prefisso', () => {
  assert.equal(normalizzaTelefono('349 123 4567'), '+393491234567')
  assert.equal(normalizzaTelefono('349.123.45.67'), '+393491234567')
  assert.equal(normalizzaTelefono('+39 349 123 4567'), '+393491234567')
  assert.equal(normalizzaTelefono('0039 349 123 4567'), '+393491234567')
  assert.equal(normalizzaTelefono('+41 79 123 45 67'), '+41791234567')
  assert.equal(normalizzaTelefono(''), '')
})

test('normalizzazione: email in minuscolo, testo senza HTML', () => {
  assert.equal(normalizzaEmail('  Mario.Rossi@Esempio.IT '), 'mario.rossi@esempio.it')
  assert.equal(testoPulito('<b>Villa</b> <script>alert(1)</script> &amp; giardino', 100), 'Villa alert(1) giardino')
  assert.equal(testoPulito('a\u0000b\u0007c', 100), 'abc')
  assert.equal(testoPulito('riga 1\n\n\n\nriga 2', 100, true), 'riga 1\n\nriga 2')
  assert.equal(testoPulito('x'.repeat(50), 10).length, 10)
})

test('normalizza: lead pronto per email e database', () => {
  const lead = normalizza(
    { ...valido, email: ' Mario.Rossi@Esempio.IT', angolo: 'terreno', event_id: 'evento-123456', consenso_marketing: 'si', utm_source: '', messaggio: '<i>ciao</i>' },
    'riserva-000000',
  )
  assert.equal(lead.email, 'mario.rossi@esempio.it')
  assert.equal(lead.telefono, '+393491234567')
  assert.equal(lead.angolo, 'terreno')
  assert.equal(lead.event_id, 'evento-123456')
  assert.equal(lead.consenso_marketing, true)
  assert.equal(lead.utm_source, null)
  assert.equal(lead.messaggio, 'ciao')

  const senzaExtra = normalizza({ ...valido, telefono: '', angolo: 'sconosciuto', event_id: '<x>' }, 'riserva-000000')
  assert.equal(senzaExtra.telefono, null)
  assert.equal(senzaExtra.angolo, 'famiglia')
  assert.equal(senzaExtra.event_id, 'riserva-000000')
  assert.equal(senzaExtra.consenso_marketing, false)
})

test('mascheramento di email e telefono per log e file di prova', () => {
  assert.equal(mascheraEmail('mario.rossi@esempio.it'), 'm***@e***.it')
  assert.equal(mascheraTelefono('+393491234567'), '+39********67')
  assert.equal(mascheraTelefono(null), null)
})
