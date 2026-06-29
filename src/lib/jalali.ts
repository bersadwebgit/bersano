// Jalaali calendar helper functions
// Based on the well-known Jalaali algorithm

export function gregorianToJalali(date: Date): { jy: number; jm: number; jd: number; hour: number; minute: number } {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();

  const jalali = g2j(gy, gm, gd);
  return {
    jy: jalali.jy,
    jm: jalali.jm,
    jd: jalali.jd,
    hour,
    minute,
  };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number, hour = 0, minute = 0): Date {
  const greg = j2g(jy, jm, jd);
  const date = new Date(greg.gy, greg.gm - 1, greg.gd, hour, minute, 0, 0);
  return date;
}

// Math helpers for conversion
function g2j(gy: number, gm: number, gd: number) {
  const g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let jy = gy - 621;
  
  // Check Gregorian leap year
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  if (isLeapG) g_days_in_month[2] = 29;

  let g_day_no = 0;
  for (let i = 1; i < gm; i++) {
    g_day_no += g_days_in_month[i];
  }
  g_day_no += gd;

  let j_day_no;
  let j_np;
  if (g_day_no > 79) {
    const gy2 = gy + 1;
    const isLeapG2 = (gy2 % 4 === 0 && gy2 % 100 !== 0) || gy2 % 400 === 0;
    const leapDays = isLeapG ? 1 : 0;
    j_day_no = g_day_no - (79 + leapDays);
    j_np = 0;
  } else {
    const gy_prev = gy - 1;
    const isLeapGPrev = (gy_prev % 4 === 0 && gy_prev % 100 !== 0) || gy_prev % 400 === 0;
    const leapDays = isLeapGPrev ? 1 : 0;
    j_day_no = g_day_no + 286 + leapDays;
    jy--;
    j_np = 1;
  }

  let jm, jd;
  if (j_day_no <= 186) {
    jm = Math.floor((j_day_no - 1) / 31) + 1;
    jd = j_day_no - (jm - 1) * 31;
  } else {
    const temp = j_day_no - 186;
    jm = Math.floor((temp - 1) / 30) + 7;
    jd = temp - (jm - 7) * 30;
  }

  return { jy, jm, jd };
}

function j2g(jy: number, jm: number, jd: number) {
  let gy = jy + 621;
  let g_day_no;
  let j_day_no = 0;

  if (jm <= 6) {
    j_day_no = (jm - 1) * 31 + jd;
  } else {
    j_day_no = 186 + (jm - 7) * 30 + jd;
  }

  // Check if previous Gregorian year was leap
  const isLeapG = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const leapDays = isLeapG ? 1 : 0;

  let gd, gm;
  if (j_day_no <= 286) {
    g_day_no = j_day_no + 79;
    if (g_day_no > 365 + leapDays) {
      g_day_no -= 365 + leapDays;
      gy++;
    }
  } else {
    g_day_no = j_day_no - 286;
    gy++;
  }

  const g_days_in_month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapGCurrent = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  if (isLeapGCurrent) g_days_in_month[2] = 29;

  let i = 1;
  while (i <= 12 && g_day_no > g_days_in_month[i]) {
    g_day_no -= g_days_in_month[i];
    i++;
  }
  gm = i;
  gd = g_day_no;

  return { gy, gm, gd };
}
