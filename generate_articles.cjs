const fs = require('fs');
const path = require('path');
const db = new (require('better-sqlite3'))('/home/pipatl/.openclaw/workspace/agents/liza/articles_db/articles.db');

const TEMPLATE = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE} — The 101 World</title>
<style>
  :root { --bg: #fafaf8; --surface: #fff; --text: #1a1a1a; --text2: #555; --accent: #1a1a2e; --accent2: #3b82f6; --border: #e5e5e5; --tag: #f0f0f0; }
  body { font-family: 'Sarabun', 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
  .meta { color: var(--text2); font-size: 0.875rem; margin-bottom: 2rem; }
  .tag { display: inline-block; background: var(--tag); border-radius: 4px; padding: 2px 10px; font-size: 0.8rem; margin-right: 6px; }
  .back { display: inline-flex; align-items: center; gap: 6px; color: var(--text2); text-decoration: none; font-size: 0.875rem; margin-bottom: 1.5rem; }
  .back:hover { color: var(--accent); }
  .content { max-width: 720px; }
  .content h2 { font-size: 1.2rem; font-weight: 600; margin: 2rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
  .content h3 { font-size: 1.05rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
  .content p { margin: 0.9rem 0; }
  .content table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  .content th, .content td { border: 1px solid var(--border); padding: 8px 12px; font-size: 0.9rem; }
  .content th { background: var(--tag); }
  .content ul, .content ol { margin: 0.9rem 0; padding-left: 1.5rem; }
  .content li { margin: 0.4rem 0; }
  .content strong { color: var(--accent); }
  .content em { font-style: italic; }
  .content pre { background: var(--tag); padding: 1rem; border-radius: 6px; overflow-x: auto; }
  .content blockquote { border-left: 3px solid var(--accent2); margin: 1.5rem 0; padding: 0.5rem 1rem; color: var(--text2); font-style: italic; }
  .content hr { border: none; border-top: 1px solid var(--border); margin: 2rem 0; }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<a class="back" href="https://kickoman7.github.io/articles">← กลับหน้าแรก</a>
<article>
<h1>{TITLE}</h1>
<div class="meta">📅 {DATE} | ✍️ ดร.พิพัฒน์ เหลืองนฤมิตชัย</div>
<div class="content">
{CONTENT}
</div>
</article>
</body>
</html>`;

// Convert full_text (plain text with markdown-like syntax) to HTML
function convertContent(text) {
  if (!text) return '';

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Collect lines, process blocks
  const lines = text.split('\n');
  const htmlParts = [];
  let i = 0;

  // We'll accumulate paragraph text and flush on blank line or block signal
  let paraBuffer = [];

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    let para = paraBuffer.join(' ').trim();
    if (!para) return;
    // Process inline styles
    para = para.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    para = para.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Single newlines within paragraph become <br>
    para = para.replace(/\n/g, '<br>');
    htmlParts.push(`<p>${para}</p>`);
    paraBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // HR
    if (line.match(/^---+\s*$/) || line === '***') {
      flushPara();
      htmlParts.push('<hr>');
      i++;
      continue;
    }

    // H2
    if (line.match(/^# /)) {
      flushPara();
      const h2 = line.replace(/^# /, '').trim();
      htmlParts.push(`<h2>${h2}</h2>`);
      i++;
      continue;
    }

    // H3
    if (line.match(/^## /)) {
      flushPara();
      const h3 = line.replace(/^## /, '').trim();
      htmlParts.push(`<h3>${h3}</h3>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.match(/^> /)) {
      flushPara();
      const quote = line.replace(/^> /, '').trim();
      htmlParts.push(`<blockquote>${quote}</blockquote>`);
      i++;
      continue;
    }

    // Unordered list item
    if (line.match(/^- /)) {
      flushPara();
      const items = [];
      while (i < lines.length && lines[i].match(/^- /)) {
        let item = lines[i].replace(/^- /, '').trim();
        item = item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        item = item.replace(/\*(.+?)\*/g, '<em>$1</em>');
        items.push(`<li>${item}</li>`);
        i++;
      }
      if (items.length > 0) htmlParts.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list item
    if (line.match(/^\d+\. /)) {
      flushPara();
      const items = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        let item = lines[i].replace(/^\d+\. /, '').trim();
        item = item.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        item = item.replace(/\*(.+?)\*/g, '<em>$1</em>');
        items.push(`<li>${item}</li>`);
        i++;
      }
      if (items.length > 0) htmlParts.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blank line = flush paragraph
    if (line.trim() === '') {
      flushPara();
      i++;
      continue;
    }

    // Regular line — accumulate
    paraBuffer.push(line);
    i++;
  }

  flushPara();
  return htmlParts.join('\n');
}

function slugFromUrl(url) {
  // https://www.the101.world/gdp-third-quater-2023-analysis/ -> gdp-third-quater-2023-analysis.html
  const m = url.match(/the101\.world\/([^/]+)\/?$/);
  if (m) return m[1] + '.html';
  // fallback
  const u = new URL(url);
  const parts = u.pathname.replace(/\//g, '').split('.');
  return parts[0] + '.html';
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

const articles = db.prepare(`
  SELECT id, title, url, publish_date, full_text, outlet
  FROM articles
  WHERE outlet = 'the101'
    AND article_type = 'own'
    AND url != 'https://kickoman7.github.io/articles/solar-inverter-diagnosis.html'
`).all();

const updateStmt = db.prepare('UPDATE articles SET url = ? WHERE id = ?');

let created = 0;
let updated = 0;
let skipped = 0;
const updatedUrls = [];

for (let idx = 0; idx < articles.length; idx++) {
  const a = articles[idx];

  if (!a.full_text || a.full_text.length < 200) {
    console.log(`⚠️  SKIP id=${a.id} "${a.title}" — full_text too short (${a.full_text ? a.full_text.length : 0} chars)`);
    skipped++;
    continue;
  }

  const slug = slugFromUrl(a.url);
  const newUrl = `https://kickoman7.github.io/articles/${slug}`;

  const htmlContent = TEMPLATE
    .replace('{TITLE}', a.title)
    .replace('{DATE}', formatDate(a.publish_date))
    .replace('{CONTENT}', convertContent(a.full_text));

  const filePath = path.join('/home/pipatl/the101-archive', slug);
  fs.writeFileSync(filePath, htmlContent, 'utf8');

  // Update DB
  updateStmt.run(newUrl, a.id);

  created++;
  updated++;
  updatedUrls.push(newUrl);

  if ((idx + 1) % 5 === 0 || idx === articles.length - 1) {
    console.log(`✅ Processed ${idx + 1}/${articles.length}: ${a.title.substring(0, 50)}`);
  }
}

db.close();

console.log(`\n📊 Summary:`);
console.log(`   Files created: ${created}`);
console.log(`   DB URLs updated: ${updated}`);
console.log(`   Skipped: ${skipped}`);
console.log(`\n🔗 First 3 updated article URLs:`);
updatedUrls.slice(0, 3).forEach((u, i) => console.log(`   ${i + 1}. ${u}`));