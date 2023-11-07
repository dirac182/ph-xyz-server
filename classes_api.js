import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import { customAlphabet } from 'nanoid';
import axios from "axios";

const nanoid = customAlphabet('123456789abcdefghijklmnopqrstuvwxyz', 6)
const classesRouter = express.Router();
const port = process.env.PORT || 5003;

classesRouter.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
classesRouter.use(bodyParser.urlencoded({
    extended: true
}));
classesRouter.use(bodyParser.json());

// Database Stuff
mongoose.connect(process.env.DB_PATH);

const classesSchema = new mongoose.Schema({
    joinCode: {
        type: String,
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    className: {
        type: String,
        required: true
    },
    students: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment'
    }],
});

const Classes = mongoose.model('Class', classesSchema);

classesRouter.post("/classes/update_classroom_assignment", async (req,res) => {
    const userId = req.query.userId;
    const assignmentId = req.body.assignmentId;
    const assignedClasses = req.body.assignedClasses
    console.log(assignmentId)
    try {
        const userClasses = await Classes.find({ teacherId: userId });
        // console.log(userClasses)
        userClasses.map(async (cls) => {
            if (assignedClasses.includes(cls.id)) {
                // Add assignmentId to the class if it's not already there
                if (!cls.assignments.includes(assignmentId)) {
                    cls.assignments.push(assignmentId);
                    await cls.save();
                }
            } else {
                // Remove assignmentId from the class if it's there
                const index = cls.assignments.indexOf(assignmentId);
                if (index > -1) {
                    cls.assignments.splice(index, 1);
                    await cls.save();
                }
            }
        });

        res.status(200).json({ message: 'Classrooms updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

classesRouter.post("/classes/update_on_assignment_delete", async (req, res) => {
    const userId = req.body.userId;
    const assignmentId = req.body.assignmentId;
    const classesToUpdate = req.body.classesToUpdate;
    console.log(userId,assignmentId,classesToUpdate);
    try {
        // Update multiple classes by removing the assignmentId from their assignments array
        await Classes.updateMany(
            { 
                _id: { $in: classesToUpdate }, // Filter to match only the specified class IDs
                teacherId: userId // Optional: Ensure that the classes belong to the specified teacher
            },
            { $pull: { assignments: assignmentId } } // Remove the assignmentId from the assignments array
        );

        res.status(200).json({ message: 'Assignment removed from classes successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating classes', error: error.message });
    }
});

classesRouter.post("/classes/create_teacher_classroom", async (req,res) => {
    console.log("Classroom created.")
    const userId = req.query.userId;
    const className = req.body.className;
    const newTeacherClassroom = new Classes({
        joinCode: nanoid(),
        teacherId: userId,
        className: className,
        students: [], 
        assignments: [] 
    });
    console.log(newTeacherClassroom)
    newTeacherClassroom.save();
    res.status(200).json({ message: 'Classroom Created'});
    
})

classesRouter.get('/classes/get_teacher_classrooms', async (req, res) => {
    const userId = req.query.userId;
    try {
        // Find the user by userId
        await Classes.find({teacherId:userId}).populate("assignments").populate("students")
        .then((classes) => {
            console.log("classes fetched")
            res.status(200).json({ message: 'Teacher classrooms retrieved successfully', classes });
        }).catch((error) => {
            res.status(404).json({ message: 'User not found' }, error);
        })
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving teacher classrooms', error: error.message });
    }
});

classesRouter.get('/classes/get_student_classrooms', async (req, res) => {
    const classesArray = req.query.classesArray.split(",");
    try {
        const classes = await Classes.find({ _id: { $in: classesArray } }).populate('assignments').populate("teacherId");
        if (classes.length > 0) {
            res.status(200).json(classes);
        } else {
            res.status(404).json({ message: 'No classes found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving classes', error: error });
    }
});

classesRouter.get('/classes/get_class_by_id', async (req, res) => {
    const classId = req.query.classId;
    try {
        // Find the class by classId and populate the students array
        const cls = await Classes.findById(classId).populate('students').populate("assignments")
        if (cls) {
            res.status(200).json({ message: 'Classroom retrieved successfully', cls });
            console.log(cls);
        } else {
            res.status(404).json({ message: 'Class not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving classroom', error: error.message });
    }
});

classesRouter.post("/classes/add_student_to_classroom", async (req,res) => {
    const { userId, classCode } = req.body;
    try {
        // Find the class by classCode
        const foundClass = await Classes.findOne({ joinCode: classCode });
        if (foundClass) {
            // Add the userId to the students array if it's not already there
            if (!foundClass.students.includes(userId)) {
                foundClass.students.push(userId);
                axios.post('http://localhost:5002/user/add_class_to_studentClasses', {
                        userId,
                        classId: foundClass._id
                        })
                await foundClass.save();
                console.log("Student added to class successfully")
                res.status(200).json({ message: "Student added to class successfully" });
            } else {
                console.log("Student already in class")
                res.status(400).json({ message: "Student already in class" });
            }
        } else {
            console.log("Class not found")
            res.status(404).json({ message: "Class not found" });
        }
    } catch (error) {
        console.log("Error adding student to class", error)
        res.status(500).json({ message: "Error adding student to class", error });
    }
})

classesRouter.post("/classes/check_valid_join_code", (req,res) => {
    const userInput = req.body.userInput;
    console.log(userInput)
    Classes.findOne({joinCode:userInput})
    .then(cls => {
        if(cls){
            console.log(cls)
           res.status(200).send(true) 
        }else {
            res.status(200).send(false) 
        }
    })
    .catch(error => {
        res.status(500,error)
    })
})

classesRouter.delete('/classes/delete_teacher_classroom', async (req, res) => {
    const { userId, classId } = req.query;
    console.log(userId, classId)
    try {
        Classes.findOneAndDelete({teacherId:userId, _id:classId})
        .then(deleted => {
            console.log("Classroom Deleted")
            res.status(200).json({ message: 'Classroom deleted successfully', deleted });
        })
        .catch(error => {
            res.status(404).json({ message: 'Class not found', error });
        })

    } catch (error) {
        res.status(500).json({ message: 'Error deleting teacher classroom', error: error.message });
    }
});

export default classesRouter;