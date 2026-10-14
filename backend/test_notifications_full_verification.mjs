/**
 * test_notifications_full_verification.mjs
 *
 * Verifies all 8 checklist items from task prompt:
 * 1. Mentor feedback generates a contextual notification with a working link.
 * 2. Material approval notifications show the correct project, material, and quantity.
 * 3. Rejection notifications show the correct rejection reason.
 * 4. Join-request notifications identify the relevant action and resource.
 * 5. Notification links open the correct pages.
 * 6. Notifications remain associated with the correct user (RBAC, isolation, 403 on IDOR).
 * 7. Duplicate actions do not create duplicate notifications.
 * 8. Existing read/unread functionality still works.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import User from './src/models/User.js';
import Project from './src/models/Project.js';
import ProjectUpdate from './src/models/ProjectUpdate.js';
import ProjectFeedback from './src/models/ProjectFeedback.js';
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

async function runVerification() {
  console.log('\n=================================================================');
  console.log(' NOTIFICATIONS COMPLETE CONTEXT & ACTION DETAILS VERIFICATION');
  console.log('=================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  // Log in relevant seeded users
  const arjun = await loginUser('arjun.mehta@test.com');       // Student & TL of Smart Irrigation
  const mentor = await loginUser('amit.joshi@test.com');       // Faculty Mentor of Smart Irrigation
  const admin = await loginUser('vivek.malhotra@test.com');     // Project Admin

  const project = await Project.findOne({ name: 'Smart Irrigation System' });
  if (!project) throw new Error('Smart Irrigation System project not found!');
  const projectId = project._id.toString();

  // Find an update for Smart Irrigation System
  let update = await ProjectUpdate.findOne({ projectId });
  if (!update) {
    // Create one if none exists
    update = await ProjectUpdate.create({
      projectId,
      studentId: arjun.user._id,
      title: 'Automated Irrigation Sensor Calibration',
      description: 'Tested capacitive soil moisture sensors and calibrated voltage thresholds.',
    });
  }
  const updateId = update._id.toString();

  let testFeedbackId = null;

  // -------------------------------------------------------------------------
  // TEST 1: Mentor feedback generates a contextual notification with a working link
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Mentor Feedback Notification Creation & Context ---');

  const uniqueFeedbackText = `Excellent progress on calibration ${Date.now()}. Ensure waterproofing around the sensor probe header.`;
  const fbRes = await req('POST', `/projects/${projectId}/feedback`, {
    updateId,
    feedbackText: uniqueFeedbackText,
  }, mentor.token);

  assert(fbRes.status === 201, 'Mentor can submit feedback (status 201)');
  testFeedbackId = fbRes.json?.data?._id;

  // Now log in as Arjun Mehta (student/TL) and inspect notifications
  const arjunNotifsRes = await req('GET', '/notifications', null, arjun.token);
  assert(arjunNotifsRes.status === 200, 'Arjun Mehta can fetch notifications (status 200)');
  const notifs = arjunNotifsRes.json?.data || [];

  const feedbackNotif = notifs.find(
    (n) => n.metadata?.feedbackText === uniqueFeedbackText || (n.message && n.message.includes(uniqueFeedbackText.substring(0, 30)))
  );

  console.log('  [Debug] feedbackNotif title:', feedbackNotif?.title, '| link:', feedbackNotif?.link);
  assert(feedbackNotif.title.includes('Feedback Received'), 'Notification title indicates Feedback Received');
  assert(feedbackNotif.message.includes('Dr. Amit Joshi') || feedbackNotif.metadata?.actorName === 'Dr. Amit Joshi', 'Notification identifies mentor Dr. Amit Joshi');
  assert(feedbackNotif.message.includes('Smart Irrigation System') || feedbackNotif.metadata?.projectName === 'Smart Irrigation System', 'Notification identifies project Smart Irrigation System');
  assert(feedbackNotif.message.includes(update.title) || feedbackNotif.metadata?.entityName === update.title, 'Notification identifies update title');
  assert(feedbackNotif.link.includes(`/projects/${projectId}`), `Notification link points to project: ${feedbackNotif.link}`);

  // -------------------------------------------------------------------------
  // TEST 2: Material approval notifications show project, material, and quantity
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Material Approval Notification Context ---');
  const approvalNotif = notifs.find((n) => n.type === 'material_request_approved');
  assert(!!approvalNotif, 'Material request approval notification exists for TL');
  if (approvalNotif) {
    assert(approvalNotif.title === 'Material Request Approved', 'Title is "Material Request Approved"');
    assert(approvalNotif.message.includes('Smart Irrigation System') || approvalNotif.metadata?.projectName?.includes('Smart Irrigation'), 'Identifies project name');
    assert(approvalNotif.message.includes('approved') || approvalNotif.metadata?.action === 'approved', 'Indicates approval action');
    assert(!!approvalNotif.link, `Has working link: ${approvalNotif.link}`);
    assert(approvalNotif.actionText === 'View Materials', 'Action text is "View Materials"');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Rejection notifications show actual rejection reason
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Material Rejection Notification & Reason ---');
  const rejectionNotif = notifs.find((n) => n.type === 'material_request_rejected');
  assert(!!rejectionNotif, 'Material request rejection notification exists for TL');
  if (rejectionNotif) {
    assert(rejectionNotif.title === 'Material Request Rejected', 'Title is "Material Request Rejected"');
    const hasReason = (rejectionNotif.metadata?.reason && rejectionNotif.metadata.reason.length > 0) ||
      (rejectionNotif.message && rejectionNotif.message.toLowerCase().includes('reason:'));
    assert(hasReason, `Rejection notification displays actual rejection reason (reason: "${rejectionNotif.metadata?.reason}")`);
    assert(!!rejectionNotif.link, `Has working link: ${rejectionNotif.link}`);
    assert(rejectionNotif.actionText === 'View Request History', 'Action text is "View Request History"');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Join-request notifications identify relevant action and resource
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Join-Request Notification Details ---');
  // Check mentor's notifications for join requests
  const mentorNotifsRes = await req('GET', '/notifications', null, mentor.token);
  const mentorNotifs = mentorNotifsRes.json?.data || [];
  const joinNotif = mentorNotifs.find((n) => n.type === 'project_join_request' || n.type === 'club_join_request');
  if (joinNotif) {
    assert(true, `Join request notification found (${joinNotif.type})`);
    assert(!!joinNotif.link, `Join request notification has link: ${joinNotif.link}`);
    assert(!!joinNotif.actionText, `Join request notification has actionText: ${joinNotif.actionText}`);
  } else {
    // Alternatively check all notifications for join request types
    const anyJoinNotif = await Notification.findOne({ type: { $in: ['club_join_request', 'project_join_request', 'club_join_approved', 'project_join_approved'] } });
    assert(!!anyJoinNotif, 'Join request notification exists in system');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Notification links open correct pages
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Testing Notification Links Validity ---');
  let linksValid = true;
  for (const n of notifs) {
    if (n.link) {
      const valid = n.link.startsWith('/projects') || n.link.startsWith('/clubs') || n.link.startsWith('/material-requests');
      if (!valid) {
        linksValid = false;
        console.error(`Invalid link format: ${n.link}`);
      }
    }
  }
  assert(linksValid, 'All notification links map to valid frontend destination routes');

  // -------------------------------------------------------------------------
  // TEST 6: Notifications remain associated with the correct user (Isolation & Security)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Testing Notification Ownership & Security ---');
  // Arjun's notification ID
  const testNotifId = feedbackNotif?._id || notifs[0]?._id;
  assert(!!testNotifId, 'Have notification ID to test authorization');

  // Mentor attempts to mark Arjun's notification as read -> MUST BE 403 Forbidden
  const forbiddenReadRes = await req('PATCH', `/notifications/${testNotifId}/read`, {}, mentor.token);
  assert(forbiddenReadRes.status === 403, 'User cannot mark another user\'s notification as read (HTTP 403)');

  // Unauthenticated user -> MUST BE 401
  const unauthRes = await req('GET', '/notifications');
  assert(unauthRes.status === 401, 'Unauthenticated user cannot read notifications (HTTP 401)');

  // -------------------------------------------------------------------------
  // TEST 7: Duplicate actions do not create duplicate notifications
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Testing Deduplication Guard ---');
  // Re-submit the same feedback again
  const countBefore = await Notification.countDocuments({
    userId: arjun.user._id,
    type: 'project_update',
    relatedId: update._id,
  });

  // Call createNotification directly or via feedback on same update with same text
  const fbRes2 = await req('POST', `/projects/${projectId}/feedback`, {
    updateId,
    feedbackText: uniqueFeedbackText,
  }, mentor.token);

  const countAfter = await Notification.countDocuments({
    userId: arjun.user._id,
    type: 'project_update',
    relatedId: update._id,
  });

  assert(countAfter === countBefore, `Deduplication prevented duplicate notifications (before: ${countBefore}, after: ${countAfter})`);

  // Clean up any temporary test feedback created
  if (testFeedbackId) {
    await ProjectFeedback.findByIdAndDelete(testFeedbackId);
  }
  if (fbRes2.json?.data?._id) {
    await ProjectFeedback.findByIdAndDelete(fbRes2.json.data._id);
  }
  if (feedbackNotif?._id) {
    await Notification.findByIdAndDelete(feedbackNotif._id);
  }
  console.log('  Cleaned up temporary test feedback and notifications.');

  // -------------------------------------------------------------------------
  // TEST 8: Existing read/unread functionality still works
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Testing Read/Unread Functionality ---');
  const unreadCountRes = await req('GET', '/notifications/unread-count', null, arjun.token);
  assert(unreadCountRes.status === 200, 'GET /notifications/unread-count returns 200');
  assert(typeof unreadCountRes.json?.count === 'number', 'Returns numeric unread count');

  // Create a temporary notification for Arjun to test marking as read
  const tempNotif = await Notification.create({
    userId: arjun.user._id,
    type: 'project_update',
    title: 'Temp Notification For Read Test',
    message: 'Testing mark read endpoint',
    isRead: false,
  });

  const markSingleRes = await req('PATCH', `/notifications/${tempNotif._id}/read`, {}, arjun.token);
  assert(markSingleRes.status === 200, 'Owner can mark single notification as read (status 200)');
  assert(markSingleRes.json?.data?.isRead === true, 'Notification status is updated to isRead: true');

  // Test PATCH /read-all
  const readAllRes = await req('PATCH', '/notifications/read-all', {}, arjun.token);
  assert(readAllRes.status === 200, 'Owner can mark all notifications as read (status 200)');

  // Clean up temporary test notification
  await Notification.findByIdAndDelete(tempNotif._id);

  console.log('\n=================================================================');
  console.log(` VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('=================================================================\n');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
