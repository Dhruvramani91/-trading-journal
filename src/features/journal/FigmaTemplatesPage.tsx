import { ExternalLink, Eye, Layers } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

const FIGMA_TEMPLATE_URL = 'https://www.figma.com/community/file/1648620874038235248';
const FIGMA_EMBED_URL = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(FIGMA_TEMPLATE_URL)}`;

export function FigmaTemplatesPage() {
  const [previewRequested, setPreviewRequested] = useState(false);

  return <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-5 overflow-hidden sm:h-[calc(100dvh-6.5rem)] md:h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3.5rem)]">
    <PageHeader
      title="Figma templates"
      description="Browse trade image templates and open them in Figma to make your own copy."
    />

    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-3">
            <svg viewBox="0 0 38 57" className="h-6 w-4" aria-hidden="true" focusable="false">
              <path d="M19 28.5c0-5.247 4.253-9.5 9.5-9.5 5.247 0 9.5 4.253 9.5 9.5 0 5.247-4.253 9.5-9.5 9.5-5.247 0-9.5-4.253-9.5-9.5z" fill="#1ABCFE" />
              <path d="M0 47.5C0 42.253 4.253 38 9.5 38H19v9.5c0 5.247-4.253 9.5-9.5 9.5C4.253 57 0 52.747 0 47.5z" fill="#0ACF83" />
              <path d="M19 0v19h9.5c5.247 0 9.5-4.253 9.5-9.5C38 4.253 33.747 0 28.5 0H19z" fill="#FF7262" />
              <path d="M0 9.5C0 14.747 4.253 19 9.5 19H19V0H9.5C4.253 0 0 4.253 0 9.5z" fill="#F24E1E" />
              <path d="M0 28.5C0 33.747 4.253 38 9.5 38H19V19H9.5C4.253 19 0 23.253 0 28.5z" fill="#A259FF" />
            </svg>
          </span>
          <div className="min-w-0">
            <CardTitle level={2} className="truncate">Trade image template</CardTitle>
            <p className="mt-1 text-xs text-fg-muted">Figma Community</p>
          </div>
        </div>
        <Button asChild rightIcon={<ExternalLink className="h-4 w-4" />}>
          <a href={FIGMA_TEMPLATE_URL} target="_blank" rel="noopener noreferrer">Open in Figma</a>
        </Button>
      </CardHeader>
      <CardBody className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-line bg-bg-0">
          {previewRequested ? <iframe
              title="Figma Community trade image template preview"
              src={FIGMA_EMBED_URL}
              className="block h-full w-full"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            /> : <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-bg-2 text-fg-muted" aria-hidden="true"><Eye className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-fg">Preview this community template</p><p className="mt-1 max-w-sm text-xs text-fg-muted">Load the interactive preview from Figma when you’re ready. The preview may take a few seconds to appear.</p></div>
              <Button variant="secondary" leftIcon={<Eye className="h-4 w-4" />} onClick={() => setPreviewRequested(true)}>Load preview</Button>
            </div>}
        </div>
        <p className="flex items-start gap-2 text-xs text-fg-dim">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Use the preview to explore the file. Open it in Figma to duplicate and customize the template. If the preview is unavailable, use the button above.</span>
        </p>
      </CardBody>
    </Card>
  </div>;
}
