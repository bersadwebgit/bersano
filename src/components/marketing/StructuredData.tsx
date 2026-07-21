import 'server-only';

/**
 * Renders one or more JSON-LD blocks safely.
 * Escapes '<' to neutralize any '</script>' breakout and XSS via stored fields.
 * Server component.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export default function StructuredData({ data }: { data: Record<string, any> | Array<Record<string, any>> }) {
  const blocks = Array.isArray(data) ? data : [data];
  return (
    <>
      {blocks.filter(Boolean).map((block, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(block) }}
        />
      ))}
    </>
  );
}
