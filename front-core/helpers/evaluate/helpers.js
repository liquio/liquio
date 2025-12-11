const helpers = {
  date: {
    dayOfBirthFromIpn: {},
    monthOfBirthFromIpn: {},
    yearOfBirthFromIpn: {},
    isDateNotBiggerCurrent: {},
    isCorrectDayOfMonth: {},
    isDaysCountInMonthCorrect: {},
    is29thNumberInLeapYear: {},
    isPersonHasNeededAge: {},
    isDateNotLargerCurrent: {},
    isDateNotLess1stJanuaryYear: {},
    inDotFormat: {},
    inHyphenFormat: {},
    fromDotsToHyphen: {},
    fromHyphenToDots: {},
  },
  string: {
    isUkrainianLettersOnlyAndSomeSymbolsEqual: {},
    isUkrainianLettersNumbersPunctuationMarksOnlyAndSomeSymbolsCountNotLess: {},
    isUkrainianLettersNumbersQuotesHyphenGapOnly: {},
    isNotMoreOneHyphenOrSpaceInRow: {},
  },
};

helpers.date.dayOfBirthFromIpn = `((ipn) => {
  const first5Numbers = Number(ipn.slice(0, 5));
  const dateOfBirth = new Date(1899, 11, 31 + first5Numbers);
  return String(dateOfBirthDate());
})(ipn)`;

helpers.date.monthOfBirthFromIpn = `((ipn) => {
  const first5Numbers = Number(ipn.slice(0, 5));
  const dateOfBirth = new Date(1899, 11, 31 + first5Numbers);
  const monthOfBirth = dateOfBirthMonth() + 1;
  return (monthOfBirth >= 10) ? String(monthOfBirth) : String('0' + monthOfBirth);
})(ipn)`;

helpers.date.yearOfBirthFromIpn = `((ipn) => {
  const first5Numbers = Number(ipn.slice(0, 5));
  const dateOfBirth = new Date(1899, 11, 31 + first5Numbers);
  return String(dateOfBirthFullYear());
})(ipn)`;

helpers.date.isDateNotBiggerCurrent = `(({
  day,
  month,
  year
}) => {
  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);
  return ((dayNum && monthNum && yearNum) && (new Date(yearNum, monthNum - 1, dayNum) < Date.now()))
})({
  day,
  month,
  year
})`;

helpers.date.isCorrectDayOfMonth = `(({
  day
}) => {
  const dayNum = Number(day);
  return !(!dayNum || dayNum < 1 || dayNum > 31 || isNaN(dayNum))
})({
  day
})`;

helpers.date.isDaysCountInMonthCorrect = `(({
  day,
  month
}) => {
  const monthNum = Number(month);
  const _29daysMonth = [2];
  const _31daysMonth = [1, 3, 5, 7, 8, 10, 12];
  let countDaysInMonth = 30;
  if (_29daysMonth.includes(monthNum)) countDaysInMonth = 29;
  if (_31daysMonth.includes(monthNum)) countDaysInMonth = 31;
  return (Number(day) <= countDaysInMonth)
})({
  day,
  month
})`;

helpers.date.is29thNumberInLeapYear = `(({
  day,
  month,
  year
}) => {
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  return !(dayNum === 29 && monthNum === 2 && yearNum % 4 !== 0);
})({
  day,
  month,
  year
})`;

helpers.date.isPersonHasNeededAge = `(({
  day,
  month,
  year,
  personAge
}) => {
  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  return ((new Date(yearNum, monthNum - 1, dayNum) <= Date.now()) && new Date(yearNum + personAge, monthNum - 1, dayNum) <= Date.now())
})({
  day,
  month,
  year,
  personAge
})`;

helpers.date.isDateNotLargerCurrent = `(({
  day,
  month,
  year
}) => {
  const issueDate = new Date(year, Number(month) - 1, day)Time();
  const today = new Date()Time();
  return issueDate && (issueDate < today);
})({
  day,
  month,
  year
})`;

helpers.date.isDateNotLess1stJanuaryYear = `(({
  day,
  month,
  year
}, selectedYear) => {
  const issueDate = new Date(year, Number(month) - 1, day)Time();
  const selectedYear1stJanuary = new Date(selectedYear, 0, 1)Time();
  return selectedYear1stJanuary && issueDate && (issueDate >= selectedYear1stJanuary);
})({
  day,
  month,
  year
})`;

helpers.date.inDotFormat =
  "(() => (new Date()).toISOString().slice(0, 10).split('-').reverse().join('.'))()";

helpers.date.inHyphenFormat =
  "(() => (new Date()).toISOString().slice(0, 10).split('-').join('-'))()";

helpers.date.fromDotsToHyphen =
  "((dataWithDots) => dataWithDots.split('.').reverse().join('-'))(dataWithDots)";

helpers.date.fromHyphenToDots =
  "((dataWithDots) => dataWithDots.split('-').reverse().join('.'))(dataWithDots)";

helpers.string.isUkrainianLettersOnlyAndSomeSymbolsEqual =
  '((value, length) => ((new RegExp(`^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя]{${length}}$`)).test(value)))(value, length)';

helpers.string.isUkrainianLettersNumbersPunctuationMarksOnlyAndSomeSymbolsCountNotLess =
  "((value, length) => ((new RegExp(`^[АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя0-9№/ ,.\\-'’\"]{${length},}$`)).test(value)))(value, length)";

helpers.string.isUkrainianLettersNumbersQuotesHyphenGapOnly = '((value) => /^[-\'‘’\" /А-ЩЬЮЯҐЄІЇа-щьюяґєії0-9]+$/.test(value))(value)';

helpers.string.isNotMoreOneHyphenOrSpaceInRow =
  '((value) => value && !/[-]{2,}/.test(value) && !/[ ]{2,}/.test(value))(value)';

export default helpers;
