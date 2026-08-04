import * as ExcelJS from 'exceljs';

export interface SheetData {
  name: string;
  headers: string[];
  rows: any[][];
}

export async function exportToExcel(
  filename: string,
  columns: Partial<ExcelJS.Column>[],
  data: any[]
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  worksheet.columns = columns;
  worksheet.addRows(data);
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Xuất một workbook nhiều sheet, dùng cho file mẫu nhập dữ liệu. */
export async function exportWorkbook(
  filename: string,
  sheets: { name: string; columns: Partial<ExcelJS.Column>[]; rows?: any[] }[]
) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.columns = sheet.columns;
    if (sheet.rows?.length) worksheet.addRows(sheet.rows);
    worksheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Chuẩn hóa một ô của ExcelJS về giá trị nguyên thủy. */
function cellValue(value: any): any {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if ('text' in value) return value.text;
    if ('result' in value) return value.result;
    if ('richText' in value) return value.richText.map((t: any) => t.text).join('');
    if ('hyperlink' in value) return value.text ?? value.hyperlink;
    return String(value);
  }
  return value;
}

const isBlank = (v: any) => v === null || v === undefined || String(v).trim() === '';

/** Tách bảng thô thành hàng tiêu đề + các hàng dữ liệu. */
function toSheetData(name: string, matrix: any[][]): SheetData {
  // Hàng tiêu đề là hàng đầu tiên có ít nhất 2 ô có nội dung
  let headerIndex = matrix.findIndex((row) => row.filter((c) => !isBlank(c)).length >= 2);
  if (headerIndex === -1) headerIndex = matrix.findIndex((row) => row.some((c) => !isBlank(c)));
  if (headerIndex === -1) return { name, headers: [], rows: [] };

  const headerRow = matrix[headerIndex];
  const width = matrix.reduce((max, row) => Math.max(max, row.length), headerRow.length);

  const headers = Array.from({ length: width }, (_, i) => {
    const raw = headerRow[i];
    return isBlank(raw) ? `Cột ${i + 1}` : String(raw).replace(/\s+/g, ' ').trim();
  });

  const rows = matrix
    .slice(headerIndex + 1)
    .map((row) => Array.from({ length: width }, (_, i) => (row[i] === undefined ? null : row[i])))
    .filter((row) => row.some((c) => !isBlank(c)));

  return { name, headers, rows };
}

function parseCsv(text: string): any[][] {
  const clean = text.replace(/^\uFEFF/, '');
  // Tự nhận diện dấu phân cách phổ biến ở bản Excel tiếng Việt
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const delimiter = [';', '\t', ','].reduce((best, d) => {
    const count = firstLine.split(d).length;
    return count > firstLine.split(best).length ? d : best;
  }, ',');

  const rows: any[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.map((r) => r.map((c) => (c.trim() === '' ? null : c.trim())));
}

/** Đọc mọi sheet của file .xlsx/.csv thành dạng tiêu đề + hàng dữ liệu. */
export async function readWorkbook(file: File): Promise<SheetData[]> {
  if (/\.csv$/i.test(file.name)) {
    const text = await file.text();
    return [toSheetData(file.name.replace(/\.csv$/i, ''), parseCsv(text))];
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheets: SheetData[] = [];
  workbook.eachSheet((worksheet) => {
    const matrix: any[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as any[];
      matrix.push(values.slice(1).map(cellValue));
    });
    const sheet = toSheetData(worksheet.name, matrix);
    if (sheet.rows.length > 0) sheets.push(sheet);
  });

  return sheets;
}

/** Giữ lại để tương thích: trả về các hàng dữ liệu của sheet đầu tiên. */
export async function readExcel(file: File): Promise<any[][]> {
  const sheets = await readWorkbook(file);
  return sheets[0]?.rows ?? [];
}
