import base64
import json
import sqlite3
import os

import psycopg2

registered = [
    "RaindropsSys",
]

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


print("Initializing database...")

conn = psycopg2.connect(database="derpibooru")
db = conn.cursor()

print("Creating taggings index...")
db.execute("""
CREATE INDEX IF NOT EXISTS taggings_index ON image_taggings (image_id) INCLUDE (tag_id)
""")

print("Creating tags index...")
db.execute("""
CREATE INDEX IF NOT EXISTS tags_index ON tags (id) INCLUDE (name)
""")

print("Opening tags database...")

os.system("rm -rf /app/prisbeam")
os.system("rm -rf /prisbeam")
os.system("mkdir -p /prisbeam")
os.system("mkdir -p /prisbeam/common")
os.system("mkdir -p /prisbeam/users")

if os.path.exists(f"/prisbeam/common/tags.db"):
    os.remove(f"/prisbeam/common/tags.db")
db2 = sqlite3.connect(f"/prisbeam/common/tags.db")
db2.execute("CREATE TABLE tags (json LONGTEXT)")
db2.execute("CREATE TABLE aliases (json LONGTEXT)")
db2.execute("CREATE TABLE implications (json LONGTEXT)")

print("Building list of tags... Step 1/3")
db.execute("""
SELECT *
FROM tags
""")
data = list(map(lambda x: dict_factory(db, x), db.fetchall()))
for tag in data:
    tag['id'] = int('10' + str(tag['id']))
    db2.execute("INSERT INTO tags VALUES ('" + base64.b64encode(bytes(json.dumps(tag), 'utf-8')).decode('utf-8') + "')")

print("Building list of tags... Step 2/3")
db.execute("""
SELECT *
FROM tag_aliases
""")
data = list(map(lambda x: dict_factory(db, x), db.fetchall()))
for tag in data:
    tag['tag_id'] = int('10' + str(tag['tag_id']))
    tag['target_tag_id'] = int('10' + str(tag['target_tag_id']))
    db2.execute("INSERT INTO aliases VALUES ('" + base64.b64encode(bytes(json.dumps(tag), 'utf-8')).decode('utf-8') + "')")

print("Building list of tags... Step 3/3")
db.execute("""
SELECT *
FROM tag_implications
""")
data = list(map(lambda x: dict_factory(db, x), db.fetchall()))
for tag in data:
    tag['tag_id'] = int('10' + str(tag['tag_id']))
    tag['target_tag_id'] = int('10' + str(tag['target_tag_id']))
    db2.execute("INSERT INTO implications VALUES ('" + base64.b64encode(bytes(json.dumps(tag), 'utf-8')).decode('utf-8') + "')")

print("Saving...")
db2.commit()
db2.close()

print("Gathering user list...")
db.execute("""
SELECT *
FROM public.users
""")

users = list(filter(lambda x: x['name'] in registered, map(lambda x: dict_factory(db, x), db.fetchall())))

for user in users:
    print(f"{user['name']}: Initialising database...");

    if os.path.exists(f"/prisbeam/users/{user['name']}.db"):
        os.remove(f"/prisbeam/users/{user['name']}.db")

    db2 = sqlite3.connect(f"/prisbeam/users/{user['name']}.db")
    db2.execute("CREATE TABLE images (json LONGTEXT)")

    print(f"{user['name']}: Fetching data...")

    db.execute(f"""
    SELECT *
    FROM image_faves
    JOIN image_intensities ON image_faves.image_id = image_intensities.image_id
    JOIN images ON image_faves.image_id = images.id
    JOIN users ON images.user_id = users.id
    WHERE image_faves.user_id = {user['id']}
    """)
    data = list(map(lambda x: dict_factory(db, x), db.fetchall()))

    i = 0
    l = len(data)

    for image in data:
        print(f"{user['name']}: Processing image #{image['image_id']} ({round((i / l) * 100)}%)")

        db.execute(f"""
        SELECT tags.id, tags.name
        FROM image_taggings
        JOIN tags ON image_taggings.tag_id = tags.id
        WHERE image_taggings.image_id = {image['image_id']}
        """)
        tags = list(map(lambda x: dict_factory(db, x), db.fetchall()))

        db.execute(f"""
        SELECT source
        FROM image_sources
        WHERE image_sources.image_id = {image['image_id']}
        """)
        sources = list(map(lambda x: dict_factory(db, x), db.fetchall()))

        dic = {
            'wilson_score': 0,
            'spoilered': False,
            'representations': {
                'full': f"{image['version_path']}full.{image['image_format']}",
                'large': f"{image['version_path']}large.{image['image_format']}",
                'medium': f"{image['version_path']}medium.{image['image_format']}",
                'small': f"{image['version_path']}small.{image['image_format']}",
                'tall': f"{image['version_path']}tall.{image['image_format']}",
                'thumb': f"{image['version_path']}thumb.{image['image_format']}",
                'thumb_small': f"{image['version_path']}thumb_small.{image['image_format']}",
                'thumb_tiny': f"{image['version_path']}thumb_tiny.{image['image_format']}",
            },
            'faves': 0,
            'aspect_ratio': image['image_aspect_ratio'],
            'duration': 0,
            'thumbnails_generated': True,
            'tags': list(map(lambda x: x['name'], tags)),
            'created_at': image['created_at'].isoformat(),
            'tag_count': 0,
            'downvotes': image['downvotes'],
            'id': int('10' + str(image['image_id'])),
            'source_id': image['image_id'],
            'source': 'https://derpibooru.org/images/%s',
            'source_name': 'Derpibooru',
            'name': image['image_name'],
            'width': image['image_width'],
            'intensities': {
                'ne': image['ne_intensity'],
                'nw': image['nw_intensity'],
                'se': image['se_intensity'],
                'sw': image['sw_intensity']
            },
            'orig_sha512_hash': image['image_orig_sha512_hash'],
            'deletion_reason': None,
            'processed': True,
            'animated': None,
            'height': image['image_height'],
            'description': '',
            'sha512_hash': image['image_sha512_hash'],
            'source_urls': list(map(lambda x: x['source'], sources)) if len(list(map(lambda x: x['source'], sources))) else [],
            'upvotes': image['upvotes'],
            'source_url': list(map(lambda x: x['source'], sources))[0] if len(list(map(lambda x: x['source'], sources))) else '',
            'uploader_id': image['user_id'],
            'score': image['score'],
            'uploader': image['name'],
            'first_seen_at': image['created_at'].isoformat(),
            'mime_type': image['image_mime_type'],
            'duplicate_of': None,
            'size': image['image_size'],
            'comment_count': image['comment_count'],
            'view_url': f"{image['version_path'][:-1].replace('/img/', '/img/view/')}.{image['image_format']}",
            'hidden_from_users': False,
            'updated_at': image['updated_at'].isoformat(),
            'tag_ids': list(map(lambda x: int('10' + str(x['id'])), tags)),
            'format': image['image_format'],
        }

        db2.execute("INSERT INTO images VALUES ('" + base64.b64encode(bytes(json.dumps(dic), 'utf-8')).decode('utf-8') + "')")
        i += 1

    print(f"{user['name']}: Saving...")

    db2.commit()
    db2.close()
    print(f"{user['name']}: Finished.")

db.close()
print("Moving...")
os.system("cp -rv /prisbeam/* /app/prisbeam")
os.system("rm -rf /prisbeam")
print("Done!")
