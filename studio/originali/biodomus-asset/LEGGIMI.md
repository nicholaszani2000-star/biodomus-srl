# Biodomus · immagini pronte per il sito

Kit del 17 novembre 2026, ricavato dalle quattro immagini ricevute (in `originali/`, intatte).
Va caricato in `studio/originali/` del repository, sul branch `lavoro`. Lo step 2 lo usa così com'è.

## In breve

- **Sul sito vanno 8 file:** il logo positivo (impilato e orizzontale), le favicon e `og-image.jpg`. Il campo `sul_sito` di `manifesto.json` li segna.
- **Logo senza payoff.** Il payoff «COSTRUZIONI • CASE SU MISURA» non c'è, perché Biodomus non esegue lavori (CLAUDE.md §10.2) e quella parola direbbe il contrario. Le versioni con payoff restano solo in `logo/3d/` come originale ripulito: non usarle né sul sito né nelle inserzioni.
- **Il verde resta dentro il logo.** Non diventa un colore dell'interfaccia: l'accento del sito resta l'antracite (§5).
- **Le illustrazioni sono immagini generate con l'AI.** Le ho ripulite di scritte, loghi e insegna. In pagina possono andare solo con la dicitura «Illustrazione» (§10.9) e mai presentate come case costruite (§3.7). Il brief oggi non le prevede: lo step 2 le lascia qui finché non si decide diversamente.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `logo/svg/` | Vettoriali. `biodomus-logo-*` (impilato), `biodomus-logo-orizzontale-*`, `biodomus-marchio-*` (solo la casa), `biodomus-scritta-*` (solo la scritta). Ognuno in `positivo` (fondi chiari), `negativo` (fondi scuri), `mono-scuro` e `mono-chiaro`. In più `biodomus-logo-3d.svg` e `biodomus-marchio-3d.svg`, solo per fondi scuri. |
| `logo/png/` | PNG trasparenti per documenti, email e social, più il 3D in WebP. |
| `logo/3d/` | L'originale 3D ripulito: su nero oppure trasparente (solo fondi scuri), con e senza payoff, più AVIF e WebP per il web. |
| `favicon/` | `favicon.svg`, `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180), `icona-512.png`, `icona-512-maskable.png`. |
| `condivisione/` | `og-image.jpg` (1200 × 630, quella da usare), `og-image-scuro.jpg`, `profilo-social.jpg` e `profilo-social-3d.jpg` (1080 × 1080, per le foto profilo Facebook e Instagram). |
| `illustrazioni/` | Ritagli senza testo in AVIF, WebP e JPG, già nei pesi di §9. |
| `originali/` | Le quattro immagini ricevute, intatte. |
| `anteprima.jpg` | Tutto il kit in una pagina. |
| `manifesto.json` | Ogni file con uso, fondo, misure, peso e indicazione se va sul sito. |

## Colori del logo

| Versione | Grigio | Verde | Note |
|---|---|---|---|
| positivo | `#1F2326` | `#4F8F17` | Il verde ha contrasto 3,4:1 sul fondo `#EDECE8`. |
| negativo | `#ECEBE8` | `#8DC21E` | È il lime dell'originale: su fondo chiaro arriva a 1,8:1 e non si legge. |

## Uso sul sito

- **Header:**
  - fino a 1023 px: `biodomus-logo-positivo.svg` alto 44 px;
  - da 1024 px: `biodomus-logo-orizzontale-positivo.svg` alto 34 px.

  Sempre con `width` e `height` dichiarati e il nome «Biodomus» per gli screen reader.
- **Footer:** `biodomus-logo-positivo.svg` alto 48 px.
- **Testa della pagina:**

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="https://biodomussrls.it/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

- **Effetto 3D sul sito (facoltativo):** il logo 3D funziona solo su fondo scuro. Sulle pagine chiare l'effetto si ottiene meglio con il movimento. Per esempio una leggera inclinazione in prospettiva del logo o di una card al passaggio del mouse (CSS `perspective` con GSAP, niente WebGL), disattivata con `prefers-reduced-motion`.

## Cosa ho cambiato rispetto agli originali

- **Logo, sfondo:** il PNG aveva un canale di trasparenza rovinato. La sagoma bianca, sfocata e a quadretti che si vede dietro al logo non era nel disegno: era la trasparenza sbagliata. L'ho tolta.
- **Logo, versione vettoriale:**
  - la casa è ridisegnata sulle misure dell'originale;
  - la scritta usa Michroma (SIL Open Font License 1.1), ingrassata e allargata come l'originale;
  - la S ha i terminali orizzontali, come nell'originale.
- **3D:**
  - versione vettoriale nuova con estrusione, smusso e alone caldo, nitida a ogni misura;
  - originale ripulito, con lo sfondo nero pieno oppure trasparente.
- **Illustrazioni:** ho tagliato le scritte, il logo, l'insegna «BIODOMUS COSTRUZIONI», l'elmetto e le icone con la foglia. Ho rimosso tutti i metadati.

## Cosa non usare, e perché

Nelle immagini originali, così come sono:

| Elemento | Perché no |
|---|---|
| «Realizziamo», «Costruiamo», «Ti consegniamo», «ci occupiamo di tutto» | Biodomus non costruisce: il contratto si firma con l'impresa (§0, §10.2). |
| «sostenibili», «Sostenibilità», «Bioedilizia», le icone a foglia | Sono asserzioni ambientali generiche, vietate (§3.13). |
| «Massima affidabilità» | È un superlativo vuoto (§8). |
| «Richiedi una consulenza» | La CTA del sito è «Richiedi un preventivo» (§8). |
| il payoff «COSTRUZIONI» | Vedi sopra. |
| il pannello 3 del percorso | I muri sono in laterizio, non in casseri isolanti. Non descrive il sistema di §2. |
| «tende forma» | È un refuso dell'immagine originale: va «prende forma». |

Queste regole valgono anche per le inserzioni su Instagram e Facebook, che sono comunicazioni commerciali come la pagina.
