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

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const WESTERN_FROM_EASTERN = Object.fromEntries(
  [...EASTERN_DIGITS].map((digit, index) => [digit, String(index)]),
);

function toEasternDigitString(value) {
  return Math.trunc(Number(value))
    .toString()
    .replace(/\d/g, (digit) => EASTERN_DIGITS[digit]);
}

function formatFullSalary(value) {
  return Math.trunc(Number(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function findGradeAndLevel(salary) {
  if (!Number.isFinite(salary) || salary <= 0) {
    return null;
  }

  return SALARY_LADDER_LOOKUP.get(Math.trunc(salary)) ?? null;
}

const input = document.getElementById("salary-thousands");
const gradeValue = document.getElementById("grade-value");
const levelValue = document.getElementById("level-value");
const lookupStatus = document.getElementById("lookup-status");
const lookupResult = document.getElementById("lookup-result");

/** Digits the user typed as thousands (e.g. "380"). */
let thousandsDigits = "";

function resetResult() {
  gradeValue.textContent = "—";
  levelValue.textContent = "—";
  lookupStatus.hidden = true;
  lookupStatus.textContent = "";
  lookupResult.classList.remove("lookup-result--matched", "lookup-result--miss");
}

function updateResult(fullSalary) {
  if (!thousandsDigits) {
    resetResult();
    return;
  }

  const match = findGradeAndLevel(fullSalary);

  if (!match) {
    gradeValue.textContent = "—";
    levelValue.textContent = "—";
    lookupStatus.hidden = false;
    lookupStatus.textContent = "لا توجد درجة ومرحلة مطابقة لهذا الراتب.";
    lookupResult.classList.remove("lookup-result--matched");
    lookupResult.classList.add("lookup-result--miss");
    return;
  }

  gradeValue.innerHTML = `<bdi class="numeral">${toEasternDigitString(match.grade)}</bdi>`;
  levelValue.innerHTML = `<bdi class="numeral">${toEasternDigitString(match.level)}</bdi>`;
  lookupStatus.hidden = true;
  lookupStatus.textContent = "";
  lookupResult.classList.add("lookup-result--matched");
  lookupResult.classList.remove("lookup-result--miss");
}

function renderField() {
  if (!thousandsDigits) {
    input.value = "";
    resetResult();
    return;
  }

  const fullSalary = Number(thousandsDigits) * 1000;
  input.value = formatFullSalary(fullSalary);
  updateResult(fullSalary);
}

function normalizeDigitChar(char) {
  if (/\d/.test(char)) return char;
  return WESTERN_FROM_EASTERN[char] ?? null;
}

input.addEventListener("beforeinput", (event) => {
  const type = event.inputType;

  if (type === "insertText" || type === "insertCompositionText") {
    event.preventDefault();
    const digits = [...(event.data || "")]
      .map(normalizeDigitChar)
      .filter(Boolean)
      .join("");
    if (!digits) return;
    thousandsDigits = `${thousandsDigits}${digits}`.replace(/^0+/, "") || "";
    if (thousandsDigits.length > 5) {
      thousandsDigits = thousandsDigits.slice(0, 5);
    }
    renderField();
    return;
  }

  if (type === "insertFromPaste") {
    event.preventDefault();
    const digits = [...(event.data || "")]
      .map(normalizeDigitChar)
      .filter(Boolean)
      .join("")
      .replace(/^0+/, "");
    thousandsDigits = digits.slice(0, 5);
    renderField();
    return;
  }

  if (
    type === "deleteContentBackward" ||
    type === "deleteContentForward" ||
    type === "deleteByCut" ||
    type === "deleteByDrag"
  ) {
    event.preventDefault();
    thousandsDigits = thousandsDigits.slice(0, -1);
    renderField();
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key !== "Backspace" && event.key !== "Delete") return;
  // Some browsers skip beforeinput for these; keep state in sync.
  if (event.defaultPrevented) return;
});
