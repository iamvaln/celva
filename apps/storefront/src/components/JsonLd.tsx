/**
 * Renders a schema.org JSON-LD <script>. We escape `<` so a stray
 * "</script>" inside any string field can't break out of the tag.
 */
export const JsonLd = ({ data }: { data: Record<string, unknown> }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, '\\u003c'),
    }}
  />
);
