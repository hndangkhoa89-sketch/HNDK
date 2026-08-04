import React, { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileDown,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { exportWorkbook, readWorkbook, type SheetData } from '../lib/excel';
import {
  ENTITIES,
  cellText,
  detectColumns,
  detectEntity,
  formatDate,
  getEntity,
  isPresent,
  normalize,
  slugId,
  type EntityKind,
} from '../lib/import-mapping';
import { Button } from './ui/button';
import { Card, CardBody, CardHeader, PageHeader } from './ui/card';
import { Field, Select } from './ui/form';
import { Badge, Code, EmptyState, StatCard, Td, Th, Tr, TableWrap } from './ui/data';

interface SheetConfig {
  kind: EntityKind;
  columns: Record<string, number>;
}

interface ImportResult {
  inserted: { groups: number; members: number; activities: number; attendance: number };
  warnings: string[];
}

export default function ImportTab() {
  const { request } = useApi();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [configs, setConfigs] = useState<SheetConfig[]>([]);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);

  // Dữ liệu đã có trong hệ thống, dùng để đối chiếu mã/tên khi nhập điểm danh
  const [existing, setExisting] = useState<{ members: any[]; activities: any[] }>({
    members: [],
    activities: [],
  });

  useEffect(() => {
    Promise.all([request('/teachers'), request('/dashboard')])
      .then(([teachersRes, dashboardRes]) =>
        setExisting({
          members: teachersRes.teachers || [],
          activities: dashboardRes.activities || [],
        })
      )
      .catch(() => setExisting({ members: [], activities: [] }));
  }, [request]);

  const loadFile = async (file: File) => {
    setReading(true);
    setResult(null);
    try {
      const parsed = await readWorkbook(file);
      if (parsed.length === 0) {
        throw new Error('Không tìm thấy dữ liệu nào trong file.');
      }
      setFileName(file.name);
      setSheets(parsed);
      setConfigs(
        parsed.map((sheet) => {
          const kind = detectEntity(sheet);
          return { kind, columns: detectColumns(sheet, kind) };
        })
      );
    } catch (err: any) {
      Swal.fire('Không đọc được file', err.message, 'error');
    } finally {
      setReading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const setKind = (index: number, kind: EntityKind) => {
    setConfigs((prev) =>
      prev.map((cfg, i) =>
        i === index ? { kind, columns: detectColumns(sheets[index], kind) } : cfg
      )
    );
  };

  const setColumn = (index: number, fieldKey: string, columnIndex: number) => {
    setConfigs((prev) =>
      prev.map((cfg, i) =>
        i === index ? { ...cfg, columns: { ...cfg.columns, [fieldKey]: columnIndex } } : cfg
      )
    );
  };

  const reset = () => {
    setFileName('');
    setSheets([]);
    setConfigs([]);
    setResult(null);
  };

  /* ------------------- Chuyển cấu hình thành dữ liệu gửi ------------------ */

  const payload = useMemo(() => {
    const outGroups = new Map<string, { id: string; name: string }>();
    const outMembers = new Map<string, any>();
    const outActivities = new Map<string, any>();
    const outAttendance: any[] = [];
    const issues: string[] = [];

    const memberKeys = new Map<string, string>();
    const activityKeys = new Map<string, string>();
    const takenMemberIds = new Set<string>();
    const takenActivityIds = new Set<string>();

    for (const m of existing.members) {
      takenMemberIds.add(m.id);
      memberKeys.set(normalize(m.id), m.id);
      memberKeys.set(normalize(m.name), m.id);
    }
    for (const a of existing.activities) {
      takenActivityIds.add(a.id);
      activityKeys.set(normalize(a.id), a.id);
      activityKeys.set(normalize(a.name), a.id);
    }

    const at = (row: any[], index: number) => (index >= 0 ? row[index] : null);

    // Vòng 1: danh mục nền (tổ, đoàn viên, hoạt động)
    sheets.forEach((sheet, sheetIndex) => {
      const cfg = configs[sheetIndex];
      if (!cfg || cfg.kind === 'skip') return;
      const cols = cfg.columns;

      if (cfg.kind === 'groups') {
        for (const row of sheet.rows) {
          const name = cellText(at(row, cols.name));
          if (!name) continue;
          const id = cellText(at(row, cols.id)) || name;
          outGroups.set(id, { id, name });
        }
      }

      if (cfg.kind === 'members') {
        for (const row of sheet.rows) {
          const name = cellText(at(row, cols.name));
          if (!name) continue;
          const groupName = cellText(at(row, cols.groupId));
          const id = cellText(at(row, cols.id)) || slugId('DV', name, takenMemberIds);
          takenMemberIds.add(id);
          if (groupName) outGroups.set(groupName, { id: groupName, name: groupName });
          outMembers.set(id, {
            id,
            name,
            groupId: groupName || null,
            role: cellText(at(row, cols.role)) || 'Đoàn viên',
            active: true,
          });
          memberKeys.set(normalize(id), id);
          memberKeys.set(normalize(name), id);
        }
      }

      if (cfg.kind === 'activities') {
        for (const row of sheet.rows) {
          const name = cellText(at(row, cols.name));
          if (!name) continue;
          const id = cellText(at(row, cols.id)) || slugId('HD', name, takenActivityIds);
          takenActivityIds.add(id);
          outActivities.set(id, {
            id,
            name,
            date: formatDate(at(row, cols.date)),
            notes: cellText(at(row, cols.notes)),
          });
          activityKeys.set(normalize(id), id);
          activityKeys.set(normalize(name), id);
        }
      }
    });

    // Vòng 2: điểm danh, cần danh mục ở vòng 1 để đối chiếu
    sheets.forEach((sheet, sheetIndex) => {
      const cfg = configs[sheetIndex];
      if (!cfg) return;
      const cols = cfg.columns;

      if (cfg.kind === 'attendance') {
        for (const row of sheet.rows) {
          const memberRaw = cellText(at(row, cols.memberId));
          const activityRaw = cellText(at(row, cols.activityId));
          if (!memberRaw || !activityRaw) continue;

          const memberId = memberKeys.get(normalize(memberRaw));
          if (!memberId) {
            issues.push(`Sheet "${sheet.name}": không tìm thấy đoàn viên "${memberRaw}".`);
            continue;
          }
          let activityId = activityKeys.get(normalize(activityRaw));
          if (!activityId) {
            activityId = slugId('HD', activityRaw, takenActivityIds);
            outActivities.set(activityId, { id: activityId, name: activityRaw, date: '', notes: '' });
            activityKeys.set(normalize(activityRaw), activityId);
          }

          outAttendance.push({
            activityId,
            memberId,
            present: cols.present >= 0 ? isPresent(at(row, cols.present)) : true,
            notes: cellText(at(row, cols.notes)),
          });
        }
      }

      if (cfg.kind === 'matrix') {
        const skipCols = new Set(
          [cols.memberId, cols.groupId].filter((i) => i !== undefined && i >= 0)
        );
        // Mỗi cột còn lại là một hoạt động
        const activityColumns = sheet.headers
          .map((header, index) => ({ header: cellText(header), index }))
          .filter(({ header, index }) => header && !skipCols.has(index) && !/^Cột \d+$/.test(header));

        for (const { header, index } of activityColumns) {
          if (activityKeys.has(normalize(header))) continue;
          const id = slugId('HD', header, takenActivityIds);
          outActivities.set(id, { id, name: header, date: '', notes: '' });
          activityKeys.set(normalize(header), id);
          void index;
        }

        for (const row of sheet.rows) {
          const memberRaw = cellText(at(row, cols.memberId));
          if (!memberRaw) continue;
          let memberId = memberKeys.get(normalize(memberRaw));
          if (!memberId) {
            const groupName = cellText(at(row, cols.groupId));
            memberId = slugId('DV', memberRaw, takenMemberIds);
            if (groupName) outGroups.set(groupName, { id: groupName, name: groupName });
            outMembers.set(memberId, {
              id: memberId,
              name: memberRaw,
              groupId: groupName || null,
              role: 'Đoàn viên',
              active: true,
            });
            memberKeys.set(normalize(memberRaw), memberId);
          }

          for (const { header, index } of activityColumns) {
            const activityId = activityKeys.get(normalize(header));
            if (!activityId) continue;
            outAttendance.push({
              activityId,
              memberId,
              present: isPresent(row[index]),
              notes: '',
            });
          }
        }
      }
    });

    return {
      groups: [...outGroups.values()],
      members: [...outMembers.values()],
      activities: [...outActivities.values()],
      attendance: outAttendance,
      issues: issues.slice(0, 20),
    };
  }, [sheets, configs, existing]);

  const totalRecords =
    payload.groups.length +
    payload.members.length +
    payload.activities.length +
    payload.attendance.length;

  const handleImport = async () => {
    const confirm = await Swal.fire({
      title: 'Nhập dữ liệu vào hệ thống?',
      html: `Sẽ thêm mới hoặc cập nhật:<br/><b>${payload.groups.length}</b> tổ, <b>${payload.members.length}</b> đoàn viên, <b>${payload.activities.length}</b> hoạt động, <b>${payload.attendance.length}</b> bản ghi điểm danh.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Nhập dữ liệu',
      cancelButtonText: 'Hủy',
    });
    if (!confirm.isConfirmed) return;

    try {
      setImporting(true);
      const res = await request('/import', {
        method: 'POST',
        body: JSON.stringify({
          groups: payload.groups,
          members: payload.members,
          activities: payload.activities,
          attendance: payload.attendance,
        }),
      });
      setResult({ inserted: res.inserted, warnings: res.warnings || [] });
      const refreshed = await Promise.all([request('/teachers'), request('/dashboard')]);
      setExisting({
        members: refreshed[0].teachers || [],
        activities: refreshed[1].activities || [],
      });
      Swal.fire('Nhập thành công', 'Dữ liệu đã được ghi vào cơ sở dữ liệu.', 'success');
    } catch (err: any) {
      Swal.fire('Lỗi khi nhập dữ liệu', err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    exportWorkbook('Mau_nhap_du_lieu_cong_doan', [
      {
        name: 'Tổ công đoàn',
        columns: [
          { header: 'Mã tổ', key: 'id', width: 16 },
          { header: 'Tên tổ', key: 'name', width: 34 },
        ],
        rows: [{ id: 'TO1', name: 'Tổ Toán - Tin' }],
      },
      {
        name: 'Đoàn viên',
        columns: [
          { header: 'Mã đoàn viên', key: 'id', width: 16 },
          { header: 'Họ và tên', key: 'name', width: 30 },
          { header: 'Tổ công đoàn', key: 'groupId', width: 26 },
          { header: 'Chức vụ', key: 'role', width: 20 },
        ],
        rows: [{ id: 'GV001', name: 'Nguyễn Văn A', groupId: 'TO1', role: 'Tổ trưởng' }],
      },
      {
        name: 'Hoạt động',
        columns: [
          { header: 'Mã hoạt động', key: 'id', width: 16 },
          { header: 'Tên hoạt động', key: 'name', width: 40 },
          { header: 'Ngày', key: 'date', width: 16 },
          { header: 'Ghi chú', key: 'notes', width: 30 },
        ],
        rows: [{ id: 'HD1', name: 'Hội thao chào mừng 20/11', date: '2025-11-15', notes: '' }],
      },
      {
        name: 'Điểm danh',
        columns: [
          { header: 'Mã hoạt động', key: 'activityId', width: 16 },
          { header: 'Mã đoàn viên', key: 'memberId', width: 16 },
          { header: 'Có mặt', key: 'present', width: 12 },
          { header: 'Ghi chú', key: 'notes', width: 30 },
        ],
        rows: [{ activityId: 'HD1', memberId: 'GV001', present: 'x', notes: '' }],
      },
    ]);
  };

  /* -------------------------------- Giao diện ------------------------------ */

  if (sheets.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Nhập dữ liệu từ Excel"
          description="Tải lên file Excel hoặc CSV có sẵn của đơn vị. Hệ thống tự nhận diện từng sheet, cho phép bạn kiểm tra lại cách ghép cột rồi mới ghi vào cơ sở dữ liệu."
          actions={
            <Button variant="outline" icon={<FileDown className="h-4 w-4" />} onClick={downloadTemplate}>
              Tải file mẫu
            </Button>
          }
        />

        <Card>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`m-4 flex flex-col items-center gap-4 rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors ${
              dragging ? 'border-primary bg-primary-muted/60' : 'border-border bg-muted/30'
            }`}
          >
            <FileSpreadsheet className="h-10 w-10 text-primary/70" aria-hidden="true" />
            <div>
              <p className="font-semibold">Kéo file vào đây hoặc chọn từ máy</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hỗ trợ định dạng .xlsx và .csv, đọc được nhiều sheet trong cùng một file.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
              }}
            />
            <Button
              loading={reading}
              icon={<Upload className="h-4 w-4" />}
              onClick={() => inputRef.current?.click()}
            >
              Chọn file dữ liệu
            </Button>
          </div>

          <CardBody className="border-t border-border">
            <h3 className="text-sm font-bold">Hệ thống nhận diện được những loại sheet nào?</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {ENTITIES.map((entity) => (
                <li key={entity.kind} className="flex gap-3 text-sm">
                  <Table2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{entity.label}</span>
                    <span className="text-muted-foreground"> — {entity.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kiểm tra dữ liệu trước khi nhập"
        description={`Đã đọc ${sheets.length} sheet từ file ${fileName}. Chọn đúng loại dữ liệu và cột tương ứng cho từng sheet.`}
        actions={
          <>
            <Button variant="outline" icon={<X className="h-4 w-4" />} onClick={reset}>
              Chọn file khác
            </Button>
            <Button
              loading={importing}
              disabled={totalRecords === 0}
              icon={<Upload className="h-4 w-4" />}
              onClick={handleImport}
            >
              Nhập {totalRecords} bản ghi
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tổ công đoàn" value={payload.groups.length} />
        <StatCard label="Đoàn viên" value={payload.members.length} />
        <StatCard label="Hoạt động" value={payload.activities.length} />
        <StatCard label="Bản ghi điểm danh" value={payload.attendance.length} />
      </div>

      {payload.issues.length > 0 && (
        <Card className="border-accent/40 bg-accent-muted/40">
          <CardBody className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-accent">Cần kiểm tra lại một số dòng</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground/80">
                {payload.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      )}

      {result && (
        <Card className="border-primary/30 bg-primary-muted/40">
          <CardBody className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-primary">Đã ghi vào cơ sở dữ liệu</p>
              <p className="mt-1 text-sm">
                {result.inserted.groups} tổ · {result.inserted.members} đoàn viên ·{' '}
                {result.inserted.activities} hoạt động · {result.inserted.attendance} bản ghi điểm danh.
              </p>
              {result.warnings.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {sheets.map((sheet, sheetIndex) => (
        <SheetCard
          key={`${sheet.name}-${sheetIndex}`}
          sheet={sheet}
          config={configs[sheetIndex]}
          onKindChange={(kind) => setKind(sheetIndex, kind)}
          onColumnChange={(fieldKey, columnIndex) => setColumn(sheetIndex, fieldKey, columnIndex)}
        />
      ))}
    </div>
  );
}

function SheetCard({
  sheet,
  config,
  onKindChange,
  onColumnChange,
}: {
  sheet: SheetData;
  config: SheetConfig;
  onKindChange: (kind: EntityKind) => void;
  onColumnChange: (fieldKey: string, columnIndex: number) => void;
}) {
  const entity = getEntity(config.kind);
  const preview = sheet.rows.slice(0, 5);
  const mappedColumns = new Set(Object.values(config.columns).filter((i) => i >= 0));

  return (
    <Card>
      <CardHeader
        title={sheet.name}
        description={`${sheet.rows.length} dòng dữ liệu · ${sheet.headers.length} cột`}
        actions={
          <div className="flex items-center gap-2">
            {config.kind === 'skip' ? (
              <Badge>Bỏ qua</Badge>
            ) : (
              <Badge tone="primary">{entity?.label}</Badge>
            )}
            <Select
              aria-label={`Loại dữ liệu của sheet ${sheet.name}`}
              value={config.kind}
              onChange={(e) => onKindChange(e.target.value as EntityKind)}
              className="w-56"
            >
              <option value="skip">Bỏ qua sheet này</option>
              {ENTITIES.map((ent) => (
                <option key={ent.kind} value={ent.kind}>
                  {ent.label}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {entity && (
        <CardBody className="border-b border-border">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {entity.fields.map((field) => (
              <Field
                key={field.key}
                label={field.required ? `${field.label} *` : field.label}
                hint={
                  config.columns[field.key] >= 0
                    ? undefined
                    : field.required
                      ? 'Chưa ghép cột, các dòng sẽ bị bỏ qua'
                      : 'Không dùng'
                }
              >
                <Select
                  value={config.columns[field.key] ?? -1}
                  onChange={(e) => onColumnChange(field.key, Number(e.target.value))}
                >
                  <option value={-1}>— Không dùng —</option>
                  {sheet.headers.map((header, index) => (
                    <option key={index} value={index}>
                      {header}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          {config.kind === 'matrix' && (
            <p className="mt-3 text-sm text-muted-foreground">
              Các cột không được ghép ở trên sẽ được hiểu là hoạt động. Ô chứa{' '}
              <Code>x</Code>, <Code>v</Code> hoặc <Code>1</Code> nghĩa là đoàn viên có tham gia.
            </p>
          )}
        </CardBody>
      )}

      {preview.length > 0 ? (
        <TableWrap className="border-t-0">
          <thead>
            <tr>
              {sheet.headers.map((header, index) => (
                <Th
                  key={index}
                  className={mappedColumns.has(index) ? 'text-primary' : undefined}
                >
                  {header}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, rowIndex) => (
              <Tr key={rowIndex}>
                {sheet.headers.map((_, colIndex) => (
                  <Td
                    key={colIndex}
                    className={
                      mappedColumns.has(colIndex)
                        ? 'whitespace-nowrap font-medium'
                        : 'whitespace-nowrap text-muted-foreground'
                    }
                  >
                    {cellText(row[colIndex]) || '—'}
                  </Td>
                ))}
              </Tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState title="Sheet này không có dòng dữ liệu nào" />
      )}
    </Card>
  );
}
