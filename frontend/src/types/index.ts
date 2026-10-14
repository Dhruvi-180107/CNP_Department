
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  universityId?: string;
  enrollmentNumber?: string;
  phone?: string;
  bio?: string;
  profileImage?: string;
  semester?: number;
}

export interface Club {
  _id: string;
  name: string;
  description: string;
  facultyCoordinatorId?: string | { _id: string; name: string };
  logo?: string;
  images?: string[];
  totalMembers?: number;
  memberCount?: number;
  coreTeamCount?: number;
  regularMemberCount?: number;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  teamLeaderId?: string | { _id: string; name: string };
  image?: string;
}
