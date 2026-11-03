
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

  const tickerType = items[0]?.type === 'sport' ? 'LIVE' : 'UPDATES';

  if (items.length === 0) {
    return null;
  }

  return <TickerClient items={items} tickerType={tickerType} />;
}
