import type { SheetData } from './excel';

export type EntityKind = 'skip' | 'groups' | 'members' | 'activities' | 'attendance' | 'matrix';

export interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  aliases: string[];
}

export interface EntityDef {
  kind: EntityKind;
  label: string;
  description: string;
  sheetAliases: string[];
  fields: FieldDef[];
}

/** Bỏ dấu, hạ chữ thường, bỏ ký tự phụ để so khớp tiêu đề linh hoạt. */
export function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const ENTITIES: EntityDef[] = [
  {
    kind: 'groups',
    label: 'Tổ công đoàn',
    description: 'Danh sách các tổ công đoàn.',
    sheetAliases: ['to', 'tocongdoan', 'danhsachto', 'group', 'groups', 'to_cong_doan'],
    fields: [
      { key: 'id', label: 'Mã tổ', aliases: ['mato', 'ma', 'matocongdoan', 'id', 'code'] },
      {
        key: 'name',
        label: 'Tên tổ',
        required: true,
        aliases: ['tento', 'ten', 'tentocongdoan', 'tocongdoan', 'to', 'name', 'tenđoan'],
      },
    ],
  },
  {
    kind: 'members',
    label: 'Đoàn viên / Giáo viên',
    description: 'Danh sách đoàn viên kèm tổ và chức vụ.',
    sheetAliases: [
      'doanvien',
      'danhsachdoanvien',
      'giaovien',
      'danhsachgiaovien',
      'gv',
      'member',
      'members',
      'teacher',
      'teachers',
      'nhansu',
    ],
    fields: [
      { key: 'id', label: 'Mã đoàn viên', aliases: ['madv', 'magv', 'ma', 'madoanvien', 'magiaovien', 'id', 'code', 'macb'] },
      {
        key: 'name',
        label: 'Họ và tên',
        required: true,
        aliases: ['hoten', 'ten', 'hovaten', 'tengiaovien', 'tendoanvien', 'name', 'fullname', 'hoentendem'],
      },
      {
        key: 'groupId',
        label: 'Tổ công đoàn',
        aliases: ['to', 'tocongdoan', 'mato', 'tento', 'group', 'groupid', 'donvi', 'bomon'],
      },
      { key: 'role', label: 'Chức vụ', aliases: ['chucvu', 'vaitro', 'role', 'chucdanh', 'nhiemvu'] },
    ],
  },
  {
    kind: 'activities',
    label: 'Hoạt động',
    description: 'Danh sách hoạt động công đoàn.',
    sheetAliases: [
      'hoatdong',
      'danhsachhoatdong',
      'hd',
      'activity',
      'activities',
      'sukien',
      'phongtrao',
    ],
    fields: [
      { key: 'id', label: 'Mã hoạt động', aliases: ['mahd', 'ma', 'mahoatdong', 'id', 'code'] },
      {
        key: 'name',
        label: 'Tên hoạt động',
        required: true,
        aliases: ['tenhoatdong', 'ten', 'tenhd', 'noidung', 'name', 'hoatdong', 'tensukien'],
      },
      { key: 'date', label: 'Ngày', aliases: ['ngay', 'ngayhoatdong', 'thoigian', 'date', 'ngaytochuc'] },
      { key: 'notes', label: 'Ghi chú', aliases: ['ghichu', 'note', 'notes', 'chuthich'] },
    ],
  },
  {
    kind: 'attendance',
    label: 'Điểm danh (dạng danh sách)',
    description: 'Mỗi hàng là một lần điểm danh của một đoàn viên trong một hoạt động.',
    sheetAliases: ['diemdanh', 'attendance', 'thamgia', 'chitietdiemdanh'],
    fields: [
      {
        key: 'activityId',
        label: 'Mã / tên hoạt động',
        required: true,
        aliases: ['mahd', 'mahoatdong', 'hoatdong', 'tenhoatdong', 'activityid', 'activity'],
      },
      {
        key: 'memberId',
        label: 'Mã / họ tên đoàn viên',
        required: true,
        aliases: ['madv', 'magv', 'hoten', 'ten', 'doanvien', 'giaovien', 'memberid', 'member'],
      },
      {
        key: 'present',
        label: 'Có mặt',
        aliases: ['comat', 'thamgia', 'diemdanh', 'present', 'ketqua', 'trangthai', 'x'],
      },
      { key: 'notes', label: 'Ghi chú', aliases: ['ghichu', 'note', 'notes', 'lydo'] },
    ],
  },
  {
    kind: 'matrix',
    label: 'Điểm danh (bảng chéo)',
    description:
      'Mỗi hàng là một đoàn viên, mỗi cột còn lại là một hoạt động; ô có dấu x hoặc số 1 nghĩa là có tham gia.',
    sheetAliases: ['bangdiemdanh', 'tonghop', 'tonghopdiemdanh', 'matran'],
    fields: [
      {
        key: 'memberId',
        label: 'Mã / họ tên đoàn viên',
        required: true,
        aliases: ['madv', 'magv', 'hoten', 'ten', 'hovaten', 'doanvien', 'giaovien'],
      },
      {
        key: 'groupId',
        label: 'Tổ công đoàn',
        aliases: ['to', 'tocongdoan', 'mato', 'tento', 'group'],
      },
    ],
  },
];

