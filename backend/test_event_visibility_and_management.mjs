import 'dotenv/config';

const BASE = 'http://localhost:5000/api';

let passed = 0;
let failed = 0;

function assert(cond, msg, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✅ PASS — ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL — ${msg}${detail ? ' | ' + detail : ''}`);
  }
}

async function login(email, password = 'Test@12345') {
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

async function run() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(' EVENT VISIBILITY, DASHBOARD & PERMISSIONS TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════════\n');

  // 1. Authenticate users
  const fc = await login('neha.verma@test.com'); // Faculty Coordinator (Robotics & Photography)
  const ca = await login('karan.shah@test.com'); // Club Admin
  const st = await login('arjun.mehta@test.com'); // Student

  console.log('--- Phase 1: Retrieve Clubs & Verify Assignments ---');
  const clubsRes = await fetch(`${BASE}/clubs`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const clubsData = await clubsRes.json();
  assert(clubsRes.status === 200 && Array.isArray(clubsData.data), 'GET /clubs returns 200');

  const roboticsClub = clubsData.data.find(c => c.name === 'Robotics Club');
  const codingClub = clubsData.data.find(c => c.name === 'Coding Club');
  const photoClub = clubsData.data.find(c => c.name === 'Photography Club');

  assert(!!roboticsClub, 'Robotics Club exists');
  assert(!!codingClub, 'Coding Club exists');
  assert(!!photoClub, 'Photography Club exists');

  const fcCoordId = typeof roboticsClub.facultyCoordinatorId === 'object'
    ? roboticsClub.facultyCoordinatorId?._id
    : roboticsClub.facultyCoordinatorId;
  assert(fcCoordId === fc.user._id, 'Dr. Neha Verma is assigned coordinator for Robotics Club');

  const codingCoordId = typeof codingClub.facultyCoordinatorId === 'object'
    ? codingClub.facultyCoordinatorId?._id
    : codingClub.facultyCoordinatorId;
  assert(codingCoordId !== fc.user._id, 'Dr. Neha Verma is NOT the coordinator for Coding Club');

  console.log('\n--- Phase 2: Faculty Coordinator Views Events From All Clubs ---');
  const allEventsRes = await fetch(`${BASE}/events`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const allEventsData = await allEventsRes.json();
  assert(allEventsRes.status === 200, 'FC can access GET /events (status 200)');
  assert(Array.isArray(allEventsData.data), 'FC receives all events list');

  const upcomingEventsRes = await fetch(`${BASE}/events/upcoming`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const upcomingEventsData = await upcomingEventsRes.json();
  assert(upcomingEventsRes.status === 200, 'FC can access GET /events/upcoming (status 200)');

  // Verify clubId population with name, logo, description
  if (allEventsData.data.length > 0) {
    const sample = allEventsData.data[0];
    assert(sample.clubId && typeof sample.clubId === 'object', 'Event has populated clubId object');
    assert(typeof sample.clubId.name === 'string', 'Event clubId has name string');
  }

  console.log('\n--- Phase 3: FC Authorization Restrictions on Other Clubs ---');
  // FC tries to create event for Coding Club (unassigned)
  const tomorrow = new Date(Date.now() + 86400000).toISOString();
  const unauthCreateRes = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fc.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Unauthorized Event',
      description: 'Should fail',
      location: 'Lab',
      clubId: codingClub._id,
      eventDate: tomorrow,
    }),
  });
  const unauthCreateData = await unauthCreateRes.json();
  assert(unauthCreateRes.status === 403, 'FC creating event for unassigned club returns 403 Forbidden');
  assert(unauthCreateData.success === false, 'FC create for unassigned club returns success: false');

  console.log('\n--- Phase 4: FC Creates, Edits & Categorizes Events in Assigned Club ---');
  // FC creates event for Robotics Club
  const createRes = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${fc.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Robotics Workshop 2026',
      description: 'Hands-on robot build',
      location: 'Robotics Lab 101',
      clubId: roboticsClub._id,
      eventDate: tomorrow,
      eventLink: 'https://robotics.university.edu',
      eventLinkName: 'Register Here',
      relatedDocumentName: 'Workshop Guidelines',
    }),
  });
  const createData = await createRes.json();
  assert(createRes.status === 201, 'FC successfully creates event for assigned club (status 201)');
  assert(createData.data && createData.data.title === 'Robotics Workshop 2026', 'Created event title matches');
  assert(createData.data.clubId && typeof createData.data.clubId === 'object', 'Response populates clubId');
  assert(createData.data.clubId.name === 'Robotics Club', 'Club name is Robotics Club');

  const eventId = createData.data._id;

  // Confirm event is returned in GET /events/upcoming
  const checkUpcoming1 = await fetch(`${BASE}/events/upcoming`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const checkUpcomingData1 = await checkUpcoming1.json();
  assert(
    checkUpcomingData1.data.some(e => e._id === eventId),
    'Newly created future event is present in GET /events/upcoming'
  );

  // Edit event date to PAST (yesterday)
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const updateToPastRes = await fetch(`${BASE}/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${fc.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventDate: yesterday,
      description: 'Updated to past workshop',
    }),
  });
  const updateToPastData = await updateToPastRes.json();
  assert(updateToPastRes.status === 200, 'Updating event date to past succeeds (status 200)');

  // Verify it is REMOVED from GET /events/upcoming
  const checkUpcoming2 = await fetch(`${BASE}/events/upcoming`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const checkUpcomingData2 = await checkUpcoming2.json();
  assert(
    !checkUpcomingData2.data.some(e => e._id === eventId),
    'Past-dated event is excluded from GET /events/upcoming'
  );

  // But still present in GET /events
  const checkAll1 = await fetch(`${BASE}/events`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const checkAllData1 = await checkAll1.json();
  assert(
    checkAllData1.data.some(e => e._id === eventId),
    'Past-dated event remains present in GET /events (preserved in database)'
  );

  // Edit event date back to FUTURE (day after tomorrow)
  const futureDate = new Date(Date.now() + 172800000).toISOString();
  const updateToFutureRes = await fetch(`${BASE}/events/${eventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${fc.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      eventDate: futureDate,
      description: 'Updated back to upcoming',
    }),
  });
  assert(updateToFutureRes.status === 200, 'Updating event date back to future succeeds (status 200)');

  // Confirm it re-appears in GET /events/upcoming
  const checkUpcoming3 = await fetch(`${BASE}/events/upcoming`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const checkUpcomingData3 = await checkUpcoming3.json();
  assert(
    checkUpcomingData3.data.some(e => e._id === eventId),
    'Event re-appears in GET /events/upcoming after date changed to future'
  );

  console.log('\n--- Phase 5: Club Details Scoped Events ---');
  // GET /api/clubs/:clubId/events for Robotics Club
  const roboticsEventsRes = await fetch(`${BASE}/clubs/${roboticsClub._id}/events`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const roboticsEventsData = await roboticsEventsRes.json();
  assert(roboticsEventsRes.status === 200, 'GET /clubs/:id/events returns 200');
  assert(
    roboticsEventsData.data.every(e => {
      const cId = typeof e.clubId === 'object' ? e.clubId?._id : e.clubId;
      return !cId || cId === roboticsClub._id;
    }),
    'Club details returns events ONLY for the selected club'
  );
  assert(
    roboticsEventsData.data.some(e => e._id === eventId),
    'Created event appears on Robotics Club details events list'
  );

  // GET /api/clubs/:clubId/events for Coding Club should NOT have our event
  const codingEventsRes = await fetch(`${BASE}/clubs/${codingClub._id}/events`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  const codingEventsData = await codingEventsRes.json();
  assert(
    !codingEventsData.data.some(e => e._id === eventId),
    'Event does NOT appear on Coding Club details events list'
  );

  console.log('\n--- Phase 6: Club Admin Global Permissions ---');
  // Club Admin creates event for Coding Club
  const caCreateRes = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ca.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Coding Hackathon',
      description: 'Build apps',
      location: 'CS Lab 2',
      clubId: codingClub._id,
      eventDate: tomorrow,
    }),
  });
  const caCreateData = await caCreateRes.json();
  assert(caCreateRes.status === 201, 'Club Admin can create event for any club (status 201)');
  const caEventId = caCreateData.data._id;

  // Club Admin can update event
  const caUpdateRes = await fetch(`${BASE}/events/${caEventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${ca.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Coding Hackathon Updated',
    }),
  });
  assert(caUpdateRes.status === 200, 'Club Admin can update event (status 200)');

  // FC CANNOT update Coding Club event
  const fcUnauthorizedUpdate = await fetch(`${BASE}/events/${caEventId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${fc.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Malicious change',
    }),
  });
  assert(fcUnauthorizedUpdate.status === 403, 'FC cannot update another club’s event (403 Forbidden)');

  // FC CANNOT delete Coding Club event
  const fcUnauthorizedDelete = await fetch(`${BASE}/events/${caEventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  assert(fcUnauthorizedDelete.status === 403, 'FC cannot delete another club’s event (403 Forbidden)');

  // Club Admin deletes the event
  const caDeleteRes = await fetch(`${BASE}/events/${caEventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ca.token}` },
  });
  assert(caDeleteRes.status === 200, 'Club Admin can delete event (status 200)');

  console.log('\n--- Phase 7: Student Permissions & Event Visibility ---');
  // Student can view upcoming events
  const stUpcoming = await fetch(`${BASE}/events/upcoming`, {
    headers: { Authorization: `Bearer ${st.token}` },
  });
  assert(stUpcoming.status === 200, 'Student can view upcoming events (status 200)');

  // Student CANNOT create, update, or delete events
  const stCreate = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${st.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Student Event',
      description: 'Should fail',
      location: 'Campus',
      clubId: roboticsClub._id,
      eventDate: tomorrow,
    }),
  });
  assert(stCreate.status === 403, 'Student cannot create events (403 Forbidden)');

  const stDelete = await fetch(`${BASE}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${st.token}` },
  });
  assert(stDelete.status === 403, 'Student cannot delete events (403 Forbidden)');

  console.log('\n--- Phase 8: Clean Up Created Event ---');
  const deleteRes = await fetch(`${BASE}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  assert(deleteRes.status === 200, 'FC successfully deletes event (status 200)');

  const getDeleted = await fetch(`${BASE}/events/${eventId}`, {
    headers: { Authorization: `Bearer ${fc.token}` },
  });
  assert(getDeleted.status === 404, 'Deleted event returns 404 Not Found');

  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
  console.log('═════════════════════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
