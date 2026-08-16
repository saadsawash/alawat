const form = document.getElementById("allowance-form");
const result = document.getElementById("result");
const resultContent = document.getElementById("result-content");
const allowancesList = document.getElementById("allowances-list");
const addAllowanceBtn = document.getElementById("add-allowance");
const STORAGE_KEY = "alawat-form-data-v2";
const MAX_ALLOWANCES = 10;

const staticFieldIds = [
  "employee-name",
  "job-title",
  "education-level",
  "salary-list-order",
  "allowance-number",
  "allowance-doc-date",
];

const staticFields = [
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
    validate: (value) => Boolean(parseDateInput(value)),
  },
];

/** @type {{ currentSalary: string, newSalary: string, fromDate: string, toDate: string }[]} */
let allowances = [{ currentSalary: "", newSalary: "", fromDate: "", toDate: "" }];

function emptyAllowance() {
  return { currentSalary: "", newSalary: "", fromDate: "", toDate: "" };
}

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

/**
 * Salary ladder in full dinars.
 * Outer index = الدرجة (1-based), inner index = المرحلة (1-based).
 */
const SALARY_LADDER = [
  [910000, 930000, 950000, 970000, 990000, 1010000, 1030000, 1050000, 1070000, 1090000, 1110000],
  [723000, 740000, 757000, 774000, 791000, 808000, 825000, 842000, 859000, 876000, 893000],
  [600000, 610000, 620000, 630000, 640000, 650000, 660000, 670000, 680000, 690000, 700000],
  [509000, 517000, 525000, 533000, 541000, 549000, 557000, 565000, 573000, 581000, 589000],
  [429000, 435000, 441000, 447000, 453000, 459000, 465000, 471000, 477000, 483000, 489000],
  [362000, 368000, 374000, 380000, 386000, 392000, 398000, 404000, 410000, 416000, 422000],
  [296000, 302000, 308000, 314000, 320000, 326000, 332000, 338000, 344000, 350000, 356000],
  [260000, 263000, 266000, 269000, 272000, 275000, 278000, 281000, 284000, 287000, 290000],
  [210000, 213000, 216000, 219000, 222000, 225000, 228000, 231000, 234000, 237000, 240000],
  [170000, 173000, 176000, 179000, 182000, 185000, 188000, 191000, 194000, 197000, 200000],
];

const SALARY_LADDER_LOOKUP = new Map();

for (let gradeIndex = 0; gradeIndex < SALARY_LADDER.length; gradeIndex += 1) {
  for (let levelIndex = 0; levelIndex < SALARY_LADDER[gradeIndex].length; levelIndex += 1) {
    SALARY_LADDER_LOOKUP.set(SALARY_LADDER[gradeIndex][levelIndex], {
      grade: gradeIndex + 1,
      level: levelIndex + 1,
    });
  }
}

function findGradeAndLevel(salary) {
  if (!Number.isFinite(salary) || salary <= 0) {
    return null;
  }

  return SALARY_LADDER_LOOKUP.get(Math.trunc(salary)) ?? null;
}

