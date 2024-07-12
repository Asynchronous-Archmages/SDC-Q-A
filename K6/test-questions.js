import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Define options for the load test
export let options = {
  scenarios: {
    constant_rps: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      gracefulStop: '30s',
    },
  },
};

let productId = 1; // Change this to a valid product ID

//export let failedRequests = new Rate('failed_requests');

export default function () {
http.get(`http://127.0.0.1:3000/questions/${productId}`);

/*  let success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response contains product_id': (r) => r.json().product_id === productId,
  });

  if (!success) {
    console.log(`Request failed for product_id: ${productId}, status: ${res.status}, body: ${res.body}`);
    failedRequests.add(1);
  }
*/
  // Optionally, increment the productId for next iteration
  productId++;
}