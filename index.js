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
        res.json(assignments);
    })
    .catch((error) => {
      console.log("Error finding assignments:" + error)
    })
  })

  app.get("/get/assignmentById", async (req,res) => {
    const userId = req.query.userId;
    const assignmentId = req.query.assignmentId;
    Assignment.findOne({userID: userId, assignmentID: assignmentId})
    .then ((assignment) => {
        console.log("GetByID", userId, assignmentId)
        res.json(assignment);
    })
    .catch((error) => {
      console.log("Error finding assignments:" + error)
    })
  })

  app.post("/create/assignment", async (req,res) => {
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
        status: req.body.status
    });
    newAssignment.save();
    console.log("Assignment Created")
    res.json(newAssignment);
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
        status: req.body.status
    };
    Assignment.findOneAndUpdate(
      {assignmentID:aID, userID: uID}, 
      {$set: updatedData},
      { new: true, useFindAndModify: false })
      .then((doc)=> {
          console.log("Updated document:", doc);
        })
      .catch((error)=> {
          console.error("Error updating document:", error);
        })
    })

    app.post("/delete/assignment", (req,res) => {
      const uID = req.query.userID;
      const aID = req.query.assignmentID;
      Assignment.findOneAndDelete({ assignmentID: aID, userID: uID })
      .then(()=> {
        console.log("Assignment deleted");
      })
      .catch((error)=> {
        console.log("Error deleting Assignment:", error);
      })
    })

app.listen(port, () =>{
    console.log(`Api server has successfully started on port ${port}.`)
})