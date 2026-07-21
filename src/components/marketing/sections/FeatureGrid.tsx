import Card from '@/components/marketing/ui/Card';
import Icon from '@/components/marketing/ui/Icon';
import { cn } from '@/components/marketing/ui/cn';

export interface FeatureItem {
  id?: string;
  title: string;
  desc: string;
  icon?: string;
}

interface FeatureGridProps {
  items: FeatureItem[];
  columns?: 2 | 3;
  className?: string;
}

/** Outcome-oriented feature cards. Server component. */
export default function FeatureGrid({ items, columns = 3, className }: FeatureGridProps) {
  if (!items?.length) return null;
  return (
    <div
      className={cn(
        'grid gap-4 sm:gap-6',
        'grid-cols-1 sm:grid-cols-2',
        columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        className,
      )}
    >
      {items.map((item, idx) => (
        <Card key={item.id || idx} interactive as="article" padding="lg" className="h-full">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-300">
            <Icon name={item.icon} className="h-5 w-5" />
          </div>
          <h3 className="text-base font-black text-mk-strong dark:text-white">{item.title}</h3>
          <p className="mt-2 text-[13px] font-medium leading-relaxed text-mk-muted whitespace-pre-line">
            {item.desc}
          </p>
        </Card>
      ))}
    </div>
  );
}
