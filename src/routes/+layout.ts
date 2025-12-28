import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';
import { injectAnalytics } from '@vercel/analytics/sveltekit';
import { dev } from '$app/environment';

injectSpeedInsights();
injectAnalytics({ mode: dev ? 'development' : 'production' });
