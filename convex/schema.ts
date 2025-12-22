import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ AUTHENTICATION ============
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.string(), // "super_admin" | "admin" | "department_manager" | "warehouse_manager" | "member"
    isActive: v.boolean(),
    forcePasswordChange: v.boolean(),
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  // ============ PROJECT MANAGEMENT ============
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    status: v.string(), // "backlog" | "in_progress" | "review" | "done"
    priority: v.string(), // "low" | "medium" | "high" | "urgent"
    createdBy: v.id("users"),
    assignedTo: v.optional(v.id("users")),
    estimatedHours: v.optional(v.number()),
    actualHours: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    aiGeneratedSteps: v.optional(v.string()), // JSON stringified array
    aiTimelineAnalysis: v.optional(
      v.object({
        estimatedCompletion: v.string(),
        isOnSchedule: v.boolean(),
        behindByDays: v.optional(v.number()),
        confidence: v.number(),
        reasoning: v.string(),
      })
    ),
    repositoryId: v.optional(v.id("repositories")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_assignee", ["assignedTo"])
    .index("by_created", ["createdAt"]),

  tasks: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "todo" | "in_progress" | "done"
    order: v.number(),
    estimatedMinutes: v.optional(v.number()),
    actualMinutes: v.optional(v.number()),
    assignedTo: v.optional(v.id("users")),
    dueDate: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // ============ APPLICATIONS (from ietires.com) ============
  jobs: defineTable({
    title: v.string(),
    location: v.string(),
    type: v.string(), // "Full-time" | "Part-time"
    positionType: v.optional(v.string()), // "hourly" | "salaried" | "management"
    department: v.string(),
    status: v.string(),
    description: v.string(),
    benefits: v.array(v.string()),
    keywords: v.array(v.string()),
    isActive: v.boolean(),
    urgentHiring: v.optional(v.boolean()), // Legacy - now use badgeType
    badgeType: v.optional(v.string()), // "urgently_hiring" | "accepting_applications" | "open_position"
    displayOrder: v.optional(v.number()), // For custom ordering
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_department", ["department"])
    .index("by_status", ["status"])
    .index("by_active", ["isActive"]),

  applications: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.optional(v.string()),
    resumeText: v.optional(v.string()),
    appliedJobId: v.optional(v.id("jobs")),
    appliedJobTitle: v.string(),
    aiAnalysis: v.optional(
      v.object({
        suggestedJobId: v.optional(v.id("jobs")),
        suggestedJobTitle: v.optional(v.string()),
        matchScore: v.number(),
        allScores: v.array(
          v.object({
            jobId: v.id("jobs"),
            jobTitle: v.string(),
            score: v.number(),
            matchedKeywords: v.array(v.string()),
            reasoning: v.optional(v.string()),
          })
        ),
        extractedSkills: v.array(v.string()),
        summary: v.optional(v.string()),
      })
    ),
    candidateAnalysis: v.optional(
      v.object({
        overallScore: v.number(),
        stabilityScore: v.number(),
        experienceScore: v.number(),
        employmentHistory: v.array(
          v.object({
            company: v.string(),
            title: v.string(),
            duration: v.string(),
            durationMonths: v.number(),
            startDate: v.optional(v.string()),
            endDate: v.optional(v.string()),
          })
        ),
        redFlags: v.array(
          v.object({
            type: v.string(),
            severity: v.string(),
            description: v.string(),
          })
        ),
        greenFlags: v.array(
          v.object({
            type: v.string(),
            description: v.string(),
          })
        ),
        totalYearsExperience: v.number(),
        averageTenureMonths: v.number(),
        longestTenureMonths: v.number(),
        recommendedAction: v.string(),
        hiringTeamNotes: v.string(),
      })
    ),
    status: v.string(), // "new" | "reviewed" | "contacted" | "scheduled" | "interviewed" | "hired" | "rejected"
    notes: v.optional(v.string()),
    // Scheduled interview info
    scheduledInterviewDate: v.optional(v.string()), // ISO date string (YYYY-MM-DD)
    scheduledInterviewTime: v.optional(v.string()), // Time string (HH:MM)
    scheduledInterviewLocation: v.optional(v.string()), // "In-person", "Phone", "Video", or custom location
    // Interview rounds (up to 3)
    interviewRounds: v.optional(
      v.array(
        v.object({
          round: v.number(), // 1, 2, or 3
          interviewerName: v.string(),
          conductedAt: v.number(),
          questions: v.array(
            v.object({
              question: v.string(),
              answer: v.optional(v.string()),
              aiGenerated: v.boolean(),
            })
          ),
          interviewNotes: v.optional(v.string()),
          aiEvaluation: v.optional(
            v.object({
              overallScore: v.number(),
              strengths: v.array(v.string()),
              concerns: v.array(v.string()),
              recommendation: v.string(),
              detailedFeedback: v.string(),
            })
          ),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_job", ["appliedJobId"])
    .index("by_created", ["createdAt"]),

  // ============ GITHUB REPOSITORIES ============
  repositories: defineTable({
    githubId: v.number(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    htmlUrl: v.string(),
    cloneUrl: v.string(),
    defaultBranch: v.string(),
    isPrivate: v.boolean(),
    language: v.optional(v.string()),
    starCount: v.number(),
    forkCount: v.number(),
    openIssuesCount: v.number(),
    lastPushedAt: v.string(),
    lastSyncedAt: v.number(),
  })
    .index("by_github_id", ["githubId"])
    .index("by_name", ["name"]),

  // ============ MESSAGING ============
  conversations: defineTable({
    type: v.string(), // "direct" | "project"
    projectId: v.optional(v.id("projects")),
    participants: v.array(v.id("users")),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_last_message", ["lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    mentions: v.array(v.id("users")),
    readBy: v.array(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created", ["createdAt"]),

  // ============ AUDIT LOG ============
  auditLogs: defineTable({
    action: v.string(),
    actionType: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    userId: v.id("users"),
    userEmail: v.string(),
    details: v.string(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_user", ["userId"]),

  // ============ WEBSITE INQUIRIES (from ietires.com) ============
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    status: v.string(), // "new" | "read" | "replied" | "archived"
    notes: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    repliedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  dealerInquiries: defineTable({
    businessName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    businessType: v.optional(v.string()), // "tire_shop" | "auto_dealer" | "fleet" | "other"
    yearsInBusiness: v.optional(v.number()),
    estimatedMonthlyVolume: v.optional(v.string()),
    currentSuppliers: v.optional(v.string()),
    message: v.optional(v.string()),
    status: v.string(), // "new" | "contacted" | "qualified" | "approved" | "rejected"
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    followUpDate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_assigned", ["assignedTo"]),

  // ============ PERSONNEL MANAGEMENT ============
  // Personnel profiles (hired applicants become personnel)
  personnel: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    applicationId: v.optional(v.id("applications")), // Link to original application
    position: v.string(), // Job title
    department: v.string(), // "Warehouse", "Sales", "Management", etc.
    employeeType: v.string(), // "full_time" | "part_time" | "seasonal"
    hireDate: v.string(), // YYYY-MM-DD
    hourlyRate: v.optional(v.number()),
    status: v.string(), // "active" | "on_leave" | "terminated"
    terminationDate: v.optional(v.string()),
    terminationReason: v.optional(v.string()),
    emergencyContact: v.optional(v.object({
      name: v.string(),
      phone: v.string(),
      relationship: v.string(),
    })),
    notes: v.optional(v.string()),
    completedTraining: v.optional(v.array(v.string())), // Legacy: Array of training area names
    trainingRecords: v.optional(v.array(v.object({
      area: v.string(), // Training area name
      completedAt: v.number(), // Timestamp when training was completed
      certifiedBy: v.optional(v.id("users")), // Who certified the training
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_department", ["department"])
    .index("by_status", ["status"])
    .index("by_email", ["email"]),

  // Write-ups / Disciplinary Records
  writeUps: defineTable({
    personnelId: v.id("personnel"),
    date: v.string(), // YYYY-MM-DD
    category: v.string(), // "attendance" | "behavior" | "safety" | "performance" | "policy_violation"
    severity: v.string(), // "verbal_warning" | "written_warning" | "final_warning" | "suspension"
    description: v.string(),
    actionTaken: v.optional(v.string()),
    followUpRequired: v.boolean(),
    followUpDate: v.optional(v.string()),
    followUpNotes: v.optional(v.string()),
    issuedBy: v.id("users"),
    acknowledgedAt: v.optional(v.number()),
    // Write-ups expire/archive after 90 days from date - not counted for incentives
    isArchived: v.optional(v.boolean()), // Auto-set based on 90-day rule, but can be manually archived
    // Document attachments
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      uploadedAt: v.number(),
    }))),
    createdAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["date"])
    .index("by_severity", ["severity"]),

  // Attendance Records
  attendance: defineTable({
    personnelId: v.id("personnel"),
    date: v.string(), // YYYY-MM-DD
    status: v.string(), // "present" | "absent" | "late" | "excused" | "no_call_no_show"
    scheduledStart: v.optional(v.string()), // HH:MM
    scheduledEnd: v.optional(v.string()), // HH:MM
    actualStart: v.optional(v.string()), // HH:MM
    actualEnd: v.optional(v.string()), // HH:MM
    hoursWorked: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["date"])
    .index("by_personnel_date", ["personnelId", "date"]),

  // Merits / Commendations
  merits: defineTable({
    personnelId: v.id("personnel"),
    date: v.string(), // YYYY-MM-DD
    type: v.string(), // "performance" | "attendance" | "teamwork" | "safety" | "customer_service" | "initiative"
    title: v.string(),
    description: v.string(),
    issuedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["date"])
    .index("by_type", ["type"]),

  // Shift Planning (whiteboard style)
  shifts: defineTable({
    date: v.string(), // YYYY-MM-DD
    name: v.optional(v.string()), // Shift name like "Morning", "Evening", etc.
    startTime: v.string(), // HH:MM
    endTime: v.string(), // HH:MM
    position: v.string(), // "Receiving", "Shipping", "Inventory", etc.
    department: v.string(),
    requiredCount: v.number(), // How many people needed
    assignedPersonnel: v.array(v.id("personnel")),
    leadId: v.optional(v.id("personnel")), // Department lead for this shift
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_department", ["department"])
    .index("by_date_department", ["date", "department"]),

  // Performance Reviews
  performanceReviews: defineTable({
    personnelId: v.id("personnel"),
    reviewPeriod: v.string(), // "Q1 2025", "Annual 2024", etc.
    reviewDate: v.string(), // YYYY-MM-DD
    reviewedBy: v.id("users"),
    overallRating: v.number(), // 1-5 scale
    categories: v.array(v.object({
      name: v.string(), // "Attendance", "Quality of Work", "Teamwork", etc.
      rating: v.number(), // 1-5
      notes: v.optional(v.string()),
    })),
    strengths: v.array(v.string()),
    areasForImprovement: v.array(v.string()),
    goals: v.array(v.object({
      goal: v.string(),
      targetDate: v.optional(v.string()),
      completed: v.boolean(),
    })),
    employeeComments: v.optional(v.string()),
    managerNotes: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["reviewDate"]),

  // ============ PROJECT SUGGESTIONS ============
  projectSuggestions: defineTable({
    suggestedBy: v.id("users"),
    suggestedTo: v.id("users"),
    title: v.string(),
    description: v.string(),
    priority: v.optional(v.string()), // "low" | "medium" | "high" | "urgent"
    status: v.string(), // "pending" | "approved" | "denied"
    // Approval fields
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    estimatedTimeline: v.optional(v.string()), // e.g., "2 weeks", "1 month", etc.
    // If approved, link to created project
    projectId: v.optional(v.id("projects")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_suggested_to", ["suggestedTo"])
    .index("by_suggested_by", ["suggestedBy"])
    .index("by_status", ["status"]),
});
