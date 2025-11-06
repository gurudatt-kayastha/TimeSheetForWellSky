export type TimesheetStatus = 'PENDING' | 'APPROVED' | 'REJECTED';


export interface TimesheetEntry {
id: string;
date: string; 
user: string;
comment?: string;
createdDate: string; 
unit: number;
project: string;
activity: string;
status: TimesheetStatus;
}