const parseTableData = (html) => {
  const result = [];

  const container = document.createElement('div');
  container.innerHTML = html;

  const trs = container.getElementsByTagName('tr');
  for (const tr of trs) {
    const row = [];
    const tds = tr.getElementsByTagName('td');

    for (const td of tds) {
      row.push(td.innerText.trim());
    }

    result.push(row);
  }
  return result;
};

export default parseTableData;
