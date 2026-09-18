# StudentSuccess

StudentSuccess is a web-based academic performance monitoring and early intervention platform designed to connect teachers, students, and parents around student academic progress.

The application will provide a centralized location for grades, attendance, academic trends, teacher feedback, goals, progress reporting, remediation plans, communications, and AI-assisted academic support.

AI-generated remediation recommendations will be reviewed by teachers before being shared with students or parents.

---

## Project Goals

StudentSuccess is intended to:

* Help teachers monitor student academic performance
* Identify academic trends and areas of opportunity
* Improve communication among teachers, students, and parents
* Allow students to track grades, goals, and progress
* Allow parents to monitor academic progress and approved support plans
* Assist teachers with AI-generated remediation recommendations
* Maintain teacher oversight of AI-generated academic recommendations
* Provide a centralized platform for tracking student improvement over time

---

# Team

| Team Member        | Role                               | Primary Responsibilities                                                                                         |
| ------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Novoa Champion** | Product Owner + Frontend Developer | Project scope, requirements, Jira backlog, user stories, frontend/UI development, teacher-facing views           |
| **Antwain Sparks** | Scrum Master + Backend Developer   | Sprint organization, GitHub, SDLC, backend architecture, Node.js/Express API, MongoDB, infrastructure, CI/CD     |
| **Deandra Harvin** | Developer + QA/AI Lead             | Student/parent requirements, acceptance criteria, testing, UAT, AI/remediation requirements, development support |

All team members may contribute across the application as needed.

---

# Development Methodology

StudentSuccess will use an **Agile Software Development Methodology**.

Development will be completed incrementally using Jira to manage the backlog, stories, sprint work, acceptance criteria, defects, and project progress.

## Jira Workflow

```text
Backlog
   ↓
To Do
   ↓
In Progress
   ↓
Review/Test
   ↓
Done
```

A feature is not considered complete simply because development is finished. Required review and testing must also be completed before the Jira item moves to `Done`.

---

# Git Development Workflow

Feature development should be associated with a Jira ticket.

Example:

```text
Jira Story
    ↓
Feature Branch
    ↓
Development
    ↓
Commit
    ↓
Push
    ↓
Pull Request
    ↓
CI Validation
    ↓
Code Review / Testing
    ↓
Merge
    ↓
Done
```

## Branch Naming

Branches should include the Jira issue key.

Example:

```text
SCRUM-12-create-student-api
```

## Commit Naming

Commits should reference the Jira issue where practical.

Example:

```text
SCRUM-12 Add student profile API endpoint
```

## Pull Request Naming

Example:

```text
SCRUM-12 Create student profile API
```

Feature development should not normally be performed directly on `main`.

---

# Technology Stack

## Frontend

* React
* JavaScript
* HTML
* CSS
* REST API integration

## Backend

* Node.js
* Express.js
* JavaScript
* REST APIs

## Database

* MongoDB
* Mongoose

## AI

The application will support AI-assisted functionality for:

* Remediation-plan suggestions
* Academic goal suggestions
* Progress summaries
* Academic trend analysis

The architecture should support both:

* Locally hosted language models
* External foundation-model APIs

AI functionality should be implemented through a provider abstraction rather than tightly coupling application features to a single AI vendor.

## Development / DevOps

* Visual Studio Code
* Git
* GitHub
* Jira
* GitHub Actions
* Docker / Docker Compose
* Postman

---

# Repository Architecture

StudentSuccess uses a **monorepo architecture**.

The frontend and backend are separate applications within the same repository.

This allows each application to be developed and tested independently while keeping shared code, infrastructure, documentation, and CI/CD configuration in one project.

