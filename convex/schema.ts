import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============ AUTHENTICATION ============
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    role: v.string(), // "admin" | "member" | "viewer"
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
});
