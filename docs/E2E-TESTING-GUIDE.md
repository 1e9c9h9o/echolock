# End-to-End Testing Guide

**Date**: October 13, 2025
**Version**: 0.1.0
**Purpose**: Manual E2E testing checklist for EchoLock full-stack application

---

## Prerequisites

### Services Running

Ensure both services are running before testing:

```bash
# Terminal 1: Backend API
npm run api
# Should see: "🚀 EchoLock API server started on port 3000"

# Terminal 2: Frontend
cd frontend && npm run dev
# Should see: "Ready on http://localhost:3001"
```

### Verification

- Backend: http://localhost:3000/health (should return `{"status":"healthy"}`)
- Frontend: http://localhost:3001 (should load landing page)
- Database: PostgreSQL running on localhost:5432

---

## Test Suite 1: Authentication Flow

### 1.1 User Sign Up

**Steps**:
1. Navigate to http://localhost:3001
2. Click "Sign Up" button
3. Fill in form:
   - Email: `testuser+[timestamp]@example.com` (use unique email)
   - Password: `TestPassword123` (note: must have uppercase)
   - Confirm Password: `TestPassword123`
4. Click "Sign Up"

**Expected Results**:
- ✅ Toast notification: "Account created successfully!"
- ✅ Redirects to /auth/login after 1 second
- ✅ Backend logs show: "User signed up" with user ID

**Database Verification**:
```bash
sudo -u postgres psql -d echolock -c "SELECT email, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 1;"
```

**Failure Cases to Test**:
- Password < 8 characters → Warning toast: "Password must be at least 8 characters"
- No uppercase letter → Warning toast: "Password must contain at least one uppercase letter"
- Passwords don't match → Warning toast: "Passwords do not match"
- Duplicate email → Error toast: "Email already exists"

---

### 1.2 User Login

**Steps**:
1. On login page (after redirect or navigate manually)
2. Fill in form:
   - Email: (email from signup)
   - Password: `TestPassword123`
3. Click "Login"

**Expected Results**:
- ✅ Toast notification: "Login successful! Redirecting..."
- ✅ Redirects to /dashboard after 0.5 seconds
- ✅ JWT tokens stored in localStorage
- ✅ Backend logs show: "User logged in"

**Verify Tokens**:
Open browser DevTools → Application → Local Storage → http://localhost:3001
- Should see: `accessToken` and `refreshToken`

**Failure Cases**:
- Wrong password → Error toast: "Invalid credentials"
- Non-existent email → Error toast: "Invalid credentials"
- Empty fields → Error toast

---

## Test Suite 2: Dashboard & Switches

### 2.1 Dashboard Empty State

**Steps**:
1. After successful login, should be on /dashboard
2. Observe page content

**Expected Results**:
- ✅ Shows "NO SWITCHES ACTIVE" message
- ✅ "Create your first dead man's switch" text
- ✅ "Create Switch" button visible (2 places: top-right and center)
- ✅ No error messages or loading states

---

### 2.2 Create Switch

**Steps**:
1. Click "Create Switch" button
2. Fill in form:
   - Title: `Test Switch #1`
   - Message: `This is a secret test message for recovery`
   - Check-in Interval: `24` (hours)
   - Password: `SwitchPassword123`
   - Confirm Password: `SwitchPassword123`
   - Recipient Name: `John Doe`
   - Recipient Email: `john@example.com`
3. Click "Add Recipient" (if adding more)
4. Click "Create Switch"

**Expected Results**:
- ✅ Loading state: Button shows "Creating..."
- ✅ Success toast: "Switch created successfully!"
- ✅ Redirects to /dashboard
- ✅ New switch appears in list
- ✅ Shows status badge: "ACTIVE" (green)
- ✅ Shows correct check-in interval
- ✅ Shows recipient count
- ✅ Backend logs show: "Switch created" with switch ID

**Database Verification**:
```bash
# Check switch
sudo -u postgres psql -d echolock -c "SELECT id, title, status, check_in_hours FROM switches ORDER BY created_at DESC LIMIT 1;"

# Check recipients
sudo -u postgres psql -d echolock -c "SELECT name, email FROM recipients WHERE switch_id = '[switch_id_from_above]';"
```

**Failure Cases**:
- Empty required fields → Validation errors
- Password < 8 characters → Error message
- No recipients → Error: "At least one recipient required"

---

### 2.3 View Switch Details

**Steps**:
1. From dashboard, click "View" button on a switch
2. Navigate to switch detail page

**Expected Results**:
- ✅ Displays switch title
- ✅ Shows status badge
- ✅ Shows check-in countdown timer
- ✅ Shows next check-in due time
- ✅ Lists all recipients
- ✅ Shows encrypted message indicator
- ✅ "Check In" button visible

---

### 2.4 Perform Check-In

**Steps**:
1. On switch detail page or dashboard
2. Click "Check In" button

**Expected Results**:
- ✅ Success toast: "Check-in successful! Timer reset."
- ✅ Next check-in time updates
- ✅ Button temporarily disabled during request
- ✅ Backend logs show: "Check-in recorded"

**Database Verification**:
```bash
sudo -u postgres psql -d echolock -c "SELECT switch_id, checked_in_at FROM check_ins ORDER BY checked_in_at DESC LIMIT 1;"
```

---

## Test Suite 3: Error Handling

### 3.1 Network Errors

**Steps**:
1. Stop backend API (Ctrl+C in terminal)
2. Try to login or perform any action

