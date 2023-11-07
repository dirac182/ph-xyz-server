import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session"
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";
import cookieSession from 'cookie-session';
import 'dotenv/config'
import { customAlphabet } from 'nanoid';
import axios from 'axios';
import Assignment from "./assignments_api.js";
import Classes from './classes_api.js';
import Question from './questions_api.js';

const assignment = Assignment();
const question = Question();
// const classes = Classes();

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6)
const app = express();
const port =  5002;
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.use(cookieSession({
    maxAge: 30*24*60*60*1000,
    keys: [process.env.COOKIE_KEY]
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB_PATH);

const studentQuestionSetSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question',
    },
    selectedAnswerIndex: Number,
    isCorrect: Number,
    isFlagged: Boolean,
    isFocused: Boolean
});

const studentAssignmentInfoSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
        unique: true
    },
    studentQuestionSet: [[studentQuestionSetSchema]],
    grade: Number
});

const userSchema = new mongoose.Schema ({
    googleId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: false
    },
    isTeacher: {
        type: Boolean,
        required: false
    },
    username:{
        type: String
    },
    studentClasses: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Classes'
    }],
    studentAssignmentInfo: [studentAssignmentInfoSchema]
})

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser((id, cb) => {
    User.findById(id)
    .then(user => {
        cb(null,user);
    });
  });

passport.use(User.createStrategy());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:5002/auth/google/callback",
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    const data = JSON.parse(req.query.state)
    const isTeacher = data.role === "student" ? false : true
    const classCode = data.classCode ? data.classCode : null
    // console.log(isTeacher,classCode)
    User.findOne({ googleId: profile.id }).then(existingUser => {
        if (existingUser) {
          // we already have a record with the given profile ID
        //   console.log(existingUser);
          done(null, existingUser);
        } else {
          // we don't have a user record with this ID, make a new record!
          if (isTeacher){
            const newUser = new User({ googleId: profile.id, username: profile._json.email, firstName: profile._json.given_name, lastName: profile._json.family_name, isTeacher: isTeacher })
            newUser.save()
            .then(user => {
                done(null, user) 
            })
          }else {
            Classes.findOne({joinCode:classCode})
            .then(cls => {
                const newUser = new User({ googleId: profile.id, username: profile._json.email, firstName: profile._json.given_name, lastName: profile._json.family_name, isTeacher: isTeacher, studentClasses:[cls._id] })
                newUser.save()
                .then((user) => {
                    // console.log(user)
                    axios.post('http://localhost:5003/classes/add_student_to_classroom', {
                        userId: user.id,
                        classCode: classCode
                        })
                    done(null, user)    
                    })
            });
          }
        }
      });
  }
));

app.get("/auth/google", (req,res,done) => {
    const data = JSON.stringify(req.query)
    passport.authenticate("google", {
        scope: ["profile","email"], 
        state: data
     })(req,res,done);
})

app.get('/auth/google/callback', 
  passport.authenticate('google'), (req, res) => {
    // Successful authentication, redirect home.
    const role = req.query.state;
    res.redirect('http://localhost:3000/');
  });

app.get("/user/logout", (req,res) => {
    req.logout();
    res.redirect('http://localhost:3000/');
});

app.get("/user/get_current_user", (req,res) => {
    // console.log("sent User:",req.user);
    res.send(req.user);
});

app.post("/user/add_class_to_studentClasses", async (req,res) => {
    const { userId, classId } = req.body;
    try {
        // Update the user by adding the class ObjectId to the studentClasses array
        await User.findByIdAndUpdate(
            userId,
            { $addToSet: { studentClasses: classId } }, // $addToSet ensures no duplicates
            { new: true }
        );
        res.status(200).json({ message: 'Student added to class successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding student to class', error: error.message });
    }
})

app.get("/user/fetch_student_assignment_info", async (req, res) => {
    const { userId, assignmentId } = req.query;
    console.log(userId,assignmentId);
    try {
        // Find the user by userId
        const user = await User.findById(userId).populate('studentAssignmentInfo.studentQuestionSet.question').populate("studentAssignmentInfo.assignmentId");
        const assignmentInfo = user.studentAssignmentInfo.find(info => info.assignmentId._id.toString() === assignmentId);
        if (assignmentInfo) {
            console.log("Data Retrieved",assignmentInfo.studentQuestionSet)
            res.status(200).json(assignmentInfo);
        } else {
            res.status(200).json(false);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error checking student assignment info', error: error.message });
    }
});

app.post("/user/initialize_student_assignment_info", async (req, res) => {
    const { userId, assignmentId } = req.query;
    const assignmentInfo = req.body.assignmentInfo;
    console.log(assignmentInfo)
    try {
        // Find the user and check if studentAssignmentInfo with the given assignmentId already exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingAssignmentInfo = user.studentAssignmentInfo.find(info => info.assignmentId.toString() === assignmentId);
        if (existingAssignmentInfo) {
            return res.status(400).json({ message: 'Student assignment info for this assignment already exists' });
        }

        // Construct the studentAssignmentInfo object
        const newStudentAssignmentInfo = {
            assignmentId: assignmentId,
            studentQuestionSet: assignmentInfo,
            grade: 0
        };

        // Update the user's studentAssignmentInfo array
        user.studentAssignmentInfo.push(newStudentAssignmentInfo);
        const updatedUser = await user.save();

        res.status(200).json({ message: 'Student assignment info initialized successfully', updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error initializing student assignment info', error: error.message });
    }
});

app.post("/user/update_student_assignment_info", async (req, res) => {
    const { userId, assignmentId } = req.query;
    const updatedStudentQuestionSet = req.body.updatedAssignmentInfo;
    const updatedGrade = req.body.updatedGrade;
    console.log("Recieved Update:", req.body)
    try {
        // Find the user by userId
        const user = await User.findById(userId);

        if (user) {
            // Find the assignment info with the specified assignmentId
            const assignmentInfo = user.studentAssignmentInfo.find(info => info.assignmentId.toString() === assignmentId);

            if (assignmentInfo) {
                // Update the studentQuestionSet
                assignmentInfo.studentQuestionSet = updatedStudentQuestionSet;
                assignmentInfo.grade = updatedGrade;
                // Save the updated user document
                await user.save();
                // console.log("Updated Student assignmnet Info", updatedStudentQuestionSet, updatedGrade)
                res.status(200).json({ message: 'Student assignment info updated successfully' });
            } else {
                res.status(404).json({ message: 'Assignment info not found' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating student assignment info', error: error.message });
    }
});

app.listen(port, () =>{
    console.log(`Users Api server has successfully started on port ${port}.`)
})

export default User;