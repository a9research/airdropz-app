'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const handleOpenProxyBrowser = () => {
    console.log('Button clicked');
    if (window.api) {
      window.api.openProxyBrowser('https://baidu.com')
        .then((window: unknown) => {
          if (window) {
            console.log('Proxy browser opened:', window);
          }
        })
        .catch((error: Error) => console.error('Failed to open proxy browser:', error));
    } else {
      console.error('window.api is not available');
    }
  };

  useEffect(() => {
    console.log('useEffect triggered', window.api);
    if (window.api) {
      window.api.scrape('https://baidu.com')
        .then((result: string) => {
          console.log('Scrape result:', result);
          setScrapeResult(result);
        })
        .catch((error: Error) => console.error('Scrape error:', error));
    }
  }, []);

  return (
    <div>
      <h1>Electron App with Proxy Browser</h1>
      <button onClick={handleOpenProxyBrowser}>Open Proxy Browser</button>
      {scrapeResult ? <p>Scrape Result: {scrapeResult}</p> : <p>Loading...</p>}
    </div>
  );
}