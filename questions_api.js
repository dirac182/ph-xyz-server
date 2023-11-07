import express, { Router } from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";

const questionsRouter = express.Router();
const port = process.env.PORT || 5001;
questionsRouter.use(cors());

mongoose.connect(process.env.DB_PATH);

const questionSchema = new mongoose.Schema({
    QID: {
      type: String,
      required: true,
      unique: true
    },
    QSubID:{
        type: String,
        required: true
    },
    QUnitPrimary: {
      type: String,
      required: true,
    },
    QUnitOthers: {
      type: [String],
    },
    QTopicPrimary: {
      type: String,
      required: true,
    },
    QTopicOthers: {
      type: [String],
    },
    QTags: {
      type: [String],
      required: true
    },
    QType:{
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true
    },
    prompt:{
        type: String,
        required: false
    },
    image: {
      type: String,
      required: false
    },
    choices: {
      type: [String],
      required: true
    },
    correctChoice: {
      type: String,
      required: true
    },
    correctChoiceIndex: {
      type: Number,
      required: true
    },
    skills: {
      type: [String],
      required: true
    },
    solution: {
      type: String,
      required: true
    }
  });

  const Question = mongoose.model("Question", questionSchema);

  // Middleware
questionsRouter.use(bodyParser.json());

// const giantList = [
//   {
//     "QID": "U1T1.2-58679",
//     "QSubID": "U1T1.2-58679|U1T1.2-58679",
//     "QUnitPrimary": "Unit 1",
//     "QUnitOthers": [],
//     "QTopicPrimary": "1.2",
//     "QTopicOthers": [],
//     "QTags": ["velocity", "displacement", "graph"],
//     "QType": "Multiple Choice",
//     "text": "An object moves on a straight path on a horizontal surface. The graph depicts the object's velocity with respect to time. What can be deduced about the object's displacement during the period shown in the graph?",
//     "prompt": "Plot a velocity vs time graph that starts at 5m/s and decreases linearly to -5m/s over a span of 10 seconds.",
//     "image": "https://lh3.googleusercontent.com/drive-viewer/AK7aPaCtS1Zy90tkKUtXCh99gWhdmNVh6R_JheNYCzix3b8o0jZRXF-8nN5Dd1708mVI9rW3ZlXBM5xUpig_GhhmOFl4dIDg3Q=s2560",
//     "choices": [
//       "The displacement is 0 m.",
//       "The displacement is 5 m.",
//       "The displacement is 10 m.",
//       "The displacement is 15 m.",
//       "The displacement depends on the initial position of the object."
//     ],
//     "correctChoice": "The displacement is 0 m.",
//     "correctChoiceIndex": 0,
//     "skills": ["EU4.A", "EK4.A.2", "LO4.A.2.3", "SP1", "SP1.4"],
//     "solution": "<h3>Area under the Curve:</h3><p>The area under a velocity-time graph gives the displacement of the object. In this case, the areas above and below the time axis cancel each other out, resulting in a total displacement of 0 m.</p>"
//   }
//  ]

// const questionsToInsert = giantList.map(q => ({
//     QID: q.QID,
//     QSubID: q.QSubID,
//     QUnitPrimary: q.QUnitPrimary,
//     QUnitOthers: q.QUnitOthers,
//     QTopicPrimary: q.QTopicPrimary,
//     QTopicOthers: q.QTopicOthers,
//     QTags: q.QTags,
//     QType: q.QType,
//     text: q.text,
//     image: q.image,
//     prompt: q.prompt,
//     choices: q.choices,
//     correctChoice: q.correctChoice,
//     correctChoiceIndex: q.correctChoiceIndex,
//     skills: q.skills,
//     solution: q.solution
// }));

// Question.insertMany(questionsToInsert)
//     .then(() => {
//         console.log("All questions saved!");
//     })
//     .catch(err => {
//         console.error("Error saving questions:", err);
//     });

questionsRouter.get("/get/AllQuestionIds", async (req,res) => {
    Question.find({}).select("QID")
    .then((QIDs) => {
        console.log("QIDs successfully fetched.");
        res.json(QIDs);
    })
    .catch((error) => {
        console.log("Error Fetching QIDs:", error);
        res.status(500).send("Internal Server Error");
    })
})

questionsRouter.get("/get/questionByTopic", async (req,res) => {
    const topicId = req.query.topicId;
    Question.findOne({QTopicPrimary: topicId})
    .then ((question) => {
        console.log(topicId)
        console.log("fetch Question",question)
        res.status(200).send("Fetched question successfully");
        res.json(question);
    })
    .catch((error) => {
      console.log("Error finding question:" + error)
      res.status(500).send("Internal Server Error");
    })
  })

  questionsRouter.get("/get/questionSetByIds", async (req,res) => {
    const idsArray = req.query.IdSet;
    const questionIds = idsArray.split(',');
    const questionArray = await Question.find({"QID": {$in: questionIds}}).then(questions => {return questions})
    console.log("Question Array successfully fetched");
    res.status(200).json(questionArray)
  })

export default Question;
module.exports = questionsRouter;