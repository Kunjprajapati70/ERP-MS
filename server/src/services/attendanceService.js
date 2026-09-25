const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const { startOfBusinessDay, getCalendarDateKey, getAppTimezone } = require('../utils/timezone');
const { isAdminRole, isCustomerRole, isAttendanceEligibleRole } = require('../constants/roles');

function parseTimestamp(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw AppError.badRequest(`Invalid ${fieldName}`, 'INVALID_TIMESTAMP');
  }
  return d;
}

function dayStart(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) {
    throw AppError.badRequest('Invalid date', 'INVALID_DATE');
  }
  const start = startOfBusinessDay(d);
  if (!start) {
    throw AppError.badRequest('Invalid date', 'INVALID_DATE');
  }
  return start;
}

function calcWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  let ms = end - start;
  if (ms < 0) {
    ms += 24 * 60 * 60 * 1000;
  }
  if (ms <= 0) return 0;
  const hours = Math.min(ms / (1000 * 60 * 60), 24);
  return Math.round(hours * 100) / 100;
}

function derivePunchState(attendance) {
  if (!attendance?.checkIn) return 'NOT_CHECKED_IN';
  if (!attendance.checkOut) return 'CHECKED_IN';
  return 'CHECKED_OUT';
}

function assertAttendanceEligibleUser(user) {
  if (!user) throw AppError.unauthorized();
  const roleName = user.role?.name;
  if (isAdminRole(roleName)) {
    throw AppError.forbidden(
      'Administrators are not required to check in or check out',
      'ATTENDANCE_NOT_REQUIRED'
    );
  }
  if (isCustomerRole(roleName)) {
    throw AppError.forbidden('Customer accounts do not have attendance', 'ATTENDANCE_NOT_REQUIRED');
  }
  if (!isAttendanceEligibleRole(roleName)) {
    throw AppError.forbidden('Attendance is only available for employees', 'ATTENDANCE_NOT_REQUIRED');
  }
}

async function getNonAdminEmployeeIds() {
  const admins = await Employee.find({ department: 'ADMIN' }).select('_id');
  return admins.map((e) => e._id);
}

function isAdminEmployeeRecord(employee) {
  return String(employee?.department || '').toUpperCase() === 'ADMIN';
}

