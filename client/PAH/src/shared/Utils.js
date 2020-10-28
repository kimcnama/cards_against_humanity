export function formatText(text, allowSpaces = true, allLowerCase = true) {
  var formattedStr = text;
  if (!allowSpaces) {
    formattedStr = formattedStr.replace(' ', '');
  }
  formattedStr = formattedStr.replace(':', '');
  formattedStr = formattedStr.replace(';', '');
  if (allLowerCase) {
    formattedStr = formattedStr.toLowerCase();
  }
  return formattedStr;
}
