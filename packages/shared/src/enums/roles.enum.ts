export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  COACH = 'COACH',
  PARENT = 'PARENT',
  CHILD = 'CHILD',
}

export enum Permission {
  // Users
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  // Families
  FAMILY_READ = 'family:read',
  FAMILY_WRITE = 'family:write',
  // Programs
  PROGRAM_READ = 'program:read',
  PROGRAM_WRITE = 'program:write',
  PROGRAM_ASSIGN = 'program:assign',
  // Children
  CHILD_READ = 'child:read',
  CHILD_WRITE = 'child:write',
  CHILD_PROGRESS_READ = 'child:progress:read',
  // Reports
  REPORT_READ = 'report:read',
  REPORT_GENERATE = 'report:generate',
  // Content
  CONTENT_READ = 'content:read',
  CONTENT_WRITE = 'content:write',
}
