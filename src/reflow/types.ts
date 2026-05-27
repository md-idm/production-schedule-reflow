/** Operating hours for a work center on a given day of the week (0 = Sunday). */
export interface Shift {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

/** Blocked period when a work center cannot run production. */
export interface MaintenanceWindow {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  reason?: string;
}

export interface WorkOrderData {
  workOrderNumber: string;
  manufacturingOrderId: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  durationMinutes: number;
  workCenterId: string;
  /** Work orders that must finish before this one can start. */
  dependsOnWorkOrderIds: string[];
  /** True when this order represents maintenance rather than production. */
  isMaintenance: boolean;
}

export interface WorkCenterData {
  name: string;
  shifts: Shift[];
  maintenanceWindows: MaintenanceWindow[];
}

export interface ManufacturingOrderData {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string; // ISO 8601
}

export interface WorkOrderDocument {
  docId: string;
  docType: 'workOrder';
  data: WorkOrderData;
}

export interface WorkCenterDocument {
  docId: string;
  docType: 'workCenter';
  data: WorkCenterData;
}

export interface ManufacturingOrderDocument {
  docId: string;
  docType: 'manufacturingOrder';
  data: ManufacturingOrderData;
}

export interface ReflowInput {
  workOrders: WorkOrderDocument[];
  workCenters: WorkCenterDocument[];
  manufacturingOrders: ManufacturingOrderDocument[];
  /** Work order whose schedule change triggered the reflow. */
  triggerWorkOrderId: string;
}

export interface ScheduleChange {
  workOrderId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  reason: string;
  delayMinutes: number;
}

export interface ReflowResult {
  workOrders: WorkOrderDocument[];
  changes: ScheduleChange[];
}
