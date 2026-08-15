#!/usr/bin/env python3
"""Convert Mandarin Bean WordPress lesson JSON from stdin into reader source data."""
import html
import json
import re
import sys

RUBY = re.compile(r'<ruby\b(?P<attrs>[^>]*)>(?P<body>.*?)</ruby>', re.I | re.S)
ATTR = re.compile(r'data-mb-([\w-]+)="([^"]*)"', re.I)
SI = re.compile(r'<span\s+class="si">(.*?)</span>', re.I | re.S)
TAG = re.compile(r'<[^>]+>')
HAN = re.compile(r'[\u3400-\u9fff\uf900-\ufaff]')

SAMPLE_TAXONOMY = {
    21311: ('Beginner', ['Fun']), 21195: ('Beginner', ['Fun']),
    19954: ('Beginner', ['Story']), 16943: ('Beginner', ['Story']),
    14995: ('Beginner', ['Fun']), 22102: ('Beginner', ['Lifestyle']),
    22106: ('Beginner', ['Fun']), 21997: ('Beginner', ['Fun']),
    21884: ('Beginner', ['Fun']), 21739: ('Beginner', ['Fun']),
}

def clean(value):
    return html.unescape(TAG.sub('', value)).strip()

def source_taxonomy(post, level):
    """Keep publisher taxonomy separate from metadata calculated by this app."""
    category, topics = SAMPLE_TAXONOMY.get(post['id'], ('Beginner', []))
    for terms in post.get('_embedded', {}).get('wp:term', []):
        for term in terms:
            if term.get('taxonomy') == 'category': category = term.get('name', category)
            elif term.get('taxonomy') == 'post_tag' and not re.fullmatch(r'HSK\s*\d+', term.get('name', ''), re.I):
                topics.append(term['name'])
    return {'category': category, 'topics': list(dict.fromkeys(topics)), 'hsk': level,
            'publishedAt': post.get('date', '')}

def calculated_metadata(lines, vocabulary, token_lines=None):
    han_characters = sum(len(HAN.findall(line['zh'])) for line in lines)
    return {'hanCharacters': han_characters, 'words': sum(len(line.get('tokens', [])) for line in (token_lines or lines)),
            'uniqueWords': len(vocabulary), 'segments': len(lines),
            'length': 'short' if han_characters <= 100 else 'medium' if han_characters <= 250 else 'long'}

def parse_post(post):
    rendered = post['content']['rendered']
    tokens = []
    cursor = 0
    for match in RUBY.finditer(rendered):
        between = clean(rendered[cursor:match.start()])
        if between:
            tokens.append({'text': re.sub(r'\s+', '', between), 'plain': True})
        attrs = {key: html.unescape(value) for key, value in ATTR.findall(match.group('attrs'))}
        simplified = SI.search(match.group('body'))
        if simplified:
            tokens.append({
                'text': clean(simplified.group(1)),
                'pinyin': attrs.get('pinyin', ''),
                'definition': attrs.get('definition', ''),
                'oldHsk': attrs.get('oldhsk', ''),
                'newHsk': attrs.get('newhsk', ''),
            })
        cursor = match.end()
    tail = clean(rendered[cursor:])
    if tail:
        tokens.append({'text': re.sub(r'\s+', '', tail), 'plain': True})

    lines, current = [], []
    for token in tokens:
        text = token['text']
        if token.get('plain') and text:
            parts = re.split(r'(?<=[。！？!?])', text)
            for part in parts:
                if not part: continue
                current.append({**token, 'text': part})
                if re.search(r'[。！？!?]$', part):
                    lines.append(current); current = []
        else:
            current.append(token)
    if current: lines.append(current)

    return {
        'id': f"mandarinbean:{post['id']}",
        'wpId': post['id'],
        'slug': post['slug'],
        'titleEn': html.unescape(post['title']['rendered']),
        'url': post['link'],
        'lines': [{
            'zh': ''.join(t['text'] for t in line),
            'py': ' '.join(t.get('pinyin', '') for t in line if t.get('pinyin')),
            'tokens': [t for t in line if not t.get('plain')],
        } for line in lines if ''.join(t['text'] for t in line).strip()],
    }

