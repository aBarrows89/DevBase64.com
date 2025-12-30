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
          // Preliminary evaluation (small talk phase) - scores 1-4
          preliminaryEvaluation: v.optional(
            v.object({
              appearance: v.number(), // 1-4: Personal appearance/presentation
              manner: v.number(), // 1-4: Professional demeanor/attitude
              conversation: v.number(), // 1-4: Communication skills
              intelligence: v.number(), // 1-4: Quick thinking/comprehension
              sociability: v.number(), // 1-4: Interpersonal/social skills
              overallHealthOpinion: v.number(), // 1-4: General health/fitness impression
              notes: v.optional(v.string()), // Optional notes from small talk
              evaluatedAt: v.number(), // When evaluation was recorded
            })
          ),
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
    locationId: v.optional(v.id("locations")), // Assigned work location
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
    // Tenure milestone check-ins (1 day, 3 day, 7 day, 30 day, 60 day)
    tenureCheckIns: v.optional(v.array(v.object({
      milestone: v.string(), // "1_day" | "3_day" | "7_day" | "30_day" | "60_day"
      completedAt: v.number(), // Timestamp when check-in was completed
      completedBy: v.optional(v.id("users")), // Who conducted the check-in (optional for bulk/system operations)
      completedByName: v.string(), // Name of who conducted it (for display)
      notes: v.optional(v.string()), // Any notes from the check-in
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
    // Document attachments (doctor's notes, etc.)
    attachments: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileType: v.string(),
      uploadedAt: v.number(),
    }))),
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

  // ============ NOTIFICATIONS ============
  notifications: defineTable({
    userId: v.id("users"), // Who should receive the notification
    type: v.string(), // "tenure_check_in" | "write_up_follow_up" | "review_due" | etc.
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // URL to navigate to when clicked
    relatedPersonnelId: v.optional(v.id("personnel")),
    relatedId: v.optional(v.string()), // Generic related ID (write-up, review, etc.)
    isRead: v.boolean(),
    isDismissed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_type", ["type"]),

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

  // ============ LOCATIONS ============
  locations: defineTable({
    name: v.string(), // e.g., "Main Warehouse", "Distribution Center 2"
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),

  // ============ EQUIPMENT INVENTORY ============
  // Scanners (RF scanners, barcode scanners, etc.)
  scanners: defineTable({
    number: v.string(), // Scanner identifier (e.g., "1", "A-12", "SC-001")
    pin: v.optional(v.string()), // PIN code for the scanner
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()), // e.g., "Zebra MC3300", "Honeywell CT60"
    locationId: v.id("locations"),
    status: v.string(), // "available" | "assigned" | "maintenance" | "lost" | "retired"
    assignedTo: v.optional(v.id("personnel")),
    assignedAt: v.optional(v.number()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()), // Current condition of the equipment
    retiredAt: v.optional(v.number()), // When the equipment was retired
    retiredReason: v.optional(v.string()), // Why it was retired
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_location", ["locationId"])
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"]),

  // Pickers (order picking devices/equipment)
  pickers: defineTable({
    number: v.string(), // Picker identifier (e.g., "1", "P-01", "PK-A")
    pin: v.optional(v.string()), // PIN code for the picker
    serialNumber: v.optional(v.string()),
    model: v.optional(v.string()),
    locationId: v.id("locations"),
    status: v.string(), // "available" | "assigned" | "maintenance" | "lost" | "retired"
    assignedTo: v.optional(v.id("personnel")),
    assignedAt: v.optional(v.number()),
    lastMaintenanceDate: v.optional(v.string()),
    purchaseDate: v.optional(v.string()),
    notes: v.optional(v.string()),
    conditionNotes: v.optional(v.string()), // Current condition of the equipment
    retiredAt: v.optional(v.number()), // When the equipment was retired
    retiredReason: v.optional(v.string()), // Why it was retired
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_location", ["locationId"])
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"]),

  // Equipment agreements (signed disclosures for assigned equipment)
  equipmentAgreements: defineTable({
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    personnelId: v.id("personnel"),
    equipmentNumber: v.string(), // Equipment identifier at time of signing
    serialNumber: v.optional(v.string()), // Serial number at time of signing
    equipmentValue: v.number(), // Dollar value (e.g., 100)
    agreementText: v.string(), // Full disclosure text
    signatureData: v.string(), // Base64 encoded signature image
    signedAt: v.number(), // Timestamp when signed
    witnessedBy: v.id("users"), // Admin/manager who processed assignment
    witnessedByName: v.string(), // Name for display
    // Revocation (when equipment is unassigned)
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
    revokedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_equipment", ["equipmentType", "equipmentId"])
    .index("by_personnel", ["personnelId"])
    .index("by_signed", ["signedAt"]),

  // Equipment return condition checks (manager validates before reassignment)
  equipmentConditionChecks: defineTable({
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    returnedBy: v.id("personnel"), // Who returned the equipment
    checkedBy: v.id("users"), // Manager who performed the check
    checkedByName: v.string(),
    // Checklist items
    checklist: v.object({
      physicalCondition: v.boolean(), // No visible damage
      screenFunctional: v.boolean(), // Screen works (for scanners)
      buttonsWorking: v.boolean(), // All buttons responsive
      batteryCondition: v.boolean(), // Battery holds charge
      chargingPortOk: v.boolean(), // Charging port not damaged
      scannerFunctional: v.boolean(), // Barcode scanning works
      cleanCondition: v.boolean(), // Equipment is clean
    }),
    overallCondition: v.string(), // "excellent" | "good" | "fair" | "poor" | "damaged"
    damageNotes: v.optional(v.string()), // Details of any damage found
    repairRequired: v.boolean(),
    readyForReassignment: v.boolean(), // Manager confirms ready to assign to next person
    deductionRequired: v.optional(v.boolean()), // If damage requires pay deduction
    deductionAmount: v.optional(v.number()), // Amount to deduct
    checkedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_equipment", ["equipmentType", "equipmentId"])
    .index("by_personnel", ["returnedBy"])
    .index("by_checked", ["checkedAt"]),

  // Equipment assignment history (for audit trail)
  equipmentHistory: defineTable({
    equipmentType: v.string(), // "scanner" | "picker"
    equipmentId: v.union(v.id("scanners"), v.id("pickers")),
    action: v.string(), // "assigned" | "unassigned" | "maintenance" | "status_change" | "condition_check"
    previousStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    previousAssignee: v.optional(v.id("personnel")),
    newAssignee: v.optional(v.id("personnel")),
    conditionCheckId: v.optional(v.id("equipmentConditionChecks")), // Link to condition check if applicable
    performedBy: v.id("users"),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_equipment", ["equipmentType", "equipmentId"])
    .index("by_created", ["createdAt"]),

  // ============ SAFETY CHECKLISTS ============
  // Safety checklist templates (admin-editable)
  safetyChecklistTemplates: defineTable({
    name: v.string(), // "Standard Picker Checklist"
    isDefault: v.boolean(), // True for the standard template
    equipmentType: v.string(), // "picker" | "scanner" | "all"
    items: v.array(v.object({
      id: v.string(), // Unique ID for the item
      question: v.string(), // "Check hydraulic fluid levels"
      description: v.optional(v.string()), // Detailed instructions
      minimumSeconds: v.number(), // Minimum time before can proceed (e.g., 30)
      order: v.number(), // Display order
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_default", ["isDefault"])
    .index("by_equipment_type", ["equipmentType"]),

  // Equipment-specific checklist configuration (overrides/additions)
  equipmentChecklistConfig: defineTable({
    equipmentType: v.string(), // "picker" or "scanner"
    equipmentId: v.union(v.id("pickers"), v.id("scanners")), // Specific equipment
    templateId: v.optional(v.id("safetyChecklistTemplates")), // Override default template
    additionalItems: v.optional(v.array(v.object({
      id: v.string(),
      question: v.string(),
      description: v.optional(v.string()),
      minimumSeconds: v.number(),
      order: v.number(),
    }))), // Extra questions for this specific equipment
    personnelOverrides: v.optional(v.array(v.object({
      personnelId: v.id("personnel"),
      additionalItems: v.array(v.object({
        id: v.string(),
        question: v.string(),
        minimumSeconds: v.number(),
      })),
    }))), // Extra questions for specific people on this equipment
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_equipment", ["equipmentType", "equipmentId"]),

  // Completed safety checklist records
  safetyChecklistCompletions: defineTable({
    equipmentType: v.string(), // "picker" | "scanner"
    equipmentId: v.union(v.id("pickers"), v.id("scanners")),
    equipmentNumber: v.string(), // Equipment number at time of completion (for display)
    personnelId: v.id("personnel"),
    personnelName: v.string(), // Name at time of completion (for display)
    templateId: v.optional(v.id("safetyChecklistTemplates")),
    responses: v.array(v.object({
      itemId: v.string(),
      question: v.string(),
      passed: v.boolean(),
      notes: v.optional(v.string()),
      timeSpent: v.number(), // Actual seconds spent on this item
      completedAt: v.number(),
    })),
    allPassed: v.boolean(),
    totalTimeSpent: v.number(), // Total seconds
    issues: v.optional(v.array(v.object({
      itemId: v.string(),
      description: v.string(),
    }))),
    shiftDate: v.string(), // "2024-12-30" for easy querying
    locationId: v.optional(v.id("locations")),
    completedAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_personnel_date", ["personnelId", "shiftDate"])
    .index("by_equipment", ["equipmentType", "equipmentId"])
    .index("by_equipment_date", ["equipmentType", "equipmentId", "shiftDate"])
    .index("by_date", ["shiftDate"]),

  // ============ DOCUMENT HUB ============
  // Frequently used documents (forms, templates, etc.)
  documents: defineTable({
    name: v.string(), // Document name/title
    description: v.optional(v.string()), // Brief description
    category: v.string(), // "forms" | "policies" | "sops" | "templates" | "training" | "other"
    fileId: v.id("_storage"), // Convex storage ID for the file
    fileName: v.string(), // Original filename
    fileType: v.string(), // MIME type (application/pdf, etc.)
    fileSize: v.number(), // File size in bytes
    uploadedBy: v.id("users"),
    uploadedByName: v.string(), // For display purposes
    isActive: v.boolean(),
    downloadCount: v.number(), // Track usage
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_created", ["createdAt"]),

  // ============ TIME CLOCK ============
  // Raw time entries (clock in/out, breaks)
  timeEntries: defineTable({
    personnelId: v.id("personnel"),
    date: v.string(), // YYYY-MM-DD
    type: v.string(), // "clock_in" | "clock_out" | "break_start" | "break_end"
    timestamp: v.number(), // Unix timestamp (ms)
    source: v.string(), // "admin" | "mobile" | "kiosk"
    locationId: v.optional(v.id("locations")),
    gpsCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    notes: v.optional(v.string()),
    // Edit tracking
    editedBy: v.optional(v.id("users")), // If manually adjusted
    editedAt: v.optional(v.number()),
    originalTimestamp: v.optional(v.number()), // Value before edit
    editReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["date"])
    .index("by_personnel_date", ["personnelId", "date"]),

  // Time correction requests (employee requests, manager approval)
  timeCorrections: defineTable({
    personnelId: v.id("personnel"),
    timeEntryId: v.optional(v.id("timeEntries")), // If editing existing entry
    date: v.string(), // YYYY-MM-DD
    requestType: v.string(), // "edit" | "add_missed" | "delete"
    // For edits
    currentTimestamp: v.optional(v.number()), // Current value
    requestedTimestamp: v.optional(v.number()), // Requested new value
    // For adding missed entries
    requestedType: v.optional(v.string()), // "clock_in" | "clock_out" | "break_start" | "break_end"
    reason: v.string(),
    status: v.string(), // "pending" | "approved" | "denied"
    requestedAt: v.number(),
    // Review fields
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewNotes: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_personnel", ["personnelId"])
    .index("by_date", ["date"]),
});
