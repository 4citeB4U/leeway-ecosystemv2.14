import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 25,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<450'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/');
  check(res, { 'rtc route proxy reachable': (r) => r.status >= 200 && r.status < 500 });
  sleep(0.15);
}