```text
StudentSuccess/
│
├── apps/
│   │
│   ├── api/                         # Antwain - Backend
│   │   ├── src/
│   │   │   ├── config/              # Environment, DB, application configuration
│   │   │   ├── controllers/         # Request handlers
│   │   │   ├── middleware/          # Authentication, RBAC, error handling
│   │   │   ├── models/              # MongoDB / Mongoose models
│   │   │   ├── routes/              # REST API routes
│   │   │   ├── services/            # Business logic
│   │   │   │   ├── ai/              # LLM integration
│   │   │   │   ├── students/
│   │   │   │   ├── grades/
│   │   │   │   ├── reports/
│   │   │   │   └── remediation/
│   │   │   ├── validators/          # Request validation
│   │   │   ├── utils/               # Backend utilities
│   │   │   ├── app.js
│   │   │   └── server.js
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   │
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── web/                          # Novoa - Frontend/UI
│       ├── src/
│       │   ├── components/
│       │   │   ├── common/
│       │   │   ├── auth/
│       │   │   ├── teacher/
│       │   │   ├── student/
│       │   │   └── parent/
│       │   │
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   ├── teacher/
│       │   │   ├── student/
│       │   │   └── parent/
│       │   │
│       │   ├── layouts/
│       │   ├── hooks/
│       │   ├── services/             # Backend API calls
│       │   ├── state/
│       │   ├── utils/
│       │   ├── styles/
│       │   ├── App.jsx
│       │   └── main.jsx
│       │
│       ├── tests/
│       │   ├── unit/
│       │   └── e2e/
│       │
│       ├── package.json
│       └── Dockerfile
│
├── packages/
│   └── shared/                       # Shared API/UI resources
│       ├── constants/
│       ├── schemas/
│       ├── types/
│       └── validation/
│
├── infrastructure/                   # Primarily Antwain
│   ├── docker/
│   ├── database/
│   ├── deployment/
│   └── README.md
│
├── scripts/                          # Primarily Antwain
│   ├── seed/
│   │   ├── users/
│   │   ├── students/
│   │   ├── grades/
│   │   ├── attendance/
│   │   ├── notes/
│   │   └── remediation/
│   │
│   └── setup/
│
├── docs/                             # Shared team documentation
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── diagrams/
│   ├── sdlc/
│   └── setup/
│
├── .github/
│   ├── workflows/                    # Primarily Antwain
│   │   ├── api-ci.yml
│   │   ├── web-ci.yml
│   │   └── deploy.yml
│   │
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json                      # Root workspace configuration
└── README.md
```

---

# Application Ownership

## Backend — Antwain

Primary development area:

```text
apps/api/
```

Responsibilities include:

* Node.js/Express backend
* REST API development
* MongoDB integration
* Mongoose models
* Authentication
* Authorization
* Role-based access control
* Relationship-based access control
* Backend validation
* Backend testing
* Infrastructure
* GitHub configuration
* Jira/GitHub integration
* CI/CD
* Local development environment
* Database seed infrastructure

---

## Frontend — Novoa

Primary development area:

```text
apps/web/
```

Responsibilities include:

* Frontend application
* UI components
* Teacher dashboard
* Student profile views
* Grade views
* Frontend routing
* API integration
* User experience
* Frontend styling
* Frontend development associated with Product Owner requirements

---

## QA / AI — Deandra

Deandra's responsibilities are cross-functional rather than limited to a single repository folder.

Responsibilities include:

* Student requirements
* Parent requirements
* Remediation requirements
* Acceptance criteria
* Testing scenarios
* Functional testing
* Integration testing support
* User Acceptance Testing
* Defect verification
* AI/remediation requirements
* AI-output expectations
* Testing AI-assisted workflows
* Development support

AI-related code may be implemented under:

```text
apps/api/src/services/ai/
```

while Deandra provides requirements, acceptance criteria, testing, and validation for those capabilities.

---

# Shared Code

Shared definitions that may be required by both frontend and backend should be placed under:

```text
packages/shared/
```

Examples include:

```text
Role constants
API schemas
Validation schemas
Shared data structures
Status constants
Shared configuration definitions
```

Example roles:

```text
TEACHER
STUDENT
PARENT
ADMIN
```

Changes to shared packages should be coordinated because they may affect both the frontend and backend.

---

# User Roles

StudentSuccess initially supports three primary application users:

* Teacher
* Student
* Parent / Guardian

