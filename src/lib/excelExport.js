import { strToU8, zipSync } from 'fflate';

const escapeXml = (value) => String(value ?? '')
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
  const styleAttribute = style != null ? ` s="${style}"` : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"${styleAttribute}><v>${value}</v></c>`;
  }
  return `<c r="${reference}"${styleAttribute} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value ?? '')}</t></is></c>`;
}

function makeStyles() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0.00;[Red]-&quot;₱&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="#,##0"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
  </numFmts>
  <fonts count="12">
    <!-- 0: default -->
    <font><name val="Aptos"/><sz val="10"/><color rgb="FF1E293B"/></font>
    <!-- 1: Republic header -->
    <font><name val="Aptos"/><sz val="9.5"/><b/><color rgb="FF475569"/></font>
    <!-- 2: Organization -->
    <font><name val="Aptos"/><sz val="11.5"/><b/><color rgb="FF0F2D4A"/></font>
    <!-- 3: Main report title banner -->
    <font><name val="Aptos Display"/><sz val="14"/><b/><color rgb="FFFFFFFF"/></font>
    <!-- 4: Period / Generated timestamp -->
    <font><name val="Aptos"/><sz val="9.5"/><i/><color rgb="FF64748B"/></font>
    <!-- 5: Summary text -->
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FF166534"/></font>
    <!-- 6: Table header -->
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FFFFFFFF"/></font>
    <!-- 7: Data cell normal -->
    <font><name val="Aptos"/><sz val="9.5"/><color rgb="FF1E293B"/></font>
    <!-- 8: Total row label & values -->
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FF0F2D4A"/></font>
    <!-- 9: Signatory role -->
    <font><name val="Aptos"/><sz val="9.5"/><b/><color rgb="FF334155"/></font>
    <!-- 10: Signatory name -->
    <font><name val="Aptos"/><sz val="10"/><b/><color rgb="FF0F2D4A"/></font>
    <!-- 11: Signatory designation -->
    <font><name val="Aptos"/><sz val="9"/><i/><color rgb="FF64748B"/></font>
  </fonts>
  <fills count="6">
    <!-- 0 & 1 required by OpenXML spec -->
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <!-- 2: Deep Navy -->
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F2D4A"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 3: Alternating row soft zebra -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 4: Total row background -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
    <!-- 5: Summary badge light background -->
    <fill><patternFill patternType="solid"><fgColor rgb="FFF0FDF4"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="6">
    <!-- 0: none -->
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <!-- 1: thin light gray (data cells) -->
    <border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>
    <!-- 2: table header border -->
    <border><left style="thin"><color rgb="FF1E3A5F"/></left><right style="thin"><color rgb="FF1E3A5F"/></right><top style="thin"><color rgb="FF0F2D4A"/></top><bottom style="medium"><color rgb="FF0F2D4A"/></bottom><diagonal/></border>
    <!-- 3: total row border with double bottom -->
    <border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FF0F2D4A"/></top><bottom style="double"><color rgb="FF0F2D4A"/></bottom><diagonal/></border>
    <!-- 4: signatory signature line -->
    <border><left/><right/><top style="thin"><color rgb="FF334155"/></top><bottom/><diagonal/></border>
    <!-- 5: summary box border -->
    <border><left style="thin"><color rgb="FFBBF7D0"/></left><right style="thin"><color rgb="FFBBF7D0"/></right><top style="thin"><color rgb="FFBBF7D0"/></top><bottom style="thin"><color rgb="FFBBF7D0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="24">
    <!-- 0: default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Republic header (centered) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 2: Organization title (centered) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 3: Main report title banner (navy fill, white text, centered) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 4: Period and timestamp (centered, italic) -->
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 5: Summary text (light green fill, border 5, centered) -->
    <xf numFmtId="0" fontId="5" fillId="5" borderId="5" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 6: Table header left -->
    <xf numFmtId="0" fontId="6" fillId="2" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 7: Table header center -->
    <xf numFmtId="0" fontId="6" fillId="2" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <!-- 8: Table header right -->
    <xf numFmtId="0" fontId="6" fillId="2" borderId="2" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>
    <!-- 9: Data cell left normal -->
    <xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 10: Data cell left zebra -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <!-- 11: Data cell center normal -->
    <xf numFmtId="0" fontId="7" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 12: Data cell center zebra -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 13: Data cell currency right normal -->
    <xf numFmtId="164" fontId="7" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 14: Data cell currency right zebra -->
    <xf numFmtId="164" fontId="7" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 15: Data cell number right normal -->
    <xf numFmtId="165" fontId="7" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 16: Data cell number right zebra -->
    <xf numFmtId="165" fontId="7" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 17: Total row label left -->
    <xf numFmtId="0" fontId="8" fillId="4" borderId="3" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <!-- 18: Total row currency right -->
    <xf numFmtId="164" fontId="8" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 19: Total row number right -->
    <xf numFmtId="165" fontId="8" fillId="4" borderId="3" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <!-- 20: Total row blank/other -->
    <xf numFmtId="0" fontId="8" fillId="4" borderId="3" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 21: Signatory title role -->
    <xf numFmtId="0" fontId="9" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <!-- 22: Signatory name with top line -->
    <xf numFmtId="0" fontId="10" fillId="0" borderId="4" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
    <!-- 23: Signatory designation subtext -->
    <xf numFmtId="0" fontId="11" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

