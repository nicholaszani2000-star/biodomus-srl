// SVG inline: i disegni di studio/svg/genera-svg.mjs importati con ?raw e inseriti nell'HTML,
// così le variabili dei token (colori, --bd-dettaglio) valgono anche dentro il disegno.

const attributo = (testo: string) => testo.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Prepara un SVG per l'inserimento inline: via title, id e aria del file, poi classe ed etichetta della pagina. */
export function svgInline(svg: string, { classe = '', etichetta }: { classe?: string; etichetta?: string } = {}): string {
  const accessibile = etichetta ? `role="img" aria-label="${attributo(etichetta)}"` : 'aria-hidden="true" focusable="false"'
  return svg
    .trim()
    .replace(/<title[^>]*>[\s\S]*?<\/title>/, '')
    .replace(/\s(role|aria-label|aria-labelledby)="[^"]*"/g, '')
    .replace('<svg ', `<svg class="${attributo(classe)}" ${accessibile} `)
}

