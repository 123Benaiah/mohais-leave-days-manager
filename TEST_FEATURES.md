# Feature Testing Guide

## 1. Testing Negative Days Subtraction

### Test Steps:
1. **Login as Admin** (normal admin, not super admin)
2. **Navigate to Employee Management** (`/employees`)
3. **Find an employee** with some used days (e.g., 10 used days)
4. **Test Case 1: Subtract more than available**
   - Enter a number in the "Days" input field (e.g., 15)
   - Click the "-" (subtract) button
   - **Expected Result**: Used days should become negative (e.g., 10 - 15 = -5)
   - The remaining days calculation should show correctly
   
5. **Test Case 2: Subtract less than available**
   - Enter a number less than used days (e.g., 5)
   - Click the "-" button
   - **Expected Result**: Used days should decrease normally (e.g., -5 - 5 = -10)

### Verification Points:
- ✅ Backend allows negative results (no Math.max restriction)
- ✅ Frontend allows the operation (isValidNumber with allowNegative=true for subtract)
- ✅ Database stores negative values correctly
- ✅ UI displays negative values correctly

### Code Verification:
- `server/models/Employee.js` line 119: `newUsedDays = currentUsedDays - daysNum;` (no Math.max)
- `client/src/App.js` line 145: `isValidNumber(days, true)` (allows negative result)
- `client/src/App.js` line 199: `if (!allowNegative && num < 0)` (only blocks negative INPUT, not result)

---

## 2. Testing Audit Logs Filtering by Employee Number

### Test Steps:
1. **Login as Super Admin**
2. **Navigate to Audit Logs tab**
3. **Create some test data** (if needed):
   - Go to Employee Management as admin
   - Make changes to employees (add/subtract days, create, edit, delete)
   - Note the employee numbers you're working with

4. **Test Filtering:**
   - **Test Case 1: Filter by specific employee number**
     - Enter an employee number in the filter box (e.g., "EMP0001")
     - **Expected Result**: Only audit logs for that employee should appear
     - Verify each log shows:
       - Employee number in green badge (#EMP0001)
       - Admin name who made the change
       - Date/time of the change
       - Employee name
       - Before/after values with employee numbers
   
   - **Test Case 2: Clear filter**
     - Click the "✕" button next to the filter
     - **Expected Result**: All audit logs should appear again
   
   - **Test Case 3: Filter with no results**
     - Enter a non-existent employee number
     - **Expected Result**: Should show "No audit logs found for employee number: XXX"

### Verification Points:
- ✅ Filter input appears in Audit Logs tab
- ✅ Filtering works correctly (backend query)
- ✅ Employee number displayed prominently in each log
- ✅ Admin name, date, and employee info clearly visible
- ✅ Filter clears properly
- ✅ Empty state message shows when no results

### Code Verification:
- `server/models/AuditLog.js` line 54-59: Employee number filtering in SQL query
- `server/routes/superAdmin.js` line 320: Endpoint accepts employeeNumber parameter
- `client/src/components/SuperAdminDashboard.js` line 71-73: Filter included in API call
- `client/src/components/SuperAdminDashboard.js` line 611: Employee number extracted and displayed
- `client/src/components/SuperAdminDashboard.js` line 637: Employee number shown in badge

---

## Expected Behavior Summary

### Negative Days:
- **Input**: Positive number (e.g., 15)
- **Operation**: Subtract from current used days (e.g., 10)
- **Result**: Can be negative (e.g., -5)
- **Display**: Shows negative number correctly in UI

### Audit Logs Filtering:
- **Filter Input**: Employee number (e.g., "EMP0001")
- **Results**: Only logs matching that employee number
- **Display**: 
  - Employee number in green badge
  - Admin name with "👤 Admin:" label
  - Date with "🕐 Date:" label
  - Employee name with "🏷️ Employee:" label
  - Before/after values with employee numbers

---

## Troubleshooting

If negative subtraction doesn't work:
1. Check browser console for errors
2. Verify backend is running and updated
3. Check database - used_days should allow negative values
4. Verify no other validation is blocking it

If audit logs filtering doesn't work:
1. Check browser console for API errors
2. Verify employee_number is stored in audit_logs.new_values JSON
3. Check network tab - filter parameter should be in URL
4. Verify SQL query is correct (LIKE pattern matching)
