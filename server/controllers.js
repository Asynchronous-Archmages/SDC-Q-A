const pool = require('./db');

const getQuestions = (req, res) => {
  const productId = req.params.product_id;
  const queryString = `
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
  WHERE q.product_id = $1
  GROUP BY q.product_id;`
  ;

  pool.connect()
  .then(client => {
    return client.query(queryString, [productId])
      .then(result => {
        client.release();
        res.status(200).json(result.rows[0].result);
      })
      .catch(error => {
        client.release();
        console.log(error);
        res.status(500).send('Error fetching questions');
      });
  })
  .catch(error => {
    console.log(error);
    res.status(500).send('Error connecting to the database');
  });
};

const getAnswers = (req, res) => {
  const questionId = req.params.question_id;
  const limitValue = parseInt(req.query.count) || 5;
  const page = parseInt(req.query.page) || 1;
  const offsetValue = (page - 1)*limitValue;

  const queryString = `
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
WHERE a.question_id = $1 AND a.reported = FALSE
GROUP BY
a.answer_id
),
paginated_answers AS (
  SELECT ap.*
  FROM answers_photos ap
  ORDER BY ap.helpfulness DESC, ap.date DESC
  LIMIT $2 OFFSET $3
)
SELECT json_build_object (
  'question', $4::int,
  'page', $5::int,
  'count', $6::int,
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
`;

pool.connect()
  .then(client =>{
    return client.query(queryString, [questionId, limitValue, offsetValue, questionId, page, limitValue])
    .then(result => {
      res.status(200).json(result.rows[0]);
      client.release();
    })
    .catch(error => {
      client.release();
      console.log(error);
      res.status(500).send('Error fetching answers');
    })
  })
  .catch(error => {
    console.log('Error connecting to database');
    res.status(500).send('Error connecting to database');
  })};

const formatDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth()+1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

const addQuestion = (req, res) => {
  const date = formatDate();
  const queryString = `
  INSERT INTO questions (product_id, question_body, question_date, asker_name, asker_email)
  VALUES ($1, $2, $3, $4, $5);
  `;
  const params = [
    req.params.product_id,
    req.body.question_body,
    date,
    req.body.asker_name,
    req.body.asker_email,
  ];

  pool.connect()
  .then(client => {
    return client.query(queryString, params)
    .then(result => {
      client.release();
      res.status(201).send('Question added successfully');
    })
    .catch(error => {
      client.release();
      res.status(500).send('Error adding question');
    })
  })
  .catch(error => {
    res.status(500).send('Error connecting to the database');
  })
};

const addAnswer = (req, res) => {
  const queryString1 =
  `INSERT INTO answers (question_id, body, date, answerer_name, answerer_email)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING answer_id;`;

  const date = formatDate();
  const params = [req.params.id, req.body.body, date, req.body.answerer_name, req.body.answerer_email];
  const photos = req.body.photos;

  pool.connect()
  .then(client => {
    return client.query(queryString1, params)
    .then(result => {
      const answerId = result.rows[0].answer_id;
      const photoQuery = photos.map(url => {
        return {
          text: `INSERT INTO photos (answer_id, url) VALUES ($1, $2);`,
          value: [answerId, url]
        };
      });

      return Promise.all(photoQuery.map(q=>client.query(q)))
      .then(result => {
        client.release();
        res.status(201).send('Answer and photos added successfully');
      })
      .catch(error => {
        console.log(error);
        res.status(500).send('Error adding photos');
      });
    })
    .catch(error => {
      client.release();
      console.error('Error inserting answer');
      res.status(500).send('Error adding answer');
    });
  })
  .catch(error => {
    console.error('Error connecting to the database');
    res.status(500).send('Error connecting to the database');
  });
};

const markQuestionHelpful = (req, res) => {
  const questionId = req.params.question_id;
  const queryString = `Update questions
SET question_helpfulness = question_helpfulness + 1
WHERE question_id = $1;`;

pool.connect()
  .then(client => {
    return client.query(queryString, [questionId])
      .then(result => {
        client.release();
        res.status(200).send('Question marked as helpful');
      })
      .catch(error => {
        console.log(error);
        client.release();
        res.status(500).send('Error marking the question as helpful');
      });
  })
  .catch(error => {
    console.log(error);
    res.status(500).send('Error connecting to the database');
  });
};

const markAnswerHelpful = (req, res) => {
  const answerId = req.params.answer_id;
  const queryString = `
    UPDATE answers
    SET helpfulness = helpfulness + 1
    WHERE answer_id = $1;
  `;

  pool.connect()
    .then(client => {
      return client.query(queryString, [answerId])
        .then(result => {
          client.release();
          res.status(200).send('Answer marked as helpful');
        })
        .catch(error => {
          client.release();
          console.error('Error executing query');
          res.status(500).send('Error marking answer as helpful');
        });
    })
    .catch(error => {
      console.error('Error connecting to the database');
      res.status(500).send('Error connecting to the database');
    });
};

const reportQuestion = (req, res) => {
  const queryString = `UPDATE questions
SET reported = TRUE
WHERE question_id = $1;`
  const questionId = req.params.question_id;

  pool.connect()
    .then(client => {
      return client.query(queryString, [questionId])
        .then(result => {
          client.release();
          res.status(200).send('Question reported successfully');
        })
        .catch(error => {
          client.release();
          console.error('Error executing query');
          res.status(500).send('Error reporting question');
        });
    })
    .catch(error => {
      console.error('Error connecting to the database');
      res.status(500).send('Error connecting to the database');
    });
};

const reportAnswer = (req, res) => {
  const queryString = `UPDATE answers
SET reported = TRUE
WHERE answer_id = $1;`
  const answerId = req.params.answer_id;

  pool.connect()
    .then(client => {
      return client.query(queryString, [answerId])
        .then(result => {
          client.release();
          res.status(200).send('Answer reported successfully');
        })
        .catch(error => {
          client.release();
          console.error('Error executing query');
          res.status(500).send('Error reporting answer');
        });
    })
    .catch(error => {
      console.error('Error connecting to the database');
      res.status(500).send('Error connecting to the database');
    });
};

  module.exports = {
    getQuestions,
    getAnswers,
    addQuestion,
    addAnswer,
    markQuestionHelpful,
    markAnswerHelpful,
    reportAnswer,
    reportQuestion,
  };

