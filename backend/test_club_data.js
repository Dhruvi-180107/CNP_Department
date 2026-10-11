import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Club from './src/models/Club.js';
import ClubMembership from './src/models/ClubMembership.js';
import Event from './src/models/Event.js';
import User from './src/models/User.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  console.log("=== Finding a Club ===");
  const club = await Club.findOne().populate('facultyCoordinatorId', 'name email role profileImage department semester');
  console.log(club ? `Found Club: ${club.name}` : "No club found");
  if (club && club.facultyCoordinatorId) {
    console.log("Faculty Coordinator:", club.facultyCoordinatorId.name, "Dept:", club.facultyCoordinatorId.department);
  }

  if (club) {
    console.log("\n=== Finding Members ===");
    const members = await ClubMembership.find({ clubId: club._id }).populate('studentId', 'name email role profileImage department semester');
    console.log(`Found ${members.length} members`);
    members.forEach(m => {
      console.log(`- [${m.membershipType}] ${m.studentId.name} | Email: ${m.studentId.email} | Dept: ${m.studentId.department} | Sem: ${m.studentId.semester}`);
    });

    console.log("\n=== Finding Events ===");
    const events = await Event.find({ clubId: club._id }).populate('createdBy', 'name email');
    console.log(`Found ${events.length} events`);
    events.forEach(e => {
      console.log(`- Event: ${e.title} | Link: ${e.eventLinkName} | Doc: ${e.relatedDocumentName} | Desc length: ${e.description?.length}`);
    });
  }
  
  process.exit(0);
}
test();
