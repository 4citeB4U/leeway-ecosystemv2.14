import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<300'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/');
  check(res, { 'status is 2xx or 3xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(0.2);
}
