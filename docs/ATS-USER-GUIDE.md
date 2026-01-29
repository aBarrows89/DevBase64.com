# ATS & Hiring System - User Guide
## Import Export Tire Co - IE Central

---

## Table of Contents

1. [Overview](#overview)
2. [Receiving Applications](#receiving-applications)
3. [Managing the Application Pipeline](#managing-the-application-pipeline)
4. [Reviewing Candidates](#reviewing-candidates)
5. [Scheduling Interviews](#scheduling-interviews)
6. [Conducting Interviews](#conducting-interviews)
7. [Creating & Sending Offer Letters](#creating--sending-offer-letters)
8. [Hiring a Candidate](#hiring-a-candidate)
9. [Onboarding Documents](#onboarding-documents)
10. [Managing Job Postings](#managing-job-postings)
11. [Bulk Resume Upload](#bulk-resume-upload)
12. [Indeed Integration](#indeed-integration)

---

## Overview

The IE Central ATS (Applicant Tracking System) manages the entire hiring workflow:

```
Application Received → Review → Schedule Interview → Interview → Offer Letter → Hire → Onboarding
```

### Application Statuses

| Status | Description |
|--------|-------------|
| **New** | Application just received, not yet reviewed |
| **Reviewed** | Application has been looked at |
| **Contacted** | Candidate has been reached out to |
| **Scheduled** | Interview has been scheduled |
| **Interviewed** | Interview completed, awaiting decision |
| **DNS** | Did Not Show - candidate missed interview |
| **Hired** | Offer accepted, candidate hired |
| **Rejected** | Application rejected |

---

## Receiving Applications

### How Applications Come In

1. **Website Career Page** - Candidates apply directly on iecentral.com/careers
2. **Indeed Integration** - Applications from Indeed job postings automatically sync
3. **Manual Entry** - HR can manually add candidates
4. **Bulk Upload** - Upload multiple resumes at once (PDF files)

### What Happens Automatically

When an application is received:
- Resume is parsed and text is extracted
- AI analyzes the candidate's background
- AI matches candidate to best-fit job openings
- Candidate receives scores:
  - **Overall Score** (0-100) - General fit
  - **Stability Score** - Based on job tenure history
  - **Experience Score** - Relevant work experience
- Red flags and green flags are identified
- Application appears in the pipeline as "New"

---

## Managing the Application Pipeline

### Accessing Applications

**Navigation:** Dashboard → Applications (or direct link: `/applications`)

### Two View Modes

1. **Table View** - Traditional list with sortable columns
2. **Kanban View** - Visual board with drag-and-drop between statuses

### Filtering Applications

Use the filter bar to narrow down:
- **Status** - Filter by pipeline stage
- **Department** - Filter by job department
- **Location** - Filter by work location
- **Search** - Search by name, email, phone, or job title

### Sorting Options

- By Score (highest first)
- By Position
- By Date (newest first)
- By Status

### Moving Candidates Through Pipeline

**Kanban View:** Drag and drop cards between columns

**Table/Detail View:** Click on candidate → Use status dropdown or action buttons

---

## Reviewing Candidates

### Opening a Candidate Profile

Click on any candidate name or row to open their full profile.

### Candidate Profile Sections

1. **Overview Tab**
   - Contact information
   - Applied position
   - AI match score and analysis
   - Green flags (positive indicators)
   - Red flags (concerns to explore)
   - Employment history timeline

2. **Resume Tab**
   - View/download original resume PDF
   - Extracted text version

3. **Interview Tab**
   - Schedule interviews
   - View interview history
   - Record interview notes and evaluations

4. **Activity Tab**
   - Timeline of all actions taken on this application
   - Status changes, notes, emails sent

### AI-Generated Insights

The system automatically provides:
- **Suggested Job** - Best matching position
- **Match Scores** - Scores against all open positions
- **Extracted Skills** - Skills found in resume
- **Summary** - Brief candidate overview
- **Red Flags** - Job hopping, gaps, concerns
- **Green Flags** - Career progression, relevant experience
- **Recommended Action** - AI suggestion (interview, review, pass)

---

## Scheduling Interviews

### From the Candidate Profile

1. Open the candidate's profile
2. Go to the **Interview** tab
3. Click **"Schedule Interview"**

### Required Information

- **Date** - Interview date
- **Time** - Interview time
- **Location** - Interview location (office, phone, video)
- **Attendees** - Add interviewers (optional)

### What Happens When You Schedule

1. Application status changes to "Scheduled"
2. Calendar event is created
3. Interview confirmation email is sent to candidate
4. Attendees receive calendar invites

### Rescheduling

1. Open candidate profile → Interview tab
2. Click **"Reschedule"**
3. Enter new date/time
4. Candidate receives reschedule notification

### Marking No-Shows

If a candidate doesn't show up:
1. Open candidate profile
2. Click **"Mark as DNS"** (Did Not Show)
3. Status updates and is recorded in activity log

---

## Conducting Interviews

### Starting an Interview Round

1. Open candidate profile → Interview tab
2. Click **"Start Interview"** or **"Start Round 2/3"**

### Interview Structure

Each interview round has three phases:

#### Phase 1: Preliminary Evaluation (Small Talk)

Rate the candidate on first impressions (1-4 scale):
- Appearance
- Manner
- Conversation
- Intelligence
- Sociability

Add notes about initial impressions and overall health opinion.

#### Phase 2: Interview Questions

- AI generates contextual questions based on:
  - Candidate's resume and experience
  - Job requirements
  - Red/green flags to explore
  - Previous round questions (won't repeat)

- Record candidate's answers in the text fields
- Questions cover:
  - Experience and skills
  - Behavioral scenarios
  - Job-specific knowledge
  - Cultural fit

#### Phase 3: Evaluation

After the interview, record:
- Overall impression
- Strengths observed
- Concerns identified
- Recommendation (advance/hire/reject)

### Completing the Round

1. Click **"Complete Interview Round"**
2. Thank you email is automatically sent to candidate
3. Status changes to "Interviewed"

### Multiple Interview Rounds

The system supports up to 3 interview rounds:
- **Round 1** - Initial screening
- **Round 2** - In-depth interview
- **Round 3** - Final interview (if needed)

Each round generates fresh questions and tracks separate evaluations.

---

## Creating & Sending Offer Letters

### Creating an Offer Letter

1. Open candidate profile (must be in "Interviewed" status)
2. Click **"Create Offer Letter"**

### Offer Letter Details

**Position Information:**
- Job Title
- Department
- Location
- Reports To (Manager)
- Start Date

**Compensation:**
- Type: Hourly or Salary
- Amount
- Pay Frequency (Weekly, Bi-weekly, Monthly)

**Schedule & Benefits:**
- Work Schedule
- Benefits Eligibility Date
- Benefits Start Date
- PTO Accrual Rate

**Additional Terms:**
- Any special conditions or notes

### Offer Letter Workflow

```
Draft → Sent → Viewed → Accepted/Declined
```

| Status | Description |
|--------|-------------|
| **Draft** | Being prepared, editable |
| **Sent** | Emailed to candidate |
| **Viewed** | Candidate opened the offer |
| **Accepted** | Candidate accepted |
| **Declined** | Candidate declined |
| **Expired** | Offer passed deadline (default 7 days) |
| **Withdrawn** | Company withdrew the offer |

### Sending the Offer

1. Review all details in the preview
2. Click **"Send Offer"**
3. Candidate receives email with link to view offer
4. You can track when they open it

### Candidate Response

- **Accepted** - Candidate clicks accept, you're notified
- **Declined** - Candidate declines, can provide reason
- **No Response** - Offer expires after deadline

### Withdrawing an Offer

If needed, you can withdraw a sent offer before it's accepted:
1. Open the offer letter
2. Click **"Withdraw Offer"**
3. Candidate is notified

---

## Hiring a Candidate

### After Offer Acceptance

1. Open the candidate's profile
2. Click **"Hire"** or **"Complete Hiring"**

### What Happens

1. Application status changes to "Hired"
2. New personnel record is created with:
   - Name, contact info
   - Position, department, location
   - Start date, compensation
   - Manager assignment
3. Application is automatically archived
4. Candidate appears in Personnel module

### Post-Hire

The new employee will:
- Appear in Personnel list
- Be assigned onboarding documents to sign
- Be added to the org chart
- Have access to employee portal (if applicable)

---

## Onboarding Documents

### Managing Documents (Admin)

**Navigation:** Settings → Onboarding Documents

### Uploading Documents

1. Click **"Upload Document"**
2. Select PDF file
3. Fill in details:
   - Title (e.g., "Employee Handbook")
   - Description
   - Type: Handbook, Policy, Agreement, or Form
   - Version number
   - Effective date
   - Requires signature? (Yes/No)
   - Is required? (Yes/No)

### Document Types

| Type | Use For |
|------|---------|
| **Handbook** | Employee handbook, code of conduct |
| **Policy** | Company policies (safety, IT, etc.) |
| **Agreement** | NDAs, non-competes, at-will agreements |
| **Form** | W-4, direct deposit, emergency contact |

### Tracking Signatures

For each document, you can see:
- Total employees
- Signed count
- Pending signatures
- Who hasn't signed

### Employee Experience

New employees see pending documents in their portal and can:
1. View the document
2. Read/scroll through
3. Sign electronically
4. Signature is timestamped with IP address

---

## Managing Job Postings

### Accessing Jobs

**Navigation:** Dashboard → Jobs (or `/jobs`)

### Creating a Job Posting

1. Click **"Add Job"**
2. Fill in details:
   - Title
   - Department
   - Location(s)
   - Job Type (Full-time, Part-time)
   - Position Type (Hourly, Salaried, Management)
   - Description
   - Keywords (for AI matching)
   - Benefits

### Job Status

- **Open** - Accepting applications
- **Closed** - Not accepting applications

### Job Badges

Add badges to highlight positions:
- **Urgently Hiring** - High priority
- **Accepting Applications** - Standard
- **Open Position** - General

### Display Order

Set the order jobs appear on the career page (lower number = higher on list)

---

## Bulk Resume Upload

### When to Use

- Job fairs with many paper resumes
- Migrating from another system
- Processing email attachments in bulk

### How to Upload

**Navigation:** Applications → Bulk Upload (or `/applications/bulk-upload`)

1. Click **"Select Files"** or drag PDFs into the upload area
2. Select multiple PDF resume files
3. Click **"Process Resumes"**

### Processing

For each resume:
1. PDF text is extracted
2. AI analyzes the candidate
3. Best-fit job is identified
4. New application is created
5. Progress shows success/failure for each

### After Upload

All uploaded candidates appear in the Applications pipeline as "New" status with:
- Extracted contact info
- AI analysis and scoring
- Job match recommendations

---

## Indeed Integration

### How It Works

When someone applies to your jobs on Indeed:
1. Indeed sends application data to IE Central
2. System receives candidate info + resume
3. Application is created automatically
4. AI analyzes and scores the candidate
5. Application appears in pipeline as "New"

### Indeed Job Mapping

To connect Indeed job postings to your internal jobs:
1. Go to Settings → Indeed Mappings
2. Add mapping: Indeed Job ID → Internal Job
3. Future applications will link correctly

### Tracking Indeed Applications

Indeed applications are marked with source: "indeed" and include:
- Indeed Apply ID (unique identifier)
- Original Indeed job posting info
- Processing status

### Webhook Logs

View Indeed webhook activity at Settings → Indeed Logs:
- Received applications
- Processing status
- Any errors

---

## Tips & Best Practices

### Moving Candidates Efficiently

1. **Use Kanban View** for visual pipeline management
2. **Batch similar actions** - Review all new apps, then move to next stage
3. **Add notes** as you go - helps other team members

### Interview Best Practices

1. **Review AI analysis** before the interview
2. **Explore red flags** with specific questions
3. **Use the preliminary evaluation** - first impressions matter
4. **Complete evaluations immediately** after interviews while fresh

### Offer Letters

1. **Double-check compensation** before sending
2. **Set appropriate expiration** - 7 days is standard
3. **Track viewed status** - follow up if not opened

### Keeping Pipeline Clean

1. **Archive rejected candidates** - keeps active list manageable
2. **Update statuses promptly** - accurate pipeline metrics
3. **Add notes** - document reasons for decisions

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Open search |
| `Esc` | Close modal/dialog |
| `Tab` | Navigate between fields |

---

## Getting Help

- **Technical Issues:** Contact IT
- **Process Questions:** Contact HR
- **System Bugs:** Report in the system or contact admin

---

## Glossary

| Term | Definition |
|------|------------|
| **ATS** | Applicant Tracking System |
| **DNS** | Did Not Show (missed interview) |
| **Pipeline** | The stages candidates move through |
| **Kanban** | Visual board with columns for each status |
| **Red Flag** | Concern identified in candidate background |
| **Green Flag** | Positive indicator in candidate background |
| **Match Score** | AI-calculated fit percentage for a job |

---

*Last Updated: January 2026*
*IE Central v2.0*
