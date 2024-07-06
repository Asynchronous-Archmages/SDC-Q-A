require('dotenv').config();
const express = require('express');
const app = express();
const controllers = require('./controllers');

app.use(express.json());

app.get('/questions/:product_id', controllers.getQuestions);
app.get('/answers/:question_id', controllers.getAnswers);
app.post('/questions/:product_id', controllers.addQuestion);
app.post('/answers/:question_id', controllers.addAnswer);
app.put('/questions/:question_id/helpful', controllers.markQuestionHelpful);
app.put('/answers/:answer_id/helpful', controllers.markAnswerHelpful);
app.put('/questions/:question_id/report', controllers.reportQuestion);
app.put('/answers/:answer_id/report', controllers.reportAnswer);


app.listen(process.env.PORT, ()=>{
  console.log(`Server is running successfully on port ${process.env.PORT}`);
})
