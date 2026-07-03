import MobilePdfFallback from './MobilePdfFallback'

interface PdfEmbedProps {
  src: string
  title: string
}

export default function PdfEmbed({ src, title }: PdfEmbedProps) {
  return (
    <>
      <MobilePdfFallback src={src} />
      <div style={{ margin: 0, height: '100dvh', width: '100%', overflow: 'hidden' }}>
        <iframe
          src={src}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={title}
        />
      </div>
    </>
  )
}
