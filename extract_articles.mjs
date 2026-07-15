import { readFileSync } from 'fs';

const db = new (require('better-sqlite3'))('/home/pipatl/.openclaw/workspace/agents/liza/articles_db/articles.db');

const articles = db.prepare(`
  SELECT id, title, url, publish_date, full_text, outlet
  FROM articles
  WHERE outlet = 'the101'
    AND article_type = 'own'
    AND url != 'https://kickoman7.github.io/articles/solar-inverter-diagnosis.html'
`).all();

console.log(JSON.stringify(articles.map(a => ({
  id: a.id,
  title: a.title,
  url: a.url,
  publish_date: a.publish_date,
  len: a.full_text ? a.full_text.length : 0
}))));

db.close();