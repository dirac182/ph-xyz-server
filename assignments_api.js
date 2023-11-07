import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";

const app = express();
const port = 5000;
app.use(cors());

// Database Stuff
mongoose.connect(process.env.DB_PATH);

const tqPairSchema = new mongoose.Schema({
    topicId: {
      type: Number,
      required: true
    },
    topic: {
      type: String,
      required: true
    },
    questions: {
      type: Number,
      required: true
    }
  });

  const questionSetSchema = new mongoose.Schema({
    topicId: {
        type: Number,
        required: true,
    },
    topic: {
        type: String,
        required: true
    },
    QIDArray: {
        type: [String],
        required: true
    }
});

  const assignmentSchema = new mongoose.Schema({
    userID: {
      type: String,
      required: true
    },
    assignmentName: {  // fixed the typo here
      type: String,
      required: true
    },
    tqPair: [tqPairSchema],  // array of tqPair objects
    quiz: {
      type: Boolean,
      required: true
    },
    timeLimit: Number,
    status: {
      type: Boolean,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    questionSet: [questionSetSchema],
    timeHr: {
      type: Number,
      required: true,
    },
    timeMin: {
      type: Number,
      required: true,
    },
    isPm: {
      type: Boolean,
      required: true,
    },
    classes: {
      type: [String],
      required: true
    }
  });

const Assignment = mongoose.model("Assignment", assignmentSchema);

// Middleware
app.use(bodyParser.json());

app.get("/get/assignments", async (req,res) => {
    const userId = req.query.userId;
    Assignment.find({userID: userId})
    .then ((assignments) => {
        console.log("fetch Assignments")
        res.status(200);
        res.json(assignments);
    })
    .catch((error) => {
      console.log("Error finding assignments:" + error)
    })
  })

  app.get("/get/assignmentById", async (req,res) => {
    const userId = req.query.userId;
    const assignmentId = req.query.assignmentId;
    Assignment.findOne({userID: userId, _id: assignmentId})
    .then ((assignment) => {
        console.log("GetByID", userId, assignmentId)
        res.json(assignment);
    })
    .catch((error) => {
      console.log("Error finding assignments:" + error)
    })
  })

  app.post("/create/assignment", async (req,res) => {
    console.log(req.body.classes)
    const newAssignment = new Assignment({
        userID: req.body.userID,
        assignmentName: req.body.name,
        tqPair: req.body.tqPair,
        quiz: req.body.quiz,
        timeLimit: req.body.timeLimit,
        dueDate: req.body.dueDate,
        timeHr: req.body.timeHr,
        timeMin: req.body.timeMin,
        isPm: req.body.isPm,
        status: req.body.status,
        questionSet: req.body.questionSet,
        classes: req.body.classes
    });
    console.log(newAssignment)
    newAssignment.save()
    .then((doc) => {
      console.log(doc)
      res.status(200).send(doc._id);
    })
    .catch((error) => {
      console.log(error)
      res.status(404).json( error);
    })
    
  })

  app.post("/edit/assignment", async (req,res) => {
    const uID = req.query.userID;
    const aID = req.query.assignmentID;
    const updatedData = {
        assignmentName: req.body.name,
        tqPair: req.body.tqPair,
        quiz: req.body.quiz,
        timeLimit: req.body.timeLimit,
        dueDate: req.body.dueDate,
        timeHr: req.body.timeHr,
        timeMin: req.body.timeMin,
        isPm: req.body.isPm,
        status: req.body.status,
        questionSet: req.body.questionSet,
        classes: req.body.classes
    };
    Assignment.findOneAndUpdate(
      {_id:aID, userID: uID}, 
      {$set: updatedData},
      { new: true, useFindAndModify: false })
      .then((doc)=> {
          res.status(200).send( doc);
        })
      .catch((error)=> {
          console.error("Error updating document:", error);
          res.status(500).send("Internal Server Error");
        })
    })

    app.post("/delete/assignment", (req,res) => {
      const uID = req.query.userID;
      const aID = req.query.assignmentID;
      Assignment.findOneAndDelete({ _id: aID, userID: uID })
      .then((doc)=> {
        console.log("Assignment deleted", doc);
        axios.post('http://localhost:5003/classes/update_on_assignment_delete', {
                        userId: uID,
                        assignmentId: aID,
                        classesToUpdate: doc.classes
                        })
        res.status(200).send("Assignment deleted successfully");
      })
      .catch((error)=> {
        console.log("Error deleting Assignment:", error);
        res.status(500).send("Internal Server Error");
      })
    })

app.listen(process.env.PORT, () =>{
    console.log(`Assignments Api server has successfully started on port ${port}.`)
})
export default Assignment;