import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Play } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardTitle } from '@/components/ui/Card';

const tutorials = [
  { title: 'Getting started', videoId: 'M7lc1UVf-VE', description: 'A quick introduction to your trading journal.' },
  { title: 'Logging a trade', videoId: 'aqz-KE-bpKQ', description: 'See how to record and review a trade.' },
  { title: 'Reading your statistics', videoId: 'ScMzIvxBSi4', description: 'Understand the performance breakdowns.' },
];

export function TutorialsPage() {
  return <div className="space-y-6">
    <PageHeader
      title="Help & tutorials"
      description="Short guides to help you get more from your trading journal."
      actions={<Button asChild variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}><Link to="/settings">Back to settings</Link></Button>}
    />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {tutorials.map((tutorial, index) => (
        <Card key={tutorial.videoId} className="overflow-hidden">
          <a
            href={`https://www.youtube.com/watch?v=${tutorial.videoId}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Watch tutorial: ${tutorial.title}`}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
          >
            <div className="flex aspect-video items-center justify-center border-b border-line bg-bg-3 text-fg-muted transition-colors group-hover:bg-bg-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-bg-2 text-fg">
                <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <CardBody className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <CardTitle>{tutorial.title}</CardTitle>
                <p className="mt-1 text-sm text-fg-muted">{tutorial.description}</p>
                <p className="mt-2 text-xs text-fg-dim">Sample tutorial {index + 1}</p>
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-fg-dim group-hover:text-fg" aria-hidden="true" />
            </CardBody>
          </a>
        </Card>
      ))}
    </div>
  </div>;
}
