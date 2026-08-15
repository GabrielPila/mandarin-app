#!/usr/bin/env python3
"""Build a complete encrypted-reader source collection from Mandarin Bean WP posts.

Input is a WordPress posts JSON array. Translations are cached under private-source
so interrupted runs can resume without repeating completed requests.
"""
import argparse
import importlib.util
import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('mandarinbean_extract', Path(__file__).with_name('extract-mandarinbean.py'))
extract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extract)
HAN = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
TITLE = re.compile(r'<h2[^>]*class="[^"]*elementor-heading-title[^"]*"[^>]*>\s*<span class="si">(.*?)</span>', re.I | re.S)

def han_count(text): return len(HAN.findall(text))

def split_chinese(text):
    if han_count(text) <= 25: return [text]
    clauses = [part for part in re.findall(r'.+?[，；：]|.+$', text) if part]
    blocks, current = [], ''
    for clause in clauses:
        if current and han_count(current) >= 10 and han_count(current + clause) > 25:
            blocks.append(current); current = clause
        else: current += clause
    if current: blocks.append(current)
    return blocks

def semantic_rows(article, char_pinyin):
    normalized = []
    pending_prefix = ''
    for source in article['lines']:
        line = dict(source)
        if re.fullmatch(r'[“"\']+', line['zh'].strip()):
            pending_prefix += line['zh']; continue
        line['zh'] = pending_prefix + line['zh']; pending_prefix = ''
        if line['zh'].startswith(('”', '"')) and normalized:
            normalized[-1]['zh'] += line['zh'][0]; line['zh'] = line['zh'][1:]
        if line['zh'].strip(): normalized.append(line)
    rows = []
    for source in normalized:
        parts, syllables, offset = split_chinese(source['zh']), source['py'].split(), 0
        for part in parts:
            count = han_count(part)
            rows.append({'zh': part, 'py': ' '.join(syllables[offset:offset + count])})
            offset += count
    merged = []
    for row in rows:
        previous = merged[-1] if merged else None
        can_merge = (previous and han_count(previous['zh']) < 10 and han_count(row['zh']) < 10 and
                     han_count(previous['zh'] + row['zh']) <= 25 and
                     not re.search(r'[“”"？?！!]', previous['zh'] + row['zh']))
        if can_merge:
            previous['zh'] += row['zh']; previous['py'] = f"{previous['py']} {row['py']}".strip()
        else: merged.append(row)
    for row in merged:
        if han_count(row['zh']) != len(row['py'].split()):
            repaired = [char_pinyin.get(char, '') for char in row['zh'] if HAN.match(char)]
            if not all(repaired): raise ValueError(f"Cannot repair pinyin: {row['zh']}")
            row['py'] = ' '.join(repaired)
    return merged

def request_text(url, data=None, attempts=4):
    request = urllib.request.Request(url, data=data, headers={'User-Agent': 'MandarinApp personal learning importer'})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read().decode('utf-8')
        except Exception:
            if attempt == attempts - 1: raise
            time.sleep(1.5 * (attempt + 1))

def translate_request(lines, language, source_language='zh-CN'):
    payload = urllib.parse.urlencode({'client': 'gtx', 'sl': source_language, 'tl': language, 'dt': 't', 'q': '\n'.join(lines)}).encode()
    data = json.loads(request_text('https://translate.googleapis.com/translate_a/single', payload))
    translated = ''.join(part[0] for part in data[0]).splitlines()
    if len(translated) != len(lines):
        if len(lines) == 1: return [' '.join(translated).strip()]
        middle = len(lines) // 2
        return translate_request(lines[:middle], language, source_language) + translate_request(lines[middle:], language, source_language)
    return [line.strip() for line in translated]

def translate_all(texts, language, cache, source_language='zh-CN', namespace=''):
    prefix = f'{namespace}{language}:'
    missing = list(dict.fromkeys(text for text in texts if text and f'{prefix}{text}' not in cache))
    batches, batch, size = [], [], 0
    for text in missing:
        if batch and size + len(text) > 2200:
            batches.append(batch); batch, size = [], 0
        batch.append(text); size += len(text) + 1
    if batch: batches.append(batch)
    for index, lines in enumerate(batches, 1):
        translations = translate_request(lines, language, source_language)
        cache.update({f'{prefix}{source}': target for source, target in zip(lines, translations)})
        print(f'  {language}: translated batch {index}/{len(batches)} ({len(lines)} segments)', flush=True)
        time.sleep(.25)

def fetch_title(post):
    page = request_text(post['link'])
    match = TITLE.search(page)
    return post['id'], extract.clean(match.group(1)) if match else ''

