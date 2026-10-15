import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const BASE = 'http://127.0.0.1:5000/api';
let passed = 0;
let failed = 0;

function assert(cond, msg, detail = '') {
  if (cond) {
    console.log(`  ✅ PASS — ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL — ${msg}${detail ? ' | ' + detail : ''}`);
    failed++;
  }
}

const login = async (email, password = 'Test@12345') => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

async function run() {
  console.log('\n======================================================================');
  console.log(' RUNNING GLOBAL EVENT NOTIFICATIONS & 24-HOUR REMINDERS TEST SUITE');
  console.log('======================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB.');

  const User = (await import('./src/models/User.js')).default;
  const Club = (await import('./src/models/Club.js')).default;
  const Event = (await import('./src/models/Event.js')).default;
  const Notification = (await import('./src/models/Notification.js')).default;
  const {
    calculateReminderScheduledFor,
    shouldSkipReminder,
    checkAndSendEventReminders,
  } = await import('./src/services/eventReminderService.js');

  // Authenticate users representing all 5 roles
  const clubAdmin = await login('karan.shah@test.com');
  const facultyCoord = await login('neha.verma@test.com');
  const facultyMentor = await login('amit.joshi@test.com');
  const projectAdmin = await login('vivek.malhotra@test.com');
  const student = await login('arjun.mehta@test.com');
  const studentUnrelated = await login('ananya.singh@test.com');

  assert(clubAdmin.user?.role === 'club_admin', 'Authenticated as club_admin');
  assert(facultyCoord.user?.role === 'faculty_coordinator', 'Authenticated as faculty_coordinator');
  assert(facultyMentor.user?.role === 'faculty_mentor', 'Authenticated as faculty_mentor');
  assert(projectAdmin.user?.role === 'project_admin', 'Authenticated as project_admin');
  assert(student.user?.role === 'student', 'Authenticated as student');

  // Find a club where facultyCoord is assigned
  const clubsRes = await fetch(`${BASE}/clubs`, {
    headers: { Authorization: `Bearer ${clubAdmin.token}` },
  });
  const clubsData = await clubsRes.json();
  const testClub = clubsData.data[0];
  assert(testClub && testClub._id, `Found test club: ${testClub.name} (${testClub._id})`);

  const ts = Date.now();
  let createdEventId = null;

  try {
    // ── CHECKLIST 1: Event Creation & Global Notifications ──────────────
    console.log('\n--- 1. Testing Event Creation & Global Notifications across All 5 Roles ---');

    // Future event scheduled 3 days ahead
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const createRes = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clubAdmin.token}`,
      },
      body: JSON.stringify({
        title: `Robotics Expo ${ts}`,
        description: 'Annual robotics and automated showcase.',
        clubId: testClub._id,
        eventDate: futureDate,
        location: 'Main Auditorium',
        eventLink: 'https://example.com/expo',
        eventLinkName: 'Expo Portal',
      }),
    });

    const createData = await createRes.json();
    assert(createRes.status === 201, 'Event created successfully (HTTP 201)');
    assert(createData.data?._id, 'Created event ID returned');
    createdEventId = createData.data?._id;

    // Check notifications for each of the 5 roles
    const accountsToVerify = [
      { role: 'club_admin (Creator)', user: clubAdmin.user, token: clubAdmin.token },
      { role: 'faculty_coordinator', user: facultyCoord.user, token: facultyCoord.token },
      { role: 'faculty_mentor', user: facultyMentor.user, token: facultyMentor.token },
      { role: 'project_admin', user: projectAdmin.user, token: projectAdmin.token },
      { role: 'student', user: student.user, token: student.token },
      { role: 'student (unrelated to club)', user: studentUnrelated.user, token: studentUnrelated.token },
    ];

    for (const acc of accountsToVerify) {
      const notifRes = await fetch(`${BASE}/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${acc.token}` },
      });
      const notifData = await notifRes.json();
      const eventNotif = (notifData.data || []).find(
        (n) => n.type === 'event_created' && n.relatedId === createdEventId
      );

      assert(
        !!eventNotif,
        `User ${acc.user.name} (${acc.role}) received "New Event Created" notification`
      );
      if (eventNotif) {
        assert(eventNotif.title === 'New Event Created', 'Notification title is "New Event Created"');
        assert(
          eventNotif.message.includes(`Robotics Expo ${ts}`) && eventNotif.message.includes(testClub.name),
          'Message includes event title and organizing club name'
        );
        assert(eventNotif.message.includes('Location: Main Auditorium'), 'Message includes event location');
        assert(eventNotif.link === `/events#event-${createdEventId}`, 'Notification link points to /events#event-:id');
        assert(eventNotif.actionText === 'View Event', 'Action text is "View Event"');
      }
    }

    // ── CHECKLIST 2: Failed Event Creation Produces No Notification ─────
    console.log('\n--- 2. Testing Failed Event Creation Produces No Notification ---');
    const notifsBeforeFail = await Notification.countDocuments({ type: 'event_created' });
    const failRes = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clubAdmin.token}`,
      },
      body: JSON.stringify({
        title: '', // Missing title
        clubId: testClub._id,
        eventDate: futureDate,
        location: 'Room 101',
      }),
    });
    assert(failRes.status === 400, 'Invalid event creation rejected with 400');
    const notifsAfterFail = await Notification.countDocuments({ type: 'event_created' });
    assert(notifsBeforeFail === notifsAfterFail, 'No notifications created on failed event creation');

    // ── CHECKLIST 3: Editing an Event Does Not Produce Another Creation Notification ──
    console.log('\n--- 3. Testing Event Edit Does Not Trigger Creation Notification ---');
    const notifsBeforeEdit = await Notification.countDocuments({ type: 'event_created' });
    const editRes = await fetch(`${BASE}/events/${createdEventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clubAdmin.token}`,
      },
      body: JSON.stringify({
        title: `Robotics Expo ${ts} (Updated)`,
        description: 'Updated description for the expo.',
      }),
    });
    assert(editRes.status === 200, 'Event updated successfully (HTTP 200)');
    const notifsAfterEdit = await Notification.countDocuments({ type: 'event_created' });
    assert(notifsBeforeEdit === notifsAfterEdit, 'Editing event did NOT create extra notifications');

    // ── CHECKLIST 4: Rescheduling Event Updates Scheduled Reminder Time ──
    console.log('\n--- 4. Testing Event Rescheduling Recalculates Reminder Time ---');
    const newFutureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const rescheduleRes = await fetch(`${BASE}/events/${createdEventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clubAdmin.token}`,
      },
      body: JSON.stringify({
        eventDate: newFutureDate.toISOString(),
      }),
    });
    assert(rescheduleRes.status === 200, 'Event rescheduled successfully (HTTP 200)');
    const updatedEventDoc = await Event.findById(createdEventId);
    const expectedReminderTime = calculateReminderScheduledFor(newFutureDate);
    assert(
      Math.abs(updatedEventDoc.reminderScheduledFor.getTime() - expectedReminderTime.getTime()) < 1000,
      'reminderScheduledFor was correctly recalculated to 24h prior to new eventDate'
    );
    assert(updatedEventDoc.reminderSkipped === false, 'reminderSkipped remains false for upcoming event');

    // ── CHECKLIST 5: Event Created Less Than 24h Before Start Skips Reminder ──
    console.log('\n--- 5. Testing Event Created < 24 Hours Ahead Skips Reminder ---');
    const soonDate = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours ahead
    const soonRes = await fetch(`${BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clubAdmin.token}`,
      },
      body: JSON.stringify({
        title: `Flash Seminar ${ts}`,
        description: 'Impromptu tech talk.',
        clubId: testClub._id,
        eventDate: soonDate.toISOString(),
        location: 'Lab 3',
      }),
    });
    const soonData = await soonRes.json();
    assert(soonRes.status === 201, 'Short-notice event created (HTTP 201)');
    const soonEventDoc = await Event.findById(soonData.data?._id);
    assert(soonEventDoc.reminderSkipped === true, 'reminderSkipped is true because 24h mark already passed at creation time');

    // Clean up short-notice test event
    await Event.findByIdAndDelete(soonData.data?._id);
    await Notification.deleteMany({ relatedId: soonData.data?._id });

    // ── CHECKLIST 6: 24-Hour Reminder Delivery & Idempotency ────────────
    console.log('\n--- 6. Testing 24-Hour Reminder Delivery & Idempotency ---');
    // Create an upcoming event that is 23.5 hours away (its 24h reminder threshold is in the past, but event is upcoming!)
    const reminderTargetEventDate = new Date(Date.now() + 23.5 * 60 * 60 * 1000);
    const reminderEvent = await Event.create({
      title: `Grand Hackathon ${ts}`,
      description: '24-hour coding challenge.',
      clubId: testClub._id,
      eventDate: reminderTargetEventDate,
      location: 'Innovation Hub',
      createdBy: clubAdmin.user._id,
      reminderScheduledFor: new Date(reminderTargetEventDate.getTime() - 24 * 60 * 60 * 1000), // was 30 mins ago!
      reminderSent: false,
      reminderSkipped: false,
    });
    await reminderEvent.populate('clubId', 'name');

    // Run the scheduler via checkAndSendEventReminders()
    const processedFirst = await checkAndSendEventReminders();
    assert(processedFirst >= 1, `Scheduler processed reminder for Grand Hackathon (processed: ${processedFirst})`);

    // Verify reminder was delivered to all 5 roles
    for (const acc of accountsToVerify) {
      const notifRes = await fetch(`${BASE}/notifications?limit=20`, {
        headers: { Authorization: `Bearer ${acc.token}` },
      });
      const notifData = await notifRes.json();
      const reminderNotif = (notifData.data || []).find(
        (n) => n.type === 'event_reminder' && n.relatedId === reminderEvent._id.toString()
      );

      assert(
        !!reminderNotif,
        `User ${acc.user.name} (${acc.role}) received "Event Reminder — Tomorrow"`
      );
      if (reminderNotif) {
        assert(reminderNotif.title === 'Event Reminder — Tomorrow', 'Title is "Event Reminder — Tomorrow"');
        assert(
          reminderNotif.message.includes(`Grand Hackathon ${ts}`) &&
            reminderNotif.message.includes('starts in approximately 24 hours'),
          'Message mentions starts in approximately 24 hours'
        );
        assert(reminderNotif.link === `/events#event-${reminderEvent._id}`, 'Link points to /events#event-:id');
        assert(reminderNotif.actionText === 'View Event', 'Action text is "View Event"');
      }
    }

    // Verify Event document marked as reminderSent: true
    const reminderEventAfter = await Event.findById(reminderEvent._id);
    assert(reminderEventAfter.reminderSent === true, 'Event marked with reminderSent: true');
    assert(reminderEventAfter.reminderSentAt !== null, 'Event has reminderSentAt timestamp');

    // ── CHECKLIST 7: Running Scheduler Repeatedly Does NOT Duplicate Reminders ──
    console.log('\n--- 7. Testing Idempotency: Multiple Scheduler Runs Cause ZERO Duplicates ---');
    const reminderCountBefore = await Notification.countDocuments({
      type: 'event_reminder',
      relatedId: reminderEvent._id,
    });

    // Run checkAndSendEventReminders twice more
    const run2 = await checkAndSendEventReminders();
    const run3 = await checkAndSendEventReminders();
    assert(run2 === 0, 'Second scheduler run skipped already-sent reminder (0 processed)');
    assert(run3 === 0, 'Third scheduler run skipped already-sent reminder (0 processed)');

    const reminderCountAfter = await Notification.countDocuments({
      type: 'event_reminder',
      relatedId: reminderEvent._id,
    });
    assert(
      reminderCountBefore === reminderCountAfter,
      `Reminder count remained exactly identical (${reminderCountBefore} notifications, zero duplicates)`
    );

    // ── CHECKLIST 8: Past and Deleted Events Never Receive Reminders ─────
    console.log('\n--- 8. Testing Past and Deleted Events Do Not Receive Reminders ---');
    // Create a past event
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const pastEvent = await Event.create({
      title: `Past Symposium ${ts}`,
      description: 'Historical symposium.',
      clubId: testClub._id,
      eventDate: pastDate,
      location: 'Hall B',
      createdBy: clubAdmin.user._id,
      reminderScheduledFor: new Date(pastDate.getTime() - 24 * 60 * 60 * 1000),
      reminderSent: false,
      reminderSkipped: false,
    });

    const processedPast = await checkAndSendEventReminders();
    const pastNotifCount = await Notification.countDocuments({
      type: 'event_reminder',
      relatedId: pastEvent._id,
    });
    assert(pastNotifCount === 0, 'Past event did NOT receive any reminder notifications');

    // Delete past event
    await Event.findByIdAndDelete(pastEvent._id);

    // ── CHECKLIST 9: Testing Trigger Endpoint — Role Authorization (POST /api/events/reminders/process) ─
    console.log('\n--- 9. Testing Role Authorization on /api/events/reminders/process ---');

    // 9a. Unauthenticated request must be rejected with 401
    const noAuthRes = await fetch(`${BASE}/events/reminders/process`, { method: 'POST' });
    assert(noAuthRes.status === 401, '9a: Unauthenticated request rejected with HTTP 401');

    // 9b. Invalid / expired token must be rejected with 401
    const badTokenRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: 'Bearer this.is.not.a.valid.jwt' },
    });
    assert(badTokenRes.status === 401, '9b: Invalid/expired token rejected with HTTP 401');

    // 9c. Authenticated student must be forbidden (403)
    const studentTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert(studentTriggerRes.status === 403, '9c: Authenticated student receives HTTP 403 Forbidden');

    // 9d. faculty_mentor must be forbidden (403)
    const mentorTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyMentor.token}` },
    });
    assert(mentorTriggerRes.status === 403, '9d: faculty_mentor receives HTTP 403 Forbidden');

    // 9e. project_admin must be forbidden (403)
    const projAdminTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${projectAdmin.token}` },
    });
    assert(projAdminTriggerRes.status === 403, '9e: project_admin receives HTTP 403 Forbidden');

    // 9f. club_admin must be allowed (200)
    const clubAdminTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clubAdmin.token}` },
    });
    const clubAdminTriggerData = await clubAdminTriggerRes.json();
    assert(clubAdminTriggerRes.status === 200, '9f: club_admin receives HTTP 200 OK');
    assert(clubAdminTriggerData.success === true, '9f: Response has success: true');
    assert(typeof clubAdminTriggerData.processed === 'number', '9f: Response returns numeric processed count');

    // 9g. faculty_coordinator must be allowed (200)
    const coordTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyCoord.token}` },
    });
    const coordTriggerData = await coordTriggerRes.json();
    assert(coordTriggerRes.status === 200, '9g: faculty_coordinator receives HTTP 200 OK');
    assert(coordTriggerData.success === true, '9g: Response has success: true');
    assert(typeof coordTriggerData.processed === 'number', '9g: Response returns numeric processed count');

    // 9h. Repeated requests remain idempotent (already-sent reminders are not re-sent)
    const repeatTriggerRes = await fetch(`${BASE}/events/reminders/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${clubAdmin.token}` },
    });
    const repeatTriggerData = await repeatTriggerRes.json();
    assert(repeatTriggerRes.status === 200, '9h: Repeated trigger request returns HTTP 200 (idempotent)');
    assert(repeatTriggerData.processed === 0, '9h: Repeated trigger reports 0 events processed (no duplicates)');


    // ── CHECKLIST 10: Existing Notification Workflows (Read / Unread Counts) ──
    console.log('\n--- 10. Testing Notification Inbox Operations (Read / Unread Counts) ---');
    const unreadRes = await fetch(`${BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    const unreadData = await unreadRes.json();
    assert(unreadRes.status === 200, 'GET /notifications/unread-count returned 200');
    assert(unreadData.count > 0, `Student unread count is positive (${unreadData.count})`);

    // Mark single notification as read
    const studentNotifsRes = await fetch(`${BASE}/notifications`, {
      headers: { Authorization: `Bearer ${student.token}` },
    });
    const studentNotifs = await studentNotifsRes.json();
    const targetNotif = studentNotifs.data[0];
    const markReadRes = await fetch(`${BASE}/notifications/${targetNotif._id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert(markReadRes.status === 200, 'PATCH /notifications/:id/read returned 200');

    // Mark all read
    const markAllRes = await fetch(`${BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${student.token}` },
    });
    assert(markAllRes.status === 200, 'PATCH /notifications/read-all returned 200');
    const unreadAfter = await fetch(`${BASE}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${student.token}` },
    }).then((r) => r.json());
    assert(unreadAfter.count === 0, 'Unread count is 0 after mark-all-read');

    // Clean up test events and their notifications
    await Event.findByIdAndDelete(createdEventId);
    await Notification.deleteMany({ relatedId: createdEventId });
    await Event.findByIdAndDelete(reminderEvent._id);
    await Notification.deleteMany({ relatedId: reminderEvent._id });
  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
  }

  console.log('\n======================================================================');
  console.log(`EVENT NOTIFICATIONS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
