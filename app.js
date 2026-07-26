const form = document.getElementById("allowance-form");
const result = document.getElementById("result");
const resultContent = document.getElementById("result-content");
const STORAGE_KEY = "alawat-form-data";

const fieldIds = [
  "employee-name",
  "job-title",
  "education-level",
  "salary-list-order",
  "allowance-number",
  "allowance-doc-date",
  "from-date",
  "to-date",
  "current-salary",
  "new-salary",
];

const monthNames = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

const fields = [
  {
    id: "employee-name",
    validate: (value) => value.trim().length > 0,
  },
  {
    id: "job-title",
    validate: (value) => value.trim().length > 0,
  },
  {
    id: "education-level",
    validate: (value) => value.trim().length > 0,
  },
  {
    id: "salary-list-order",
    validate: (value) => {
      if (value.trim() === "") return true;
      const number = Number(value);
      return Number.isInteger(number) && number >= 1 && number <= 5000;
    },
  },
  {
    id: "allowance-number",
    validate: (value) => Number(value) >= 1,
  },
  {
    id: "allowance-doc-date",
    validate: (value) => Boolean(value),
  },
  {
    id: "from-date",
    validate: (value) => Boolean(value),
  },
  {
    id: "to-date",
    validate: (value) => Boolean(value),
  },
  {
    id: "current-salary",
    validate: (value) => value !== "" && Number(value) >= 0,
  },
  {
    id: "new-salary",
    validate: (value) => value !== "" && Number(value) >= 0,
  },
];

/**
 * Salary ladder in thousands of dinars (320 means 320,000).
 * Outer index = الدرجة (1-based), inner index = المرحلة (1-based).
 * Columns go المرحلة ١ → ١١, matching the table right → left.
 */
const SALARY_LADDER = [
  [910, 930, 950, 970, 990, 1010, 1030, 1050, 1070, 1090, 1110], // درجة ١
  [723, 740, 757, 774, 791, 808, 825, 842, 859, 876, 893], // درجة ٢
  [600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700], // درجة ٣
  [498, 506, 514, 522, 530, 538, 546, 554, 562, 570, 578], // درجة ٤
  [428, 434, 440, 446, 452, 458, 464, 470, 476, 482, 488], // درجة ٥
  [362, 368, 374, 380, 386, 392, 398, 404, 410, 416, 422], // درجة ٦
  [296, 302, 308, 314, 320, 326, 332, 338, 344, 350, 356], // درجة ٧
  [260, 263, 266, 269, 272, 275, 278, 281, 284, 287, 290], // درجة ٨
  [210, 213, 216, 219, 222, 225, 228, 231, 234, 237, 240], // درجة ٩
  [170, 173, 176, 179, 182, 185, 188, 191, 194, 197, 200], // درجة ١٠
];

function findGradeAndStage(salary) {
  if (!Number.isFinite(salary) || salary <= 0 || salary % 1000 !== 0) {
    return null;
  }

  const thousands = salary / 1000;

  for (let gradeIndex = 0; gradeIndex < SALARY_LADDER.length; gradeIndex += 1) {
    const stageIndex = SALARY_LADDER[gradeIndex].indexOf(thousands);
    if (stageIndex !== -1) {
      return { grade: gradeIndex + 1, stage: stageIndex + 1 };
    }
  }

  return null;
}

function formatGradeAndStage(salary) {
  const match = findGradeAndStage(salary);
  if (!match) return "—";
  return `الدرجة ${formatPlainNumber(match.grade)} · المرحلة ${formatPlainNumber(match.stage)}`;
}

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toEasternDigitString(value) {
  return Math.trunc(Number(value))
    .toString()
    .replace(/\d/g, (digit) => EASTERN_DIGITS[digit]);
}

