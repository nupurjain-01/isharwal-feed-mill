# UMAX Packaging Limited – Gate Entry Management System

A modern, secure, and production-grade Full-Stack Gate Entry Management System built with **React.js, Node.js, Express.js, PostgreSQL, and Socket.io**.

---

## 🚀 Quick Start (1-Click Launch)

To start the application on your Windows PC:
1. Double-click the **`run_umax.bat`** file in this folder.
2. The server will start on port 5000 and automatically open **http://localhost:5000** in your web browser.

---

## 🔑 Default Login Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@umaxpackaging.com` | `admin123` | Full access (Departments, Employees, Users, Reports, Exports, Delete) |
| **Security Guard** | `gate@umaxpackaging.com` | `guard123` | Visitor Check-In, Check-Out, Expected Visitors, Gate Pass Printing |

---

## 📋 Features Implemented

1. **Executive Dashboard**:
   - Live Counters: Total Visitors Today, Currently Inside, Checked Out Today, Expected Visitors, Total All-Time.
   - Department-wise visitor traffic chart.
   - Today's hourly movement graph.
   - Live recent visitor desk with 1-click Check Out.

2. **New Visitor Gate Pass**:
   - Auto-generated sequential Visitor ID (`UMAX-2026-0001`).
   - Live Webcam Photo Capture or file upload.
   - **Dynamic Dependent Dropdowns**: Selecting a Department auto-filters the Person to Meet (Employee) list.
   - Vehicle number, number of visitors, material details, purpose, remarks.
   - Printable thermal / slip gate pass.

3. **Visitor Records & Exit Desk**:
   - Live search by Visitor Name, Mobile Number, Company, Vehicle, or Pass ID.
   - Status filters (`INSIDE` vs `CHECKED_OUT`).
   - Date range filters.
   - 1-Click "Mark Out" with automatic Out-Time timestamping and duplicate checkout prevention.

4. **Expected Visitors (Pre-registration)**:
   - Pre-book upcoming VIPs, vendors, and meeting guests.
   - **1-Click Express Check-In Conversion**: Converts an expected visitor into an active gate pass with zero retyping.

5. **Master Data Management**:
   - Full CRUD for **Departments** (with safety protection: cannot delete department if employees exist).
   - Full CRUD for **Employees** (linked to departments with designations, phone, email).

6. **Reports & Bulk Excel Center**:
   - Filter reports by Today, Yesterday, This Week, This Month, or Custom Date Range.
   - 1-Click **Export to Excel (`.xlsx`)** with styled headers and status colors.
   - Download sample Excel templates for bulk upload.
   - **Bulk Excel Import**: Upload `.xlsx` spreadsheets to import hundreds of departments and employees in seconds with column validation and duplicate checks.

7. **Real-time Notifications**:
   - Socket.io live sound chime and floating toast banner when a visitor checks in.
   - Web Notification API for desktop banners.
   - Automated email dispatch via SMTP to host employees.

8. **Automated Database Backups**:
   - Double-click **`backup_umax.bat`** to create a complete SQL backup in `C:\UMAX_Backups\`.
   - Compatible with Windows Task Scheduler for automated nightly backups.
