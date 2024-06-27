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
1. run db.sql to create qna database and the tables: psql -U <username> -d postgres -f db.sql
2. After qna database is created, connect to qna database by psql -U <username> -d qna
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