SAMPLE = {
    21311: (1, "我没笑", "No me reí",
        "Xiao Wang came home from school. His mother asked how his day had gone, and he told her, “A child fell into the water today. All my classmates laughed; I was the only one who didn’t.” His mother was pleased: “Good boy. Of course we mustn’t laugh at others. Who fell into the water?” Xiao Wang said, “Me.”",
        "Xiao Wang volvió a casa de la escuela. Su madre le preguntó cómo le había ido y él le dijo: «Hoy un niño cayó al agua. Todos mis compañeros se rieron; solo yo no me reí». Su madre se alegró: «Buen chico. Claro que no debemos reírnos de los demás. ¿Quién cayó al agua?». Xiao Wang respondió: «Yo».") ,
    21195: (1, "爸爸的工作", "El trabajo de papá",
        "The teacher asked a five-year-old girl, “What does your father do?” The girl said, “Whatever my mother tells him to do, he does.”",
        "La maestra le preguntó a una niña de cinco años: «¿A qué se dedica tu papá?». La niña respondió: «Hace todo lo que mi mamá le dice que haga».") ,
    19954: (1, "我是谁", "Quién soy",
        "My name is David Li. I am American, but I grew up in Japan, attended university in Britain, and now work in China. I studied history and English at university and now teach English. I like my job very much. The students are wonderful, and so is the school.",
        "Me llamo David Li. Soy estadounidense, pero crecí en Japón, estudié en una universidad británica y ahora trabajo en China. Estudié historia e inglés en la universidad y ahora soy profesor de inglés. Me gusta mucho mi trabajo. Los estudiantes son estupendos y la escuela también."),
    16943: (1, "你认识他们吗", "¿Los conoces?",
        "Do you know these two people? She is my Chinese teacher, Ms. Wang; he is my younger brother’s English teacher, Mr. Li. Ms. Wang is very pretty. She is twenty-eight and enjoys traveling and running. Mr. Li is tall, thirty-two, and works at a university. They have known each other for five years and have a daughter and a son. Their daughter is one and their son is three. The children can speak both Chinese and English. Ms. Wang and Mr. Li are both very nice people, and my brother and I like them very much.",
        "¿Conoces a estas dos personas? Ella es mi profesora de chino, la señora Wang; él es el profesor de inglés de mi hermano menor, el señor Li. La señora Wang es muy bonita. Tiene veintiocho años y le gusta viajar y correr. El señor Li es alto, tiene treinta y dos años y trabaja en una universidad. Se conocen desde hace cinco años y tienen una hija y un hijo. La hija tiene un año y el hijo tres. Los niños hablan chino e inglés. Ambos profesores son muy buenas personas, y a mi hermano y a mí nos caen muy bien."),
    14995: (1, "你长大了", "Ya has crecido",
        "A child often asks his parents for money to buy things. One day he again asked his father for money: “Dad, give me fifty cents. I want to buy something to eat.” His father said, “You’re ten and already grown up. You asked for fifty cents yesterday, again today, and you’ll ask again tomorrow. That isn’t good, is it? Would a big kid do that?” The child thought and said, “Dad, you’re right. That isn’t good. I’m a big kid now, so give me five yuan today!”",
        "Un niño les pide con frecuencia dinero a sus padres para comprar cosas. Un día volvió a pedirle dinero a su padre: «Papá, dame cincuenta centavos. Quiero comprar algo de comer». Su padre dijo: «Tienes diez años y ya eres mayor. Ayer pediste cincuenta centavos, hoy otra vez y mañana volverás a pedirlos. Eso no está bien, ¿verdad? ¿Un niño mayor haría eso?». El niño lo pensó y dijo: «Papá, tienes razón. Eso no está bien. Ya soy mayor, ¡así que hoy dame cinco yuanes!»."),
    22102: (2, "中国孩子太胖了", "Los niños chinos tienen sobrepeso",
        "Nowadays, children in China are a little too overweight, and boys are heavier than girls. Many parents think a slightly heavier child is a good thing because being plump looks healthy. Doctors, however, say that being too overweight is unhealthy. In places such as Hunan, children consume a lot of oil, so there are many overweight children. Why do children gain weight? First, they eat too quickly and too much. Second, many prefer playing on their phones to exercising. Third, if their parents are overweight, the children may be too. Excess weight can make people ill. Everyone should exercise more, eat more fruit and vegetables, and eat slowly.",
        "Actualmente, los niños en China tienen un poco de sobrepeso, y los niños pesan más que las niñas. Muchos padres creen que un niño algo rellenito es algo bueno porque parece saludable. Sin embargo, los médicos dicen que demasiado peso es perjudicial. En lugares como Hunan, los niños consumen mucho aceite, por lo que hay muchos niños con sobrepeso. ¿Por qué engordan? Primero, comen demasiado rápido y demasiado. Segundo, muchos prefieren jugar con el teléfono en vez de hacer ejercicio. Tercero, si sus padres tienen sobrepeso, ellos también podrían tenerlo. El exceso de peso puede causar enfermedades. Todos deberían hacer más ejercicio, comer más frutas y verduras y comer despacio."),
    22106: (2, "游泳课", "La clase de natación",
        "A boy went to his first swimming lesson. After thirty minutes he told the teacher, “I don’t want to swim anymore today.” The teacher asked, “Why?” The boy replied, “I really don’t want to drink any more water. I’ve drunk too much today.”",
        "Un niño fue a su primera clase de natación. Después de treinta minutos le dijo al profesor: «Hoy ya no quiero nadar». El profesor preguntó: «¿Por qué?». El niño respondió: «De verdad no quiero beber más agua. Hoy ya he bebido demasiada»."),
    21997: (2, "你爸爸多大", "¿Cuántos años tiene tu papá?",
        "The teacher asked Xiao Ming, “How old is your father this year?” Xiao Ming said, “The same age as me. He is seven.” The teacher asked, “Why?” Xiao Ming replied, “Because he only became a father on the day I was born!”",
        "La maestra le preguntó a Xiao Ming: «¿Cuántos años tiene tu papá?». Xiao Ming respondió: «La misma edad que yo. Tiene siete». La maestra preguntó: «¿Por qué?». Xiao Ming dijo: «¡Porque solo se convirtió en papá el día que yo nací!»."),
    21884: (2, "冰淇淋", "Helado",
        "A mother and her son met an elderly neighbor. The woman liked the chubby boy and gave him an ice cream. His mother said, “Grandma gave you an ice cream. What should you say?” The boy looked at her and asked, “Do you have any more?”",
        "Una madre y su hijo se encontraron con una vecina mayor. A la señora le gustó el niño regordete y le regaló un helado. La madre dijo: «La abuela te dio un helado. ¿Qué deberías decir?». El niño miró a la señora y preguntó: «¿Tiene más?»."),
    21739: (2, "别说话", "Dejen de hablar",
        "While the teacher was teaching, two students were talking. The teacher told them, “Stop talking!” A little later they started again. Slightly angry, the teacher said, “Come up here and talk; I’ll go down there and listen.” The students said, “But we aren’t teachers.” The teacher replied, “If you aren’t teachers, why do you keep talking?” They answered, “That’s why we’re talking down here.”",
        "Mientras el profesor daba clase, dos estudiantes hablaban. El profesor les dijo: «¡Dejen de hablar!». Poco después comenzaron otra vez. Algo enojado, el profesor dijo: «Suban aquí a hablar; yo bajaré a escucharlos». Los estudiantes dijeron: «Pero nosotros no somos profesores». El profesor respondió: «Si no son profesores, ¿por qué hablan todo el tiempo?». Ellos contestaron: «Por eso hablamos aquí abajo»."),
}

