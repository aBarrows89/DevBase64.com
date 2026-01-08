# Applications & Hiring System User Guide

This guide covers how to use the Applications screen, conduct interviews, and operate the hiring systems in IE Central.

---

## Table of Contents

1. [Applications Dashboard Overview](#applications-dashboard-overview)
2. [Uploading Resumes](#uploading-resumes)
3. [Understanding AI Scoring](#understanding-ai-scoring)
4. [Reviewing Applications](#reviewing-applications)
5. [Scheduling Interviews](#scheduling-interviews)
6. [Conducting Interview Rounds](#conducting-interview-rounds)
7. [Hiring an Applicant](#hiring-an-applicant)
8. [Managing Application Status](#managing-application-status)

---

## Applications Dashboard Overview

### Accessing the Dashboard

Navigate to **Applications** from the sidebar. This is where all job applications are managed.

### Dashboard Components

1. **Statistics Bar** - Shows counts for each status:
   - Total applications
   - New (unreviewed)
   - Reviewed
   - Contacted
   - Interviewed
   - Hired
   - Rejected

2. **Top Candidates Section** - Highlights the top 3 highest-scoring active applicants:
   - Gold badge (#1), Silver badge (#2), Bronze badge (#3)
   - Shows overall score, stability score, and experience score
   - Displays recommended action (Strong Candidate, Worth Interviewing, etc.)
   - Click any card to view the full application

3. **Search & Filter** - Filter applications by:
   - Name, email, or job title (search box)
   - Status (dropdown filter)

4. **Applications Table** - Sortable columns:
   - **Applicant** - Name and email
   - **Position** - Job they applied for (click header to sort)
   - **Score** - AI-generated overall score (click header to sort)
   - **Status** - Dropdown to change status directly
   - **Applied** - Application date (click header to sort)
   - **Actions** - View details or Delete (admin only)

---

## Uploading Resumes

### Single Resume Upload

Resumes are typically submitted through the public careers page or uploaded individually.

### Bulk Upload (From Indeed)

For bulk uploading multiple resumes at once:

1. Click the **Bulk Upload** button in the Applications header
2. Download resumes from Indeed as PDF files
3. Drag and drop all PDFs into the upload zone (or click "Browse Files")
4. Click **Process All** to begin processing

**Processing Steps:**
1. **Extracting** - Text is extracted from the PDF
2. **Processing** - AI analyzes the resume and creates the application

**After Processing:**
- Green checkmark = Success (shows candidate name, matched job, score)
- Red X = Failed (shows error message)
- Click **Retry Failed** to reprocess any failed files
- Click **View** to see any successfully created application

---

## Understanding AI Scoring

Each resume is automatically analyzed by AI. Here's how scoring works:

### Overall Score (0-100)

Weighted calculation:
- **35% Experience** - Relevance of work history to the position
- **35% Stability** - Job tenure and employment consistency
- **20% Skills** - Relevant certifications and abilities
- **10% Education** - Relevant training or degrees

### Score Ranges

| Score | Meaning | Color |
|-------|---------|-------|
| 80-100 | Excellent candidate | Green |
| 60-79 | Good candidate, worth interviewing | Amber/Yellow |
| Below 60 | May have concerns | Red |

### Red Flags (Concerns)

The AI identifies potential issues:
- **Job Hopping** - Multiple short-tenure positions (< 1 year)
- **Employment Gaps** - Unexplained periods without work
- **Lack of Relevant Experience** - Skills don't match the position
- **Termination Patterns** - Evidence of being let go

Each flag has a severity level: Low, Medium, or High

### Green Flags (Positives)

The AI identifies strengths:
- **Long Tenure** - Extended employment at previous jobs
- **Promotions** - Career advancement
- **Relevant Skills** - Certifications, specific abilities
- **Industry Experience** - Direct relevant experience

### Recommended Actions

- **Strong Candidate** - Schedule interview immediately
- **Worth Interviewing** - Good potential, conduct screening
- **Review Carefully** - Has concerns but may be viable
- **Likely Pass** - Significant red flags

---

## Reviewing Applications

### Viewing Application Details

Click any row in the applications table (or the "View" button) to see full details.

### Application Detail Screen Sections

1. **Header** - Candidate name, position applied for, status selector, action buttons

2. **Contact Information** - Email, phone, application date

3. **Candidate Scores** - Visual display of:
   - Overall Score
   - Stability Score
   - Experience Score
   - Total Years of Experience

4. **Red & Green Flags** - Detailed breakdown of AI-identified concerns and positives

5. **Employment History** - Timeline of previous jobs with:
   - Company name and title
   - Duration at each position
   - Average tenure and longest tenure statistics

6. **Interview Rounds** - Track multiple interview stages (see below)

7. **AI Job Match Analysis** - If available, shows how well the candidate matches different positions

8. **Hiring Team Notes** - AI-generated summary for your team

9. **Scheduled Interview** - Shows upcoming interview details

10. **Internal Notes** - Add your own private notes about the candidate

11. **Submitted Resume** - The original resume text

---

## Scheduling Interviews

### To Schedule an Interview

1. Open the application detail page
2. Click **Schedule** in the "Schedule Interview" section
3. Fill in:
   - **Date** (required)
   - **Time** (required)
   - **Location** - In-person, Phone, Video Call, or Other
4. Click **Schedule Interview**

### Managing Scheduled Interviews

- The scheduled interview appears as an orange banner
- Click **Edit** to modify the schedule
- Click **Clear** to remove the scheduled interview

When an interview is scheduled, the application status should be changed to "Scheduled".

---

## Conducting Interview Rounds

The system supports up to 3 interview rounds:
- **Round 1** - Initial Screening
- **Round 2** - Skills Assessment
- **Round 3** - Final Interview

### Starting an Interview Round

1. Open the application detail page
2. In the "Interview Rounds" section, click **Start Round [#]**
3. Enter the **Interviewer Name**
4. Select the **Interview Round** (if multiple available)
5. Click **Generate Questions**

The AI will generate personalized interview questions based on:
- The candidate's resume and experience
- The position they applied for
- Any concerns or gaps identified
- Previous interview responses (for rounds 2 and 3)

### Preliminary Evaluation (Small Talk Phase)

**Before asking scripted questions**, conduct the preliminary evaluation during the initial small talk/greeting phase:

1. Click on the interview round to expand it
2. The **Preliminary Evaluation** section appears first (amber/yellow box)
3. Rate the candidate on a 1-4 scale for each criterion:

| Criterion | What to Evaluate |
|-----------|------------------|
| **Appearance** | Personal presentation, grooming, appropriate attire |
| **Manner** | Professional demeanor, attitude, body language |
| **Conversation** | Communication skills, clarity, engagement |
| **Intelligence** | Quick thinking, comprehension, articulate responses |
| **Sociability** | Interpersonal skills, friendliness, rapport building |
| **Health Opinion** | General fitness impression, energy level |

**Score Guide:**
- 1 = Poor
- 2 = Below Average
- 3 = Good
- 4 = Excellent

4. Optionally add notes about your observations
5. Click **Save Preliminary Evaluation**

The average of these scores is displayed and factored into the AI's overall interview evaluation:
- **3.5-4.0 avg**: Strong first impression (+10 points)
- **2.5-3.4 avg**: Average impression (neutral)
- **1.5-2.4 avg**: Below average (-10 points)
- **1.0-1.4 avg**: Poor impression (-15-20 points)

### During the Interview

1. After completing the preliminary evaluation, proceed to the scripted questions
2. For each question:
   - Read the question to the candidate
   - Record their response in the text area
   - Click **Save Answer**
3. Add any general notes in the "Interview Notes" section

### After the Interview

Once all questions have answers recorded:

1. Click **Generate AI Evaluation**
2. The AI will analyze responses and provide:
   - **Overall Score** (0-100)
   - **Strengths** - What the candidate did well
   - **Concerns** - Areas of weakness or concern
   - **Recommendation** - STRONG YES, YES, MAYBE, or NO
   - **Detailed Feedback** - Comprehensive analysis

### Managing Interview Rounds

- Click on a round to expand/collapse details
- The score badge appears next to each evaluated round
- Click **Delete Round** to remove a round (requires confirmation)

---

## Hiring an Applicant

### When to Hire

After completing interviews and deciding on a candidate:

1. Open the application detail page
2. Click the green **Hire Applicant** button (top right)

### Hire Form

Fill in the new employee's information:

| Field | Description | Required |
|-------|-------------|----------|
| Position | Job title (pre-filled from application) | Yes |
| Department | e.g., Warehouse, Sales, Operations | Yes |
| Employee Type | Full Time, Part Time, Contract, Seasonal | Yes |
| Hire Date | Start date | Yes |
| Hourly Rate | Pay rate (optional) | No |

Click **Create Personnel Record** to complete the hire.

### What Happens

1. Application status automatically changes to "Hired"
2. A new Personnel record is created
3. You're redirected to the new employee's Personnel page
4. The application will show "View Personnel Record" button

### If Already Hired

If a personnel record already exists for this application:
- The "Hire Applicant" button is replaced with "View Personnel Record"
- Click it to go to their employee profile

---

## Managing Application Status

### Status Flow

Typical workflow:
```
New → Reviewed → Contacted → Scheduled → Interviewed → Hired
                                                    ↘ Rejected
```

### Changing Status

**From the Applications List:**
- Click the status dropdown directly in the table row
- Select the new status

**From the Application Detail:**
- Click the status dropdown in the header
- Select the new status

### Status Descriptions

| Status | When to Use |
|--------|-------------|
| **New** | Just received, not yet reviewed |
| **Reviewed** | You've looked at the application |
| **Contacted** | You've reached out to the candidate |
| **Scheduled** | Interview has been scheduled |
| **Interviewed** | Interview(s) completed |
| **Hired** | Candidate accepted and hired |
| **Rejected** | Candidate not moving forward |

### Deleting Applications

Only **Admin** and **Super Admin** users can delete applications.

1. Click **Delete** in the application detail header (or from the table)
2. Confirm the deletion

**Warning:** Deletion is permanent and cannot be undone.

---

## Best Practices

### Reviewing Applications

1. Start with the **Top Candidates** section for quick wins
2. Sort by **Score** (descending) to see best candidates first
3. Review **Red Flags** carefully - some concerns can be addressed in interviews
4. Check **Employment History** for tenure patterns

### Conducting Interviews

1. Use the AI-generated questions as a starting point
2. Add follow-up questions based on responses
3. Record responses accurately - AI evaluation depends on them
4. Add personal notes for context the AI might miss

### Making Hiring Decisions

1. Review all interview round evaluations
2. Consider the overall trajectory across rounds
3. Weight the AI recommendation but use your judgment
4. Check for consistency between resume claims and interview responses

---

## Troubleshooting

### Resume Score Shows 50

This typically means AI processing failed. Common causes:
- API rate limiting (too many uploads at once)
- Network timeout
- Invalid resume format

**Solution:** Delete the application and re-upload the resume.

### PDF Won't Process

- Ensure the PDF is text-based (not a scanned image)
- Try a smaller file size
- Check that the PDF isn't password-protected

### Interview Questions Not Generating

- Verify the Anthropic API key is configured
- Check for rate limiting (wait a few minutes)
- Ensure the application has resume text available

---

## Permissions Summary

| Action | Required Role |
|--------|---------------|
| View Applications | All authenticated users |
| Change Status | All authenticated users |
| Schedule Interviews | All authenticated users |
| Conduct Interviews | All authenticated users |
| Hire Applicants | All authenticated users |
| Delete Applications | Admin, Super Admin only |
| Bulk Upload | All authenticated users |
