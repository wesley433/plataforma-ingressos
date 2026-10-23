import sanitizeHtml from 'sanitize-html';

/**
 * Limpa o HTML da descrição do evento (vem do editor no navegador e não é confiável).
 * Só formatação de texto e links; nada de scripts, estilos, iframes ou imagens externas.
 */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
    },
  }).trim();
}

/** Texto puro (para metadescrição e cards). */
export function plainText(html: string, maxLength = 160): string {
  // fim de bloco vira espaço, senão "<p>show</p><p>incrível</p>" viraria "showincrível"
  const spaced = html.replace(/<\/(p|h2|h3|li|blockquote)>|<br\s*\/?>/gi, ' ');
  const text = sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
