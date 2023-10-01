import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";

const app = express();
const port = 5000;
app.use(cors());

// Database Stuff
mongoose.connect("mongodb+srv://admin-bus:admin-pass@cluster0.tlilvc7.mongodb.net/assignmentsDB");

const tqPairSchema = new mongoose.Schema({
    id: {
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

  const assignmentSchema = new mongoose.Schema({
    assignmentID: {
      type: String,
      unique: true,  // if you want it to be unique
      required: true
    },
    userID: {
      type: Number,
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
    }
  });

const Assignment = mongoose.model("Assignment", assignmentSchema);

// Middleware
app.use(bodyParser.json());

app.get("/get/assignments", (req,res) => {
    Assignment.find({})
    .then ((assignments) => {
        console.log(assignments)
        res.json(assignments);
    })
    .catch((error) => {
      console.log("Error finding assignments:" + error)
    })
  })

  app.post("/createAssignment", (req,res) => {
    console.log("Assignment Created.")
    var assignmentID = "id" + Math.random().toString(16).slice(2)
    const newAssignment = new Assignment({
        assignmentID,
        userID: req.body.userID,
        assignmentName: req.body.name,
        tqPair: req.body.tqPair,
        quiz: req.body.quiz,
        timeLimit: req.body.timeLimit,
        dueDate: req.body.dueDate,
        dueTime:req.body.dueTime,
        status: req.body.status
    });
    newAssignment.save();
    res.json(newAssignment);
  })

app.listen(port, () =>{
    console.log(`Api server has successfully started on port ${port}.`)
})