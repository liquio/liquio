import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import XLSX from 'xlsx';

import Scrollbar from 'components/Scrollbar';
import ProgressLine from 'components/Preloader/ProgressLine';
import './styles.css';

const between = (x, min, max) => x >= min && x <= max;

const getSpan = (num) => Number(num.toString().replace('-', '')) + 1;

const makeCols = (refstr) => {
  if (!refstr) return [];
  const o = [];
  const C = XLSX.utils.decode_range(refstr).e.c + 1;

  for (let i = 0; i < C; i++) {
    o[i] = { name: XLSX.utils.encode_col(i), key: i };
  }
  return o;
};

const ExcelRenderer = (file, callback) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    const rABS = !!reader.readAsBinaryString;
    reader.onload = function (e) {
      const bstr = e.target.result;
      const wb = XLSX.read(bstr, { type: rABS ? 'binary' : 'array' });
      const parsedResult = {};
      const wsnames = wb.SheetNames || [];
      wsnames.forEach((name) => {
        const ws = wb.Sheets[name];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const cols = makeCols(ws['!ref']);
        const merges = ws['!merges'];
        parsedResult[name] = { rows: json, cols, merges };
      });
      resolve(parsedResult);
      return callback(null, parsedResult);
    };
    if (file && rABS) reader.readAsBinaryString(file);
    else reader.readAsArrayBuffer(file);
  });

class XlsxViewer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      active: null
    };
  }

  renderFile = (fileObj) => {
    ExcelRenderer(fileObj, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        this.setState({ data });
      }
    });
  };

  dataURLtoFile = (dataurl, filename) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  setActiveTable = (active) => this.setState({ active });

  renderTable = () => {
    const { darkTheme } = this.props;
    const { data, active } = this.state;

    if (!data) {
      return (
        <div style={{ width: '100%', height: 2 }}>
          <ProgressLine loading={true} />
        </div>
      );
    }

    const keys = Object.keys(data) || [];

    return (
      <>
        <div className={'ExcelTableTabsWrapper'}>
          {keys.length > 1
            ? keys.map((name, index) => (
                <div
                  key={name}
                  className={'ExcelTableTab'}
                  onClick={() => this.setActiveTable(index)}
                >
                  {name}
                </div>
              ))
            : null}
        </div>
        {keys.map((name, index) => {
          const { rows, cols, merges } = data[name];

          return (
            <table
              className={classNames({
                ExcelTable: true,
                ExcelTableDarkTheme: darkTheme
              })}
              key={rows.length}
              style={{
                display: (index === 0 && !active) || active === index ? 'table' : 'none'
              }}
            >
              <tbody>
                <tr>
                  <th />
                  {cols.map((c) => (
                    <th key={c.key} className={c.key === -1 ? 'heading' : ''}>
                      {c.key === -1 ? '' : c.name}
                    </th>
                  ))}
                </tr>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td key={i} className={'heading'}>
                      {i + 1}
                    </td>
                    {cols.map((c, j) => {
                      const isMerging = (merges || [])
                        .filter((m) => m.s.r === i && m.s.c === j)
                        .pop();
                      const isMerged = (merges || [])
                        .filter((m) => between(i, m.s.r, m.e.r) && between(j, m.s.c, m.e.c))
                        .pop();

                      if (isMerged && !isMerging) return null;

                      if (!isMerging) return <td key={c.key}>{r[c.key]}</td>;

                      const colspan = getSpan(isMerging.s.c - isMerging.e.c);
                      const rowspan = getSpan(isMerging.s.r - isMerging.e.r);

                      return (
                        <td key={c.key} rowSpan={rowspan} colSpan={colspan}>
                          {r[c.key]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })}
      </>
    );
  };

  componentDidMount = () => {
    const { filePath, fileType } = this.props;
    this.renderFile(this.dataURLtoFile(filePath, `${fileType}.${fileType}`));
  };

  render = () => <Scrollbar>{this.renderTable()}</Scrollbar>;
}

XlsxViewer.propTypes = {
  filePath: PropTypes.string.isRequired,
  fileType: PropTypes.string.isRequired
};

export default XlsxViewer;