function toEasternDigits(value) {
  return Math.trunc(Number(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    .replace(/\d/g, (digit) => EASTERN_DIGITS[digit]);
}

function formatNumber(value) {
  return `<bdi class="numeral">${toEasternDigits(value)}</bdi>`;
}

function formatPlainNumber(value) {
  return `<bdi class="numeral">${toEasternDigitString(value)}</bdi>`;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function eqTerm(value, label, { strong = false, meta = "" } = {}) {
  const numberHtml = strong
    ? `<strong>${formatNumber(value)}</strong>`
    : formatNumber(value);
  const metaHtml = meta ? `<span class="eq-meta">${meta}</span>` : "";

  return `
    <span class="eq-term">
      ${numberHtml}
      <span class="eq-label">${label}</span>
      ${metaHtml}
    </span>
  `;
}

function parseDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function monthLabel(year, month) {
  return `${monthNames[month - 1]} ${toEasternDigitString(year)}`;
}

/**
 * Counts whole months from the start month through the month before the end month.
 * The start month always counts in full, regardless of the day.
 * Example: 2026-03-26 → 2026-08-30 = آذار..تموز = 5 months.
 */
function countDifferenceMonths(start, end) {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

function listDifferenceMonths(start, end) {
  const months = [];
  let year = start.year;
  let month = start.month;
  const total = countDifferenceMonths(start, end);

  for (let i = 0; i < total; i += 1) {
    months.push(monthLabel(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return months;
}

function calculateDifferences({ currentSalary, newSalary, fromDate, toDate }) {
  const salaryDifference = newSalary - currentSalary;
  const start = parseDateInput(fromDate);
  const end = parseDateInput(toDate);
  const differenceMonths = countDifferenceMonths(start, end);
  const monthsList = listDifferenceMonths(start, end);
  const differencesTotal = salaryDifference * differenceMonths;
  const grandTotal = differencesTotal + newSalary;

  return {
    currentSalary,
    newSalary,
    salaryDifference,
    start,
    end,
    differenceMonths,
    monthsList,
    differencesTotal,
    grandTotal,
  };
}

function setFieldError(fieldId, hasError) {
  const input = document.getElementById(fieldId);
  const error = document.getElementById(`${fieldId}-error`);
  const field = input.closest(".field");

  field.classList.toggle("has-error", hasError);
  error.hidden = !hasError;
}

function validateForm() {
  let firstInvalid = null;
  let isValid = true;

  for (const field of fields) {
    const input = document.getElementById(field.id);
    const ok = field.validate(input.value);
    setFieldError(field.id, !ok);

    if (!ok) {
      isValid = false;
      if (!firstInvalid) firstInvalid = input;
    }
  }

  const fromDate = document.getElementById("from-date");
  const toDate = document.getElementById("to-date");
  const toDateError = document.getElementById("to-date-error");

  if (fromDate.value && toDate.value) {
    const start = parseDateInput(fromDate.value);
    const end = parseDateInput(toDate.value);
    const monthSpan = countDifferenceMonths(start, end);

    if (
      end.year < start.year ||
      (end.year === start.year && end.month < start.month)
    ) {
      setFieldError("to-date", true);
      toDateError.textContent =
        "تاريخ النهاية يجب أن يكون في شهر البداية أو بعده.";
      isValid = false;
      if (!firstInvalid) firstInvalid = toDate;
    } else if (monthSpan < 1) {
      setFieldError("to-date", true);
      toDateError.textContent =
        "يجب أن يكون تاريخ النهاية في شهر لاحق لشهر البداية.";
      isValid = false;
      if (!firstInvalid) firstInvalid = toDate;
    } else {
      toDateError.textContent = "يرجى إدخال تاريخ النهاية.";
    }
  } else if (toDate.value) {
    toDateError.textContent = "يرجى إدخال تاريخ النهاية.";
  }

  if (firstInvalid) firstInvalid.focus();
  return isValid;
}

function formatDate(dateInput) {
  return `${toEasternDigitString(dateInput.day)} ${monthLabel(dateInput.year, dateInput.month)}`;
}

function todayDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function renderResult(data, info) {
  const monthsText =
    data.monthsList.length > 0 ? data.monthsList.join("، ") : "—";
  const lastDifferenceMonth =
    data.monthsList.length > 0
      ? data.monthsList[data.monthsList.length - 1]
      : monthLabel(data.start.year, data.start.month);

  resultContent.innerHTML = `
    <div class="sheet-header">
      <div class="sheet-header-main">
        <h2 class="sheet-title">احتساب فروقات العلاوة</h2>
      </div>
      <div class="sheet-header-meta">
        <p class="sheet-org">مديرية تقاعد كركوك</p>
        <p class="sheet-date">تاريخ التنظيم: ${formatDate(todayDate())}</p>
      </div>
    </div>

    <div class="sheet-meta">
      <dl class="meta-column meta-employee">
        <div><dt>اسم الموظف</dt><dd>${escapeHtml(info.employeeName)}${
          info.salaryListOrder
            ? ` <span class="meta-secondary">· تسلسل ${formatNumber(info.salaryListOrder)}</span>`
            : ""
        }</dd></div>
        <div><dt>العنوان الوظيفي</dt><dd>${escapeHtml(info.jobTitle)}</dd></div>
        <div><dt>الشهادة</dt><dd>${escapeHtml(info.educationLevel)}</dd></div>
        <div><dt>الدرجة والمرحلة (قبل العلاوة)</dt><dd>${formatGradeAndStage(data.currentSalary)}</dd></div>
      </dl>
      <dl class="meta-column meta-allowance">
        <div><dt>رقم العلاوة (وتاريخها)</dt><dd>${formatPlainNumber(info.allowanceNumber)} <span class="meta-secondary">· ${formatDate(info.allowanceDocDate)}</span></dd></div>
        <div><dt>اعتباراً من</dt><dd>${formatDate(data.start)}</dd></div>
        <div><dt>لغاية</dt><dd>${formatDate(data.end)}</dd></div>
        <div><dt>الدرجة والمرحلة (بعد العلاوة)</dt><dd>${formatGradeAndStage(data.newSalary)}</dd></div>
      </dl>
    </div>

    <ol class="steps">
      <li>
        <span class="step-badge"><span class="step-num">١</span>احتساب مقدار العلاوة</span>
        <div class="step-body">
          <div class="equation">
            ${eqTerm(data.newSalary, "الراتب بعد العلاوة")}
            <span class="eq-op">−</span>
            ${eqTerm(data.currentSalary, "الراتب قبل العلاوة")}
            <span class="eq-op">=</span>
            ${eqTerm(data.salaryDifference, "مقدار العلاوة", { strong: true })}
          </div>
        </div>
      </li>
      <li>
        <span class="step-badge"><span class="step-num">٢</span>احتساب عدد اشهر الفروقات</span>
        <div class="step-body">
          <p>
            من <strong>${monthLabel(data.start.year, data.start.month)}</strong>
            لغاية
            <strong>${lastDifferenceMonth}</strong>
            = <strong>${formatNumber(data.differenceMonths)}</strong> أشهر
          </p>
          <p class="months-list">${monthsText}</p>
        </div>
      </li>
      <li>
        <span class="step-badge"><span class="step-num">٣</span>احتساب مجموع الفروقات للاشهر السابقة</span>
        <div class="step-body">
          <div class="equation">
            ${eqTerm(data.salaryDifference, "مقدار العلاوة")}
            <span class="eq-op">×</span>
            ${eqTerm(data.differenceMonths, "عدد الأشهر")}
            <span class="eq-op">=</span>
            ${eqTerm(data.differencesTotal, "مجموع الفروقات", { strong: true })}
          </div>
        </div>
      </li>
      <li>
        <span class="step-badge"><span class="step-num">٤</span>احتساب الراتب الاسمي الجديد مع الفروقات</span>
        <div class="step-body">
          <div class="equation">
            ${eqTerm(data.differencesTotal, "مجموع الفروقات")}
            <span class="eq-op">+</span>
            ${eqTerm(data.newSalary, "الراتب بعد العلاوة")}
            <span class="eq-op">=</span>
            ${eqTerm(data.grandTotal, "المبلغ النهائي", { strong: true })}
          </div>
        </div>
      </li>
    </ol>

    <div class="total">
      <span>الراتب الاسمي مع الفروقات اعتباراً من ${formatDate(data.start)} ولغاية ${formatDate(data.end)}</span>
      <strong>${formatNumber(data.grandTotal)} دينار</strong>
    </div>
  `;
}

function readFormData() {
  const data = {};
  for (const id of fieldIds) {
    data[id] = document.getElementById(id).value;
  }
  return data;
}

function saveFormData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormData()));
}

function loadFormData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    for (const id of fieldIds) {
      if (data[id] !== undefined && data[id] !== null) {
        document.getElementById(id).value = data[id];
      }
    }
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }
}

function clearSavedFormData() {
  localStorage.removeItem(STORAGE_KEY);
}

function clearFormErrors() {
  for (const field of fields) {
    setFieldError(field.id, false);
  }
  document.getElementById("to-date-error").textContent =
    "يرجى إدخال تاريخ النهاية.";
}

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove("toast-out");
  toast.classList.add("toast-in");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("toast-in");
    toast.classList.add("toast-out");
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
      toast.classList.remove("toast-out");
    }, 280);
  }, 3200);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) {
    result.hidden = true;
    return;
  }

  const currentSalary = Number(document.getElementById("current-salary").value);
  const newSalary = Number(document.getElementById("new-salary").value);

  if (newSalary < currentSalary) {
    showToast("الراتب بعد العلاوة أقل من الراتب قبل العلاوة. يرجى المراجعة.");
    result.hidden = true;
    return;
  }

  saveFormData();

  const info = {
    employeeName: document.getElementById("employee-name").value.trim(),
    jobTitle: document.getElementById("job-title").value.trim(),
    educationLevel: document.getElementById("education-level").value,
    salaryListOrder: document.getElementById("salary-list-order").value.trim(),
    allowanceNumber: document.getElementById("allowance-number").value,
    allowanceDocDate: parseDateInput(
      document.getElementById("allowance-doc-date").value,
    ),
  };
  const calculation = calculateDifferences({
    currentSalary,
    newSalary,
    fromDate: document.getElementById("from-date").value,
    toDate: document.getElementById("to-date").value,
  });

  renderResult(calculation, info);
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.getElementById("print-btn").addEventListener("click", () => {
  window.print();
});

document.querySelector(".clear-fab").addEventListener("click", (event) => {
  if (!window.confirm("هل أنت متأكد من تفريغ جميع الحقول؟")) {
    event.preventDefault();
  }
});

form.addEventListener("reset", () => {
  clearSavedFormData();
  result.hidden = true;
  resultContent.innerHTML = "";

  window.requestAnimationFrame(() => {
    clearFormErrors();
    document.getElementById("employee-name").focus();
  });
});

fields.forEach(({ id }) => {
  const input = document.getElementById(id);
  const persist = () => {
    setFieldError(id, false);
    saveFormData();
  };
  input.addEventListener("input", persist);
  input.addEventListener("change", persist);
});

loadFormData();
