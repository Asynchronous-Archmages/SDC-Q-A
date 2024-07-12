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
      maxVUs: 1000,
      gracefulStop: '30s',
    },
  },
};

let questionId = 1; // Change this to a valid question ID

//export let failedRequests = new Rate('failed_requests');

export default function () {
http.get(`http://127.0.0.1:3000/answers/${questionId}`);

/*    let success = check(res, {
  'status is 200': (r) => r.status === 200,
    'response contains question_id': (r) => r.json().question === questionId,
  });

  if (!success) {
    console.log(`Request failed for question_id: ${questionId}, status: ${res.status}, body: ${res.body}`);
    failedRequests.add(1);
  }
*/
  // Optionally, increment the questionId for next iteration
  questionId++;
}