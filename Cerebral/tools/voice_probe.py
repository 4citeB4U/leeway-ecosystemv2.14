import requests, time

def main():
    time.sleep(1)
    try:
        r = requests.get('http://127.0.0.1:8765/voices', timeout=5)
        print('VOICES_STATUS', r.status_code)
        print(r.json())
        voices = r.json().get('voices', [])
        # prefer Microsoft David/Zira
        target = None
        for v in voices:
            if 'David' in v:
                target = v
                break
            if 'Zira' in v:
                target = v
                break
        if not target and voices:
            target = voices[0]
        if target:
            payload = {"text": "Testing chosen voice. Natural voice engaged.", "voice": target}
            r2 = requests.post('http://127.0.0.1:8765/speak', json=payload, timeout=30)
            print('SPEAK_STATUS', r2.status_code)
            print(r2.text)
    except Exception as e:
        print('ERROR', e)

if __name__ == '__main__':
    main()