An administrative role may also be introduced for managing application users and permissions.

---

# Authorization

StudentSuccess will use both **role-based** and **relationship-based** authorization.

Role-based access determines what a user is allowed to do.

Relationship-based authorization determines which student's information the user is allowed to access.

Examples:

```text
Student
→ Can access their own academic information.

Parent
→ Can access students associated with that parent/guardian.

Teacher
→ Can access students associated with the teacher's assigned class/course.

Teacher-only notes
→ Must not be returned to Student or Parent users.
```

Authorization must be enforced by the backend API and not only through hidden frontend elements.

---

# Initial Data Model

The initial database design is expected to include entities for:

* User
* Teacher
* Student
* Parent / Guardian
* Role
* Course
* Class / Section
* Enrollment
* Assignment
* Grade
* Attendance
* Teacher Feedback
* Teacher Notes
* Goal
* Goal Progress
* Remediation Plan
* Progress Report
* Notification
* Communication / Message

The database model will be formalized during Week 2.

---

# Synthetic Development Data

Real student records should not be required during development.

Development and testing will use synthetic data.

Possible development data includes:

* Synthetic users
* Students
* Teachers
* Parents
* Courses
* Classes
* Assignments
* Grades
* Attendance
* Teacher feedback
* Teacher notes
* Goals
* Remediation plans
* Reports
* Notifications

Faker.js may be used to generate synthetic test data.

---

# CI/CD

GitHub Actions will be used to automate validation of frontend and backend changes.

Because StudentSuccess uses a monorepo, frontend and backend pipelines may execute independently based on the files changed.

Example:

```text
apps/api/**
    ↓
API CI

apps/web/**
    ↓
Web CI
```

API CI may include:

```text
Install dependencies
Lint
Unit tests
Integration tests
Build/start validation
```

Web CI may include:

```text
Install dependencies
Lint
Unit tests
Build validation
```

Shared or root-level changes may trigger both pipelines.

---

# Environment Configuration

Environment-specific configuration should not be committed directly to source control.

Local developers should create:

```text
.env
```

using:

```text
.env.example
```

as the template.

Secrets such as database credentials and AI API keys must not be committed to GitHub.

---

# Version 1 Scope

The initial StudentSuccess release is expected to include:

* Authentication
* Teacher, Student, and Parent roles
* Student profiles
* Grades
* Attendance
* Academic trends
* Teacher feedback
* Teacher notes
* Academic goals
* Progress tracking
* Progress reports
* Remediation plans
* Parent access
* Student access
* AI-assisted remediation recommendations
* Teacher review of AI-generated recommendations

The team should avoid expanding Version 1 with unnecessary features that place the 10-week delivery schedule at risk.

---

# Sprint 1 — Week 1

The Week 1 goal is to establish the project foundation rather than begin heavy feature development.

Expected outcomes include:

* Agreed project scope
* Functional requirements
* Nonfunctional requirements
* Teacher, Student, and Parent user stories
* Initial acceptance criteria
* Student Profile and Grade View concepts
* Organized Jira backlog
* GitHub repository
* Initial repository structure
* Initial SDLC
* Technical requirements

---

# Sprint 1 — Week 2

Week 2 will formalize the technical design required before core development begins.

Primary activities include:

* System architecture
* Database design
* Backend architecture
* Authentication/authorization design
* Local development infrastructure
* CI/CD foundation
* API standards
* Synthetic seed-data design
* UML and supporting technical diagrams

---

# Local Development

Detailed setup instructions will be added as the API, database, and frontend environments are configured.

The intended local architecture is:

```text
Frontend
   ↓
StudentSuccess REST API
   ↓
MongoDB

StudentSuccess API
   ↓
AI Service
   ↓
Local or External LLM Provider
```

The complete development environment should remain capable of running locally.

---

# Documentation

Project documentation will be maintained under:

```text
docs/
```

including:

```text
docs/architecture/
docs/api/
docs/database/
docs/diagrams/
docs/sdlc/
docs/setup/
```

Documentation should evolve with the implementation rather than being deferred until the end of the project.