**Expected Results**:
- ✅ Error toast: "Failed to connect to server" or similar
- ✅ Loading state ends
- ✅ No app crash
- ✅ User can retry after restarting backend

---

### 3.2 Invalid Token

**Steps**:
1. Login successfully
2. Open DevTools → Application → Local Storage
3. Delete `accessToken`
4. Try to refresh dashboard or perform action

**Expected Results**:
- ✅ Redirects to login page
- ✅ Toast: "Session expired. Please login again."
- ✅ No console errors

---

### 3.3 Unauthorized Access

**Steps**:
1. In incognito/private window (not logged in)
2. Try to access http://localhost:3001/dashboard directly

**Expected Results**:
- ✅ Redirects to /auth/login
- ✅ Toast: "Please login to continue"

---

## Test Suite 4: UI/UX Polish

### 4.1 Toast Notifications

**Verify all toast types work**:
- Success (green): ✅ Signup, login, check-in
- Error (red): ✅ Failed login, network errors
- Warning (yellow): ✅ Validation errors
- Info (blue): ✅ (if implemented)

**Toast Behavior**:
- ✅ Slides in from right
- ✅ Auto-dismisses after 5 seconds
- ✅ Can manually close with X button
- ✅ Multiple toasts stack vertically

---

### 4.2 Loading States

**Verify loading indicators**:
- ✅ Login button: "Logging in..."
- ✅ Signup button: "Creating Account..."
- ✅ Create switch button: "Creating..."
- ✅ Check-in button: briefly disabled
- ✅ Dashboard: "Loading..." on initial load

---

### 4.3 Mobile Responsiveness

**Test on mobile viewport** (DevTools → Toggle device toolbar):

**Landing Page**:
- ✅ Logo and text readable
- ✅ Buttons stack vertically
- ✅ Sections adjust layout

**Auth Pages**:
- ✅ Forms are full width on mobile
- ✅ Input fields are large enough to tap
- ✅ Buttons are thumb-friendly

**Dashboard**:
- ✅ Navigation works on mobile
- ✅ Switch cards stack vertically
- ✅ Buttons remain accessible

---

## Test Suite 5: Security

### 5.1 XSS Prevention

**Steps**:
1. Try to create switch with title: `<script>alert('XSS')</script>`
2. View switch on dashboard

**Expected Results**:
- ✅ Script does not execute
- ✅ Text is escaped/sanitized
- ✅ No console errors

---

### 5.2 SQL Injection Prevention

**Steps**:
1. Try login with email: `' OR '1'='1`
2. Try creating switch with title: `'; DROP TABLE switches; --`

**Expected Results**:
- ✅ Login fails with "Invalid credentials"
- ✅ Switch creation fails or sanitizes input
- ✅ Database remains intact
- ✅ No server errors

---

## Test Suite 6: Full User Journey

### Complete Flow Test

**Scenario**: New user creates their first switch

**Steps**:
1. Open http://localhost:3001 in incognito window
2. Click "Sign Up" → Create account with `journey@test.com`
3. Redirected to login → Login with credentials
4. Arrives at empty dashboard
5. Click "Create Switch"
6. Fill form completely with valid data
7. Submit form → Redirected to dashboard with new switch
8. Click "View" on switch → Navigate to detail page
9. Click "Check In" → Timer resets successfully
10. Navigate to Settings → View profile
11. Logout → Return to landing page

**Expected Results**:
- ✅ All steps complete without errors
- ✅ Appropriate toasts at each step
- ✅ Data persists across navigation
- ✅ Can logout and login again to see same switch

**Time to Complete**: Should take ~3-5 minutes

---

## Test Results Log Template

```markdown
## Test Run: [Date/Time]

**Tester**: [Your Name]
**Environment**: Development
**Backend**: Running on port 3000
**Frontend**: Running on port 3001
**Database**: PostgreSQL on localhost:5432

### Test Suite 1: Authentication
- [✅/❌] 1.1 User Signup: PASS
- [✅/❌] 1.2 User Login: PASS

### Test Suite 2: Dashboard & Switches
- [✅/❌] 2.1 Dashboard Empty State: PASS
- [✅/❌] 2.2 Create Switch: PASS
- [✅/❌] 2.3 View Switch Details: PASS
- [✅/❌] 2.4 Perform Check-In: PASS

### Test Suite 3: Error Handling
- [✅/❌] 3.1 Network Errors: PASS
- [✅/❌] 3.2 Invalid Token: PASS
- [✅/❌] 3.3 Unauthorized Access: PASS

### Test Suite 4: UI/UX Polish
- [✅/❌] 4.1 Toast Notifications: PASS
- [✅/❌] 4.2 Loading States: PASS
- [✅/❌] 4.3 Mobile Responsiveness: PASS

### Test Suite 5: Security
- [✅/❌] 5.1 XSS Prevention: PASS
- [✅/❌] 5.2 SQL Injection Prevention: PASS

### Test Suite 6: Full User Journey
- [✅/❌] Complete Flow: PASS

### Issues Found:
1. [Describe issue]
2. [Describe issue]

### Notes:
- [Any observations]
```

---

## Automated Testing (Future)

For automated E2E tests, consider:
- Playwright or Cypress
- Test database seeding
- CI/CD integration
- Visual regression testing

---

## Success Criteria

**MVP is ready for beta if**:
- All test suites pass with ✅
- No critical bugs found
- <5% error rate across all tests
- Mobile responsiveness verified
- Toast notifications work consistently

**Current Status**: Ready for manual testing
**Next Step**: Perform full test run and document results
