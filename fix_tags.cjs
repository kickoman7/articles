/**
 * Run: NODE_PATH=/home/pipatl/.openclaw/workspace/agents/liza/articles_db/node_modules node fix_tags.cjs
 */

const sqlite3 = require('better-sqlite3');
const fs = require('fs');
const db = new sqlite3('/home/pipatl/.openclaw/workspace/agents/liza/articles_db/articles.db');

const tagCache = {};
db.prepare('SELECT article_id, tag_name FROM article_tags_new').all()
  .forEach(r => { if (!tagCache[r.article_id]) tagCache[r.article_id] = []; tagCache[r.article_id].push(r.tag_name); });

const articles = db.prepare(`
  SELECT a.id, a.title, a.url, a.outlet, a.publish_date, a.full_text FROM articles a
  WHERE a.scrape_status='done' AND a.article_type='own'
  ORDER BY a.publish_date DESC
`).all();

const NAV = ['หน้าแรก','หุ้น','การเงิน','Facebook','X (Twitter)','XTwitter','copy','link','share','Related','Articles','Written by','Published','Blockdit Logo','Blockdit','gtm4wp','dataLayer','schema.org'];

function isNav(t) {
  const l = t.toLowerCase();
  if (t.startsWith('var gtm') || t.startsWith('var dataLayer') || t.startsWith('{')) return true;
  return NAV.filter(k => l.includes(k.toLowerCase())).length >= 2 ||
    (NAV.some(k => l.includes(k.toLowerCase())) && t.length < 200);
}

function excerpt(t) {
  if (!t) return null;
  const ps = t.split(/\n{2,}|\n/);
  for (const p of ps) {
    const c = p.replace(/\s+/g,' ').trim();
    if (!c) continue;
    if (c.startsWith('var gtm') || c.startsWith('var dataLayer') || c.startsWith('{')) continue;
    if (c.split(/\s+/).filter(w=>w.length>0).length >= 25 && !isNav(c))
      return c.substring(0,300)+(c.length>300?'...':'');
  }
  return (ps[0]||t).replace(/\s+/g,' ').trim().substring(0,300)+(t.length>300?'...':'');
}

const out = articles.map(r => ({
  outlet: r.outlet, title: r.title, url: r.url,
  publish_date: r.publish_date,
  excerpt: excerpt(r.full_text||''),
  tags: tagCache[r.id]||['Macro'],
  len: r.full_text?r.full_text.length:0
}));

fs.writeFileSync('index.json', JSON.stringify(out));

const problem = out.filter(x => (x.excerpt||'').startsWith('var gtm') || (x.excerpt||'').startsWith('{'));
console.log('Total:', out.length, '| Problem excerpts:', problem.length);
if (problem.length) console.log('PROBLEMS:', problem.map(x=>x.title.split(' - ')[0].split(' : ')[0]));
db.close();