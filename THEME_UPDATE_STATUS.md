# Theme Support Update Status

## Completed Files ✅

The following files have been fully updated with theme switching support:

1. **`/app/jobs/page.tsx`** - Complete
   - Theme hook added
   - All backgrounds, text, borders updated
   - Form inputs and modals support both themes
   
2. **`/app/login/page.tsx`** - Complete
   - Full light/dark theme support
   - Form elements styled for both themes
   
3. **`/app/change-password/page.tsx`** - Complete
   - Theme switching implemented
   - Consistent with login page styling
   
4. **`/app/applications/page.tsx`** - Complete
   - Table, filters, and stats cards support themes
   - Light mode uses clean iOS-style white/gray
   - Dark mode maintains slate/cyan aesthetic

## Remaining Files - Require Updates ⚠️

The following files still need theme support added using the same pattern:

1. **`/app/contact-messages/page.tsx`** (328 lines)
2. **`/app/dealer-inquiries/page.tsx`** (453 lines)
3. **`/app/users/page.tsx`** (558 lines)
4. **`/app/repositories/page.tsx`** (189 lines)
5. **`/app/messages/page.tsx`** (460 lines)
6. **`/app/projects/page.tsx`** (362 lines)

## Update Pattern

For each remaining file, apply these changes:

### 1. Add Theme Import
```typescript
import { useTheme } from "../theme-context";
```

### 2. Add Theme Hook (at component start)
```typescript
const { theme } = useTheme();
const isDark = theme === "dark";
```

### 3. Update Class Patterns

**Main container:**
```typescript
// Before:
<div className="flex h-screen bg-slate-900">

// After:
<div className={`flex h-screen ${isDark ? "bg-slate-900" : "bg-[#f2f2f7]"}`}>
```

**Header:**
```typescript
// Before:
<header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 px-8 py-4">

// After:
<header className={`sticky top-0 z-10 backdrop-blur-sm border-b px-8 py-4 ${isDark ? "bg-slate-900/80 border-slate-700" : "bg-white/80 border-gray-200"}`}>
```

**Text:**
```typescript
// Titles:
<h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>

// Subtitles/descriptions:
<p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
```

**Cards/Panels:**
```typescript
<div className={`rounded-lg p-4 ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
```

**Form Inputs:**
```typescript
<input className={`w-full px-4 py-2 rounded-lg focus:outline-none ${isDark ? "bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:border-cyan-500" : "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-600"}`} />
```

**Primary Buttons:**
```typescript
<button className={`px-4 py-2 rounded-lg ${isDark ? "bg-cyan-500 hover:bg-cyan-600" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>
```

**Secondary Buttons:**
```typescript
<button className={`px-4 py-2 rounded-lg ${isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}>
```

**Tables:**
```typescript
<thead className={isDark ? "bg-slate-800" : "bg-gray-50"}>
<tr className={`border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
<th className={`px-6 py-4 text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
```

**Table Rows (Hover):**
```typescript
<tr className={`${isDark ? "hover:bg-slate-800/50" : "hover:bg-gray-50"}`}>
```

**Modals:**
```typescript
<div className={`rounded-lg p-6 ${isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-gray-200 shadow-sm"}`}>
```

## Theme Design System

### Dark Mode (isDark = true):
- Background: `bg-slate-900`
- Cards: `bg-slate-800/50 border-slate-700`
- Text: `text-white`, `text-slate-400`, `text-slate-300`
- Primary: `bg-cyan-500` (cyan/teal accent)
- Borders: `border-slate-700`

### Light Mode (isDark = false):
- Background: `bg-[#f2f2f7]` (iOS gray)
- Cards: `bg-white border-gray-200 shadow-sm`
- Text: `text-gray-900`, `text-gray-500`, `text-gray-700`
- Primary: `bg-blue-600` (iOS blue)
- Borders: `border-gray-200`

## Testing Checklist

After updating each file, verify:
- [ ] Theme toggle button switches between light/dark
- [ ] All text is readable in both modes
- [ ] Borders are visible in both modes
- [ ] Hover states work in both modes
- [ ] Modals/dialogs support both themes
- [ ] Form inputs are styled correctly
- [ ] No hardcoded `bg-slate-900` or similar classes remain

## Next Steps

1. Apply the pattern to each remaining file
2. Test theme switching on each page
3. Verify no visual regressions
4. Ensure consistent iOS-style design in light mode

