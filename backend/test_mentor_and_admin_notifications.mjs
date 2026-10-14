import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Project from './src/models/Project.js';
import ProjectMentor from './src/models/ProjectMentor.js';
import GuitarInventory from './src/models/GuitarInventory.js';
import MaterialRequest from './src/models/MaterialRequest.js';
import ProjectMaterial from './src/models/ProjectMaterial.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';
import Notification from './src/models/Notification.js';

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

async function loginUser(email, password = 'Test@12345') {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function req(method, path, body, token) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function run() {
  console.log('\n=================================================================');
  console.log(' COMPREHENSIVE MENTOR & PROJECT ADMIN NOTIFICATIONS VERIFICATION');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // 1. Authenticate users
  const admin = await loginUser('vivek.malhotra@test.com');
  const leaderA = await loginUser('riya.sharma@test.com');
  const leaderB = await loginUser('kabir.patel@test.com');
  const mentorA = await loginUser('amit.joshi@test.com');
  const mentorB = await loginUser('priya.nair@test.com');

  assert(admin.user.role === 'project_admin', 'Admin authenticated as project_admin');
  assert(leaderA.user.role === 'student', 'Leader A (Riya Sharma) authenticated as student');
  assert(leaderB.user.role === 'student', 'Leader B (Kabir Patel) authenticated as student');
  assert(mentorA.user.role === 'faculty_mentor', 'Mentor A (Amit Joshi) authenticated as faculty_mentor');
  assert(mentorB.user.role === 'faculty_mentor', 'Mentor B (Priya Nair) authenticated as faculty_mentor');

  // Verify Project assignments
  const projA = await Project.findOne({ name: 'Campus Energy Monitor' });
  const projB = await Project.findOne({ name: 'Autonomous Rover' });
  assert(!!projA, 'Found Project A: Campus Energy Monitor');
  assert(!!projB, 'Found Project B: Autonomous Rover');

  const projAId = projA._id.toString();
  const projBId = projB._id.toString();

  // Verify mentor assignments
  const projAMentors = await ProjectMentor.find({ projectId: projA._id });
  const projBMentors = await ProjectMentor.find({ projectId: projB._id });

  const mentorAAssignedToA = projAMentors.some(m => m.mentorId.toString() === mentorA.user._id.toString());
  const mentorBAssignedToA = projAMentors.some(m => m.mentorId.toString() === mentorB.user._id.toString());
  const mentorBAssignedToB = projBMentors.some(m => m.mentorId.toString() === mentorB.user._id.toString());
  const mentorAAssignedToB = projBMentors.some(m => m.mentorId.toString() === mentorA.user._id.toString());

  assert(mentorAAssignedToA, 'Mentor A (Amit Joshi) is assigned to Project A');
  assert(!mentorBAssignedToA, 'Mentor B (Priya Nair) is NOT assigned to Project A');
  assert(mentorBAssignedToB, 'Mentor B (Priya Nair) is assigned to Project B');
  assert(!mentorAAssignedToB, 'Mentor A (Amit Joshi) is NOT assigned to Project B');

  // -------------------------------------------------------------------------
  // CHECKLIST 1, 2, 3: Leader adds material to Project A
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 1, 2, 3: Leader adds material to Project A ---');
  const testMatAName = `Energy Sensor Node ${Date.now()}`;
  const addMatARes = await req('POST', `/projects/${projAId}/materials`, {
    name: testMatAName,
    quantity: 3,
    source: 'self_purchased',
    specifications: '3.3V I2C current sensor',
  }, leaderA.token);

  assert(addMatARes.status === 201, `Leader A added material to Project A (HTTP 201, got ${addMatARes.status})`);
  const matAId = addMatARes.json?.data?._id;
  assert(!!matAId, 'Material A record ID returned');

  // Check Mentor A received notification
  const mentorANotif = await Notification.findOne({
    userId: mentorA.user._id,
    type: 'material_added',
    relatedId: matAId,
  });
  assert(!!mentorANotif, "Project A's assigned mentor (Dr. Amit Joshi) received notification for Project A");
  assert(mentorANotif?.title === 'New Project Material Added', 'Mentor notification title is "New Project Material Added"');
  assert(mentorANotif?.message.includes(testMatAName), `Mentor notification message includes material name "${testMatAName}"`);
  assert(mentorANotif?.link === `/projects/${projAId}`, `Mentor notification link points to Project A material list (/projects/${projAId})`);
  assert(mentorANotif?.metadata?.source === 'self_purchased', 'Mentor notification metadata includes source: self_purchased');
  assert(mentorANotif?.metadata?.quantity === 3, 'Mentor notification metadata includes quantity: 3');
  assert(mentorANotif?.metadata?.actorName === 'Riya Sharma', 'Mentor notification metadata includes actor: Riya Sharma');
  assert(mentorANotif?.metadata?.projectName === 'Campus Energy Monitor', 'Mentor notification metadata includes project: Campus Energy Monitor');

  // Check Mentor B did NOT receive notification for Project A
  const mentorBNotifA = await Notification.findOne({
    userId: mentorB.user._id,
    type: 'material_added',
    relatedId: matAId,
  });
  assert(!mentorBNotifA, 'Mentor B (Priya Nair, assigned only to Project B) received NO notification for Project A material addition');

  // Check Guitar Admin received notification for Project A
  const adminNotifA = await Notification.findOne({
    userId: admin.user._id,
    type: 'material_added',
    relatedId: matAId,
  });
  assert(!!adminNotifA, 'Project Admin (Guitar) received notification for Project A material addition');
  assert(adminNotifA?.metadata?.projectName === 'Campus Energy Monitor', 'Admin notification mentions Project A');
  assert(adminNotifA?.link === `/projects/${projAId}`, 'Admin notification link points to Project A');

  // -------------------------------------------------------------------------
  // CHECKLIST 4: Leader adds material to Project B
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 4: Leader adds material to Project B ---');
  const testMatBName = `LiDAR Sensor Module ${Date.now()}`;
  const addMatBRes = await req('POST', `/projects/${projBId}/materials`, {
    name: testMatBName,
    quantity: 1,
    source: 'owned',
    specifications: '360 degree 12m range',
  }, leaderB.token);

  assert(addMatBRes.status === 201, `Leader B added material to Project B (HTTP 201, got ${addMatBRes.status})`);
  const matBId = addMatBRes.json?.data?._id;
  assert(!!matBId, 'Material B record ID returned');

  // Check Guitar Admin received notification for Project B
  const adminNotifB = await Notification.findOne({
    userId: admin.user._id,
    type: 'material_added',
    relatedId: matBId,
  });
  assert(!!adminNotifB, 'Project Admin (Guitar) received notification for Project B material addition');
  assert(adminNotifB?.metadata?.projectName === 'Autonomous Rover', 'Admin notification mentions Project B');
  assert(adminNotifB?.metadata?.source === 'owned', 'Admin notification metadata has source: owned');

  // Check Mentor B received notification for Project B
  const mentorBNotifB = await Notification.findOne({
    userId: mentorB.user._id,
    type: 'material_added',
    relatedId: matBId,
  });
  assert(!!mentorBNotifB, "Project B's assigned mentor (Dr. Priya Nair) received notification for Project B");

  // Check Mentor A did NOT receive notification for Project B
  const mentorANotifB = await Notification.findOne({
    userId: mentorA.user._id,
    type: 'material_added',
    relatedId: matBId,
  });
  assert(!mentorANotifB, 'Mentor A (Dr. Amit Joshi) received NO notification for Project B material addition');

  // -------------------------------------------------------------------------
  // CHECKLIST 5, 6: Leader submits project update to Project A
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 5, 6: Leader submits project update to Project A ---');
  const updateTitle = `Energy Monitoring Milestone ${Date.now()}`;
  const addUpdateRes = await req('POST', `/projects/${projAId}/updates`, {
    title: updateTitle,
    description: 'Hardware assembled and communication protocol validated successfully.',
  }, leaderA.token);

  assert(addUpdateRes.status === 201, `Leader A submitted project update (HTTP 201, got ${addUpdateRes.status})`);
  const updateId = addUpdateRes.json?.data?._id;
  assert(!!updateId, 'Project update record ID returned');

  // Check Project Admin received the project update notification
  const adminUpdateNotif = await Notification.findOne({
    userId: admin.user._id,
    type: 'project_update',
    relatedId: updateId,
  });
  assert(!!adminUpdateNotif, 'Project Admin (Guitar) received project update notification');
  assert(adminUpdateNotif?.title === 'New Project Update', 'Update notification title is "New Project Update"');
  assert(adminUpdateNotif?.message.includes(updateTitle), `Update notification message mentions title "${updateTitle}"`);
  assert(adminUpdateNotif?.link === `/projects/${projAId}#update-${updateId}`, `Update link points to /projects/${projAId}#update-${updateId}`);
  assert(adminUpdateNotif?.metadata?.actorName === 'Riya Sharma', 'Update metadata includes student author: Riya Sharma');
  assert(adminUpdateNotif?.metadata?.projectName === 'Campus Energy Monitor', 'Update metadata includes project name: Campus Energy Monitor');
  assert(adminUpdateNotif?.metadata?.entityName === updateTitle, 'Update metadata includes update title');
  assert(adminUpdateNotif?.metadata?.submissionTime != null, 'Update metadata includes submission timestamp');

  // Check Mentor A (assigned to Project A) received project update notification
  const mentorAUpdateNotif = await Notification.findOne({
    userId: mentorA.user._id,
    type: 'project_update',
    relatedId: updateId,
  });
  assert(!!mentorAUpdateNotif, "Project A's assigned mentor received project update notification");

  // Check Mentor B (assigned only to Project B) did NOT receive update notification for Project A
  const mentorBUpdateNotif = await Notification.findOne({
    userId: mentorB.user._id,
    type: 'project_update',
    relatedId: updateId,
  });
  assert(!mentorBUpdateNotif, "Mentor B (unassigned to Project A) received NO notification for Project A update");

  // -------------------------------------------------------------------------
  // CHECKLIST 7: New Material Request continues generating notification
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 7: Material Request Notification ---');
  let invItem = await GuitarInventory.findOne({ availableQuantity: { $gte: 1 } });
  if (!invItem) {
    invItem = await GuitarInventory.create({
      name: 'Test Sensor',
      category: 'Sensors',
      totalQuantity: 10,
      availableQuantity: 10,
      location: 'Bin S-1',
    });
  }

  const mrRes = await req('POST', '/material-requests', {
    projectId: projAId,
    inventoryItemId: invItem._id.toString(),
    quantity: 1,
    reason: 'Required for power measurement calibration test',
  }, leaderA.token);

  assert(mrRes.status === 201, `Material request submitted successfully (HTTP 201, got ${mrRes.status})`);
  const mrId = mrRes.json?.data?._id;
  assert(!!mrId, 'Material request ID returned');

  const adminMRNotif = await Notification.findOne({
    userId: admin.user._id,
    type: 'material_request_submitted',
    relatedId: mrId,
  });
  assert(!!adminMRNotif, 'Project Admin received notification for newly submitted material request');
  assert(adminMRNotif?.link === '/material-requests', 'MR notification link is /material-requests');

  // -------------------------------------------------------------------------
  // CHECKLIST 8: Project Admin inbox returns multiple relevant notification types
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 8: Project Admin inbox retrieval with multiple types ---');
  const adminNotifsRes = await req('GET', '/notifications', null, admin.token);
  assert(adminNotifsRes.status === 200, 'GET /notifications returns 200 for Project Admin');
  const adminNotifs = adminNotifsRes.json?.data || [];
  assert(adminNotifs.length > 0, `Admin inbox contains ${adminNotifs.length} notifications`);

  const typesPresent = new Set(adminNotifs.map(n => n.type));
  console.log(`  ℹ️ Notification types found in Admin inbox: [${Array.from(typesPresent).join(', ')}]`);
  assert(typesPresent.has('material_added'), 'Admin inbox contains "material_added" notifications');
  assert(typesPresent.has('project_update'), 'Admin inbox contains "project_update" notifications');
  assert(typesPresent.has('material_request_submitted'), 'Admin inbox contains "material_request_submitted" notifications');

  // -------------------------------------------------------------------------
  // CHECKLIST 9: Details & Timestamps
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 9: Notification details, authors, and timestamps ---');
  const sampleMatNotif = adminNotifs.find(n => n.type === 'material_added');
  assert(!!sampleMatNotif?.metadata?.actorName, `Material notification shows author name: "${sampleMatNotif?.metadata?.actorName}"`);
  assert(!!sampleMatNotif?.metadata?.projectName, `Material notification shows project name: "${sampleMatNotif?.metadata?.projectName}"`);
  assert(!!sampleMatNotif?.createdAt, `Material notification has timestamp: "${sampleMatNotif?.createdAt}"`);

  const sampleUpdNotif = adminNotifs.find(n => n.type === 'project_update');
  assert(!!sampleUpdNotif?.metadata?.actorName, `Update notification shows author name: "${sampleUpdNotif?.metadata?.actorName}"`);
  assert(!!sampleUpdNotif?.metadata?.entityName, `Update notification shows update title: "${sampleUpdNotif?.metadata?.entityName}"`);

  // -------------------------------------------------------------------------
  // CHECKLIST 10: Notification Links, Unread Count & Read Status
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 10: Unread counts, mark read, mark all read ---');
  const unreadCountRes = await req('GET', '/notifications/unread-count', null, admin.token);
  assert(unreadCountRes.status === 200, 'GET /notifications/unread-count returns 200');
  const initialUnread = unreadCountRes.json?.count;
  assert(typeof initialUnread === 'number' && initialUnread > 0, `Unread count is positive: ${initialUnread}`);

  // Mark single notification read
  const unreadNotif = adminNotifs.find(n => !n.isRead);
  if (unreadNotif) {
    const markSingleRes = await req('PATCH', `/notifications/${unreadNotif._id}/read`, {}, admin.token);
    assert(markSingleRes.status === 200, `PATCH /notifications/:id/read returned 200`);

    const unreadAfterSingle = await req('GET', '/notifications/unread-count', null, admin.token);
    assert(unreadAfterSingle.json?.count === initialUnread - 1, `Unread count decremented by 1 (now: ${unreadAfterSingle.json?.count})`);
  }

  // Mark all read
  const markAllRes = await req('PATCH', '/notifications/read-all', {}, admin.token);
  assert(markAllRes.status === 200, 'PATCH /notifications/read-all returned 200');
  const unreadAfterAll = await req('GET', '/notifications/unread-count', null, admin.token);
  assert(unreadAfterAll.json?.count === 0, 'Unread count is now 0 after mark-all-read');

  // -------------------------------------------------------------------------
  // CHECKLIST 11: Failed operations do not create notifications
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 11: Failed operations do not create notifications ---');
  const notifCountBefore = await Notification.countDocuments();

  // Failed material add: negative quantity
  const failedMatRes = await req('POST', `/projects/${projAId}/materials`, {
    name: 'Invalid Material',
    quantity: -5,
    source: 'self_purchased',
  }, leaderA.token);
  assert(failedMatRes.status === 400, 'Failed material add rejected with HTTP 400');

  // Failed material add: non-leader student
  const nonLeaderRes = await req('POST', `/projects/${projAId}/materials`, {
    name: 'Unauthorized Material',
    quantity: 1,
    source: 'self_purchased',
  }, leaderB.token); // leaderB is not leader of projA
  assert(nonLeaderRes.status === 403, 'Non-leader material add rejected with HTTP 403');

  // Failed project update: empty title
  const failedUpdRes = await req('POST', `/projects/${projAId}/updates`, {
    title: '',
    description: 'Empty title test',
  }, leaderA.token);
  assert(failedUpdRes.status === 400, 'Project update without title rejected with HTTP 400');

  const notifCountAfter = await Notification.countDocuments();
  assert(notifCountBefore === notifCountAfter, `No notifications created for failed operations (count stayed ${notifCountAfter})`);

  // -------------------------------------------------------------------------
  // CHECKLIST 12: Duplicate notifications are not generated
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 12: Deduplication verification ---');
  const dupeCount = await Notification.countDocuments({
    userId: admin.user._id,
    type: 'material_added',
    relatedId: matAId,
  });
  assert(dupeCount === 1, `Exact 1 notification created for material A for admin (no duplicates, got ${dupeCount})`);

  // -------------------------------------------------------------------------
  // CHECKLIST 13: RBAC and Notification Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- Checklist 13: RBAC and User Isolation ---');
  // Student views their own notifications
  const studentNotifsRes = await req('GET', '/notifications', null, leaderA.token);
  assert(studentNotifsRes.status === 200, 'Student can fetch their notifications');
  const studentNotifs = studentNotifsRes.json?.data || [];
  const studentHasAdminNotif = studentNotifs.some(n => n.userId.toString() === admin.user._id.toString());
  assert(!studentHasAdminNotif, "Student CANNOT see notifications belonging to Project Admin");

  // Student tries to mark Project Admin's notification as read
  if (sampleMatNotif) {
    const idorRes = await req('PATCH', `/notifications/${sampleMatNotif._id}/read`, {}, leaderA.token);
    assert(idorRes.status === 403, 'IDOR protection: Student cannot mark Admin notification as read (HTTP 403)');
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n=================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
