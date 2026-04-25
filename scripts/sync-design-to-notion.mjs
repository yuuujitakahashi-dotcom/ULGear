/**
 * DESIGN.md → Notion 同期スクリプト
 * 実行: NOTION_TOKEN=xxx NOTION_PAGE_ID=xxx node scripts/sync-design-to-notion.mjs
 */

import { Client } from '@notionhq/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PAGE_ID) {
  console.error('Error: NOTION_TOKEN と NOTION_PAGE_ID を環境変数で指定してください');
  console.error('  NOTION_TOKEN=secret_xxx NOTION_PAGE_ID=yyy node scripts/sync-design-to-notion.mjs');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// インライン Markdown → Notion rich_text
function parseRichText(text) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: { content: text.slice(lastIndex, match.index) } });
    }
    const raw = match[0];
    if (raw.startsWith('**')) {
      parts.push({ type: 'text', text: { content: raw.slice(2, -2) }, annotations: { bold: true } });
    } else {
      parts.push({ type: 'text', text: { content: raw.slice(1, -1) }, annotations: { code: true } });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', text: { content: text.slice(lastIndex) } });
  }
  return parts.length > 0 ? parts : [{ type: 'text', text: { content: text } }];
}

// Markdown → Notion blocks
function parseMarkdown(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: parseRichText(line.slice(4)) } });
      i++; continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: parseRichText(line.slice(3)) } });
      i++; continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: parseRichText(line.slice(2)) } });
      i++; continue;
    }

    // Divider
    if (line.trim() === '---') {
      blocks.push({ object: 'block', type: 'divider', divider: {} });
      i++; continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim() || 'plain text';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing ```
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: codeLines.join('\n') } }],
          language: lang === 'plain text' ? 'plain text' : lang,
        },
      });
      continue;
    }

    // Table
    if (line.startsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i];
        // セパレーター行（|---|）をスキップ
        if (!row.replace(/[\|\-\s:]/g, '').trim()) { i++; continue; }
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        tableRows.push(cells);
        i++;
      }
      if (tableRows.length > 0) {
        blocks.push({
          object: 'block',
          type: 'table',
          table: {
            table_width: tableRows[0].length,
            has_column_header: true,
            has_row_header: false,
            children: tableRows.map(cells => ({
              object: 'block',
              type: 'table_row',
              table_row: { cells: cells.map(c => parseRichText(c)) },
            })),
          },
        });
      }
      continue;
    }

    // Bullet list
    if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: parseRichText(line.slice(2)) },
      });
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') { i++; continue; }

    // Paragraph
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: { rich_text: parseRichText(line) },
    });
    i++;
  }

  return blocks;
}

async function clearPageBlocks(pageId) {
  let cursor;
  const blockIds = [];
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor });
    blockIds.push(...res.results.map(b => b.id));
    cursor = res.next_cursor;
  } while (cursor);

  for (const id of blockIds) {
    await notion.blocks.delete({ block_id: id });
  }
  console.log(`  ${blockIds.length} ブロックを削除しました`);
}

async function appendBlocks(pageId, blocks) {
  const CHUNK = 100;
  for (let i = 0; i < blocks.length; i += CHUNK) {
    const chunk = blocks.slice(i, i + CHUNK);
    await notion.blocks.children.append({ block_id: pageId, children: chunk });
    console.log(`  ブロック追加: ${i + 1}–${Math.min(i + CHUNK, blocks.length)} / ${blocks.length}`);
  }
}

async function main() {
  const mdPath = join(__dirname, '../DESIGN.md');
  const md = readFileSync(mdPath, 'utf-8');

  console.log('DESIGN.md を解析中...');
  const blocks = parseMarkdown(md);
  console.log(`  ${blocks.length} ブロック生成`);

  console.log('既存コンテンツを削除中...');
  await clearPageBlocks(NOTION_PAGE_ID);

  console.log('Notionに書き込み中...');
  await appendBlocks(NOTION_PAGE_ID, blocks);

  console.log('完了！ DESIGN.md を Notion に同期しました。');
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
