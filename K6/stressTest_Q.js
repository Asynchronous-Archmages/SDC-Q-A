import http from 'k6/http';
import { check, fail } from 'k6';
import { Rate } from 'k6/metrics';

export let options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 500,
      maxVUs: 1000,
      gracefulStop: '30s',
    },
  },
};

let productId = 1000011;
let decrement = 2;
let minProductId = 1;

export let failedRequests = new Rate('failed_requests');

export default function () {

  let res = http.get(`http://127.0.0.1:3000/questions/${productId}`);

  if (!check(res, { 'status is 200': (r) => r.status === 200 })) {
    console.log(`Request failed for productId: ${productId}, status: ${res.status}, body: ${res.body}`);
    failedRequests.add(1);
  }

  productId -= decrement;
  if (productId < minProductId) {
    productId = 1000010;
  }
}