def sample_books(posts):
    source_posts = {post['id']: post for post in posts}
    parsed = {post['wpId']: post for post in map(parse_post, posts)}
    books = []
    for level in (1, 2):
        chapters = []
        for wp_id, (item_level, title_zh, title_es, en, es) in SAMPLE.items():
            if item_level != level or wp_id not in parsed: continue
            article = parsed[wp_id]
            all_tokens = [token for line in article['lines'] for token in line['tokens']]
            unique = {}
            for token in all_tokens:
                key = (token['text'], token['pinyin'])
                unique[key] = {'h': token['text'], 'p': token['pinyin'], 'en': token['definition'], 'es': token['definition'], 'oldHsk': token['oldHsk'], 'newHsk': token['newHsk']}
            zh_lines = []
            for source_line in article['lines']:
                line = dict(source_line)
                if line['zh'].startswith('”') and zh_lines:
                    zh_lines[-1]['zh'] += '”'
                    line['zh'] = line['zh'][1:]
                if not line['zh'].strip(): continue
                if re.fullmatch(r'[”"’\']+', line['zh']) and zh_lines:
                    zh_lines[-1]['zh'] += line['zh']
                else:
                    zh_lines.append(line)
            def align_translation(text):
                sentences = [part.strip() for part in re.findall(r'.+?(?:[.!?](?:[”"»])?|$)(?:\s+|$)', text) if part.strip()]
                if len(zh_lines) == 1: return [text]
                if len(sentences) <= 1: return [text] + [''] * (len(zh_lines) - 1)
                zh_sizes = [max(1, len(line['zh'])) for line in zh_lines]
                tr_sizes = [max(1, len(sentence)) for sentence in sentences]
                zh_total, tr_total = sum(zh_sizes), sum(tr_sizes)
                groups, start, tr_before, zh_before = [], 0, 0, 0
                for index, zh_size in enumerate(zh_sizes):
                    if index == len(zh_sizes) - 1:
                        groups.append(' '.join(sentences[start:])); break
                    zh_before += zh_size
                    target = zh_before / zh_total
                    maximum = len(sentences) - (len(zh_sizes) - index - 1)
                    best = min(range(start + 1, max(start + 2, maximum + 1)),
                               key=lambda end: abs((tr_before + sum(tr_sizes[start:end])) / tr_total - target))
                    groups.append(' '.join(sentences[start:best]))
                    tr_before += sum(tr_sizes[start:best]); start = best
                return groups
            aligned_en, aligned_es = align_translation(en), align_translation(es)
            sentence_rows = [{'zh': line['zh'], 'py': line['py'], 'en': aligned_en[index] if index < len(aligned_en) else '', 'es': aligned_es[index] if index < len(aligned_es) else ''} for index, line in enumerate(zh_lines)]

            def han_count(text): return len(re.findall(r'[\u3400-\u9fff]', text))
            def split_chinese(text):
                if han_count(text) <= 25: return [text]
                clauses = [part for part in re.findall(r'.+?[，；：]|.+$', text) if part]
                blocks, current = [], ''
                for clause in clauses:
                    if current and han_count(current) >= 10 and han_count(current + clause) > 25:
                        blocks.append(current); current = clause
                    else:
                        current += clause
                if current: blocks.append(current)
                return blocks

            def align_clauses(text, chinese_parts):
                if len(chinese_parts) == 1: return [text]
                pieces = [part.strip() for part in re.findall(r'.+?(?:[,;:](?:[”"»])?|[.!?](?:[”"»])?|$)(?:\s+|$)', text) if part.strip()]
                if len(pieces) <= 1: return [text] + [''] * (len(chinese_parts) - 1)
                zh_sizes = [max(1, han_count(part)) for part in chinese_parts]
                tr_sizes = [max(1, len(part)) for part in pieces]
                groups, start, used = [], 0, 0
                for index, zh_size in enumerate(zh_sizes):
                    if index == len(zh_sizes) - 1:
                        groups.append(' '.join(pieces[start:])); break
                    target = sum(zh_sizes[:index + 1]) / sum(zh_sizes)
                    last = max(start + 1, len(pieces) - (len(zh_sizes) - index - 1))
                    choices = range(start + 1, min(len(pieces), last) + 1)
                    best = min(choices, key=lambda end: abs((used + sum(tr_sizes[start:end])) / sum(tr_sizes) - target))
                    groups.append(' '.join(pieces[start:best])); used += sum(tr_sizes[start:best]); start = best
                return groups

            adaptive_rows = []
            for row in sentence_rows:
                parts = split_chinese(row['zh'])
                en_parts, es_parts = align_clauses(row['en'], parts), align_clauses(row['es'], parts)
                if len(parts) > 1 and (any(not value for value in en_parts) or any(not value for value in es_parts)):
                    parts, en_parts, es_parts = [row['zh']], [row['en']], [row['es']]
                syllables, offset = row['py'].split(), 0
                for index, part in enumerate(parts):
                    count = han_count(part)
                    part_py = ' '.join(syllables[offset:offset + count]); offset += count
                    adaptive_rows.append({'zh': part, 'py': part_py, 'en': en_parts[index] if index < len(en_parts) else '', 'es': es_parts[index] if index < len(es_parts) else ''})

            reading_rows = []
            for row in adaptive_rows:
                previous = reading_rows[-1] if reading_rows else None
                can_merge = (previous and han_count(previous['zh']) < 10 and han_count(row['zh']) < 10
                             and han_count(previous['zh'] + row['zh']) <= 25
                             and not re.search(r'[“”"？?！!]', previous['zh'] + row['zh']))
                if can_merge:
                    previous['zh'] += row['zh']; previous['py'] = f"{previous['py']} {row['py']}".strip()
                    previous['en'] = f"{previous['en']} {row['en']}".strip(); previous['es'] = f"{previous['es']} {row['es']}".strip()
                else:
                    reading_rows.append(row)
            source_meta = source_taxonomy(source_posts[wp_id], level)
            metadata = {'source': source_meta,
                        'calculated': calculated_metadata(reading_rows, list(unique.values()), article['lines']),
                        'contentType': 'humor' if 'Fun' in source_meta['topics'] else
                                       'story' if 'Story' in source_meta['topics'] else 'informational'}
            chapters.append({
                'id': article['id'], 'number': len(chapters) + 1, 'titleZh': title_zh,
                'titleEn': article['titleEn'], 'titleEs': title_es, 'sourceUrl': article['url'],
                'tags': [f'HSK {level}', 'Mandarin Bean', *metadata['source']['topics']],
                'metadata': metadata, 'vocabulary': list(unique.values()),
                'lines': reading_rows,
            })
        books.append({'id': f'mandarinbean-hsk{level}', 'kind': 'online-collection', 'source': 'Mandarin Bean',
            'titleZh': f'Mandarin Bean · HSK {level}', 'titleEn': f'Mandarin Bean · HSK {level}',
            'titleEs': f'Mandarin Bean · HSK {level}', 'chapters': chapters})
    return books

if __name__ == '__main__':
    posts = json.load(sys.stdin)
    if len(sys.argv) == 3 and sys.argv[1] == '--append-sample':
        path = sys.argv[2]
        with open(path, encoding='utf-8') as handle: existing = json.load(handle)
        existing = [book for book in existing if not str(book.get('id', '')).startswith('mandarinbean-')]
        existing.extend(sample_books(posts))
        with open(path, 'w', encoding='utf-8') as handle: json.dump(existing, handle, ensure_ascii=False, indent=2)
        print(f'Added Mandarin Bean sample collections to {path}')
    else:
        json.dump([parse_post(post) for post in posts], sys.stdout, ensure_ascii=False, indent=2)
