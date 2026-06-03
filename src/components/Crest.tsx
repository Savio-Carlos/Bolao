// Escudo-figurinha: a imagem real do time dentro do círculo "almanaque"
// (borda + anel de papel). Mantém os tamanhos .crest / .crest.sm / .crest.xs.

export function Crest({
  src,
  alt = "",
  size,
}: {
  src: string | null | undefined;
  alt?: string;
  size?: "sm" | "xs";
}) {
  const cls = `crest${size ? ` ${size}` : ""}${src ? "" : " blank"}`;
  return (
    <span className={cls} aria-hidden={alt === "" ? true : undefined}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} />
      ) : null}
    </span>
  );
}

export default Crest;
