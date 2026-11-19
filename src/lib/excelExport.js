import { strToU8, zipSync } from 'fflate';

const escapeXml = (value) => String(value)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

function columnName(index) {
  let name = '';
  while (index > 0) {
    const remainder = (index - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    index = Math.floor((index - 1) / 26);
  }
  return name;
}

function makeCell(reference, value, style) {
  const styleAttribute = style ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value ?? '')}</t></is></c>`;
}

function makeStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00;[Red]-&quot;₱&quot;#,##0.00"/></numFmts>
  <fonts count="7">
    <font><name val="Aptos"/><sz val="10"/><color rgb="FF1E293B"/></font>
    <font><name val="Aptos Display"/><sz val="18"/><b/><color rgb="FFFFFFFF"/></font>
    <font><name val="Aptos"/><sz val="11"/><b/><color rgb="FF0F2D4A"/></font>
    <font><name val="Aptos"/><sz val="10"/><color rgb="FF64748B"/></font>
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FF0F2D4A"/></font>
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FFFFFFFF"/></font>
    <font><name val="Aptos"/><sz val="10"/><color rgb="FF1E293B"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F2D4A"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
    <border><left/><right/><top/><bottom style="hair"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="5" fillId="1" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="0" borderId="2" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="2" borderId="2" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="6" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="164" fontId="6" fillId="2" borderId="2" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

export async function downloadExcel({ filename, title, organization, period, summary, rows, columns }) {
  if (!columns.length) throw new Error('An Excel report must include at least one column.');

  const lastColumn = columnName(columns.length);
  const safeTitle = title.replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
  const reportSummary = summary || `${rows.length} record${rows.length === 1 ? '' : 's'}`;
  const generated = new Date().toLocaleDateString('en-PH');
  const tableEndRow = 6 + rows.length;
  const xmlRows = [
    `<row r="1" ht="34" customHeight="1">${makeCell('A1', title, 1)}</row>`,
    `<row r="2" ht="20" customHeight="1">${makeCell('A2', organization, 2)}</row>`,
    `<row r="3" ht="19" customHeight="1">${makeCell('A3', `${period}  |  Generated ${generated}`, 3)}</row>`,
    `<row r="4" ht="20" customHeight="1">${makeCell('A4', reportSummary, 4)}</row>`,
    '<row r="5" ht="9" customHeight="1"/>',
    `<row r="6" ht="24" customHeight="1">${columns.map(({ label }, index) => makeCell(`${columnName(index + 1)}6`, label, 5)).join('')}</row>`,
  ];

  rows.forEach((record, rowIndex) => {
    const excelRow = rowIndex + 7;
    const cells = columns.map(({ key, format }, columnIndex) => {
      const value = record[key];
      const numericValue = format === 'currency' || format === 'number' ? Number(value) : NaN;
      const isNumeric = value != null && value !== '' && Number.isFinite(numericValue);
      const style = format === 'currency' && isNumeric
        ? rowIndex % 2 === 1 ? 9 : 8
        : rowIndex % 2 === 1 ? 7 : 6;
      const cellValue = isNumeric ? numericValue : value instanceof Date ? value.toLocaleDateString('en-PH') : value;
      return makeCell(`${columnName(columnIndex + 1)}${excelRow}`, cellValue, style);
    });
    xmlRows.push(`<row r="${excelRow}" ht="21" customHeight="1">${cells.join('')}</row>`);
  });

  const widths = columns.map(({ label, width }, index) => (
    `<col min="${index + 1}" max="${index + 1}" width="${width || Math.max(14, Math.min(32, label.length + 4))}" customWidth="1"/>`
  )).join('');
  const filter = rows.length ? `<autoFilter ref="A6:${lastColumn}${tableEndRow}"/>` : '';
  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1" autoPageBreaks="0"/></sheetPr>
  <dimension ref="A1:${lastColumn}${Math.max(tableEndRow, 6)}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A7" sqref="A7"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${widths}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
  ${filter}
  <mergeCells count="4"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/><mergeCell ref="A3:${lastColumn}3"/><mergeCell ref="A4:${lastColumn}4"/></mergeCells>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const files = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    '_rels/.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    'xl/workbook.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(safeTitle)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    'xl/styles.xml': strToU8(makeStyles()),
    'xl/worksheets/sheet1.xml': strToU8(worksheetXml),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Barangay Transparency System</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`),
    'docProps/app.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Barangay Transparency System</Application>
</Properties>`),
  };
  const workbook = zipSync(files, { level: 6 });
  const url = URL.createObjectURL(new Blob([workbook], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
