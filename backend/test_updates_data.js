import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Project from './src/models/Project.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';
import ProjectFeedback from './src/models/ProjectFeedback.js';
import User from './src/models/User.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log("=== Finding a Project ===");
  const project = await Project.findOne();
  console.log(project ? `Found Project: ${project.name}` : "No project found");
  
  if (project) {
    const updates = await ProjectUpdate.find({ projectId: project._id }).populate('studentId', 'name email role profileImage department semester');
    console.log(`\nFound ${updates.length} updates`);
    
    for (const u of updates) {
      console.log(`\n- Update: [${u.title}] by ${u.studentId?.name}`);
      console.log(`  Desc length: ${u.description?.length} | Files count: ${u.files?.length}`);
      
      const feedback = await ProjectFeedback.find({ updateId: u._id }).populate('mentorId', 'name email role profileImage department semester');
      console.log(`  Feedback count: ${feedback.length}`);
      for (const fb of feedback) {
        console.log(`    -> Mentor: ${fb.mentorId?.name} | Dept: ${fb.mentorId?.department}`);
        console.log(`       Feedback: ${fb.feedbackText}`);
      }
    }
  }
  
  process.exit(0);
}
test();