function formatGradeAndLevel(salary) {
  const match = findGradeAndLevel(salary);
  if (!match) return "—";
  return `الدرجة ${formatPlainNumber(match.grade)} · المرحلة ${formatPlainNumber(match.level)}`;
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
  if (!value || typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(EASTERN_DIGITS.indexOf(digit)))
    .replace(/\//g, "-");
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function monthLabel(year, month) {
  return `${monthNames[month - 1]} ${toEasternDigitString(year)}`;
}

function formatNumericDate(dateInput) {
  const raw = `${dateInput.year}/${String(dateInput.month).padStart(2, "0")}/${String(dateInput.day).padStart(2, "0")}`;
  return raw.replace(/\d/g, (digit) => EASTERN_DIGITS[digit]);
}

/**
 * Counts whole months from the start month through the month before the end month.
 * The end month is not included here because the final step adds the new salary once.
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

  return {
    currentSalary,
    newSalary,
    salaryDifference,
    start,
    end,
    differenceMonths,
    monthsList,
    differencesTotal,
  };
}

function setFieldError(inputOrId, hasError, errorId) {
  const input =
    typeof inputOrId === "string"
      ? document.getElementById(inputOrId)
      : inputOrId;
  if (!input) return;

  const error = errorId
    ? document.getElementById(errorId)
    : document.getElementById(`${input.id}-error`);
  const field = input.closest(".field");

  if (field) field.classList.toggle("has-error", hasError);
  if (error) error.hidden = !hasError;
}

function syncAllowancesFromDom() {
  const rows = [...allowancesList.querySelectorAll(".allowance-row")];
  allowances = rows.map((row) => ({
    currentSalary: row.querySelector('[data-field="currentSalary"]').value,
    newSalary: row.querySelector('[data-field="newSalary"]').value,
    fromDate: row.querySelector('[data-field="fromDate"]').value,
    toDate: row.querySelector('[data-field="toDate"]').value,
  }));
}

function allowanceTitle(index) {
  return `العلاوة ${toEasternDigitString(index + 1)}`;
}

function createAllowanceRow(index, data, { focusSalary = false } = {}) {
  const row = document.createElement("div");
  row.className = "allowance-row";
  row.dataset.index = String(index);

  const canRemove = index > 0;
  const removeHtml = canRemove
    ? `<button type="button" class="allowance-remove" aria-label="إزالة ${allowanceTitle(index)}">إزالة</button>`
    : `<span class="allowance-remove-spacer" aria-hidden="true"></span>`;

  row.innerHTML = `
    <div class="allowance-row-head">
      <h3 class="allowance-row-title">${allowanceTitle(index)}</h3>
      ${removeHtml}
    </div>
    <div class="allowance-row-fields">
      <div class="field">
        <label for="allowance-${index}-current">الراتب قبل العلاوة</label>
        <div class="input-with-suffix">
          <input
            type="number"
            id="allowance-${index}-current"
            data-field="currentSalary"
            min="0"
            step="1"
            inputmode="numeric"
            placeholder="0"
            value="${escapeHtml(data.currentSalary)}"
            required
          />
          <span class="suffix">دينار</span>
        </div>
        <p class="error" id="allowance-${index}-current-error" hidden>
          يرجى إدخال الراتب قبل العلاوة.
        </p>
      </div>
      <div class="field">
        <label for="allowance-${index}-salary">الراتب بعد العلاوة</label>
        <div class="input-with-suffix">
          <input
            type="number"
            id="allowance-${index}-salary"
            data-field="newSalary"
            min="0"
            step="1"
            inputmode="numeric"
            placeholder="0"
            value="${escapeHtml(data.newSalary)}"
            required
          />
          <span class="suffix">دينار</span>
        </div>
        <p class="error" id="allowance-${index}-salary-error" hidden>
          يرجى إدخال الراتب بعد العلاوة.
        </p>
      </div>
      <div class="field">
        <label for="allowance-${index}-from">اعتباراً من</label>
        <input
          type="text"
          id="allowance-${index}-from"
          data-field="fromDate"
          class="date-input"
          inputmode="numeric"
          placeholder="2026-01-01"
          autocomplete="off"
          dir="ltr"
          value="${escapeHtml(data.fromDate)}"
          required
        />
        <p class="error" id="allowance-${index}-from-error" hidden>
          يرجى إدخال تاريخ صحيح مثل 2026-01-01.
        </p>
      </div>
      <div class="field">
        <label for="allowance-${index}-to">لغاية</label>
        <input
          type="text"
          id="allowance-${index}-to"
          data-field="toDate"
          class="date-input"
          inputmode="numeric"
          placeholder="2026-02-30"
          autocomplete="off"
          dir="ltr"
          value="${escapeHtml(data.toDate)}"
          required
        />
        <p class="error" id="allowance-${index}-to-error" hidden>
          يرجى إدخال تاريخ صحيح مثل 2026-02-30.
        </p>
      </div>
    </div>
  `;

  row.querySelectorAll("input").forEach((input) => {
    const persist = () => {
      setFieldError(input, false, `${input.id}-error`);
      syncAllowancesFromDom();
      saveFormData();
    };
    input.addEventListener("input", persist);
    input.addEventListener("change", persist);
  });

  const removeBtn = row.querySelector(".allowance-remove");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      syncAllowancesFromDom();
      allowances.splice(index, 1);
      if (allowances.length === 0) {
        allowances = [emptyAllowance()];
      }
      renderAllowancesList();
      saveFormData();
    });
  }

  allowancesList.appendChild(row);

  if (focusSalary) {
    row.querySelector('[data-field="currentSalary"]').focus();
  }
}

function renderAllowancesList({ focusIndex = null } = {}) {
  allowancesList.innerHTML = "";
  allowances.forEach((item, index) => {
    createAllowanceRow(index, item, { focusSalary: focusIndex === index });
  });
  addAllowanceBtn.disabled = allowances.length >= MAX_ALLOWANCES;
}

function validateDateRangeInputs(fromInput, toInput, toError) {
  let isValid = true;
  let firstInvalid = null;

  const start = parseDateInput(fromInput.value);
  const end = parseDateInput(toInput.value);

  if (start && end) {
    const monthSpan = countDifferenceMonths(start, end);

    if (
      end.year < start.year ||
      (end.year === start.year && end.month < start.month)
    ) {
      setFieldError(toInput, true, toError.id);
      toError.textContent =
        "تاريخ النهاية يجب أن يكون في شهر البداية أو بعده.";
      isValid = false;
      firstInvalid = toInput;
    } else if (monthSpan < 1) {
      setFieldError(toInput, true, toError.id);
      toError.textContent =
        "يجب أن يكون تاريخ النهاية في شهر لاحق لشهر البداية.";
      isValid = false;
      firstInvalid = toInput;
    } else {
      toError.textContent = "يرجى إدخال تاريخ صحيح مثل 2026-02-30.";
    }
  } else if (toInput.value) {
    toError.textContent = "يرجى إدخال تاريخ صحيح مثل 2026-02-30.";
  }

  return { isValid, firstInvalid };
}

function validateForm() {
  let firstInvalid = null;
  let isValid = true;

  for (const field of staticFields) {
    const input = document.getElementById(field.id);
    const ok = field.validate(input.value);
    setFieldError(field.id, !ok);

    if (!ok) {
      isValid = false;
      if (!firstInvalid) firstInvalid = input;
    }
  }

  syncAllowancesFromDom();
  const rows = [...allowancesList.querySelectorAll(".allowance-row")];

  rows.forEach((row) => {
    const currentInput = row.querySelector('[data-field="currentSalary"]');
    const salaryInput = row.querySelector('[data-field="newSalary"]');
    const fromInput = row.querySelector('[data-field="fromDate"]');
    const toInput = row.querySelector('[data-field="toDate"]');
    const currentError = row.querySelector(`#${currentInput.id}-error`);
    const salaryError = row.querySelector(`#${salaryInput.id}-error`);
    const fromError = row.querySelector(`#${fromInput.id}-error`);
    const toError = row.querySelector(`#${toInput.id}-error`);

    const currentOk =
      currentInput.value !== "" && Number(currentInput.value) >= 0;
    setFieldError(currentInput, !currentOk, currentError.id);
    if (!currentOk) {
      isValid = false;
      if (!firstInvalid) firstInvalid = currentInput;
    }

    const salaryOk = salaryInput.value !== "" && Number(salaryInput.value) >= 0;
    setFieldError(salaryInput, !salaryOk, salaryError.id);
    if (!salaryOk) {
      isValid = false;
      if (!firstInvalid) firstInvalid = salaryInput;
    }

    if (currentOk && salaryOk && Number(salaryInput.value) < Number(currentInput.value)) {
      setFieldError(salaryInput, true, salaryError.id);
      salaryError.textContent =
        "الراتب بعد العلاوة يجب أن يكون أكبر من أو يساوي الراتب قبلها.";
      isValid = false;
      if (!firstInvalid) firstInvalid = salaryInput;
    } else if (salaryOk) {
      salaryError.textContent = "يرجى إدخال الراتب بعد العلاوة.";
    }

    const fromOk = Boolean(parseDateInput(fromInput.value));
    setFieldError(fromInput, !fromOk, fromError.id);
    if (!fromOk) {
      isValid = false;
      if (!firstInvalid) firstInvalid = fromInput;
    }

    const toOk = Boolean(parseDateInput(toInput.value));
    setFieldError(toInput, !toOk, toError.id);
    if (!toOk) {
      isValid = false;
      if (!firstInvalid) firstInvalid = toInput;
    }

    if (fromOk && toOk) {
      const range = validateDateRangeInputs(fromInput, toInput, toError);
      if (!range.isValid) {
        isValid = false;
        if (!firstInvalid) firstInvalid = range.firstInvalid;
      }
    }
  });

  if (firstInvalid) firstInvalid.focus();
  return isValid;
}

function todayDate() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function renderAllowanceSteps(data, { includeFinal = false, finalSalary = null } = {}) {
  const monthsText =
    data.monthsList.length > 0 ? data.monthsList.join("، ") : "—";
  const lastDifferenceMonth =
    data.monthsList.length > 0
      ? data.monthsList[data.monthsList.length - 1]
      : monthLabel(data.start.year, data.start.month);

  const finalStep =
    includeFinal && finalSalary !== null
      ? `
      <li>
        <span class="step-badge"><span class="step-num">${toEasternDigitString(4)}</span>احتساب الراتب الاسمي الجديد مع الفروقات</span>
        <div class="step-body">
          <div class="equation">
            ${eqTerm(data.differencesTotal, "مجموع الفروقات")}
            <span class="eq-op">+</span>
            ${eqTerm(finalSalary, "الراتب بعد العلاوة")}
            <span class="eq-op">=</span>
            ${eqTerm(data.differencesTotal + finalSalary, "المبلغ النهائي", { strong: true })}
          </div>
        </div>
      </li>
    `
      : "";

  return `
    <ol class="steps">
      <li>
        <span class="step-badge"><span class="step-num">${toEasternDigitString(1)}</span>احتساب مقدار العلاوة</span>
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
        <span class="step-badge"><span class="step-num">${toEasternDigitString(2)}</span>احتساب عدد اشهر الفروقات</span>
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
        <span class="step-badge"><span class="step-num">${toEasternDigitString(3)}</span>احتساب مجموع الفروقات للاشهر السابقة</span>
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
      ${finalStep}
    </ol>
  `;
}

function renderAllowanceBlock(title, data) {
  return `
    <section class="allowance-block">
      <h3 class="allowance-block-title">${title}</h3>
      ${renderAllowanceSteps(data)}
    </section>
  `;
}

function renderPeriodRow(label, start, end, beforeSalary, afterSalary) {
  const labelHtml = label
    ? `<span class="period-label">${label}</span>`
    : "";

  return `
    <div class="period-row">
      ${labelHtml}
      <p class="period-range">
        <span class="period-k">الفترة</span>
        <span class="period-v">
          ${formatNumericDate(start)}
          <span class="period-sep">إلى</span>
          ${formatNumericDate(end)}
        </span>
      </p>
      <p class="period-grades">
        <span class="period-k">الدرجة والمرحلة</span>
        <span class="period-v">
          ${formatGradeAndLevel(beforeSalary)}
          <span class="period-sep">إلى</span>
          ${formatGradeAndLevel(afterSalary)}
        </span>
      </p>
    </div>
  `;
}

function renderResult(calculations, info) {
  const finalSalary = calculations[calculations.length - 1].newSalary;
  const combinedDifferences = calculations.reduce(
    (sum, item) => sum + item.differencesTotal,
    0,
  );
  const grandTotal = combinedDifferences + finalSalary;
  const multi = calculations.length > 1;

  const periodsHtml = calculations
    .map((item, index) =>
      renderPeriodRow(
        multi ? allowanceTitle(index) : "",
        item.start,
        item.end,
        item.currentSalary,
        item.newSalary,
      ),
    )
    .join("");

  let stepsHtml;
  if (!multi) {
    stepsHtml = renderAllowanceSteps(calculations[0], {
      includeFinal: true,
      finalSalary: calculations[0].newSalary,
    });
  } else {
    const blocks = calculations
      .map((item, index) => renderAllowanceBlock(allowanceTitle(index), item))
      .join("");

    const sumTerms = calculations
      .map(
        (item, index) =>
          `${index > 0 ? '<span class="eq-op">+</span>' : ""}${eqTerm(item.differencesTotal, `فروقات ${allowanceTitle(index)}`)}`,
      )
      .join("");

    stepsHtml = `
      ${blocks}
      <section class="allowance-block allowance-block--combined">
        <h3 class="allowance-block-title">الإجمالي</h3>
        <div class="equation equation--total">
          ${sumTerms}
          <span class="eq-op">+</span>
          ${eqTerm(finalSalary, "الراتب بعد آخر علاوة")}
          <span class="eq-op">=</span>
          ${eqTerm(grandTotal, "المبلغ النهائي", { strong: true })}
        </div>
      </section>
    `;
  }

  const sequenceHtml = info.salaryListOrder
    ? `<span class="summary-chip">تسلسل ${formatNumber(info.salaryListOrder)}</span>`
    : "";

  resultContent.innerHTML = `
    <div class="sheet-header">
      <div class="sheet-header-main">
        <h2 class="sheet-title">احتساب فروقات العلاوة</h2>
      </div>
      <div class="sheet-header-meta">
        <p class="sheet-org">مديرية تقاعد كركوك</p>
        <p class="sheet-date">تاريخ التنظيم: ${formatNumericDate(todayDate())}</p>
      </div>
    </div>

    <section class="sheet-summary">
      <div class="summary-identity">
        <div class="summary-name-row">
          <h3 class="summary-name">${escapeHtml(info.employeeName)}</h3>
          ${sequenceHtml}
        </div>
        <p class="summary-facts">
          <span>${escapeHtml(info.jobTitle)}</span>
          <span class="summary-dot" aria-hidden="true">·</span>
          <span>${escapeHtml(info.educationLevel)}</span>
        </p>
        <p class="summary-facts summary-doc">
          <span>علاوة رقم ${formatPlainNumber(info.allowanceNumber)}</span>
          <span class="summary-dot" aria-hidden="true">·</span>
          <span>${formatNumericDate(info.allowanceDocDate)}</span>
        </p>
      </div>

      <div class="summary-periods" aria-label="فترات الاحتساب">
        ${periodsHtml}
      </div>
    </section>

    <div class="result-calculations">
      ${stepsHtml}
    </div>

    <div class="total">
      <span>الراتب الاسمي مع الفروقات</span>
      <strong>${formatNumber(grandTotal)} دينار</strong>
    </div>
  `;
}

function readFormData() {
  syncAllowancesFromDom();
  const data = {};
  for (const id of staticFieldIds) {
    data[id] = document.getElementById(id).value;
  }
  data.allowances = allowances;
  return data;
}

function saveFormData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(readFormData()));
}

function migrateLegacyFormData(data) {
  if (Array.isArray(data.allowances) && data.allowances.length > 0) {
    const legacyBase = data["base-salary"] ?? data["current-salary"] ?? "";
    const migratedAllowances = data.allowances.map((item, index, list) => {
      let currentSalary = item.currentSalary ?? "";
      if (currentSalary === "" || currentSalary === undefined || currentSalary === null) {
        if (index === 0) {
          currentSalary = legacyBase || "";
        } else {
          currentSalary = list[index - 1]?.newSalary || "";
        }
      }
      return {
        currentSalary: currentSalary === undefined || currentSalary === null ? "" : String(currentSalary),
        newSalary: item.newSalary || "",
        fromDate: item.fromDate || "",
        toDate: item.toDate || "",
      };
    });
    return { ...data, allowances: migratedAllowances };
  }

  const migrated = { ...data };
  const firstCurrent =
    data["base-salary"] || data["current-salary"] || "";

  const first = {
    currentSalary: firstCurrent,
    newSalary: data["new-salary"] || "",
    fromDate: data["from-date"] || "",
    toDate: data["to-date"] || "",
  };

  migrated.allowances = [first];

  if (
    data.secondAllowanceEnabled &&
    (data["second-new-salary"] || data["second-from-date"] || data["second-to-date"])
  ) {
    migrated.allowances.push({
      currentSalary: data["second-current-salary"] || first.newSalary || "",
      newSalary: data["second-new-salary"] || "",
      fromDate: data["second-from-date"] || "",
      toDate: data["second-to-date"] || "",
    });
  }

  return migrated;
}

function loadFormData() {
  const raw =
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem("alawat-form-data");
  if (!raw) {
    renderAllowancesList();
    return false;
  }

  try {
    const data = migrateLegacyFormData(JSON.parse(raw));
    for (const id of staticFieldIds) {
      if (data[id] !== undefined && data[id] !== null) {
        const el = document.getElementById(id);
        if (el) el.value = data[id];
      }
    }

    allowances =
      Array.isArray(data.allowances) && data.allowances.length > 0
        ? data.allowances.map((item) => ({
            currentSalary: item.currentSalary || "",
            newSalary: item.newSalary || "",
            fromDate: item.fromDate || "",
            toDate: item.toDate || "",
          }))
        : [emptyAllowance()];

    renderAllowancesList();
    saveFormData();
    return true;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    renderAllowancesList();
    return false;
  }
}

function clearSavedFormData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("alawat-form-data");
}

function clearFormErrors() {
  for (const field of staticFields) {
    setFieldError(field.id, false);
  }

  allowancesList.querySelectorAll("input").forEach((input) => {
    setFieldError(input, false, `${input.id}-error`);
  });
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

addAllowanceBtn.addEventListener("click", () => {
  if (allowances.length >= MAX_ALLOWANCES) return;
  syncAllowancesFromDom();
  allowances.push(emptyAllowance());
  renderAllowancesList({ focusIndex: allowances.length - 1 });
  saveFormData();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validateForm()) {
    result.hidden = true;
    return;
  }

  syncAllowancesFromDom();
  const chain = [];

  for (let i = 0; i < allowances.length; i += 1) {
    const item = allowances[i];
    const currentSalary = Number(item.currentSalary);
    const newSalary = Number(item.newSalary);

    if (newSalary < currentSalary) {
      showToast(
        `الراتب بعد ${allowanceTitle(i)} أقل من الراتب قبلها. يرجى المراجعة.`,
      );
      result.hidden = true;
      return;
    }

    chain.push(
      calculateDifferences({
        currentSalary,
        newSalary,
        fromDate: item.fromDate,
        toDate: item.toDate,
      }),
    );
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

  renderResult(chain, info);
  result.hidden = false;
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.getElementById("print-btn").addEventListener("click", () => {
  updatePrintContinuationNotice();
  window.print();
});

window.addEventListener("beforeprint", updatePrintContinuationNotice);
window.addEventListener("afterprint", () => {
  const notice = document.getElementById("print-continuation");
  if (notice) notice.hidden = true;
  document.body.classList.remove("has-print-continuation");
});

function updatePrintContinuationNotice() {
  const content = document.getElementById("result-content");
  const notice = document.getElementById("print-continuation");
  if (!content || !notice || result.hidden) {
    if (notice) notice.hidden = true;
    document.body.classList.remove("has-print-continuation");
    return;
  }

  const pageContentHeightPx = ((297 - 9 - 9) / 25.4) * 96;
  const needsContinuation = content.scrollHeight > pageContentHeightPx - 12;

  notice.hidden = !needsContinuation;
  document.body.classList.toggle("has-print-continuation", needsContinuation);
}

document.querySelector(".clear-fab").addEventListener("click", (event) => {
  if (!window.confirm("هل أنت متأكد من تفريغ جميع الحقول؟")) {
    event.preventDefault();
  }
});

form.addEventListener("reset", () => {
  clearSavedFormData();
  result.hidden = true;
  resultContent.innerHTML = "";
  allowances = [emptyAllowance()];

  window.requestAnimationFrame(() => {
    renderAllowancesList();
    clearFormErrors();
    document.getElementById("employee-name").focus();
  });
});

staticFields.forEach(({ id }) => {
  const input = document.getElementById(id);
  const persist = () => {
    setFieldError(id, false);
    saveFormData();
  };
  input.addEventListener("input", persist);
  input.addEventListener("change", persist);
});

loadFormData();
