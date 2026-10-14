/**
 * test_student_join_notifications.mjs
 * End-to-end verification for Student Join Request Notifications with Student Details.
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
  console.log('\n=== RUNNING STUDENT JOIN REQUEST NOTIFICATION TESTS ===\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.\n');

  let studentUser, student2User, coordinator1, coordinatorUnrelated, primaryMentor, secondaryMentor;
  let testClub, testProject, noMentorProject, joinRequestId, projJoinRequestId;

  try {
    // 1. Prepare Users
    console.log('--- Phase 1: Preparing Test Users & Entities ---');

    // Create unique test users to ensure clean state
    const ts = Date.now();
    studentUser = new User({
      name: 'Arjun Mehta',
      email: `test_arjun_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'CSE',
      semester: 5,
      phone: '9876543210',
      universityId: `CNP_ARJUN_${ts}`,
    });
    await studentUser.save();

    student2User = new User({
      name: 'Riya Sharma',
      email: `test_riya_${ts}@test.com`,
      password: 'Test@12345',
      role: 'student',
      department: 'CSE',
      semester: 5,
      phone: '9876543211',
      universityId: `CNP_RIYA_${ts}`,
    });
    await student2User.save();

    coordinator1 = new User({
      name: 'Dr. Neha Verma',
      email: `test_neha_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Computer Science',
      phone: '9876543212',
    });
    await coordinator1.save();

    coordinatorUnrelated = new User({
      name: 'Dr. Rahul Desai',
      email: `test_rahul_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_coordinator',
      department: 'Electronics',
      phone: '9876543213',
    });
    await coordinatorUnrelated.save();

    primaryMentor = new User({
      name: 'Dr. Amit Joshi',
      email: `test_amit_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Computer Science',
      phone: '9876543214',
    });
    await primaryMentor.save();

    secondaryMentor = new User({
      name: 'Dr. Priya Nair',
      email: `test_priya_${ts}@test.com`,
      password: 'Test@12345',
      role: 'faculty_mentor',
      department: 'Electronics',
      phone: '9876543215',
    });
    await secondaryMentor.save();

    // Create test club
    testClub = await Club.create({
      name: `Robotics Club ${ts}`,
      description: 'Build robots and AI drones.',
      facultyCoordinatorId: coordinator1._id,
      createdBy: coordinator1._id,
    });

    // Create test project with primary and secondary mentor
    testProject = await Project.create({
      name: `Smart Irrigation System ${ts}`,
      description: 'IoT automated watering system',
      status: 'active',
      teamLeaderId: studentUser._id,
      createdBy: primaryMentor._id,
    });

    await ProjectMentor.create({
      projectId: testProject._id,
      mentorId: primaryMentor._id,
      isPrimary: true,
      assignedAt: new Date(Date.now() - 10000),
    });

    await ProjectMentor.create({
      projectId: testProject._id,
      mentorId: secondaryMentor._id,
      isPrimary: false,
      assignedAt: new Date(),
    });

    // Project with NO mentor
    noMentorProject = await Project.create({
      name: `Unmentored Project ${ts}`,
      description: 'Project without assigned mentor',
      status: 'active',
      teamLeaderId: studentUser._id,
      createdBy: primaryMentor._id,
    });

    console.log('Test fixtures created successfully.\n');

    // Login users
    const studentAuth = await loginUser(studentUser.email);
    const student2Auth = await loginUser(student2User.email);
    const coord1Auth = await loginUser(coordinator1.email);
    const coordUnrelatedAuth = await loginUser(coordinatorUnrelated.email);
    const primaryMentorAuth = await loginUser(primaryMentor.email);
    const secMentorAuth = await loginUser(secondaryMentor.email);

    // ── Phase 2: Club Join Request & Notifications ───────────────────────────
    console.log('--- Phase 2: Club Join Request & Notifications ---');

    const clubJoinRes = await req('POST', `/clubs/${testClub._id}/join`, {}, studentAuth.token);
    assert(clubJoinRes.status === 201, 'Student successfully submits club join request', JSON.stringify(clubJoinRes.data));

    joinRequestId = clubJoinRes.data?.data?._id;
    assert(Boolean(joinRequestId), 'Join request ID returned in response');

    // Check notification for assigned Faculty Coordinator (Dr. Neha Verma)
    const coordNotifsRes = await req('GET', '/notifications', null, coord1Auth.token);
    assert(coordNotifsRes.status === 200, 'Coordinator fetches notifications');

    const clubNotif = coordNotifsRes.data?.data?.find(
      (n) => String(n.relatedId) === String(joinRequestId) || String(n.metadata?.clubId) === testClub._id.toString()
    );
    assert(Boolean(clubNotif), 'Assigned Faculty Coordinator received the join request notification');

    if (clubNotif) {
      assert(clubNotif.title === 'New Club Join Request', `Notification title is 'New Club Join Request' (got: "${clubNotif.title}")`);
      assert(
        clubNotif.message.includes('has requested to join'),
        `Notification message contains request text (got: "${clubNotif.message}")`
      );
      assert(clubNotif.metadata?.actorEmail === studentUser.email, 'Metadata includes actorEmail');
      assert(clubNotif.metadata?.department === 'CSE', 'Metadata includes department');
      assert(clubNotif.metadata?.semester === 5, 'Metadata includes semester');
      assert(clubNotif.metadata?.status === 'pending', 'Metadata includes status: pending');
      assert(Boolean(clubNotif.metadata?.requestDate), 'Metadata includes requestDate');
      assert(clubNotif.link?.includes(`/clubs/${testClub._id}`), 'Notification link points to the club management page');
      assert(clubNotif.actionText === 'Review Request', 'Notification actionText is "Review Request"');
    }

    // Verify unrelated coordinator received 0 notifications
    const unrelCoordNotifs = await req('GET', '/notifications', null, coordUnrelatedAuth.token);
    const leakedClubNotif = unrelCoordNotifs.data?.data?.find((n) => n.relatedId === joinRequestId);
    assert(!leakedClubNotif, 'Unrelated Faculty Coordinator received NO notification for this club request');

    // Duplicate club join request attempt
    const dupClubRes = await req('POST', `/clubs/${testClub._id}/join`, {}, studentAuth.token);
    assert(dupClubRes.status === 409, 'Duplicate club join request prevented with 409 Conflict');

    // Verify no duplicate notification was created
    const countAfterDup = await Notification.countDocuments({
      userId: coordinator1._id,
      relatedId: joinRequestId,
    });
    assert(countAfterDup === 1, `Exactly 1 notification exists for coordinator (count: ${countAfterDup})`);

    // Verify GET /api/join-requests/club/:clubId
    const clubReqsRes = await req('GET', `/join-requests/club/${testClub._id}`, null, coord1Auth.token);
    assert(clubReqsRes.status === 200, 'Assigned coordinator can view club join requests');
    assert(clubReqsRes.data?.data?.some((r) => r._id === joinRequestId), 'Pending request is listed in club join requests');

    // Verify unrelated coordinator receives 403 on GET /api/join-requests/club/:clubId
    const unrelClubReqsRes = await req('GET', `/join-requests/club/${testClub._id}`, null, coordUnrelatedAuth.token);
    assert(unrelClubReqsRes.status === 403, 'Unrelated coordinator is forbidden (403) from accessing another club requests');

    // Coordinator approves request
    const approveClubRes = await req('PATCH', `/join-requests/${joinRequestId}/approve`, {}, coord1Auth.token);
    assert(approveClubRes.status === 200, 'Coordinator successfully approves club join request');

    // Verify student receives club_join_approved notification
    const studentNotifsAfterApprove = await req('GET', '/notifications', null, studentAuth.token);
    const approvedNotif = studentNotifsAfterApprove.data?.data?.find((n) => n.type === 'club_join_approved');
    assert(Boolean(approvedNotif), 'Student received "club_join_approved" notification');

    // ── Phase 3: Project Join Request & Notifications ────────────────────────
    console.log('\n--- Phase 3: Project Join Request & Notifications ---');

    const projJoinRes = await req('POST', `/projects/${testProject._id}/join`, {}, student2Auth.token);
    assert(projJoinRes.status === 201, 'Student successfully submits project join request', JSON.stringify(projJoinRes.data));

    projJoinRequestId = projJoinRes.data?.data?._id;
    assert(Boolean(projJoinRequestId), 'Project join request ID returned');

    // Check notification for primary Faculty Mentor (Dr. Amit Joshi)
    const primaryMentorNotifs = await req('GET', '/notifications', null, primaryMentorAuth.token);
    assert(primaryMentorNotifs.status === 200, 'Primary mentor fetches notifications');

    const projNotif = primaryMentorNotifs.data?.data?.find(
      (n) => String(n.relatedId) === String(projJoinRequestId) || String(n.metadata?.projectId) === testProject._id.toString()
    );
    assert(Boolean(projNotif), 'Primary Faculty Mentor received the project join request notification');

    if (projNotif) {
      assert(projNotif.title === 'New Project Join Request', `Notification title is 'New Project Join Request' (got: "${projNotif.title}")`);
      assert(
        projNotif.message.includes('has requested to join'),
        `Notification message contains request text (got: "${projNotif.message}")`
      );
      assert(projNotif.metadata?.actorEmail === student2User.email, 'Metadata includes actorEmail');
      assert(projNotif.metadata?.department === 'CSE', 'Metadata includes department');
      assert(projNotif.metadata?.semester === 5, 'Metadata includes semester');
      assert(projNotif.metadata?.status === 'pending', 'Metadata includes status: pending');
      assert(Boolean(projNotif.metadata?.requestDate), 'Metadata includes requestDate');
      assert(projNotif.link?.includes(`/projects/${testProject._id}`), 'Notification link points to the project management page');
      assert(projNotif.actionText === 'Review Request', 'Notification actionText is "Review Request"');
    }

    // Verify secondary / unrelated mentor received NO notification
    const secMentorNotifs = await req('GET', '/notifications', null, secMentorAuth.token);
    const leakedProjNotif = secMentorNotifs.data?.data?.find((n) => n.relatedId === projJoinRequestId);
    assert(!leakedProjNotif, 'Secondary Faculty Mentor received NO notification for this project join request');

    // Duplicate project join request attempt
    const dupProjRes = await req('POST', `/projects/${testProject._id}/join`, {}, student2Auth.token);
    assert(dupProjRes.status === 409, 'Duplicate project join request prevented with 409 Conflict');

    // Verify no duplicate notification was created
    const countProjAfterDup = await Notification.countDocuments({
      userId: primaryMentor._id,
      relatedId: projJoinRequestId,
    });
    assert(countProjAfterDup === 1, `Exactly 1 notification exists for primary mentor (count: ${countProjAfterDup})`);

    // Verify GET /api/join-requests/project/:projectId
    const projReqsRes = await req('GET', `/join-requests/project/${testProject._id}`, null, primaryMentorAuth.token);
    assert(projReqsRes.status === 200, 'Primary mentor can view project join requests');
    assert(projReqsRes.data?.data?.some((r) => r._id === projJoinRequestId), 'Pending request is listed in project join requests');

    // Secondary mentor (assigned mentor) also has access to view, but an unassigned faculty mentor receives 403
    const unassignedMentorRes = await req('GET', `/join-requests/project/${testProject._id}`, null, coordUnrelatedAuth.token);
    assert(unassignedMentorRes.status === 403, 'Unassigned faculty member receives 403 on project join requests');

    // Secondary mentor attempts to reject -> 403 (only primary mentor can approve/reject)
    const secMentorRejectRes = await req('PATCH', `/join-requests/${projJoinRequestId}/reject`, {}, secMentorAuth.token);
    assert(secMentorRejectRes.status === 403, 'Non-primary mentor cannot reject project join request (403)');

    // Primary mentor rejects request
    const primaryMentorRejectRes = await req('PATCH', `/join-requests/${projJoinRequestId}/reject`, {}, primaryMentorAuth.token);
    assert(primaryMentorRejectRes.status === 200, 'Primary mentor successfully rejects project join request');

    // Verify student receives project_join_rejected notification
    const student2NotifsAfterReject = await req('GET', '/notifications', null, student2Auth.token);
    const rejectedNotif = student2NotifsAfterReject.data?.data?.find((n) => n.type === 'project_join_rejected');
    assert(Boolean(rejectedNotif), 'Student received "project_join_rejected" notification');

    // ── Phase 4: Graceful handling when project has no mentor ────────────────
    console.log('\n--- Phase 4: Project without Primary Mentor ---');

    const noMentorJoinRes = await req('POST', `/projects/${noMentorProject._id}/join`, {}, student2Auth.token);
    assert(noMentorJoinRes.status === 400, 'Project without primary mentor returns 400 Bad Request gracefully without crashing');
    assert(
      noMentorJoinRes.data?.message?.includes('does not have a primary Faculty Mentor'),
      'Returned appropriate error message explaining missing primary mentor'
    );

    // ── Phase 5: Notification Read / Unread Status ───────────────────────────
    console.log('\n--- Phase 5: Notification Read / Unread Status ---');

    const unreadCountBefore = (await req('GET', '/notifications/unread-count', null, primaryMentorAuth.token)).data?.count;
    assert(unreadCountBefore >= 1, `Primary mentor has unread notifications (${unreadCountBefore})`);

    if (projNotif?._id) {
      const markOneRead = await req('PATCH', `/notifications/${projNotif._id}/read`, {}, primaryMentorAuth.token);
      assert(markOneRead.status === 200, 'Mark single notification as read succeeded');

      const unreadCountAfter = (await req('GET', '/notifications/unread-count', null, primaryMentorAuth.token)).data?.count;
      assert(unreadCountAfter === unreadCountBefore - 1, `Unread count decremented by 1 (now: ${unreadCountAfter})`);
    }

    const markAllRead = await req('PATCH', '/notifications/read-all', {}, primaryMentorAuth.token);
    assert(markAllRead.status === 200, 'Mark all as read succeeded');

    const unreadCountFinal = (await req('GET', '/notifications/unread-count', null, primaryMentorAuth.token)).data?.count;
    assert(unreadCountFinal === 0, `Unread count is now 0 (got: ${unreadCountFinal})`);

  } finally {
    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    if (studentUser?._id) {
      await User.deleteMany({ _id: { $in: [studentUser._id, student2User._id, coordinator1._id, coordinatorUnrelated._id, primaryMentor._id, secondaryMentor._id] } });
    }
    if (testClub?._id) {
      await Club.deleteOne({ _id: testClub._id });
    }
    if (testProject?._id) {
      await Project.deleteMany({ _id: { $in: [testProject._id, noMentorProject._id] } });
      await ProjectMentor.deleteMany({ projectId: { $in: [testProject._id, noMentorProject._id] } });
    }
    if (joinRequestId) await JoinRequest.deleteOne({ _id: joinRequestId });
    if (projJoinRequestId) await JoinRequest.deleteOne({ _id: projJoinRequestId });
    if (coordinator1?._id) {
      await Notification.deleteMany({ userId: { $in: [coordinator1._id, primaryMentor._id, studentUser._id, student2User._id] } });
    }
    console.log('Cleanup complete.');

    await mongoose.disconnect();
  }

  console.log(`\n==================================================`);
  console.log(`TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
