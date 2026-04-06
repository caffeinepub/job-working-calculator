/* eslint-disable */
// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Customer {
  'id' : string,
  'name' : string,
  'createdAt' : bigint,
  'email' : string,
  'address' : string,
  'phone' : string,
}
export interface RateHistoryEntry {
  'changedAt' : bigint,
  'rate' : number,
}
export interface RawMaterial {
  'id' : string,
  'createdAt' : bigint,
  'size' : string,
  'currentRate' : number,
  'rateHistory' : Array<RateHistoryEntry>,
  'grade' : string,
  'materialType' : string,
  'weightPerMeter' : number,
}
export interface Job {
  'id' : string,
  'name' : string,
  'createdAt' : bigint,
  'dispatchQty' : number,
  'transportIncluded' : boolean,
  'transportCost' : number,
  'customerId' : [] | [string],
  'laborRate' : number,
}
export interface JobLineItem {
  'finalPrice' : number,
  'lengthMeters' : number,
  'rawWeight' : number,
  'materialId' : string,
  'totalWeight' : number,
}
export interface WeldingLineItem {
  'finalPrice' : number,
  'ratePerKg' : number,
  'weightKg' : number,
  'grade' : string,
}
export interface MachinedLineItem {
  'opType' : string,
  'drillDia' : number,
  'matThickness' : number,
  'grade' : string,
  'numberOfDrills' : bigint,
  'costPerDrill' : number,
  'weightRemoved' : number,
  'description' : string,
  'qty' : bigint,
  'costPerUnit' : number,
  'totalCost' : number,
}
export interface SavedJob {
  'job' : Job,
  'customerName' : [] | [string],
  'weldingLineItems' : Array<WeldingLineItem>,
  'machinedLineItems' : Array<MachinedLineItem>,
  'ratePerKg' : number,
  'jobLineItems' : Array<JobLineItem>,
  'totalProductWeight' : number,
  'totalFinalPrice' : number,
}
export interface LabourJob {
  'id' : string,
  'createdAt' : bigint,
  'totalCost' : number,
  'description' : string,
  'weldLength' : number,
  'laborRate' : number,
  'materialType' : string,
}
export interface FlexibleJob {
  'id' : string,
  'description' : string,
  'materialTab' : string,
  'centerLength' : number,
  'sheetBunchWidth' : number,
  'sheetThickness' : number,
  'sheetCount' : bigint,
  'barsSupplied' : boolean,
  'barLength' : number,
  'barWidth' : number,
  'barThickness' : number,
  'numberOfDrills' : bigint,
  'numberOfFolds' : bigint,
  'sheetStackWeight' : number,
  'stripWeight' : number,
  'bar1Weight' : number,
  'bar2Weight' : number,
  'totalMaterialWeight' : number,
  'materialCost' : number,
  'cuttingCost' : number,
  'foldingCost' : number,
  'drillingCost' : number,
  'weldingCost' : number,
  'chamferingCost' : number,
  'totalWeldLength' : number,
  'overheadCost' : number,
  'profitCost' : number,
  'totalCost' : number,
  'discountPct' : number,
  'quotedPrice' : number,
  'createdAt' : bigint,
}
export interface AlWeldingJob {
  'id' : string,
  'description' : string,
  'numJoints' : bigint,
  'numBrackets' : bigint,
  'numDummy' : bigint,
  'weldLengthEachMm' : number,
  'thickness' : number,
  'laborCostPer2mm' : number,
  'totalFullLength' : number,
  'totalWeldLines' : bigint,
  'adjustedLaborCost' : number,
  'totalCost' : number,
  'costPerFullLength' : number,
  'createdAt' : bigint,
}
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } | { 'user' : null };
export interface _SERVICE {
  'addMaterial' : ActorMethod<[string, string, string, number, number], RawMaterial>,
  'updateMaterial' : ActorMethod<[string, string, string, string, number, number], RawMaterial>,
  'deleteMaterial' : ActorMethod<[string], boolean>,
  'getMaterials' : ActorMethod<[], Array<RawMaterial>>,
  'getMaterial' : ActorMethod<[string], RawMaterial>,
  'deleteRateHistoryEntry' : ActorMethod<[string, bigint], RawMaterial>,
  'addCustomer' : ActorMethod<[string, string, string, string], Customer>,
  'updateCustomer' : ActorMethod<[string, string, string, string, string], Customer>,
  'deleteCustomer' : ActorMethod<[string], boolean>,
  'getCustomers' : ActorMethod<[], Array<Customer>>,
  'getCustomer' : ActorMethod<[string], Customer>,
  'saveJob' : ActorMethod<[string, number, boolean, [] | [string], number, number, Array<JobLineItem>, Array<WeldingLineItem>, Array<MachinedLineItem>, number, number, number], SavedJob>,
  'updateJob' : ActorMethod<[string, string, number, boolean, [] | [string], number, number, Array<JobLineItem>, Array<WeldingLineItem>, Array<MachinedLineItem>, number, number, number], SavedJob>,
  'deleteJob' : ActorMethod<[string], boolean>,
  'getJobs' : ActorMethod<[], Array<SavedJob>>,
  'getJob' : ActorMethod<[string], SavedJob>,
  'saveLabourJob' : ActorMethod<[string, string, number, number, number], LabourJob>,
  'deleteLabourJob' : ActorMethod<[string], boolean>,
  'getLabourJobs' : ActorMethod<[], Array<LabourJob>>,
  'saveFlexibleJob' : ActorMethod<[string, string, number, number, number, bigint, boolean, number, number, number, bigint, bigint, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number], FlexibleJob>,
  'updateFlexibleJob' : ActorMethod<[string, string, string, number, number, number, bigint, boolean, number, number, number, bigint, bigint, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number], FlexibleJob>,
  'deleteFlexibleJob' : ActorMethod<[string], boolean>,
  'getFlexibleJobs' : ActorMethod<[], Array<FlexibleJob>>,
  'saveAlWeldingJob' : ActorMethod<[string, bigint, bigint, bigint, number, number, number, number, bigint, number, number, number], AlWeldingJob>,
  'deleteAlWeldingJob' : ActorMethod<[string], boolean>,
  'getAlWeldingJobs' : ActorMethod<[], Array<AlWeldingJob>>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
