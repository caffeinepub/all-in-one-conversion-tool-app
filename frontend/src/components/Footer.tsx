import { Heart } from 'lucide-react';

export default function Footer() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown-app';
  const appId = encodeURIComponent(hostname);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background/60 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 max-w-7xl py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {year} ConvertAll Studio. All processing is done locally in your browser.</p>
          <p className="flex items-center gap-1">
            Built with{' '}
            <Heart className="w-3 h-3 text-primary fill-primary" />{' '}
            using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
