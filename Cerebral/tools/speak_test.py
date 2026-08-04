import requests, json, time

def main():
    time.sleep(2)
    payload = {
        "text": "Cerebral OS Prime is now locked to my David Natural voice profile. Identity confirmed. All systems nominal."
    }
    try:
        r = requests.post('http://127.0.0.1:8765/speak', json=payload, timeout=30)
        print('STATUS', r.status_code)
        print(r.text)
    except Exception as e:
        print('ERROR', str(e))

if __name__ == '__main__':
    main()
