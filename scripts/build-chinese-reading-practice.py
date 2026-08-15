#!/usr/bin/env python3
"""Convert Chinese Reading Practice WordPress posts into a private reader collection."""
import argparse
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

import jieba
from bs4 import BeautifulSoup
from pypinyin import Style, lazy_pinyin

HAN = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')
CHARACTER_GLOSSES = {
    '天': {'en': 'day; sky; heaven', 'es': 'día; cielo; paraíso'},
    '上': {'en': 'on; above; up', 'es': 'en; encima de; arriba'},
}
CURATED_CONTEXT_POSTS = {3556, 3518, 3507, 3340, 3309}
TITLE_OVERRIDES = {
    1460: '小熊的美梦',
    1385: '爸爸，请您别抽烟了！',
}

def han_count(text): return len(HAN.findall(text))

def clean(node): return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip()

def clean_chinese(node):
    text = re.sub(r'\s+', '', node.get_text('', strip=True))
    opening = True
    output = []
    for character in text:
        if character == '”':
            output.append('“' if opening else '”'); opening = not opening
        else: output.append(character)
    return ''.join(output)

def translation_request(lines, source, target):
    payload = urllib.parse.urlencode({'client': 'gtx', 'sl': source, 'tl': target, 'dt': 't', 'q': '\n'.join(lines)}).encode()
    request = urllib.request.Request('https://translate.googleapis.com/translate_a/single', data=payload,
        headers={'User-Agent': 'MandarinApp personal learning importer'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=45) as response: data = json.load(response)
            translated = ''.join(part[0] for part in data[0]).splitlines()
            if len(translated) == len(lines): return [line.strip() for line in translated]
            if len(lines) == 1: return [' '.join(translated).strip()]
            middle = len(lines) // 2
            return translation_request(lines[:middle], source, target) + translation_request(lines[middle:], source, target)
        except Exception:
            if attempt == 3: raise
            time.sleep(1.5 * (attempt + 1))

def translated(texts, source, target, cache, namespace):
    prefix = f'{namespace}:'
    missing = list(dict.fromkeys(text for text in texts if text and prefix + text not in cache))
    batches, batch, size = [], [], 0
    for text in missing:
        if batch and size + len(text) > 2500: batches.append(batch); batch, size = [], 0
        batch.append(text); size += len(text) + 1
    if batch: batches.append(batch)
    for index, lines in enumerate(batches, 1):
        values = translation_request(lines, source, target)
        cache.update({prefix + original: value for original, value in zip(lines, values)})
        print(f'Translated {namespace} batch {index}/{len(batches)} ({len(lines)} items)', flush=True)

def split_zh(text): return [part.strip() for part in re.findall(r".+?(?:[。！？!?](?:[”\"’']+)?|$)", text) if part.strip()]

def split_en(text): return [part.strip() for part in re.findall(r'.+?(?:[.!?](?:[”"’\']+)?|$)(?:\s+|$)', text) if part.strip()]

def proportional_groups(parts, sizes, group_sizes):
    if len(group_sizes) == 1: return [' '.join(parts)]
    groups, start, used = [], 0, 0
    total, group_total = sum(sizes), sum(group_sizes)
    for index in range(len(group_sizes)):
        if index == len(group_sizes) - 1: groups.append(' '.join(parts[start:])); break
        target = sum(group_sizes[:index + 1]) / group_total
        maximum = len(parts) - (len(group_sizes) - index - 1)
        choices = range(start + 1, max(start + 2, maximum + 1))
        end = min(choices, key=lambda value: abs((used + sum(sizes[start:value])) / total - target))
        groups.append(' '.join(parts[start:end])); used += sum(sizes[start:end]); start = end
    return groups

def align_sentences(zh_text, en_text):
    zh_parts, en_parts = split_zh(zh_text), split_en(en_text)
    if len(zh_parts) == len(en_parts): return list(zip(zh_parts, en_parts))
    if len(en_parts) < len(zh_parts):
        groups = proportional_groups(zh_parts, [max(1, han_count(part)) for part in zh_parts], [len(part) for part in en_parts])
        return list(zip(groups, en_parts))
    groups = proportional_groups(en_parts, [len(part) for part in en_parts], [max(1, han_count(part)) for part in zh_parts])
    return list(zip(zh_parts, groups))

def split_long(zh, en):
    if han_count(zh) <= 25: return [(zh, en)]
    zh_parts = [part for part in re.findall(r'.+?[，；：]|.+$', zh) if part]
    packed, current = [], ''
    for part in zh_parts:
        if current and han_count(current) >= 10 and han_count(current + part) > 25: packed.append(current); current = part
        else: current += part
    if current: packed.append(current)
    en_parts = [part.strip() for part in re.findall(r'.+?(?:[,;:]|$)(?:\s+|$)', en) if part.strip()]
    if len(en_parts) < len(packed): return [(zh, en)]
    groups = proportional_groups(en_parts, [len(part) for part in en_parts], [max(1, han_count(part)) for part in packed])
    return list(zip(packed, groups))

def split_chinese_blocks(text):
    if han_count(text) <= 25: return [text]
    clauses = [part for part in re.findall(r'.+?[，；：]|.+$', text) if part]
    blocks, current = [], ''
    for clause in clauses:
        if current and han_count(current) >= 10 and han_count(current + clause) > 25:
            blocks.append(current); current = clause
        else: current += clause
    if current: blocks.append(current)
    output = []
    for block in blocks:
        if han_count(block) <= 30:
            output.append(block); continue
        current = ''
        for token in jieba.cut(block, cut_all=False, HMM=False):
            if current and han_count(current + token) > 25:
                output.append(current); current = token
            else: current += token
        if current: output.append(current)
    return output

def pinyin_for(text, overrides):
    hanzi = ''.join(HAN.findall(text))
    values = lazy_pinyin(hanzi, style=Style.TONE, strict=False, neutral_tone_with_five=False)
    return ' '.join(overrides.get(character, value) for character, value in zip(hanzi, values))

def contextual_words(rows):
    """Return multi-character words with pronunciation taken from their sentence."""
    words = {}
    for row in rows:
        hanzi = ''.join(HAN.findall(row['zh']))
        syllables = row['py'].split()
        offset = 0
        # Disable HMM name guessing: in a sentence such as 天上的王想帮他们,
        # it can incorrectly invent the name 王想 instead of 王 + 想.
        for token in jieba.cut(hanzi, cut_all=False, HMM=False):
            length = len(HAN.findall(token))
            if length >= 2 and all(HAN.fullmatch(character) for character in token):
                words.setdefault(token, ' '.join(syllables[offset:offset + length]))
            offset += length
        if offset != len(syllables):
            raise ValueError(f"Cannot align segmented words and pinyin: {row['zh']}")
    return words

def occurrence_meanings(text):
    """Context-specific senses keyed to a Han-character offset in the line."""
    meanings, han_offset = [], 0
    for index, character in enumerate(text):
        if not HAN.fullmatch(character): continue
        if character == '想':
            following = text[index + 1:].lstrip()
            thinking = following.startswith(('：', ':'))
            meanings.append({'at': han_offset, 'h': '想',
                'en': 'think; consider' if thinking else 'want to; would like to',
                'es': 'pensar; considerar' if thinking else 'querer; tener ganas de'})
        han_offset += 1
    return meanings

def spanish_quotes(source, target):
    starts = source.lstrip().startswith(('"', "'", '“', '‘'))
    ends = source.rstrip().endswith(('"', "'", '”', '’'))
    value = target.strip()
    if starts:
        value = value.lstrip('"\'“”‘’«»').strip()
        value = '«' + value
    if ends:
        value = value.rstrip('"\'“”‘’«»').strip() + '»'
    return value

def parse_vocab(container):
    if not container: return []
    for br in container.find_all('br'): br.replace_with('\n')
    entries = []
    for row in container.get_text('\n').splitlines():
        parts = [html.unescape(value).strip() for value in re.split(r'\s+[–—-]\s+', row.strip(), maxsplit=2)]
        if len(parts) == 3: entries.append({'h': parts[0], 'p': parts[1].replace('5', ''), 'en': parts[2]})
    return entries

def english_title(post):
    value = BeautifulSoup(post['title']['rendered'], 'html.parser').get_text(' ', strip=True)
    parts = re.split(r'\s+[–—-]\s+', value)
    if len(parts) > 1 and not HAN.search(parts[-1]): return parts[-1].strip()
    value = re.sub(r"^(?:Children(?:’|'|&rsquo;)s Story|Short Story|Fable|Jokes?|Essay|Dialogue|Poem|Idioms?)\s*:\s*", '', value, flags=re.I)
    return value.strip()

def chinese_title(post):
    value = BeautifulSoup(post['title']['rendered'], 'html.parser').get_text(' ', strip=True)
    candidates = re.split(r'\s+[–—-]\s+', value)
    candidate = next((part for part in candidates if HAN.search(part)), '')
    return re.sub(r'[^\u3400-\u9fff\uf900-\ufaff·：？！，。、《》“”]+', '', candidate)

def parse_post(post):
    soup = BeautifulSoup(post['content']['rendered'], 'html.parser')
    chinese = soup.select_one('#chinesetext')
    show = soup.find('a', attrs={'data-show-caption': re.compile('English', re.I)})
    english = show.parent.find_next_sibling('div') if show and show.parent else None
    if not chinese or not english: raise ValueError(f"{post['id']}: missing Chinese or English passage")
    title_zh_node = chinese.find(['h3', 'h4'])
    title_zh = clean_chinese(title_zh_node) if title_zh_node else TITLE_OVERRIDES.get(post['id'], chinese_title(post))
    title_node = english.find(['h3', 'h4'])
    title_en = clean(title_node) if title_node else english_title(post)
    vocab = parse_vocab(soup.select_one('.vocabulary-list'))
    overrides = {}
    for entry in vocab:
        chars, values = HAN.findall(entry['h']), entry['p'].split()
        if len(chars) == len(values): overrides.update(zip(chars, values))
    zh_paragraphs = [clean_chinese(node) for node in chinese.find_all('p', recursive=False) if clean_chinese(node)]
    en_paragraphs = [clean(node) for node in english.find_all('p', recursive=False) if clean(node)]
    legacy_passage = len(zh_paragraphs) != len(en_paragraphs)
    if zh_paragraphs and zh_paragraphs[0] == title_zh and en_paragraphs[0] == title_en:
        zh_paragraphs.pop(0); en_paragraphs.pop(0)
    rows = []
    if legacy_passage:
        zh_full = clean_chinese(chinese)
        if title_zh and zh_full.startswith(title_zh): zh_full = zh_full[len(title_zh):]
        for sentence_zh in split_zh(zh_full):
            for segment_zh in split_chinese_blocks(sentence_zh):
                rows.append({'zh': segment_zh, 'py': pinyin_for(segment_zh, overrides), 'generatedTranslation': True})
    else:
        for zh, en in zip(zh_paragraphs, en_paragraphs):
            for sentence_zh, sentence_en in align_sentences(zh, en):
                for segment_zh, segment_en in split_long(sentence_zh, sentence_en):
                    if han_count(segment_zh) > 30:
                        rows.extend({'zh': block, 'py': pinyin_for(block, overrides), 'generatedTranslation': True}
                            for block in split_chinese_blocks(segment_zh))
                    else: rows.append({'zh': segment_zh, 'py': pinyin_for(segment_zh, overrides), 'en': segment_en})
    rows = [row for row in rows if han_count(row['zh'])]
    if post['id'] in CURATED_CONTEXT_POSTS:
        for row in rows:
            meanings = occurrence_meanings(row['zh'])
            if meanings: row['meanings'] = meanings
    terms = [term for group in post.get('_embedded', {}).get('wp:term', []) for term in group]
    categories = [html.unescape(term['name']) for term in terms if term.get('taxonomy') == 'category']
    topics = [html.unescape(term['name']) for term in terms if term.get('taxonomy') == 'post_tag']
    if not topics:
        prefix = html.unescape(post['title']['rendered']).split(':', 1)[0]
        if prefix and prefix.lower() not in ('short story',): topics = [prefix]
    return {'post': post, 'titleZh': title_zh, 'titleEn': title_en, 'rows': rows, 'vocabulary': vocab,
        'categories': categories, 'topics': topics}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input'); parser.add_argument('output')
    parser.add_argument('--level', choices=('Beginner', 'Intermediate'), default='Beginner')
    parser.add_argument('--cache', default='private-source/chinese-reading-practice-cache.json')
    args = parser.parse_args()
    posts = json.loads(Path(args.input).read_text())
    records = [parse_post(post) for post in posts]
    for record in records: record['contextualWords'] = contextual_words(record['rows'])
    cache_path = Path(args.cache); cache = json.loads(cache_path.read_text()) if cache_path.exists() else {}
    characters = list(dict.fromkeys(character for record in records for row in record['rows'] for character in HAN.findall(row['zh'])))
    contextual = list(dict.fromkeys(word for record in records for word in record['contextualWords']))
    spanish_text = [record['titleEn'] for record in records] + [row['en'] for record in records for row in record['rows'] if not row.get('generatedTranslation')]
    generated_chinese = [row['zh'] for record in records for row in record['rows'] if row.get('generatedTranslation')]
    definitions = [entry['en'] for record in records for entry in record['vocabulary']]
    try:
        translated(spanish_text, 'en', 'es', cache, 'story-es')
        translated(generated_chinese, 'zh-CN', 'en', cache, 'legacy-en')
        translated(generated_chinese, 'zh-CN', 'es', cache, 'legacy-es')
        translated(definitions, 'en', 'es', cache, 'definition-es')
        translated(contextual, 'zh-CN', 'en', cache, 'contextual-en')
        translated(contextual, 'zh-CN', 'es', cache, 'contextual-es')
        translated(characters, 'zh-CN', 'en', cache, 'character-en')
        translated(characters, 'zh-CN', 'es', cache, 'character-es')
    finally:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2))
    chapters = []
    for number, record in enumerate(records, 1):
        for row in record['rows']:
            if row.pop('generatedTranslation', False):
                row['en'] = cache['legacy-en:' + row['zh']]
                row['es'] = cache['legacy-es:' + row['zh']]
            else: row['es'] = spanish_quotes(row['en'], cache['story-es:' + row['en']])
        for entry in record['vocabulary']: entry['es'] = cache['definition-es:' + entry['en']]
        key_vocabulary = len(record['vocabulary'])
        source_words = {entry['h'] for entry in record['vocabulary']}
        record['vocabulary'].extend({
            'h': word,
            'p': pinyin,
            'en': cache['contextual-en:' + word],
            'es': cache['contextual-es:' + word],
            'contextual': True,
        } for word, pinyin in record['contextualWords'].items() if word not in source_words)
        covered_characters = {entry['h'] for entry in record['vocabulary'] if len(HAN.findall(entry['h'])) == 1}
        story_characters = list(dict.fromkeys(character for row in record['rows'] for character in HAN.findall(row['zh'])))
        record['vocabulary'].extend({
            'h': character,
            'p': lazy_pinyin(character, style=Style.TONE, strict=False, neutral_tone_with_five=False)[0],
            'en': CHARACTER_GLOSSES.get(character, {}).get('en', cache['character-en:' + character]),
            'es': CHARACTER_GLOSSES.get(character, {}).get('es', cache['character-es:' + character]),
            'fallback': True,
        } for character in story_characters if character not in covered_characters)
        post, rows = record['post'], record['rows']
        count = sum(han_count(row['zh']) for row in rows)
        calculated = {'hanCharacters': count, 'words': key_vocabulary, 'uniqueWords': key_vocabulary,
            'segments': len(rows), 'length': 'short' if count <= 100 else 'medium' if count <= 250 else 'long'}
        topic_text = ' '.join(record['topics'])
        kind = 'dialogue' if 'Dialogue' in topic_text else 'humor' if 'Joke' in topic_text else 'story' if re.search(r'Stor|Myth|Fable', topic_text) else 'informational'
        chapters.append({'id': f"crp:{post['id']}", 'number': number, 'titleZh': record['titleZh'],
            'titleEn': record['titleEn'], 'titleEs': cache['story-es:' + record['titleEn']], 'sourceUrl': post['link'],
            'tags': [args.level, 'Chinese Reading Practice', *record['topics']],
            'metadata': {'source': {'categories': record['categories'], 'topics': record['topics'], 'level': args.level,
                'publishedAt': post.get('date', ''), 'modifiedAt': post.get('modified', '')},
                'calculated': calculated, 'contentType': kind},
            'vocabulary': record['vocabulary'], 'lines': rows})
    level_slug = args.level.lower()
    title_zh = {'Beginner': '初级', 'Intermediate': '中级'}[args.level]
    title_es = {'Beginner': 'Principiante', 'Intermediate': 'Intermedio'}[args.level]
    collection_id = f'chinese-reading-practice-{level_slug}'
    collection = [{'id': collection_id, 'kind': 'online-collection',
        'source': 'Chinese Reading Practice', 'titleZh': f'Chinese Reading Practice · {title_zh}',
        'titleEn': f'Chinese Reading Practice · {args.level}', 'titleEs': f'Chinese Reading Practice · {title_es}',
        'chapters': chapters}]
    Path(args.output).write_text(json.dumps(collection, ensure_ascii=False, indent=2))
    print(f'Built Chinese Reading Practice {args.level} collection: {len(chapters)} readings -> {args.output}')

if __name__ == '__main__': main()
