/**
 * test_join_request_notifications_fix.mjs
 *
 * Comprehensive end-to-end test verifying:
 * 1. Club Join Request:
 *    - Faculty Coordinator assigned to the club receives notification.
 *    - All Club Admin accounts receive separate notifications.
 *    - Unrelated Faculty Coordinator does NOT receive notifications.
 *    - Message & title: "New Club Join Request", "<Student> has requested to join <Club>."
 *    - Student details (email, department, semester), status "pending", requestDate, link "/clubs/:id#join-requests".
 * 2. Project Join Request:
 *    - Primary Faculty Mentor continues receiving notification.
 *    - All Project Admin accounts receive separate notifications.
 *    - Secondary / unrelated Faculty Mentor does NOT receive notifications.
 *    - Message & title: "New Project Join Request", "<Student> has requested to join <Project>."
 *    - Student details (email, department, semester), status "pending", requestDate, link "/projects/:id#join-requests".
 * 3. Deduplication:
 *    - Duplicate submission is blocked (409) and does NOT create duplicate notifications.
 *    - Deduplication is keyed by joinRequest ID, not solely student+club/project.
 * 4. Inbox and Dropdown APIs:
 *    - /api/notifications and /api/notifications?limit=5 return the notifications.
 *    - /api/notifications/unread-count and /api/notifications/:id/read work properly.
 * 5. Authorization & Review Workflow:
 *    - Assigned FC and Club Admin can access and review club join requests.
 *    - Assigned FM and Project Admin can access and review project join requests.
 *    - Approval/Rejection updates status and notifies student.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Club from './src/models/Club.js';
import Project from './src/models/Project.js';
import ClubMembership from './src/models/ClubMembership.js';
import ProjectMembership from './src/models/ProjectMembership.js';
import ProjectMentor from './src/models/ProjectMentor.js';
import JoinRequest from './src/models/JoinRequest.js';
import Notification from './src/models/Notification.js';

const BASE = 'http://localhost:5000/api';

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

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log('  RUNNING CLUB & PROJECT JOIN REQUEST NOTIFICATIONS VERIFICATION TEST');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const ts = Date.now();
  let student1, student2, fc1, fcUnrelated, ca1, ca2, pa1, pa2, primaryMentor, secondaryMentor;
  let club, project, clubJoinRequestId, projJoinRequestId;

  try {
    console.log('--- 1. Creating Isolated Test Users and Entities ---');

    student1 = await User.create({
      name: 'Arjun Mehta',
      email: `arjun_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'CSE',
      semester: 5,
      phone: '9876543210',
      universityId: `ARJUN_${ts}`,
    });

    student2 = await User.create({
      name: 'Riya Sharma',
      email: `riya_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'CSE',
      semester: 5,
      phone: '9876543211',
      universityId: `RIYA_${ts}`,
    });

    fc1 = await User.create({
      name: 'Dr. Neha Verma',
      email: `neha_fc_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Computer Science',
      phone: '9876543212',
    });

    fcUnrelated = await User.create({
      name: 'Dr. Rahul Desai',
      email: `rahul_unrel_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Electronics',
      phone: '9876543213',
    });

    ca1 = await User.create({
      name: 'Karan Shah',
      email: `ca1_${ts}@test.com`,
      password: 'Test@12345',
      role: 'club_admin',
      department: 'Management',
      phone: '9876543214',
    });

    ca2 = await User.create({
      name: 'Pooja ClubAdmin',
      email: `ca2_${ts}@test.com`,
      password: 'Test@12345',
      role: 'club_admin',
      department: 'Management',
      phone: '9876543215',
    });

    primaryMentor = await User.create({
      name: 'Dr. Amit Joshi',
      email: `amit_fm_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Computer Science',
      phone: '9876543216',
    });

    secondaryMentor = await User.create({
      name: 'Dr. Priya Nair',
      email: `priya_fm_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Electronics',
      phone: '9876543217',
    });

    pa1 = await User.create({
      name: 'Guitar Admin 1',
      email: `pa1_${ts}@test.com`,
      password: 'Test@12345',
      role: 'project_admin',
      department: 'Engineering',
      phone: '9876543218',
    });

    pa2 = await User.create({
      name: 'Guitar Admin 2',
      email: `pa2_${ts}@test.com`,
      password: 'Test@12345',
      role: 'project_admin',
      department: 'Engineering',
      phone: '9876543219',
    });

    club = await Club.create({
      name: `Photography Club ${ts}`,
      description: 'Capture the visual moments.',
      facultyCoordinatorId: fc1._id,
      createdBy: fc1._id,
    });

    project = await Project.create({
      name: `Smart Irrigation System ${ts}`,
      description: 'Automated plant watering.',
      status: 'active',
      teamLeaderId: student1._id,
      createdBy: primaryMentor._id,
    });

    await ProjectMentor.create({
      projectId: project._id,
      mentorId: primaryMentor._id,
      isPrimary: true,
      assignedAt: new Date(Date.now() - 5000),
    });

    await ProjectMentor.create({
      projectId: project._id,
      mentorId: secondaryMentor._id,
      isPrimary: false,
      assignedAt: new Date(),
    });

    console.log('Entities created successfully.\n');

    // Authenticate users
    const authStudent1 = await loginUser(student1.email);
    const authStudent2 = await loginUser(student2.email);
    const authFc1 = await loginUser(fc1.email);
    const authFcUnrel = await loginUser(fcUnrelated.email);
    const authCa1 = await loginUser(ca1.email);
    const authCa2 = await loginUser(ca2.email);
    const authFmPrimary = await loginUser(primaryMentor.email);
    const authFmSecondary = await loginUser(secondaryMentor.email);
    const authPa1 = await loginUser(pa1.email);
    const authPa2 = await loginUser(pa2.email);

    // ──────────────────────────────────────────────────────────────────────────
    // WORKFLOW 1: CLUB JOIN REQUEST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 2. Testing Club Join Request Notifications ---');

    const clubJoinRes = await req('POST', `/clubs/${club._id}/join`, {}, authStudent1.token);
    assert(clubJoinRes.status === 201, 'Student submits club join request (201 Created)', JSON.stringify(clubJoinRes.data));
    clubJoinRequestId = clubJoinRes.data?.data?._id;
    assert(Boolean(clubJoinRequestId), 'Join request record persisted in database');

    // Check FC1 notification
    const fc1Notifs = await Notification.find({ userId: fc1._id, relatedId: clubJoinRequestId });
    assert(fc1Notifs.length === 1, `Assigned Faculty Coordinator received exactly 1 notification (got: ${fc1Notifs.length})`);
    const fcNotif = fc1Notifs[0];
    assert(fcNotif?.type === 'club_join_request', 'Notification type is "club_join_request"');
    assert(fcNotif?.title === 'New Club Join Request', `Title is "New Club Join Request" (got: "${fcNotif?.title}")`);
    assert(
      fcNotif?.message === `Arjun Mehta has requested to join Photography Club ${ts}.`,
      `Message includes student name and club name (got: "${fcNotif?.message}")`
    );
    assert(fcNotif?.metadata?.actorName === 'Arjun Mehta', 'Metadata contains student name Arjun Mehta');
    assert(fcNotif?.metadata?.actorEmail === student1.email, `Metadata contains student email ${student1.email}`);
    assert(fcNotif?.metadata?.department === 'CSE', 'Metadata contains student department CSE');
    assert(fcNotif?.metadata?.semester === 5, 'Metadata contains student semester 5');
    assert(fcNotif?.metadata?.status === 'pending', 'Metadata contains status pending');
    assert(Boolean(fcNotif?.metadata?.requestDate), 'Metadata contains requestDate');
    assert(fcNotif?.link === `/clubs/${club._id}#join-requests`, `Link points to /clubs/${club._id}#join-requests`);
    assert(fcNotif?.actionText === 'Review Request', 'Action text is "Review Request"');

    // Check Club Admin 1 notification
    const ca1Notifs = await Notification.find({ userId: ca1._id, relatedId: clubJoinRequestId });
    assert(ca1Notifs.length === 1, `Club Admin 1 received exactly 1 notification (got: ${ca1Notifs.length})`);
    assert(
      ca1Notifs[0]?.message === `Arjun Mehta has requested to join Photography Club ${ts}.`,
      `Club Admin 1 message matches expected format (got: "${ca1Notifs[0]?.message}")`
    );

    // Check Club Admin 2 notification (multiple admin support)
    const ca2Notifs = await Notification.find({ userId: ca2._id, relatedId: clubJoinRequestId });
    assert(ca2Notifs.length === 1, `Club Admin 2 received separate notification (multiple admin support verified)`);

    // Verify unrelated coordinator received ZERO notifications
    const fcUnrelNotifs = await Notification.find({ userId: fcUnrelated._id, relatedId: clubJoinRequestId });
    assert(fcUnrelNotifs.length === 0, `Unrelated Faculty Coordinator received 0 notifications`);

    // Check inbox API for FC1 and Club Admin
    const fcInbox = await req('GET', '/notifications', null, authFc1.token);
    assert(fcInbox.status === 200, 'FC1 fetches notification inbox (200 OK)');
    const fcInboxItem = fcInbox.data?.data?.find((n) => String(n.relatedId) === String(clubJoinRequestId));
    assert(Boolean(fcInboxItem), 'Club join notification present in FC1 inbox API');
    assert(
      fcInboxItem?.message === `Arjun Mehta has requested to join Photography Club ${ts}.`,
      `FC1 inbox API preserved dynamic message without overwriting`
    );

    const caInbox = await req('GET', '/notifications', null, authCa1.token);
    assert(caInbox.status === 200, 'Club Admin 1 fetches notification inbox (200 OK)');
    const caInboxItem = caInbox.data?.data?.find((n) => String(n.relatedId) === String(clubJoinRequestId));
    assert(Boolean(caInboxItem), 'Club join notification present in Club Admin 1 inbox API');

    // Dropdown limit check
    const dropdownRes = await req('GET', '/notifications?limit=5', null, authFc1.token);
    assert(dropdownRes.status === 200, 'Notification dropdown API (limit=5) returns 200 OK');
    assert(dropdownRes.data?.data?.some((n) => String(n.relatedId) === String(clubJoinRequestId)), 'Dropdown contains the notification');

    // ──────────────────────────────────────────────────────────────────────────
    // WORKFLOW 2: DUPLICATE PREVENTION (CLUB)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Testing Duplicate Protection ---');

    const dupClubRes = await req('POST', `/clubs/${club._id}/join`, {}, authStudent1.token);
    assert(dupClubRes.status === 409, 'Duplicate club join request returns 409 Conflict');

    const fc1NotifCountAfterDup = await Notification.countDocuments({ userId: fc1._id, relatedId: clubJoinRequestId });
    assert(fc1NotifCountAfterDup === 1, `No duplicate notification created for FC1 (count remains: ${fc1NotifCountAfterDup})`);

    const ca1NotifCountAfterDup = await Notification.countDocuments({ userId: ca1._id, relatedId: clubJoinRequestId });
    assert(ca1NotifCountAfterDup === 1, `No duplicate notification created for Club Admin (count remains: ${ca1NotifCountAfterDup})`);

    // ──────────────────────────────────────────────────────────────────────────
    // WORKFLOW 3: PROJECT JOIN REQUEST
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Testing Project Join Request Notifications ---');

    const projJoinRes = await req('POST', `/projects/${project._id}/join`, {}, authStudent2.token);
    assert(projJoinRes.status === 201, 'Student submits project join request (201 Created)', JSON.stringify(projJoinRes.data));
    projJoinRequestId = projJoinRes.data?.data?._id;
    assert(Boolean(projJoinRequestId), 'Project join request record persisted in database');

    // Check Primary Faculty Mentor notification
    const fmNotifs = await Notification.find({ userId: primaryMentor._id, relatedId: projJoinRequestId });
    assert(fmNotifs.length === 1, `Primary Faculty Mentor received exactly 1 notification (got: ${fmNotifs.length})`);
    const fmNotif = fmNotifs[0];
    assert(fmNotif?.type === 'project_join_request', 'Notification type is "project_join_request"');
    assert(fmNotif?.title === 'New Project Join Request', `Title is "New Project Join Request" (got: "${fmNotif?.title}")`);
    assert(
      fmNotif?.message === `Riya Sharma has requested to join Smart Irrigation System ${ts}.`,
      `Message includes student name and project name (got: "${fmNotif?.message}")`
    );
    assert(fmNotif?.metadata?.actorName === 'Riya Sharma', 'Metadata contains student name Riya Sharma');
    assert(fmNotif?.metadata?.actorEmail === student2.email, `Metadata contains student email ${student2.email}`);
    assert(fmNotif?.metadata?.department === 'CSE', 'Metadata contains student department CSE');
    assert(fmNotif?.metadata?.semester === 5, 'Metadata contains student semester 5');
    assert(fmNotif?.metadata?.status === 'pending', 'Metadata contains status pending');
    assert(Boolean(fmNotif?.metadata?.requestDate), 'Metadata contains requestDate');
    assert(fmNotif?.link === `/projects/${project._id}#join-requests`, `Link points to /projects/${project._id}#join-requests`);
    assert(fmNotif?.actionText === 'Review Request', 'Action text is "Review Request"');

    // Check Project Admin 1 notification
    const pa1Notifs = await Notification.find({ userId: pa1._id, relatedId: projJoinRequestId });
    assert(pa1Notifs.length === 1, `Project Admin 1 received exactly 1 notification (got: ${pa1Notifs.length})`);
    assert(
      pa1Notifs[0]?.message === `Riya Sharma has requested to join Smart Irrigation System ${ts}.`,
      `Project Admin 1 message matches expected format (got: "${pa1Notifs[0]?.message}")`
    );

    // Check Project Admin 2 notification (multiple project admins)
    const pa2Notifs = await Notification.find({ userId: pa2._id, relatedId: projJoinRequestId });
    assert(pa2Notifs.length === 1, `Project Admin 2 received separate notification (multiple project admin accounts supported)`);

    // Verify secondary / unassigned mentor received ZERO notifications
    const secFmNotifs = await Notification.find({ userId: secondaryMentor._id, relatedId: projJoinRequestId });
    assert(secFmNotifs.length === 0, `Secondary Faculty Mentor received 0 notifications`);

    // Check inbox API for Primary FM and Project Admin
    const fmInbox = await req('GET', '/notifications', null, authFmPrimary.token);
    assert(fmInbox.status === 200, 'Primary FM fetches notification inbox (200 OK)');
    const fmInboxItem = fmInbox.data?.data?.find((n) => String(n.relatedId) === String(projJoinRequestId));
    assert(Boolean(fmInboxItem), 'Project join notification present in Primary FM inbox API');
    assert(
      fmInboxItem?.message === `Riya Sharma has requested to join Smart Irrigation System ${ts}.`,
      `Primary FM inbox API preserved dynamic message without overwriting`
    );

    const paInbox = await req('GET', '/notifications', null, authPa1.token);
    assert(paInbox.status === 200, 'Project Admin 1 fetches notification inbox (200 OK)');
    const paInboxItem = paInbox.data?.data?.find((n) => String(n.relatedId) === String(projJoinRequestId));
    assert(Boolean(paInboxItem), 'Project join notification present in Project Admin 1 inbox API');

    // Duplicate project join request attempt
    const dupProjRes = await req('POST', `/projects/${project._id}/join`, {}, authStudent2.token);
    assert(dupProjRes.status === 409, 'Duplicate project join request returns 409 Conflict');

    // ──────────────────────────────────────────────────────────────────────────
    // WORKFLOW 4: NOTIFICATION READ STATUS
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Testing Notification Read / Unread Status ---');

    const unreadCountBefore = (await req('GET', '/notifications/unread-count', null, authFc1.token)).data?.count;
    assert(unreadCountBefore >= 1, `FC1 has unread count >= 1 (count: ${unreadCountBefore})`);

    const markReadRes = await req('PATCH', `/notifications/${fcNotif._id}/read`, {}, authFc1.token);
    assert(markReadRes.status === 200, 'FC1 marks single notification as read (200 OK)');

    const unreadCountAfter = (await req('GET', '/notifications/unread-count', null, authFc1.token)).data?.count;
    assert(unreadCountAfter === unreadCountBefore - 1, `Unread count decremented by 1 (now: ${unreadCountAfter})`);

    // ──────────────────────────────────────────────────────────────────────────
    // WORKFLOW 5: AUTHORIZATION & REVIEW WORKFLOW
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Testing Authorization & Review Workflows ---');

    // Assigned FC can view club requests
    const fcClubReqs = await req('GET', `/join-requests/club/${club._id}`, null, authFc1.token);
    assert(fcClubReqs.status === 200, 'Assigned FC can view club join requests (200 OK)');
    assert(fcClubReqs.data?.data?.some((r) => r._id === clubJoinRequestId), 'Join request appears in assigned FC list');

    // Club Admin can view club requests for any club and /club/all
    const caClubReqs = await req('GET', `/join-requests/club/${club._id}`, null, authCa1.token);
    assert(caClubReqs.status === 200, 'Club Admin can view specific club join requests (200 OK)');

    const caAllClubReqs = await req('GET', '/join-requests/club/all', null, authCa1.token);
    assert(caAllClubReqs.status === 200, 'Club Admin can view all club join requests (200 OK)');

    // Unrelated FC cannot view club requests
    const fcUnrelClubReqs = await req('GET', `/join-requests/club/${club._id}`, null, authFcUnrel.token);
    assert(fcUnrelClubReqs.status === 403, 'Unrelated FC receives 403 Forbidden viewing other club requests');

    // Student cannot access administrative join request review endpoints
    const studentClubReqs = await req('GET', `/join-requests/club/${club._id}`, null, authStudent1.token);
    assert(studentClubReqs.status === 403, 'Student receives 403 Forbidden accessing review endpoints');

    // Club Admin approves the club join request
    const approveClubRes = await req('PATCH', `/join-requests/${clubJoinRequestId}/approve`, {}, authCa1.token);
    assert(approveClubRes.status === 200, 'Club Admin approves club join request (200 OK)');

    // Verify membership created
    const membership = await ClubMembership.findOne({ studentId: student1._id, clubId: club._id });
    assert(Boolean(membership), 'ClubMembership document created for approved student');

    // Project Admin can view project requests for any project and /project/all
    const paProjReqs = await req('GET', `/join-requests/project/${project._id}`, null, authPa1.token);
    assert(paProjReqs.status === 200, 'Project Admin can view specific project requests (200 OK)');

    const paAllProjReqs = await req('GET', '/join-requests/project/all', null, authPa1.token);
    assert(paAllProjReqs.status === 200, 'Project Admin can view all project join requests (200 OK)');

    // Primary FM can view project requests
    const fmProjReqs = await req('GET', `/join-requests/project/${project._id}`, null, authFmPrimary.token);
    assert(fmProjReqs.status === 200, 'Primary FM can view project requests (200 OK)');

    // Project Admin rejects project join request
    const rejectProjRes = await req('PATCH', `/join-requests/${projJoinRequestId}/reject`, {}, authPa1.token);
    assert(rejectProjRes.status === 200, 'Project Admin rejects project join request (200 OK)');

    const updatedProjReq = await JoinRequest.findById(projJoinRequestId);
    assert(updatedProjReq?.status === 'rejected', 'Project join request status updated to rejected');

    // Verify student received project_join_rejected notification
    const student2Notifs = await req('GET', '/notifications', null, authStudent2.token);
    const rejectedNotif = student2Notifs.data?.data?.find((n) => n.type === 'project_join_rejected');
    assert(Boolean(rejectedNotif), 'Student received "project_join_rejected" notification');

  } finally {
    console.log('\n--- Cleaning Up Test Records ---');
    const userIds = [student1?._id, student2?._id, fc1?._id, fcUnrelated?._id, ca1?._id, ca2?._id, primaryMentor?._id, secondaryMentor?._id, pa1?._id, pa2?._id].filter(Boolean);
    if (userIds.length > 0) {
      await User.deleteMany({ _id: { $in: userIds } });
      await Notification.deleteMany({ userId: { $in: userIds } });
    }
    if (club?._id) {
      await Club.deleteOne({ _id: club._id });
      await ClubMembership.deleteMany({ clubId: club._id });
    }
    if (project?._id) {
      await Project.deleteOne({ _id: project._id });
      await ProjectMentor.deleteMany({ projectId: project._id });
      await ProjectMembership.deleteMany({ projectId: project._id });
    }
    if (clubJoinRequestId) await JoinRequest.deleteOne({ _id: clubJoinRequestId });
    if (projJoinRequestId) await JoinRequest.deleteOne({ _id: projJoinRequestId });

    console.log('Test records cleaned up.');
    await mongoose.disconnect();
  }

  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`══════════════════════════════════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal error running test:', err);
  process.exit(1);
});
