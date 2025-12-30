# Picker Safety Checklist System
## Standard Operating Procedure (SOP) & User Guide

**Document Version:** 1.0
**Effective Date:** December 2024
**Department:** Warehouse Operations
**Regulatory Reference:** OSHA 29 CFR 1910.178

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [Scope](#2-scope)
3. [System Overview](#3-system-overview)
4. [Initial Setup (Administrator)](#4-initial-setup-administrator)
5. [Operator Procedure](#5-operator-procedure)
6. [Manager/Supervisor Procedure](#6-managersupervisor-procedure)
7. [Record Keeping & OSHA Compliance](#7-record-keeping--osha-compliance)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Purpose

This SOP establishes the procedure for conducting and documenting pre-operation safety inspections of powered industrial trucks (pickers/forklifts) in compliance with OSHA regulations. The digital safety checklist system ensures:

- All operators perform required pre-shift inspections
- Inspections are properly documented and retrievable
- Deficiencies are identified and reported
- Management can verify compliance
- Records are maintained for regulatory audits

---

## 2. Scope

This procedure applies to:
- All employees certified to operate powered industrial trucks
- All picker/forklift equipment at IE Tire LLC facilities
- Supervisors and managers responsible for safety compliance

---

## 3. System Overview

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| QR Code Labels | Attached to each picker | Provides quick access to safety checklist |
| Safety Check Page | `/safety-check/[id]` | Mobile-friendly checklist interface |
| Manager Dashboard | `/safety-check/manager` | Compliance monitoring and reporting |
| Template Editor | `/settings/safety-checklists` | Admin configuration of checklist items |
| Equipment History | `/equipment` > Safety button | View equipment inspection history |
| Personnel History | `/personnel/[id]` > Safety tab | View operator inspection history |

### How It Works

1. Operator scans QR code on equipment
2. Selects their name from dropdown (filtered to trained personnel)
3. Completes timed safety inspection checklist
4. Record is saved to both operator profile and equipment history
5. Managers can view, verify, and print records

---

## 4. Initial Setup (Administrator)

### 4.1 Create/Verify Default Checklist Template

1. Navigate to **People > Checklist Templates** in sidebar
2. If no templates exist, click **"Create Default Template"**
3. This creates the standard 12-item picker safety checklist

### 4.2 Customize Checklist (Optional)

1. Go to **People > Checklist Templates**
2. Click **"Edit"** on existing template, or **"New Template"**
3. Configure:
   - **Template Name:** Descriptive name (e.g., "Standard Picker Checklist")
   - **Equipment Type:** Picker, Scanner, or All
   - **Set as Default:** Check if this should be the default template

4. Add/Edit Checklist Items:
   - **Question:** The inspection item text
   - **Description:** Optional detailed instructions
   - **Minimum Seconds:** Time operator must spend before proceeding (ensures thorough inspection)

5. Use arrows to reorder items
6. Click **"Create Template"** or **"Update Template"**

### 4.3 Generate QR Codes for Equipment

1. Navigate to **People > Equipment**
2. Select **"Pickers"** tab
3. For each picker, click the purple **"QR"** button
4. In the modal:
   - Click **"Print Label"** to print a QR code label
   - Labels can be laminated and attached to equipment

### 4.4 Ensure Personnel Have Training Badge

Only personnel with the **"Picker Training Video"** training badge can complete safety checklists. To add this badge:

1. Navigate to **People > Personnel**
2. Click on the employee's name
3. In the **Training** section, add "Picker Training Video"
4. Save changes

---

## 5. Operator Procedure

### 5.1 Pre-Operation Safety Inspection

**REQUIRED:** Complete this inspection at the start of each shift BEFORE operating the picker.

#### Step 1: Scan QR Code
- Locate the QR code label on the picker
- Use your mobile device camera or scanner app to scan
- The safety checklist page will open in your browser

#### Step 2: Select Your Name
- Tap the dropdown menu
- Find and select your name from the list
- *Note: Only personnel with picker certification will appear*

#### Step 3: Complete the Checklist
For each inspection item:

1. **Read the question carefully**
2. **Perform the actual inspection** (don't just click through!)
3. **Wait for the timer** - A countdown ensures adequate inspection time
4. **Select PASS or FAIL:**
   - **PASS:** Item meets safety requirements
   - **FAIL:** Item has a deficiency or concern
5. **Add notes if needed** (especially for failed items)
6. Click **"Next"** to proceed

#### Step 4: Review and Submit
- Review your responses on the summary screen
- Click **"Submit"** to complete the inspection
- You'll see a confirmation with your results

### 5.2 What to Do If an Item Fails

1. **Document the issue** in the notes field
2. **Complete the full checklist**
3. **Report to supervisor immediately** after submission
4. **Do NOT operate** equipment with critical safety failures until repaired
5. Supervisor will determine if equipment can be used or must be taken out of service

### 5.3 Standard Checklist Items

| # | Inspection Item | Min. Time |
|---|-----------------|-----------|
| 1 | Walk around picker checking for visible damage | 30 sec |
| 2 | Check horn is functioning | 5 sec |
| 3 | Check headlights and taillights work | 10 sec |
| 4 | Check backup alarm is functioning | 5 sec |
| 5 | Inspect forks for cracks, bends, or damage | 15 sec |
| 6 | Check hydraulic fluid level | 10 sec |
| 7 | Check for hydraulic leaks under picker | 15 sec |
| 8 | Test foot brake operation | 10 sec |
| 9 | Test parking brake operation | 10 sec |
| 10 | Check battery charge level | 5 sec |
| 11 | Ensure seatbelt is present and functional | 5 sec |
| 12 | Check fire extinguisher present and charged | 10 sec |

**Total Minimum Time:** ~2.5 minutes

---

## 6. Manager/Supervisor Procedure

### 6.1 Daily Compliance Verification

1. Navigate to **People > Safety Checks**
2. Select today's date (default)
3. Optionally filter by location
4. Review the summary stats:
   - **Total Checks:** Number of inspections completed
   - **All Passed:** Inspections with no issues
   - **With Issues:** Inspections with failed items

### 6.2 Review Individual Records

1. Click on any inspection record to expand details
2. View:
   - Operator name and equipment
   - Time completed and duration
   - Pass/fail status for each item
   - Notes entered by operator

### 6.3 Print Individual Record

1. Expand the inspection record
2. Click **"Print Record"** button
3. A formatted document opens for printing/saving
4. Includes:
   - Company header
   - Operator and equipment info
   - Complete checklist responses
   - Signature lines
   - OSHA compliance statement

### 6.4 Print Daily Report

1. On the Safety Check Manager page
2. Select date and location filter
3. Click **"Print Daily Report"** button
4. Report includes:
   - Summary statistics
   - Table of all inspections
   - Issues identified
   - Supervisor certification section

### 6.5 View Equipment Inspection History

1. Navigate to **People > Equipment**
2. Select **"Pickers"** tab
3. Click the green **"Safety"** button on any picker
4. View all inspections performed on that equipment
5. Useful for:
   - Equipment maintenance planning
   - Identifying recurring issues
   - Audit documentation

### 6.6 View Operator Inspection History

1. Navigate to **People > Personnel**
2. Click on employee name
3. Select **"Safety"** tab
4. View all inspections performed by that operator
5. Useful for:
   - Performance reviews
   - Training verification
   - Compliance tracking

---

## 7. Record Keeping & OSHA Compliance

### 7.1 Regulatory Requirements

Per OSHA 29 CFR 1910.178:
- Pre-shift inspections are required for powered industrial trucks
- Defects must be reported and corrected
- Records should be maintained for audit purposes

### 7.2 Record Retention

- **Daily Reports:** Print and file weekly or as needed
- **Individual Records:** Available in system indefinitely
- **Recommended Retention:** Minimum 3 years
- **Storage:** Digital records in system + printed copies as backup

### 7.3 Generating Records for Audits

1. Go to **Safety Check Manager**
2. Select the date range needed
3. Print daily reports for each date
4. For specific equipment, use Equipment > Safety button
5. For specific operators, use Personnel > Safety tab

### 7.4 What Records Include

Each record contains:
- Record ID (unique identifier)
- Operator name (electronic signature)
- Equipment identification
- Date and exact time of inspection
- Duration of inspection
- Each checklist item with pass/fail status
- Notes for any deficiencies
- Overall inspection result

---

## 8. Troubleshooting

### Problem: Operator name not appearing in dropdown

**Cause:** Operator doesn't have "Picker Training Video" badge
**Solution:**
1. Go to Personnel page
2. Find the employee
3. Add "Picker Training Video" to their training records

### Problem: QR code won't scan

**Solution:**
1. Ensure good lighting
2. Clean the QR code label
3. Try a different scanning app
4. Use the direct URL: `https://[your-domain]/safety-check/[equipment-id]`

### Problem: Checklist not saving

**Solution:**
1. Check internet connection
2. Complete all required fields
3. Wait for each timer to complete
4. Try refreshing the page and starting over

### Problem: Can't find inspection record

**Solution:**
1. Check the correct date is selected
2. Check location filter
3. Use Equipment > Safety button to search by equipment
4. Use Personnel > Safety tab to search by operator

### Problem: Print function not working

**Solution:**
1. Allow pop-ups for the site
2. Try a different browser (Chrome recommended)
3. Save as PDF if direct printing fails

---

## Contact Information

For system issues or questions:
- **System Administrator:** [Your IT Contact]
- **Safety Manager:** [Your Safety Contact]

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Dec 2024 | Initial release | System |

---

*This document is part of the IE Tire LLC Safety Management System. For the most current version, contact your supervisor.*
