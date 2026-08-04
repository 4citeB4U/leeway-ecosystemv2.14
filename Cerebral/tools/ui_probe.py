import requests

urls = [
    'http://127.0.0.1:8765/',
    'http://127.0.0.1:8765/assets/index-BFDBzwnO.js',
    'http://127.0.0.1:8765/assets/vendor-e7mm1T1i.js',
    'http://127.0.0.1:8765/assets/MetallicBackground-BkJobBbb.js',
    'http://127.0.0.1:8765/assets/Screensaver-CTiDEBsD.js',
    'http://127.0.0.1:8765/assets/Window-bGGeYsdN.js',
    'http://127.0.0.1:8765/assets/index-RF6BIc17.css'
]

for u in urls:
    try:
        r = requests.head(u, timeout=5)
        print(u, r.status_code, r.headers.get('Content-Type'))
    except Exception as e:
        print(u, 'ERROR', e)
