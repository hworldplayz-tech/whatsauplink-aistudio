
import { getTickerData, type TickerItem, type Match, type NewsArticle } from '@/app/ticker-actions';
import { TickerClient } from './ticker-client';

export async function Ticker() {
  let items: TickerItem[] = [];
  try {
    items = await getTickerData();
  } catch (err) {
    console.error('Ticker fetch error:', err);
    items = [];
  }

  const tickerType = items[0]?.type === 'sport' ? 'LIVE' : 'NEWS';

  if (items.length === 0) {
    return (
        <div className="bg-card/80 backdrop-blur-sm border-y">
             <div className="container py-2 text-center text-muted-foreground text-sm">
                No live sports or news at the moment. Check back later!
            </div>
        </div>
    );
  }

  return <TickerClient items={items} tickerType={tickerType} />;
}