export async function downloadExcel({
  filename,
  title,
  organization,
  period,
  summary,
  rows = [],
  columns = [],
  signatories,
}) {
  if (!columns.length) throw new Error('An Excel report must include at least one column.');

  const colCount = columns.length;
  const lastColumn = columnName(colCount);
  const safeTitle = (title || 'Report').replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
  const reportSummary = summary || `${rows.length} record${rows.length === 1 ? '' : 's'} recorded`;
  const generated = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate totals for currency and number columns
  const totals = {};
  let hasTotals = false;
  columns.forEach((col) => {
    if (col.format === 'currency' || col.format === 'number') {
      const sum = rows.reduce((acc, row) => {
        const val = Number(row[col.key]);
        return acc + (Number.isFinite(val) ? val : 0);
      }, 0);
      totals[col.key] = sum;
      hasTotals = true;
    }
  });

  // Build header rows
  const xmlRows = [
    `<row r="1" ht="20" customHeight="1">${makeCell('A1', 'REPUBLIC OF THE PHILIPPINES', 1)}</row>`,
    `<row r="2" ht="22" customHeight="1">${makeCell('A2', (organization || 'BARANGAY').toUpperCase(), 2)}</row>`,
    `<row r="3" ht="30" customHeight="1">${makeCell('A3', (title || 'REPORT').toUpperCase(), 3)}</row>`,
    `<row r="4" ht="20" customHeight="1">${makeCell('A4', `Coverage: ${period}  |  Generated on ${generated}`, 4)}</row>`,
    `<row r="5" ht="22" customHeight="1">${makeCell('A5', reportSummary, 5)}</row>`,
    '<row r="6" ht="12" customHeight="1"/>',
  ];

  // Column header row (Row 7)
  const headerCells = columns.map(({ label, format }, index) => {
    const colRef = `${columnName(index + 1)}7`;
    const style = format === 'currency' || format === 'number' ? 8 : (format === 'center' ? 7 : 6);
    return makeCell(colRef, label, style);
  });
  xmlRows.push(`<row r="7" ht="26" customHeight="1">${headerCells.join('')}</row>`);

  // Data rows (Rows 8 to 8 + rows.length - 1)
  rows.forEach((record, rowIndex) => {
    const excelRow = rowIndex + 8;
    const isZebra = rowIndex % 2 === 1;
    const cells = columns.map(({ key, format, align }, columnIndex) => {
      const colLetter = columnName(columnIndex + 1);
      const cellRef = `${colLetter}${excelRow}`;
      const rawValue = record[key];

      if (format === 'currency') {
        const num = Number(rawValue);
        const isNumeric = rawValue != null && rawValue !== '' && Number.isFinite(num);
        return makeCell(cellRef, isNumeric ? num : 0, isZebra ? 14 : 13);
      }

      if (format === 'number') {
        const num = Number(rawValue);
        const isNumeric = rawValue != null && rawValue !== '' && Number.isFinite(num);
        return makeCell(cellRef, isNumeric ? num : 0, isZebra ? 16 : 15);
      }

      const isCenter = align === 'center' || format === 'center';
      const cellValue = rawValue instanceof Date ? rawValue.toLocaleDateString('en-PH') : rawValue;
      return makeCell(cellRef, cellValue, isCenter ? (isZebra ? 12 : 11) : (isZebra ? 10 : 9));
    });

    xmlRows.push(`<row r="${excelRow}" ht="22" customHeight="1">${cells.join('')}</row>`);
  });

  // Total row (if numeric columns exist and rows are present)
  let currentRow = 8 + rows.length;
  if (hasTotals && rows.length > 0) {
    const totalCells = columns.map(({ key, format }, columnIndex) => {
      const colLetter = columnName(columnIndex + 1);
      const cellRef = `${colLetter}${currentRow}`;

      if (columnIndex === 0) {
        return makeCell(cellRef, 'TOTAL', 17);
      }
      if (format === 'currency') {
        return makeCell(cellRef, totals[key] || 0, 18);
      }
      if (format === 'number') {
        return makeCell(cellRef, totals[key] || 0, 19);
      }
      return makeCell(cellRef, '', 20);
    });
    xmlRows.push(`<row r="${currentRow}" ht="24" customHeight="1">${totalCells.join('')}</row>`);
    currentRow += 1;
  }

  // Signatory Block
  // Row spacing before signatures
  xmlRows.push(`<row r="${currentRow}" ht="16" customHeight="1"/>`);
  currentRow += 1;
  xmlRows.push(`<row r="${currentRow}" ht="16" customHeight="1"/>`);
  currentRow += 1;

  // Determine signatory columns
  const defaultSigs = signatories || [
    { role: 'Prepared by:', name: 'BARANGAY TREASURER', title: 'Custodian of Public Funds' },
    { role: 'Certified Correct:', name: 'BARANGAY SECRETARY', title: 'Keeper of Official Records' },
    { role: 'Approved by:', name: 'PUNONG BARANGAY', title: 'Head of Local Government' },
  ];

  let sigColIndices = [1, Math.ceil(colCount / 2), colCount];
  if (colCount === 1) {
    sigColIndices = [1];
  } else if (colCount === 2) {
    sigColIndices = [1, 2];
  }

  // Signatory Role Row
  const sigRoleCells = sigColIndices.map((colIdx, i) => {
    const sig = defaultSigs[i] || defaultSigs[defaultSigs.length - 1];
    return makeCell(`${columnName(colIdx)}${currentRow}`, sig.role, 21);
  });
  xmlRows.push(`<row r="${currentRow}" ht="20" customHeight="1">${sigRoleCells.join('')}</row>`);
  currentRow += 1;

  // Empty space for wet signature
  xmlRows.push(`<row r="${currentRow}" ht="32" customHeight="1"/>`);
  currentRow += 1;

  // Signatory Name Row (with top border line)
  const sigNameCells = sigColIndices.map((colIdx, i) => {
    const sig = defaultSigs[i] || defaultSigs[defaultSigs.length - 1];
    return makeCell(`${columnName(colIdx)}${currentRow}`, sig.name, 22);
  });
  xmlRows.push(`<row r="${currentRow}" ht="20" customHeight="1">${sigNameCells.join('')}</row>`);
  currentRow += 1;

  // Signatory Designation Row
  const sigTitleCells = sigColIndices.map((colIdx, i) => {
    const sig = defaultSigs[i] || defaultSigs[defaultSigs.length - 1];
    return makeCell(`${columnName(colIdx)}${currentRow}`, sig.title, 23);
  });
  xmlRows.push(`<row r="${currentRow}" ht="18" customHeight="1">${sigTitleCells.join('')}</row>`);

  // Compute dynamic column widths
  const widths = columns.map(({ label, width, key, format }, index) => {
    if (width) {
      return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
    }
    let maxLen = label ? String(label).length : 0;
    rows.forEach((row) => {
      let val = row[key];
      if (format === 'currency' && typeof val === 'number') {
        val = `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
      }
      const len = val != null ? String(val).length : 0;
      if (len > maxLen) maxLen = len;
    });
    const computed = Math.min(48, Math.max(14, maxLen + 4));
    return `<col min="${index + 1}" max="${index + 1}" width="${computed}" customWidth="1"/>`;
  }).join('');

  const tableEndRow = 7 + rows.length + (hasTotals && rows.length > 0 ? 1 : 0);
  const filter = rows.length ? `<autoFilter ref="A7:${lastColumn}${tableEndRow}"/>` : '';

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1" autoPageBreaks="0"/></sheetPr>
  <dimension ref="A1:${lastColumn}${currentRow}"/>
  <sheetViews>
    <sheetView showGridLines="1" workbookViewId="0">
      <pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/>
      <selection pane="bottomLeft" activeCell="A8" sqref="A8"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${widths}</cols>
  <sheetData>${xmlRows.join('')}</sheetData>
  ${filter}
  <mergeCells count="5">
    <mergeCell ref="A1:${lastColumn}1"/>
    <mergeCell ref="A2:${lastColumn}2"/>
    <mergeCell ref="A3:${lastColumn}3"/>
    <mergeCell ref="A4:${lastColumn}4"/>
    <mergeCell ref="A5:${lastColumn}5"/>
  </mergeCells>
  <pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.25" footer="0.25"/>
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
  <dc:creator>Barangay Transparency Portal</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`),
    'docProps/app.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Barangay Transparency Portal</Application>
</Properties>`),
  };

  const workbook = zipSync(files, { level: 6 });
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
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
  return workbook;
}
