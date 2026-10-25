import { ExternalLink, Image, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

const FIGMA_TEMPLATE_URL = 'https://www.figma.com/community/file/1648620874038235248';
const FIGMA_EMBED_URL = `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(FIGMA_TEMPLATE_URL)}`;

export function FigmaTemplatesPage() {
  return <div className="space-y-5">
    <PageHeader
      title="Figma templates"
      description="Browse trade image templates and open them in Figma to make your own copy."
    />

    <Card className="overflow-hidden">
      <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-3 text-accent"><Image className="h-5 w-5" /></span>
          <div className="min-w-0">
            <CardTitle className="truncate">Trade image template</CardTitle>
            <p className="mt-1 text-xs text-fg-muted">Figma Community</p>
          </div>
        </div>
        <Button asChild rightIcon={<ExternalLink className="h-4 w-4" />}>
          <a href={FIGMA_TEMPLATE_URL} target="_blank" rel="noopener noreferrer">Open in Figma</a>
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-line bg-bg-0">
          <iframe
            title="Figma Community trade image template preview"
            src={FIGMA_EMBED_URL}
            className="block aspect-video w-full"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className="flex items-start gap-2 text-xs text-fg-dim">
          <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Use the preview to explore the file. Open it in Figma to duplicate and customize the template. If the preview is unavailable, use the button above.</span>
        </p>
      </CardBody>
    </Card>
  </div>;
}