export const getEntity = (kind: EntityKind) => ENTITIES.find((e) => e.kind === kind);

/** Đoán loại dữ liệu của một sheet dựa trên tên sheet rồi đến tiêu đề cột. */
export function detectEntity(sheet: SheetData): EntityKind {
  const sheetKey = normalize(sheet.name);
  for (const entity of ENTITIES) {
    if (entity.sheetAliases.some((a) => sheetKey.includes(a))) return entity.kind;
  }

  const headerKeys = sheet.headers.map(normalize);
  let best: { kind: EntityKind; score: number } = { kind: 'skip', score: 0 };

  for (const entity of ENTITIES) {
    if (entity.kind === 'matrix') continue;
    let score = 0;
    for (const field of entity.fields) {
      if (headerKeys.some((h) => h && field.aliases.some((a) => h === a || h.includes(a)))) {
        score += field.required ? 2 : 1;
      }
    }
    const hasRequired = entity.fields
      .filter((f) => f.required)
      .every((f) => headerKeys.some((h) => h && f.aliases.some((a) => h === a || h.includes(a))));
    if (hasRequired && score > best.score) best = { kind: entity.kind, score };
  }

  return best.kind;
}

/** Gán mỗi trường của thực thể với chỉ số cột phù hợp nhất (-1 nếu không có). */
export function detectColumns(sheet: SheetData, kind: EntityKind): Record<string, number> {
  const entity = getEntity(kind);
  const mapping: Record<string, number> = {};
  if (!entity) return mapping;

  const headerKeys = sheet.headers.map(normalize);
  const used = new Set<number>();

  for (const field of entity.fields) {
    let index = headerKeys.findIndex(
      (h, i) => !used.has(i) && h && field.aliases.some((a) => h === a)
    );
    if (index === -1) {
      index = headerKeys.findIndex(
        (h, i) => !used.has(i) && h && field.aliases.some((a) => h.includes(a) || a.includes(h))
      );
    }
    mapping[field.key] = index;
    if (index !== -1) used.add(index);
  }

  return mapping;
}

/* ------------------------------ Chuẩn hóa ô ------------------------------ */

export const cellText = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return formatDate(v);
  return String(v).replace(/\s+/g, ' ').trim();
};

export function formatDate(value: any): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = cellText(value);
  // dd/mm/yyyy hoặc d-m-yyyy → yyyy-mm-dd
  const match = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return text;
}

const TRUTHY = new Set([
  'x',
  'v',
  '1',
  'co',
  'comat',
  'x1',
  'true',
  'yes',
  'y',
  'thamgia',
  'da',
  'dathamgia',
  'dutuc',
  'du',
  'cd',
]);

export const isPresent = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  const key = normalize(v);
  if (!key) return false;
  return TRUTHY.has(key);
};

/** Tạo mã ổn định từ họ tên / tên hoạt động khi file không có sẵn mã. */
export function slugId(prefix: string, value: string, taken: Set<string>): string {
  const base = normalize(value).slice(0, 32) || 'x';
  let id = `${prefix}${base}`.toUpperCase();
  let n = 2;
  while (taken.has(id)) {
    id = `${prefix}${base}${n}`.toUpperCase();
    n++;
  }
  taken.add(id);
  return id;
}