def taxonomy(post, level):
    categories, topics = [], []
    for terms in post.get('_embedded', {}).get('wp:term', []):
        for term in terms:
            if term.get('taxonomy') == 'category': categories.append(term['name'])
            elif term.get('taxonomy') == 'post_tag' and not re.fullmatch(r'HSK\s*\d+', term.get('name', ''), re.I): topics.append(term['name'])
    return {'categories': list(dict.fromkeys(categories)), 'topics': list(dict.fromkeys(topics)),
            'hsk': level, 'publishedAt': post.get('date', ''), 'modifiedAt': post.get('modified', '')}

def content_type(topics):
    if 'Fun' in topics: return 'humor'
    if 'Story' in topics: return 'story'
    return 'informational'

def preserve_speaker(source, translated):
    match = re.match(r'^([A-ZＡ-Ｚ])：', source)
    return re.sub(r'^[A-ZＡ-Ｚ]:', f'{match.group(1)}:', translated, count=1) if match else translated

def build(posts, level, cache):
    parsed = {post['id']: extract.parse_post(post) for post in posts}
    char_pinyin = {}
    for article in parsed.values():
        for line in article['lines']:
            for token in line['tokens']:
                chars, syllables = HAN.findall(token['text']), token['pinyin'].split()
                if len(chars) == len(syllables): char_pinyin.update(zip(chars, syllables))
    print(f'Fetching {len(posts)} original Chinese titles...', flush=True)
    titles = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(fetch_title, post) for post in posts]
        for future in as_completed(futures):
            post_id, title = future.result(); titles[post_id] = title
    records = []
    for post in posts:
        article = parsed[post['id']]
        rows = semantic_rows(article, char_pinyin)
        title_zh = titles.get(post['id']) or article['titleEn']
        records.append((post, article, rows, title_zh))
    texts = [title for _, _, _, title in records] + [row['zh'] for _, _, rows, _ in records for row in rows]
    translate_all(texts, 'en', cache); translate_all(texts, 'es', cache)
    definitions = [token['definition'] for article in parsed.values() for line in article['lines'] for token in line['tokens']]
    translate_all(definitions, 'es', cache, source_language='en', namespace='def')
    chapters = []
    for number, (post, article, rows, title_zh) in enumerate(records, 1):
        tokens = [token for line in article['lines'] for token in line['tokens']]
        unique = {}
        for token in tokens:
            unique[(token['text'], token['pinyin'])] = {'h': token['text'], 'p': token['pinyin'],
                'en': token['definition'], 'es': cache.get(f"defes:{token['definition']}", token['definition']),
                'oldHsk': token['oldHsk'], 'newHsk': token['newHsk']}
        for row in rows:
            row['en'] = preserve_speaker(row['zh'], cache[f"en:{row['zh']}"])
            row['es'] = preserve_speaker(row['zh'], cache[f"es:{row['zh']}"])
        source = taxonomy(post, level)
        calculated = {'hanCharacters': sum(han_count(row['zh']) for row in rows), 'words': len(tokens),
            'uniqueWords': len(unique), 'segments': len(rows)}
        calculated['length'] = 'short' if calculated['hanCharacters'] <= 100 else 'medium' if calculated['hanCharacters'] <= 250 else 'long'
        chapters.append({'id': article['id'], 'number': number, 'titleZh': title_zh,
            'titleEn': article['titleEn'], 'titleEs': cache[f'es:{title_zh}'], 'sourceUrl': article['url'],
            'tags': [f'HSK {level}', 'Mandarin Bean', *source['topics']],
            'metadata': {'source': source, 'calculated': calculated, 'contentType': content_type(source['topics'])},
            'vocabulary': list(unique.values()), 'lines': rows})
    return [{'id': f'mandarinbean-hsk{level}', 'kind': 'online-collection', 'source': 'Mandarin Bean',
        'titleZh': f'Mandarin Bean · HSK {level}', 'titleEn': f'Mandarin Bean · HSK {level}',
        'titleEs': f'Mandarin Bean · HSK {level}', 'chapters': chapters}]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('level', type=int, choices=(1, 2)); parser.add_argument('input'); parser.add_argument('output')
    parser.add_argument('--cache', default=str(ROOT / 'private-source/mandarinbean-translations-cache.json'))
    args = parser.parse_args()
    posts = json.loads(Path(args.input).read_text())
    cache_path = Path(args.cache)
    cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    try: collection = build(posts, args.level, cache)
    finally:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2))
    Path(args.output).write_text(json.dumps(collection, ensure_ascii=False, indent=2))
    print(f'Built HSK {args.level}: {len(collection[0]["chapters"])} readings -> {args.output}')

if __name__ == '__main__': main()
