/**
 * Verification Test Suite for Project Updates & Feedback
 *
 * Tests the 10 required scenarios:
 * 1. A Faculty Mentor assigned to a project can submit feedback on its updates.
 * 2. An unassigned Faculty Mentor cannot submit feedback for that project.
 * 3. Project Admin can submit feedback on updates from any project.
 * 4. Students cannot submit mentor/admin feedback.
 * 5. Feedback is stored against the correct update and project.
 * 6. Feedback author and timestamp display correctly.
 * 7. Existing feedback is preserved when new feedback is added.
 * 8. Feedback appears immediately after successful submission.
 * 9. Existing Project Updates, attachments, and permissions continue working.
 * 10. End-to-end data integrity & cleanup.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Project from './src/models/Project.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';
import ProjectFeedback from './src/models/ProjectFeedback.js';

const BASE = 'http://127.0.0.1:5000/api';
let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS — ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL — ${message}${details ? ' | ' + details : ''}`);
  }
}

function makeToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = {}; }
  return { status: res.status, json };
}

async function runTests() {
  console.log('═'.repeat(70));
  console.log(' PROJECT UPDATES & FEEDBACK VERIFICATION SUITE');
  console.log('═'.repeat(70));

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Load test users from database
  const userMentorAssigned = await User.findOne({ email: 'amit.joshi@test.com' });
  const userMentorUnassigned = await User.findOne({ email: 'priya.nair@test.com' });
  const userAdmin = await User.findOne({ email: 'vivek.malhotra@test.com' });
  const userStudent = await User.findOne({ email: 'arjun.mehta@test.com' });

  if (!userMentorAssigned || !userMentorUnassigned || !userAdmin || !userStudent) {
    throw new Error('Required seeded users not found in database!');
  }

  const tokenMentorAssigned = makeToken(userMentorAssigned);
  const tokenMentorUnassigned = makeToken(userMentorUnassigned);
  const tokenAdmin = makeToken(userAdmin);
  const tokenStudent = makeToken(userStudent);

  console.log('Users loaded and tokens generated:');
  console.log(`- Assigned Mentor: ${userMentorAssigned.name} (${userMentorAssigned.role})`);
  console.log(`- Unassigned Mentor: ${userMentorUnassigned.name} (${userMentorUnassigned.role})`);
  console.log(`- Project Admin: ${userAdmin.name} (${userAdmin.role})`);
  console.log(`- Student: ${userStudent.name} (${userStudent.role})\n`);

  // Locate test projects
  const projectA = await Project.findOne({ name: 'Smart Irrigation System' });
  const projectB = await Project.findOne({ name: 'Autonomous Rover' });
  if (!projectA || !projectB) {
    throw new Error('Required test projects not found!');
  }
  const projectAId = projectA._id.toString();
  const projectBId = projectB._id.toString();

  // Find or create test updates on Project A
  let updateA = await ProjectUpdate.findOne({ projectId: projectAId });
  if (!updateA) {
    updateA = await ProjectUpdate.create({
      projectId: projectAId,
      studentId: userStudent._id,
      title: 'Automated Irrigation Sensor Calibration',
      description: 'Calibrated analog capacitive soil moisture sensors and tested telemetry.',
      files: [{ name: 'spec.pdf', url: 'https://example.com/spec.pdf' }]
    });
  }
  const updateAId = updateA._id.toString();

  // Find or create test update on Project B
  let updateB = await ProjectUpdate.findOne({ projectId: projectBId });
  if (!updateB) {
    updateB = await ProjectUpdate.create({
      projectId: projectBId,
      studentId: userStudent._id,
      title: 'Obstacle Detection Testing',
      description: 'LIDAR and ultrasonic sensor distance calculation under sunlight.',
      files: [{ name: 'rover_log.csv', url: 'https://example.com/rover_log.csv' }]
    });
  }
  const updateBId = updateB._id.toString();

  const createdFeedbackIds = [];

  try {
    // -----------------------------------------------------------------------
    // Scenario 1: Assigned Faculty Mentor can submit feedback on its updates
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 1: Assigned Faculty Mentor Feedback ---');
    const mentorFeedbackText = `Assigned Mentor feedback test ${Date.now()}: Excellent telemetry logs.`;
    const resMentorFb = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateAId,
      feedbackText: mentorFeedbackText
    }, tokenMentorAssigned);

    assert(resMentorFb.status === 201, 'Assigned mentor receives 201 Created');
    assert(resMentorFb.json?.success === true, 'Response indicates success');
    assert(resMentorFb.json?.data?.feedbackText === mentorFeedbackText, 'Feedback text matches submitted content');
    assert(resMentorFb.json?.data?.mentorId?._id === userMentorAssigned._id.toString(), 'Feedback mentorId matches authenticated user ID');
    assert(resMentorFb.json?.data?.mentorId?.role === 'faculty_mentor', 'Populated mentorId has role faculty_mentor');
    if (resMentorFb.json?.data?._id) createdFeedbackIds.push(resMentorFb.json.data._id);

    // -----------------------------------------------------------------------
    // Scenario 2: Unassigned Faculty Mentor cannot submit feedback for that project
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 2: Unassigned Faculty Mentor Forbidden ---');
    // Dr. Amit Joshi is NOT assigned to Project B (Autonomous Rover)
    const resUnassignedFb = await req('POST', `/projects/${projectBId}/feedback`, {
      updateId: updateBId,
      feedbackText: 'Unassigned mentor feedback attempt.'
    }, tokenMentorAssigned);

    assert(resUnassignedFb.status === 403, 'Unassigned mentor rejected with HTTP 403 Forbidden');
    assert(resUnassignedFb.json?.success === false, 'Response indicates failure');
    assert(resUnassignedFb.json?.message?.includes('not assigned as a mentor'), 'Error message states not assigned as mentor');

    // -----------------------------------------------------------------------
    // Scenario 3: Project Admin can submit feedback on updates from any project
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 3: Project Admin Feedback Across Projects ---');
    const adminFbTextProjectA = `Admin feedback on Project A ${Date.now()}: Approved for next milestone.`;
    const resAdminFbA = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateAId,
      feedbackText: adminFbTextProjectA
    }, tokenAdmin);

    assert(resAdminFbA.status === 201, 'Project Admin can submit feedback on Project A (status 201)');
    assert(resAdminFbA.json?.data?.mentorId?._id === userAdmin._id.toString(), 'Feedback author is Project Admin user');
    assert(resAdminFbA.json?.data?.mentorId?.role === 'project_admin', 'Populated role is project_admin');
    if (resAdminFbA.json?.data?._id) createdFeedbackIds.push(resAdminFbA.json.data._id);

    const adminFbTextProjectB = `Admin feedback on Project B ${Date.now()}: Great progress on rover chassis.`;
    const resAdminFbB = await req('POST', `/projects/${projectBId}/feedback`, {
      updateId: updateBId,
      feedbackText: adminFbTextProjectB
    }, tokenAdmin);

    assert(resAdminFbB.status === 201, 'Project Admin can submit feedback on Project B (status 201)');
    if (resAdminFbB.json?.data?._id) createdFeedbackIds.push(resAdminFbB.json.data._id);

    // -----------------------------------------------------------------------
    // Scenario 4: Students cannot submit mentor/admin feedback
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 4: Student Feedback Submission Forbidden ---');
    const resStudentFb = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateAId,
      feedbackText: 'Student trying to give feedback.'
    }, tokenStudent);

    assert(resStudentFb.status === 403, 'Student rejected with HTTP 403 Forbidden');
    assert(resStudentFb.json?.success === false, 'Response indicates failure');

    // -----------------------------------------------------------------------
    // Scenario 5: Feedback is stored against correct update and project
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 5: Database Storage & Relationship Integrity ---');
    const dbFeedback = await ProjectFeedback.findById(resMentorFb.json.data._id);
    assert(!!dbFeedback, 'Feedback persisted in ProjectFeedback collection');
    assert(dbFeedback.projectId.toString() === projectAId, 'Stored projectId matches target project');
    assert(dbFeedback.updateId.toString() === updateAId, 'Stored updateId matches target update');
    assert(dbFeedback.mentorId.toString() === userMentorAssigned._id.toString(), 'Stored author matches authenticated mentor');

    // Mismatched project and update validation check:
    const resMismatch = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateBId, // updateB belongs to projectB, not projectA
      feedbackText: 'Mismatched update test'
    }, tokenMentorAssigned);
    assert(resMismatch.status === 400, 'Reject feedback where updateId does not belong to projectId (HTTP 400)');

    // Non-existent update validation check:
    const fakeUpdateId = new mongoose.Types.ObjectId().toString();
    const resNonExistent = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: fakeUpdateId,
      feedbackText: 'Non-existent update test'
    }, tokenMentorAssigned);
    assert(resNonExistent.status === 404, 'Reject feedback where updateId does not exist (HTTP 404)');

    // Empty feedbackText validation check:
    const resEmpty = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateAId,
      feedbackText: '   '
    }, tokenMentorAssigned);
    assert(resEmpty.status === 400, 'Reject empty feedbackText (HTTP 400)');

    // -----------------------------------------------------------------------
    // Scenario 6: Feedback author and timestamp display correctly
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 6: Feedback Author & Timestamp Population ---');
    const resGetFb = await req('GET', `/projects/${projectAId}/feedback`, null, tokenMentorAssigned);
    assert(resGetFb.status === 200, 'GET /projects/:projectId/feedback returns HTTP 200');
    assert(Array.isArray(resGetFb.json?.data), 'Returns array of feedback');

    const retrievedMentorFb = resGetFb.json.data.find(f => f._id === resMentorFb.json.data._id);
    assert(!!retrievedMentorFb, 'Retrieved feedback list includes submitted mentor feedback');
    assert(retrievedMentorFb.mentorId?.name === userMentorAssigned.name, 'Mentor name is populated correctly');
    assert(retrievedMentorFb.mentorId?.role === 'faculty_mentor', 'Mentor role is populated correctly');
    assert(!!retrievedMentorFb.createdAt, 'Timestamp createdAt is present and valid');

    const retrievedAdminFb = resGetFb.json.data.find(f => f._id === resAdminFbA.json.data._id);
    assert(!!retrievedAdminFb, 'Retrieved feedback list includes submitted admin feedback');
    assert(retrievedAdminFb.mentorId?.name === userAdmin.name, 'Admin name is populated correctly');
    assert(retrievedAdminFb.mentorId?.role === 'project_admin', 'Admin role is populated correctly');

    // -----------------------------------------------------------------------
    // Scenario 7: Existing feedback is preserved when new feedback is added
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 7: Multiple Feedback History Preservation ---');
    const secondMentorFbText = `Second feedback on same update ${Date.now()}`;
    const resSecondFb = await req('POST', `/projects/${projectAId}/feedback`, {
      updateId: updateAId,
      feedbackText: secondMentorFbText
    }, tokenMentorAssigned);

    assert(resSecondFb.status === 201, 'Second feedback added successfully (status 201)');
    if (resSecondFb.json?.data?._id) createdFeedbackIds.push(resSecondFb.json.data._id);

    const resListAfter = await req('GET', `/projects/${projectAId}/updates/${updateAId}/feedback`, null, tokenMentorAssigned);
    assert(resListAfter.status === 200, 'GET specific update feedback returns HTTP 200');
    const updateFeedbacks = resListAfter.json?.data || [];
    const hasFirstMentorFb = updateFeedbacks.some(f => f.feedbackText === mentorFeedbackText);
    const hasAdminFb = updateFeedbacks.some(f => f.feedbackText === adminFbTextProjectA);
    const hasSecondMentorFb = updateFeedbacks.some(f => f.feedbackText === secondMentorFbText);

    assert(hasFirstMentorFb, 'Initial mentor feedback is preserved in history');
    assert(hasAdminFb, 'Project admin feedback is preserved in history');
    assert(hasSecondMentorFb, 'Newly added feedback is present in history');
    assert(updateFeedbacks.length >= 3, `History contains all feedback entries (count: ${updateFeedbacks.length})`);

    // -----------------------------------------------------------------------
    // Scenario 8: Feedback appears immediately after successful submission
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 8: Immediate Availability ---');
    assert(resSecondFb.json?.data?._id !== undefined, 'POST response immediately returns populated feedback');
    assert(resSecondFb.json?.data?.updateId !== undefined, 'POST response includes updateId');
    assert(resSecondFb.json?.data?.mentorId?.name !== undefined, 'POST response includes populated author info');

    // -----------------------------------------------------------------------
    // Scenario 9: Existing Project Updates, attachments, permissions continue working
    // -----------------------------------------------------------------------
    console.log('\n--- Scenario 9: Updates & Attachments Intact ---');
    const resUpdates = await req('GET', `/projects/${projectAId}/updates`, null, tokenStudent);
    assert(resUpdates.status === 200, 'Student member can view project updates (status 200)');
    const targetUpdate = resUpdates.json?.data?.find(u => u._id === updateAId);
    assert(!!targetUpdate, 'Target update returned in list');
    assert(targetUpdate.title === updateA.title, 'Update title unchanged');
    assert(Array.isArray(targetUpdate.files), 'Update files array intact');

  } finally {
    // Clean up temporary test feedback records
    console.log('\n--- Cleanup ---');
    if (createdFeedbackIds.length > 0) {
      const deleteResult = await ProjectFeedback.deleteMany({ _id: { $in: createdFeedbackIds } });
      console.log(`Cleaned up ${deleteResult.deletedCount} temporary test feedback records.`);
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }

  console.log('\n' + '═'.repeat(70));
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('═'.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite encountered an unexpected error:', err);
  process.exit(1);
});
