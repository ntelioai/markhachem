import json, urllib.request, re, os, ssl
ssl._create_default_https_context = ssl._create_unverified_context
artists = [
    "Dario Pérez-Flores", "Victor Vasarely", "Miguel Chevalier", "Yoshiyuki Miura",
    "Julio Le Parc", "Antonio Asis", "Rafael Barrios", "Jose Margulis", "Patrick Hughes",
    "Patrick Rubinstein", "Helen Khal", "Leila Nseir", "Hussein Madi", "Alfred Basbous",
    "Ahmad Moualla", "Philippe Hiquily", "Roberto Matta", "Salvador Dalí",
    "Chaouki Chamoun", "Fatima El Hajj", "Zena Assi", "Leila Shawa", "Nedim Kufi",
    "Nasreddine Bennacer", "Ghazi Baker", "Wolfgang Stiller", "Victor Ekpuk",
    "Mathias Schmied", "Charbel Samuel Aoun", "Yves Hayat", "Jean-Paul Donadini",
    "Mauro Corda", "Dominique Polles", "Stefano Bombardieri", "Marwan Chamaa",
    "Bassam Kyrillos", "Aysegul Dinckok"
]
os.makedirs('assets/images/artists', exist_ok=True)
hdr = {'User-Agent': 'Mozilla/5.0'}
for a in artists:
    safe_name = a.lower().replace(' ', '-').replace('é', 'e').replace('í', 'i')
    try:
        url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(a + ' art')}"
        req = urllib.request.Request(url, headers=hdr)
        html = urllib.request.urlopen(req).read().decode('utf-8')
        match = re.search(r'vqd=([\d-]+)', html)
        if match:
            vqd = match.group(1)
            img_url = f"https://duckduckgo.com/i.js?q={urllib.parse.quote(a + ' art')}&vqd={vqd}"
            req2 = urllib.request.Request(img_url, headers=hdr)
            data = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
            if data.get('results'):
                real_img = data['results'][0]['image']
                req3 = urllib.request.Request(real_img, headers=hdr)
                img_data = urllib.request.urlopen(req3, timeout=5).read()
                with open(f"assets/images/artists/{safe_name}.jpg", 'wb') as f:
                    f.write(img_data)
                print(f"Downloaded {safe_name}.jpg")
    except Exception as e:
        print(f"Failed {a}: {e}")
