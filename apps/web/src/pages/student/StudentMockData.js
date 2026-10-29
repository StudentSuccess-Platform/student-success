export const studentDashboardData = {
  student: {
    id: 'stu-001',
    firstName: 'Liam',
    term: 'Fall 2026', 
  },

  summary: {
    currentGrade: 84,
    attendance: 94,
    termGoal: 88,
  },

  grades: [
    {
      id: 1,
      subject: 'English Language Arts',
      grade: 89,
    },
    {
      id: 2,
      subject: 'Mathematics',
      grade: 78,
    },
    {
      id: 3,
      subject: 'Science',
      grade: 86,
    },
    {
      id: 4,
      subject: 'Social Studies',
      grade: 83,
    },
  ],

  performanceTrend: [
    { label: 'Q1', value: 84 },
    { label: 'Q2', value: 87 },
    { label: 'Q3', value: 83 },
    { label: 'Q4', value: 86 },
  ],

  goals: [
    {
      id: 1,
      title: 'Submit every assignment on time',
      progress: 90,
      status: 'on-track',
    },
    {
      id: 2,
      title: 'Reach 88% overall by December',
      progress: 84,
      target: 88,
      status: 'in-progress',
    },
  ],

  teacherFeedback: {
    teacher: 'Dr. Maya Chen',
    date: 'Sep 18',
    message:
      'Your explanations are getting clearer and your persistence on multi-step problems really shows.',
  },

  supportPlan: {
    status: 'approved',
    teacher: 'Dr. Maya Chen',
    focus: 'Strengthen fraction skills',

    activities: [
      {
        id: 1,
        title: 'Join two small-group sessions each week',
        schedule: 'Tuesdays & Thursdays · 30 min',
      },
      {
        id: 2,
        title: 'Complete guided fractions practice',
        schedule: '15 minutes · 3 times weekly',
      },
      {
        id: 3,
        title: 'Check in with Dr. Chen every Friday',
        schedule: 'Review progress and celebrate wins',
      },
    ],
  },
}
