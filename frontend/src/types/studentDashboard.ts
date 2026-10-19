import type { Club, User } from './index';

export type StudentDashboardClub = Omit<Club, 'facultyCoordinatorId'> & {
  facultyCoordinatorId?: {
    _id?: string;
    name?: string;
    department?: string;
    profileImage?: string | null;
  } | null;
};

export interface ClubMembershipRecord {
  membershipType: string;
  position?: string | null;
  studentId?: string | { _id: string };
}

export interface StudentClubMembership {
  club: StudentDashboardClub;
  membership: ClubMembershipRecord;
}

export interface ProjectMentorAssignment {
  _id?: string;
  isPrimary?: boolean;
  mentorId?: {
    _id?: string;
    name?: string;
    department?: string;
    profileImage?: string | null;
  } | null;
}

export interface StudentProjectWithMentors {
  _id: string;
  name: string;
  description?: string;
  image?: string | null;
  status?: string;
  teamLeaderId?: string | { _id?: string; name?: string } | null;
  mentors: ProjectMentorAssignment[];
}

export interface StudentJoinRequest {
  _id: string;
  status: string;
  requestType?: string;
  createdAt?: string;
  clubId?: { _id?: string; name?: string } | string | null;
  projectId?: { _id?: string; name?: string; status?: string } | string | null;
}

export interface StudentNotificationItem {
  _id: string;
  title: string;
  message?: string;
  isRead?: boolean;
  createdAt?: string;
  link?: string;
}

export interface StudentDashboardData {
  user: User;
  clubs: StudentClubMembership[];
  projects: StudentProjectWithMentors[];
  upcomingEvents: unknown[];
  joinRequests: StudentJoinRequest[];
  notifications: StudentNotificationItem[];
  unreadCount: number;
  loading: boolean;
  errors: {
    clubs?: string;
    projects?: string;
    events?: string;
    requests?: string;
    notifications?: string;
  };
  refetch: () => Promise<void>;
}
