import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

/** Generate the private editor source from the same action labels the public UI uses. */
export async function renderCollector(bookId) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(bookId || '')) throw new Error('A Google spreadsheet ID is required');
  const template = await readFile(new URL('../integrations/google-sheets/Collector.gs', import.meta.url), 'utf8');
  const actions = JSON.parse(await readFile(new URL('../src/config/usageActions.json', import.meta.url), 'utf8'));
  return template.replace('__LOG_SPREADSHEET_ID__', bookId).replace('/* approved actions */ {}', JSON.stringify(actions));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(await renderCollector(process.argv[2]));
}