function formatDuration(decimalHours) {
  if (!decimalHours || decimalHours <= 0) return '0h 0m';
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

async function getOrCreateEmployeeForUser(user) {
  assertAttendanceEligibleUser(user);

  let employee = await Employee.findOne({ user: user._id });
  if (!employee && user.email) {
    employee = await Employee.findOne({ email: user.email.toLowerCase() });
    if (employee && !employee.user) {
      employee.user = user._id;
      await employee.save();
    }
  }

  if (employee && isAdminEmployeeRecord(employee)) {
    throw AppError.forbidden(
      'Administrators are not required to check in or check out',
      'ATTENDANCE_NOT_REQUIRED'
    );
  }

  if (!employee) {
    const employeeCode = await nextDocumentNumber(Employee, 'employeeCode', 'EMP');
    const roleName = user.role?.displayName || user.role?.name || 'Staff';
    employee = await Employee.create({
      employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
      email: (user.email || '').toLowerCase(),
      phone: user.phone || '',
      department: 'OTHER',
      designation: roleName,
      user: user._id,
      createdBy: user._id,
    });
  }

  return employee;
}

async function listAttendance(query) {
  const { page, limit, skip, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  const adminEmployeeIds = await getNonAdminEmployeeIds();
  if (query.employee) {
    if (adminEmployeeIds.some((id) => String(id) === String(query.employee))) {
      throw AppError.badRequest('Administrators do not have attendance records', 'ATTENDANCE_NOT_REQUIRED');
    }
    filter.employee = query.employee;
  } else if (query.department) {
    const dept = query.department.toUpperCase();
    if (dept === 'ADMIN') {
      filter.employee = { $in: [] };
    } else {
      const matchingEmployees = await Employee.find({ department: dept }).select('_id');
      filter.employee = { $in: matchingEmployees.map((e) => e._id) };
    }
  } else if (adminEmployeeIds.length) {
    filter.employee = { $nin: adminEmployeeIds };
  }

  const queryDate = query.date ? dayStart(query.date) : dayStart(new Date());
  if (query.date || (!query.from && !query.to)) {
    const start = queryDate;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.date = { $gte: start, $lt: end };
  } else if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = dayStart(query.from);
    if (query.to) {
      const end = dayStart(query.to);
      end.setDate(end.getDate() + 1);
      filter.date.$lt = end;
    }
  }

  const [items, total, allFiltered] = await Promise.all([
    Attendance.find(filter)
      .populate('employee', 'employeeCode firstName lastName department designation')
      .populate('markedBy', 'firstName lastName')
      .sort(sort || { date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Attendance.countDocuments(filter),
    Attendance.find(filter),
  ]);

  // Compute live elapsed workHours for any active session
  const now = new Date();
  const enhancedItems = items.map((doc) => {
    const item = doc.toObject();
    const isCurrentlyWorking = Boolean(item.checkIn && !item.checkOut);
    let liveWorkHours = item.workHours || 0;
    if (isCurrentlyWorking && item.checkIn) {
      const activeElapsed = calcWorkHours(item.checkIn, now);
      liveWorkHours = Math.max(liveWorkHours, activeElapsed);
    }
    return {
      ...item,
      isCurrentlyWorking,
      liveWorkHours,
      formattedWorkHours: formatDuration(liveWorkHours),
    };
  });

  // Summary KPIs for Admin Observation
  let totalWorkHours = 0;
  let currentlyWorkingCount = 0;
  let checkedOutCount = 0;
  let presentCount = 0;

  for (const doc of allFiltered) {
    if (doc.status === 'PRESENT' || doc.status === 'LATE' || doc.status === 'HALF_DAY') {
      presentCount++;
    }
    if (doc.checkIn && !doc.checkOut) {
      currentlyWorkingCount++;
      const activeElapsed = calcWorkHours(doc.checkIn, now);
      totalWorkHours += Math.max(doc.workHours || 0, activeElapsed);
    } else if (doc.checkOut) {
      checkedOutCount++;
      totalWorkHours += doc.workHours || 0;
    }
  }

  totalWorkHours = Math.round(totalWorkHours * 100) / 100;
  const avgWorkHours =
    presentCount > 0 ? Math.round((totalWorkHours / presentCount) * 100) / 100 : 0;

  const totalEmployees = await Employee.countDocuments({
    status: { $in: ['ACTIVE', 'ON_LEAVE'] },
    department: { $ne: 'ADMIN' },
  });
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const attendancePercentage =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  const summary = {
    totalRecords: total,
    totalEmployees,
    presentCount,
    currentlyWorkingCount,
    checkedOutCount,
    absentCount,
    attendancePercentage,
    totalWorkHours,
    formattedTotalHours: formatDuration(totalWorkHours),
    avgWorkHours,
    formattedAvgHours: formatDuration(avgWorkHours),
  };

  const paged = buildPagedResult({ items: enhancedItems, total, page, limit });
  return { ...paged, summary };
}

async function markAttendance(payload, actor, req) {
  const employee = await Employee.findById(payload.employee);
  if (!employee || employee.status === 'TERMINATED') {
    throw AppError.badRequest('Valid employee is required', 'INVALID_EMPLOYEE');
  }
  if (isAdminEmployeeRecord(employee)) {
    throw AppError.badRequest('Administrators do not have attendance records', 'ATTENDANCE_NOT_REQUIRED');
  }

  const date = dayStart(payload.date || new Date());
  let status = (payload.status || 'PRESENT').toUpperCase();
  if (employee.status === 'ON_LEAVE' && !payload.status) status = 'ON_LEAVE';

  const checkIn = payload.checkIn
    ? parseTimestamp(payload.checkIn, 'check-in time')
    : status === 'PRESENT' || status === 'LATE'
    ? new Date()
    : null;
  const checkOut = payload.checkOut ? parseTimestamp(payload.checkOut, 'check-out time') : null;
  if (checkIn && checkOut && checkOut.getTime() < checkIn.getTime()) {
    throw AppError.badRequest('Check-out cannot be earlier than check-in', 'INVALID_TIMESTAMPS');
  }
  const workHours =
    payload.workHours !== undefined ? Number(payload.workHours) : calcWorkHours(checkIn, checkOut);

  const sessions =
    checkIn && checkOut
      ? [{ checkIn, checkOut, durationHours: workHours }]
      : checkIn
      ? [{ checkIn, checkOut: null, durationHours: 0 }]
      : [];

  const attendance = await Attendance.findOneAndUpdate(
    { employee: employee._id, date },
    {
      employee: employee._id,
      date,
      status,
      checkIn,
      checkOut,
      workHours,
      sessions,
      notes: payload.notes || '',
      markedBy: actor._id,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await writeAuditLog({
    userId: actor._id,
    action: 'ATTENDANCE_MARKED',
    module: 'HR',
    recordId: attendance._id.toString(),
    metadata: { employee: employee.employeeCode, date: date.toISOString().slice(0, 10), status },
    req,
  });

  return Attendance.findById(attendance._id)
    .populate('employee', 'employeeCode firstName lastName department designation')
    .populate('markedBy', 'firstName lastName');
}

async function checkOut(id, payload, actor, req) {
  const attendance = await Attendance.findById(id);
  if (!attendance) throw AppError.notFound('Attendance record not found', 'ATTENDANCE_NOT_FOUND');
  if (!attendance.checkIn) {
    throw AppError.badRequest('Cannot check out without check-in', 'NO_CHECK_IN');
  }
  if (attendance.checkOut) {
    throw AppError.conflict('This attendance record is already checked out', 'ALREADY_CHECKED_OUT');
  }

  const now = payload.checkOut ? parseTimestamp(payload.checkOut, 'check-out time') : new Date();
  if (now.getTime() < new Date(attendance.checkIn).getTime()) {
    throw AppError.badRequest('Check-out cannot be earlier than check-in', 'INVALID_TIMESTAMPS');
  }
  attendance.checkOut = now;

  // Update sessions
  if (!attendance.sessions || attendance.sessions.length === 0) {
    attendance.sessions = [
      { checkIn: attendance.checkIn, checkOut: now, durationHours: calcWorkHours(attendance.checkIn, now) },
    ];
  } else {
    const openSession = attendance.sessions.find((s) => !s.checkOut);
    if (openSession) {
      openSession.checkOut = now;
      openSession.durationHours = calcWorkHours(openSession.checkIn, now);
    }
  }

  // Recalculate total work hours across sessions
  const totalHours = (attendance.sessions || []).reduce(
    (acc, s) => acc + (s.durationHours || calcWorkHours(s.checkIn, s.checkOut)),
    0
  );
  attendance.workHours = Math.round(totalHours * 100) / 100;
  if (payload.notes !== undefined) attendance.notes = payload.notes;
  await attendance.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'ATTENDANCE_CHECKOUT',
    module: 'HR',
    recordId: id,
    metadata: { workHours: attendance.workHours },
    req,
  });

  return Attendance.findById(id)
    .populate('employee', 'employeeCode firstName lastName department designation')
    .populate('markedBy', 'firstName lastName');
}

/**
 * Get current employee's attendance status for today
 */
async function getMyTodayAttendance(user) {
  const employee = await getOrCreateEmployeeForUser(user);
  const today = dayStart(new Date());

  const attendance = await Attendance.findOne({ employee: employee._id, date: today })
    .populate('employee', 'employeeCode firstName lastName department designation')
    .populate('markedBy', 'firstName lastName');

  const now = new Date();
  const punchState = derivePunchState(attendance);
  let liveWorkHours = attendance?.workHours || 0;
  if (punchState === 'CHECKED_IN' && attendance.checkIn) {
    liveWorkHours = Math.max(liveWorkHours, calcWorkHours(attendance.checkIn, now));
  }

  return {
    employee,
    attendance,
    punchState,
    isCheckedIn: punchState === 'CHECKED_IN',
    hasCheckedInToday: Boolean(attendance?.checkIn),
    hasCheckedOutToday: Boolean(attendance?.checkOut),
    canCheckIn: punchState === 'NOT_CHECKED_IN',
    canCheckOut: punchState === 'CHECKED_IN',
    workHours: liveWorkHours,
    formattedWorkHours: formatDuration(liveWorkHours),
    businessDate: getCalendarDateKey(now),
    timezone: getAppTimezone(),
  };
}

/**
 * Employee self check-in
 */
async function myCheckIn(user, payload = {}, req) {
  const employee = await getOrCreateEmployeeForUser(user);
  if (employee.status === 'TERMINATED') {
    throw AppError.forbidden('Terminated employee cannot check in', 'EMPLOYEE_TERMINATED');
  }

  const today = dayStart(new Date());
  const now = new Date();

  let attendance = await Attendance.findOne({ employee: employee._id, date: today });

  if (attendance && attendance.checkIn) {
    if (!attendance.checkOut) {
      throw AppError.conflict('You are already checked in', 'ALREADY_CHECKED_IN');
    }
    throw AppError.conflict(
      'You have already completed attendance for today. Duplicate check-in is not allowed.',
      'ALREADY_CHECKED_IN'
    );
  }

  if (attendance) {
    attendance.status = 'PRESENT';
    attendance.checkIn = now;
    attendance.checkOut = null;
    attendance.workHours = 0;
    attendance.sessions = [{ checkIn: now, checkOut: null, durationHours: 0 }];
    if (payload.notes) attendance.notes = payload.notes;
    attendance.markedBy = user._id;
    await attendance.save();
  } else {
    // First check-in of the day
    attendance = await Attendance.create({
      employee: employee._id,
      date: today,
      status: 'PRESENT',
      checkIn: now,
      checkOut: null,
      workHours: 0,
      sessions: [
        {
          checkIn: now,
          checkOut: null,
          durationHours: 0,
        },
      ],
      notes: payload.notes || '',
      markedBy: user._id,
    });
  }

  await writeAuditLog({
    userId: user._id,
    action: 'EMPLOYEE_SELF_CHECKIN',
    module: 'HR',
    recordId: attendance._id.toString(),
    metadata: { employeeCode: employee.employeeCode, checkInTime: now.toISOString() },
    req,
  });

  return getMyTodayAttendance(user);
}

/**
 * Employee self check-out
 */
async function myCheckOut(user, payload = {}, req) {
  const employee = await getOrCreateEmployeeForUser(user);
  const today = dayStart(new Date());
  const now = new Date();

  const attendance = await Attendance.findOne({ employee: employee._id, date: today });
  if (!attendance || !attendance.checkIn) {
    throw AppError.badRequest('Check out is not allowed before check-in', 'NOT_CHECKED_IN');
  }
  if (attendance.checkOut) {
    throw AppError.conflict('You are already checked out for today', 'ALREADY_CHECKED_OUT');
  }

  attendance.checkOut = now;

  if (!attendance.sessions || attendance.sessions.length === 0) {
    attendance.sessions = [
      {
        checkIn: attendance.checkIn,
        checkOut: now,
        durationHours: calcWorkHours(attendance.checkIn, now),
      },
    ];
  } else {
    const openSession = attendance.sessions.find((s) => !s.checkOut);
    if (openSession) {
      openSession.checkOut = now;
      openSession.durationHours = calcWorkHours(openSession.checkIn, now);
    } else {
      attendance.sessions.push({
        checkIn: attendance.checkIn,
        checkOut: now,
        durationHours: calcWorkHours(attendance.checkIn, now),
      });
    }
  }

  // Sum all sessions accurately
  const totalHours = attendance.sessions.reduce((acc, s) => {
    return acc + (s.durationHours || calcWorkHours(s.checkIn, s.checkOut || now));
  }, 0);

  attendance.workHours = Math.round(totalHours * 100) / 100;
  if (payload.notes) attendance.notes = payload.notes;
  await attendance.save();

  await writeAuditLog({
    userId: user._id,
    action: 'EMPLOYEE_SELF_CHECKOUT',
    module: 'HR',
    recordId: attendance._id.toString(),
    metadata: {
      employeeCode: employee.employeeCode,
      checkOutTime: now.toISOString(),
      workHours: attendance.workHours,
    },
    req,
  });

  return getMyTodayAttendance(user);
}

/**
 * View personal attendance history for the logged-in employee
 */
async function getMyAttendanceHistory(user, query = {}) {
  const employee = await getOrCreateEmployeeForUser(user);
  const { page, limit, skip } = parseListQuery(query);

  const filter = { employee: employee._id };
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = dayStart(query.from);
    if (query.to) {
      const end = dayStart(query.to);
      end.setDate(end.getDate() + 1);
      filter.date.$lt = end;
    }
  }

  const [items, total, allDocs] = await Promise.all([
    Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Attendance.countDocuments(filter),
    Attendance.find(filter),
  ]);

  const totalHours = allDocs.reduce((sum, d) => sum + (d.workHours || 0), 0);
  const presentDays = allDocs.filter((d) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(d.status)).length;
  const avgHours = presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0;

  const enhancedItems = items.map((doc) => {
    const item = doc.toObject();
    return {
      ...item,
      formattedWorkHours: formatDuration(item.workHours),
    };
  });

  return {
    ...buildPagedResult({ items: enhancedItems, total, page, limit }),
    stats: {
      totalDaysRecorded: total,
      presentDays,
      totalHours: Math.round(totalHours * 100) / 100,
      formattedTotalHours: formatDuration(totalHours),
      avgHours,
      formattedAvgHours: formatDuration(avgHours),
    },
  };
}

module.exports = {
  listAttendance,
  markAttendance,
  checkOut,
  getMyTodayAttendance,
  myCheckIn,
  myCheckOut,
  getMyAttendanceHistory,
  getOrCreateEmployeeForUser,
  calcWorkHours,
  formatDuration,
  dayStart,
  derivePunchState,
};
