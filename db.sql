CREATE DATABASE IF NOT EXISTS qna;

\c qna

CREATE TABLE IF NOT EXISTS questions (
question_id SERIAL PRIMARY KEY,
product_id INT,
question_body TEXT NOT NULL,
question_date TIMESTAMP NOT NULL,
asker_name VARCHAR(255) NOT NULL,
asker_email VARCHAR(255) NOT NULL,
reported BOOLEAN DEFAULT FALSE,
question_helpfulness INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS answers (
answer_id SERIAL PRIMARY KEY,
question_id INT REFERENCES questions(question_id) ON DELETE CASCADE,
body TEXT NOT NULL,
date TIMESTAMP NOT NULL,
answerer_name VARCHAR(255) NOT NULL,
answerer_email VARCHAR(255) NOT NULL,
reported BOOLEAN DEFAULT FALSE,
helpfulness INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS photos (
photo_id SERIAL PRIMARY KEY,
answer_id INT REFERENCES answers(answer_id) ON DELETE CASCADE,
url TEXT NOT NULL
);


/*
Notes on ETL
1. run db.sql to create a new database and the tables: psql -U <username> -d postgres -f db.sql
2. After the database is created, connect to it by psql -U <username> -d <db name>
3. Check db: \d
4. Check table: \dt

5. Load data from .csv to a temporary table as the data in 'date' column are not in timestamp format but in miliseconds; also, csv uses 0 and 1 to represent false and ture while we want false and true in the db.
*5 CREATE TABLE staging_questions (
  question_id SERIAL PRIMARY KEY,
  product_id INT,
  question_body TEXT NOT NULL,
  question_date BIGINT NOT NULL,
  asker_name VARCHAR(255) NOT NULL,
  asker_email VARCHAR(255) NOT NULL,
  reported INT DEFAULT 0,
  question_helpfulness INT DEFAULT 0
)

6. Load data from questions.csv into staging_questions:
- COPY staging_questions
  FROM 'path to csv'
  DELIMITER ','
  CSV HEADER;

7. check ETL process
- SELECT * FROM staging_answers LIMIT 10;
- wc -l answers.csv => 6879306 lines
- SELECT COUNT(*) FROM staging_answers;
count
---------
 6879306

8. Load data from staging_questions into questions table and convert question_date to timestamp and reported to boolean values
- INSERT INTO questions
  SELECT  question_id,
          product_id,
          question_body,
          to_timestamp(question_date/1000),
          asker_name,
          asker_email,
          reported::boolean,
          question_helpfulness
  FROM staging_questions;

9. Check questions table:
- SELECT * FROM questions LIMIT 10;
- SELECT COUNT(*) FROM questions;

10. Repeat the same process for the other two tables
*/

/*
Command Line Query
SELECT json_build_object (
  'product_id', q.product_id,
  'result', json_agg(
    json_build_object(
      'question_id', q.question_id,
      'question_body', q.question_body,
      'question_date', q.question_date,
      'asker_name', q.asker_name,
      'question_helpfulness', q.question_helpfulness,
      'reported', q.reported,
      'answers', (SELECT json_object_agg(
        a.answer_id, json_build_object(
        'id', a.answer_id,
        'body', a.body,
        'date', a.date,
        'answerer_name', a.answerer_name,
        'helpfulness', a.helpfulness,
        'photos', (SELECT json_agg
        (p.url) FROM photos p WHERE p.answer_id = a.answer_id
        )
        )) FROM answers a
        WHERE a.question_id = q.question_id
      )
      )
  )
  ) AS result
FROM questions q
WHERE q.product_id = 5
GROUP BY q.product_id
LIMIT 5;

SELECT json_build_object (
  'product_id', q.product_id,
  'result', json_agg(
    json_build_object(
      'question_id', q.question_id,
      'question_body', q.question_body,
      'question_date', q.question_date,
      'asker_name', q.asker_name,
      'question_helpfulness', q.question_helpfulness,
      'reported', q.reported
    )
   )
  ) AS result
FROM questions q
WHERE q.product_id = 5
GROUP BY q.product_id
LIMIT 5;

INSERT INTO questions (product_id, question_body, question_date, asker_name, asker_email)
VALUES (10, 'is it made in the US?', '2024-07-01', 'Jojo', 'jojo@gmail.com');

SELECT MAX(question_id) FROM questions;
SELECT setval('questions_question_id_seq', (SELECT MAX(question_id) FROM questions));

Update questions
SET question_helpfulness = question_helpfulness + 1
WHERE question_id = 2;




WITH answers_photos AS (
  SELECT
  a.question_id,
  a.answer_id,
  a.body,
  a.date,
  a.answerer_name,
  a.helpfulness,
  json_agg(
    json_build_object(
    'id', p.photo_id,
    'url', p.url
    )
  ) AS photos
FROM answers a
LEFT JOIN photos p ON p.answer_id = a.answer_id
WHERE a.question_id = 6879300 AND a.reported = FALSE
GROUP BY
a.answer_id
),
paginated_answers AS (
  SELECT ap.*
  FROM answers_photos ap
  ORDER BY ap.helpfulness DESC, ap.date DESC
  LIMIT 5 OFFSET (1-1)*5
)
SELECT json_build_object (
  'question', 1,
  'page', 1,
  'count', 5,
  'results', json_agg(
    json_build_object(
      'answer_id', pa.answer_id,
      'body', pa.body,
      'date', pa.date,
      'answerer_name', pa.answerer_name,
      'helpfulness', pa.helpfulness,
      'photos', COALESCE (pa.photos, '[]' :: json)
    )
  )
)
FROM paginated_answers pa;
(GROUP BY pa.question_id) -- optional

INSERT INTO answers (question_id, body, date, answerer_name, answerer_email)
VALUES (10, 'what is the best color', '2024-07-02', 'Lyn', 'lyn@gmail.com')
RETURNING answer_id;

INSERT INTO photos (answer_id, url)
VALUES (6879307, 'https://unsplash.com/photos/a-person-swimming-in-the-ocean-with-a-camera-NhWxAIs61MM'),
(6879307, 'https://unsplash.com/photos/man-sitting-on-rock-surrounded-by-water--Q_t4SCN8c4');

UPDATE answers
SET helpfulness = helpfulness + 1
WHERE answer_id = 10;

UPDATE answers
SET reported = TRUE
WHERE answer_id = 6879307;