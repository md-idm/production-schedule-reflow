# Types

## Goal

Create TypeScript interfaces for the production schedule reflow system.

## Prompt

Update `src/reflow/types.ts` to match the technical assignment exactly.

Requirements:

- Use interfaces only.
- Keep everything simple and readable.
- Do not use classes.
- Do not use generics.

Core types:

- `Shift`
  - `dayOfWeek: number`
  - `startHour: number`
  - `endHour: number`

- `MaintenanceWindow`
  - `startDate: string`
  - `endDate: string`
  - `reason?: string`

Work order:

- `workOrderNumber: string`
- `manufacturingOrderId: string`
- `workCenterId: string`
- `startDate: string`
- `endDate: string`
- `durationMinutes: number`
- `isMaintenance: boolean`
- `dependsOnWorkOrderIds: string[]`

Work center:

- `name: string`
- `shifts: Shift[]`
- `maintenanceWindows: MaintenanceWindow[]`

Manufacturing order:

- `manufacturingOrderNumber: string`
- `itemId: string`
- `quantity: number`
- `dueDate: string`

Document wrappers:

- `WorkOrderDocument`
  - `docId: string`
  - `docType: 'workOrder'`
  - `data: WorkOrderData`

- `WorkCenterDocument`
  - `docId: string`
  - `docType: 'workCenter'`
  - `data: WorkCenterData`

- `ManufacturingOrderDocument`
  - `docId: string`
  - `docType: 'manufacturingOrder'`
  - `data: ManufacturingOrderData`

Scheduler types:

- `ReflowInput`
- `ScheduleChange`
- `ReflowResult`

`ScheduleChange` should include:

- `workOrderId`
- `oldStartDate`
- `oldEndDate`
- `newStartDate`
- `newEndDate`
- `delayMinutes`
- `reason`

Dates should stay as ISO 8601 strings.
