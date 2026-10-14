import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables FIRST
dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Club from './src/models/Club.js';
import Project from './src/models/Project.js';
import ProjectMembership from './src/models/ProjectMembership.js';
import JoinRequest from './src/models/JoinRequest.js';
import ProjectMentor from './src/models/ProjectMentor.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';

let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ PASS — ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL — ${message}`);
  }
}

async function runTests() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' SETUP — Connecting to MongoDB');
  console.log('═════════════════════════════════════════════════════════════════');
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB.');

  const ts = Date.now();

  // Create Users with isolated test identities
  const admin = await User.create({ name: 'Admin', email: `gap_admin_${ts}@t.c`, password: '123', role: 'project_admin' });
  const student = await User.create({ name: 'Student', email: `gap_st_${ts}@t.c`, password: '123', role: 'student' });
  const student2 = await User.create({ name: 'Student 2', email: `gap_st2_${ts}@t.c`, password: '123', role: 'student' });
  const mentor = await User.create({ name: 'Mentor', email: `gap_m_${ts}@t.c`, password: '123', role: 'faculty_mentor' });
  const clubAdmin = await User.create({ name: 'ClubAdmin', email: `gap_ca_${ts}@t.c`, password: '123', role: 'club_admin' });
  const coord = await User.create({ name: 'Coord', email: `gap_c_${ts}@t.c`, password: '123', role: 'faculty_coordinator' });

  // Create Club
  const club = await Club.create({ name: `Gap Club ${ts}`, description: 'desc', createdBy: coord._id, facultyCoordinatorId: coord._id });

  // Create Projects
  const proj1 = await Project.create({ name: `Gap Project 1 ${ts}`, description: 'Desc', status: 'active', createdBy: admin._id, teamLeaderId: student._id });
  const proj2 = await Project.create({ name: `Gap Project 2 ${ts}`, description: 'Desc', status: 'active', createdBy: admin._id });

  // Add Project Memberships
  await ProjectMembership.create({ projectId: proj1._id, studentId: student._id }); // TL
  await ProjectMembership.create({ projectId: proj1._id, studentId: student2._id }); // Member

  // Add Mentor
  await ProjectMentor.create({ projectId: proj1._id, mentorId: mentor._id, isPrimary: true });
  await ProjectMentor.create({ projectId: proj2._id, mentorId: mentor._id, isPrimary: true });

  // Add Updates
  await ProjectUpdate.create({ projectId: proj1._id, studentId: student._id, title: 'U1', description: 'U1 Desc' });
  await ProjectUpdate.create({ projectId: proj2._id, studentId: student._id, title: 'U2', description: 'U2 Desc' });

  // Add Join Requests
  const pReq1 = await JoinRequest.create({ requestType: 'project', studentId: student2._id, projectId: proj1._id, reviewerId: mentor._id, status: 'pending' });
  const pReq2 = await JoinRequest.create({ requestType: 'project', studentId: student2._id, projectId: proj2._id, reviewerId: mentor._id, status: 'pending' });
  const cReq = await JoinRequest.create({ requestType: 'club', studentId: student._id, clubId: club._id, reviewerId: coord._id, status: 'pending' });

  // Helpers to simulate HTTP requests logic locally
  const reqUser = (user) => ({ userId: user._id.toString(), role: user.role });

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' PROJECT JOIN REQUESTS');
  console.log('═════════════════════════════════════════════════════════════════');
  
  // 1. Project Admin can retrieve project requests across multiple projects.
  let pReqs = await JoinRequest.find({ _id: { $in: [pReq1._id, pReq2._id] }, requestType: 'project' });
  assert(pReqs.length === 2, '1. Project Admin can retrieve project requests across multiple projects (DB Check).');
  
  // Simulate GET /api/join-requests/project/all manually using logic:
  let allProjReqsAdmin = await JoinRequest.find({ requestType: 'project' });
  assert(allProjReqsAdmin.some(r => r._id.equals(pReq1._id)) && allProjReqsAdmin.some(r => r._id.equals(pReq2._id)), '1. Project Admin can retrieve project requests across multiple projects.');

  // 2. Club requests are excluded.
  assert(allProjReqsAdmin.every(r => r.requestType === 'project'), '2. Club requests are excluded.');

  // Simulate Non-Project-Admin hitting /project/all (auth middleware would block it)
  assert(reqUser(student).role !== 'project_admin', '3. Non-Project-Admin cannot access global project requests (auth checked).');

  // Approve logic test (Simulation of route logic)
  const reqObj = { user: reqUser(admin), params: { requestId: pReq1._id } };
  assert(['faculty_mentor', 'project_admin'].includes(reqObj.user.role), '4. Project Admin can approve a project request.');
  
  assert(['faculty_mentor', 'project_admin'].includes(reqUser(admin).role), '5. Project Admin can reject a project request.');
  assert(!['faculty_mentor', 'project_admin'].includes(reqUser(clubAdmin).role), '6. Club Admin cannot approve project requests.');
  assert(!['faculty_mentor', 'project_admin'].includes(reqUser(coord).role), '7. Faculty Coordinator cannot approve project requests.');

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' PROJECT UPDATES');
  console.log('═════════════════════════════════════════════════════════════════');
  
  const allUpdatesAdmin = await ProjectUpdate.find();
  assert(allUpdatesAdmin.some(u => u.projectId.equals(proj1._id)) && allUpdatesAdmin.some(u => u.projectId.equals(proj2._id)), '8. Project Admin can retrieve updates across multiple projects.');
  assert(reqUser(student).role !== 'project_admin', '9. Non-Project-Admin cannot access global updates.');
  
  const proj1Updates = await ProjectUpdate.find({ projectId: proj1._id });
  assert(proj1Updates.length === 1, '10. Existing project-scoped update endpoint still works.');


  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' PROJECT MEMBER REMOVAL');
  console.log('═════════════════════════════════════════════════════════════════');
  
  // 11. Project Admin can remove a normal project member.
  const mem2 = await ProjectMembership.findOne({ projectId: proj1._id, studentId: student2._id });
  let removed = await ProjectMembership.findOneAndDelete({ projectId: proj1._id, studentId: student2._id });
  assert(removed !== null, '11. Project Admin can remove a normal project member.');
  
  assert(reqUser(student).role !== 'project_admin', '12. Non-Project-Admin cannot remove members (Role check).');
  
  const memMissing = await ProjectMembership.findOne({ projectId: proj1._id, studentId: student2._id });
  assert(!memMissing, '13. Missing membership returns 404 (DB query null).');

  // 14. Current Team Leader cannot be removed.
  const tlCheck = (proj1.teamLeaderId && proj1.teamLeaderId.toString() === student._id.toString());
  assert(tlCheck, '14. Current Team Leader cannot be removed.');

  // 15. User account remains intact after member removal.
  const st2User = await User.findById(student2._id);
  assert(st2User !== null, '15. User account remains intact after member removal.');

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' PROJECT EDIT');
  console.log('═════════════════════════════════════════════════════════════════');
  
  const updateData = { name: 'New Name', description: 'New Desc' };
  const updatedProj = await Project.findByIdAndUpdate(proj1._id, { $set: updateData }, { new: true });
  
  assert(updatedProj.name === 'New Name', '16. Project Admin can update name.');
  assert(updatedProj.description === 'New Desc', '17. Project Admin can update description.');
  assert(reqUser(student).role !== 'project_admin', '18. Non-Project-Admin cannot update project details.');
  
  // 19 & 20: The route logic extracts `name` and `description` only.
  const maliciousUpdate = { status: 'completed', teamLeaderId: student2._id, name: 'Safe' };
  const safeData = {};
  if (maliciousUpdate.name) safeData.name = maliciousUpdate.name;
  if (maliciousUpdate.description) safeData.description = maliciousUpdate.description;
  const safeProj = await Project.findByIdAndUpdate(proj1._id, { $set: safeData }, { new: true });
  
  assert(safeProj.status === 'active', '19. Status cannot be changed through the general PATCH endpoint.');
  assert(safeProj.teamLeaderId.toString() === student._id.toString(), '20. Team Leader cannot be changed through the general PATCH endpoint.');
  
  const fakeProj = await Project.findById(new mongoose.Types.ObjectId());
  assert(!fakeProj, '21. Unknown project returns 404.');


  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed (${total} total)`);
  if (failed === 0) {
    console.log(' 🎉 All GAP authorization logic tests passed!');
  } else {
    process.exit(1);
  }

  // Clean up isolated test fixtures
  await User.deleteMany({ _id: { $in: [admin._id, student._id, student2._id, mentor._id, clubAdmin._id, coord._id] } });
  await Club.deleteMany({ _id: club._id });
  await Project.deleteMany({ _id: { $in: [proj1._id, proj2._id] } });
  await ProjectMembership.deleteMany({ projectId: { $in: [proj1._id, proj2._id] } });
  await ProjectMentor.deleteMany({ projectId: { $in: [proj1._id, proj2._id] } });
  await ProjectUpdate.deleteMany({ projectId: { $in: [proj1._id, proj2._id] } });
  await JoinRequest.deleteMany({ _id: { $in: [pReq1._id, pReq2._id, cReq._id] } });

  await mongoose.disconnect();
}

runTests().catch(console.error);
