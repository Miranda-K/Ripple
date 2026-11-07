import { Compass } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/misc';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound({ what = 'page' }: { what?: string }) {
  return (
    <Card>
      <EmptyState
        icon={<Compass size={22} />}
        title={`We couldn’t find that ${what}`}
        body="The link may be out of date, or the demo data was reset."
        action={<ButtonLink to="/">Back to Overview</ButtonLink>}
      />
    </Card>
  );
}
