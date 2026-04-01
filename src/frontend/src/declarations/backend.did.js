/* eslint-disable */
// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

export const idlFactory = ({ IDL: _IDL }) => {
  const RateHistoryEntry = _IDL.Record({
    'changedAt' : _IDL.Int,
    'rate' : _IDL.Float64,
  });
  const RawMaterial = _IDL.Record({
    'id' : _IDL.Text,
    'createdAt' : _IDL.Int,
    'size' : _IDL.Text,
    'currentRate' : _IDL.Float64,
    'rateHistory' : _IDL.Vec(RateHistoryEntry),
    'grade' : _IDL.Text,
    'materialType' : _IDL.Text,
    'weightPerMeter' : _IDL.Float64,
  });
  const Customer = _IDL.Record({
    'id' : _IDL.Text,
    'name' : _IDL.Text,
    'createdAt' : _IDL.Int,
    'email' : _IDL.Text,
    'address' : _IDL.Text,
    'phone' : _IDL.Text,
  });
  const Job = _IDL.Record({
    'id' : _IDL.Text,
    'name' : _IDL.Text,
    'createdAt' : _IDL.Int,
    'dispatchQty' : _IDL.Float64,
    'transportIncluded' : _IDL.Bool,
    'transportCost' : _IDL.Float64,
    'customerId' : _IDL.Opt(_IDL.Text),
    'laborRate' : _IDL.Float64,
  });
  const JobLineItem = _IDL.Record({
    'finalPrice' : _IDL.Float64,
    'lengthMeters' : _IDL.Float64,
    'rawWeight' : _IDL.Float64,
    'materialId' : _IDL.Text,
    'totalWeight' : _IDL.Float64,
  });
  const WeldingLineItem = _IDL.Record({
    'finalPrice' : _IDL.Float64,
    'ratePerKg' : _IDL.Float64,
    'weightKg' : _IDL.Float64,
    'grade' : _IDL.Text,
  });
  const SavedJob = _IDL.Record({
    'job' : Job,
    'customerName' : _IDL.Opt(_IDL.Text),
    'weldingLineItems' : _IDL.Vec(WeldingLineItem),
    'ratePerKg' : _IDL.Float64,
    'jobLineItems' : _IDL.Vec(JobLineItem),
    'totalProductWeight' : _IDL.Float64,
    'totalFinalPrice' : _IDL.Float64,
  });
  const LabourJob = _IDL.Record({
    'id' : _IDL.Text,
    'createdAt' : _IDL.Int,
    'totalCost' : _IDL.Float64,
    'description' : _IDL.Text,
    'weldLength' : _IDL.Float64,
    'laborRate' : _IDL.Float64,
    'materialType' : _IDL.Text,
  });
  const FlexibleJob = _IDL.Record({
    'id' : _IDL.Text,
    'description' : _IDL.Text,
    'materialTab' : _IDL.Text,
    'centerLength' : _IDL.Float64,
    'sheetBunchWidth' : _IDL.Float64,
    'sheetThickness' : _IDL.Float64,
    'sheetCount' : _IDL.Nat,
    'barsSupplied' : _IDL.Bool,
    'barLength' : _IDL.Float64,
    'barWidth' : _IDL.Float64,
    'barThickness' : _IDL.Float64,
    'numberOfDrills' : _IDL.Nat,
    'numberOfFolds' : _IDL.Nat,
    'sheetStackWeight' : _IDL.Float64,
    'stripWeight' : _IDL.Float64,
    'bar1Weight' : _IDL.Float64,
    'bar2Weight' : _IDL.Float64,
    'totalMaterialWeight' : _IDL.Float64,
    'materialCost' : _IDL.Float64,
    'cuttingCost' : _IDL.Float64,
    'foldingCost' : _IDL.Float64,
    'drillingCost' : _IDL.Float64,
    'weldingCost' : _IDL.Float64,
    'chamferingCost' : _IDL.Float64,
    'totalWeldLength' : _IDL.Float64,
    'overheadCost' : _IDL.Float64,
    'profitCost' : _IDL.Float64,
    'totalCost' : _IDL.Float64,
    'discountPct' : _IDL.Float64,
    'quotedPrice' : _IDL.Float64,
    'createdAt' : _IDL.Int,
  });
  const AlWeldingJob = _IDL.Record({
    'id' : _IDL.Text,
    'description' : _IDL.Text,
    'numJoints' : _IDL.Nat,
    'numBrackets' : _IDL.Nat,
    'numDummy' : _IDL.Nat,
    'weldLengthEachMm' : _IDL.Float64,
    'thickness' : _IDL.Float64,
    'laborCostPer2mm' : _IDL.Float64,
    'totalFullLength' : _IDL.Float64,
    'totalWeldLines' : _IDL.Nat,
    'adjustedLaborCost' : _IDL.Float64,
    'totalCost' : _IDL.Float64,
    'costPerFullLength' : _IDL.Float64,
    'createdAt' : _IDL.Int,
  });
  const UserProfile = _IDL.Record({ 'name' : _IDL.Text });
  const UserRole = _IDL.Variant({ 'admin' : _IDL.Null, 'user' : _IDL.Null });
  return _IDL.Service({
    'addMaterial' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Float64], [RawMaterial], []),
    'updateMaterial' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Float64], [RawMaterial], []),
    'deleteMaterial' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getMaterials' : _IDL.Func([], [_IDL.Vec(RawMaterial)], ['query']),
    'getMaterial' : _IDL.Func([_IDL.Text], [RawMaterial], ['query']),
    'deleteRateHistoryEntry' : _IDL.Func([_IDL.Text, _IDL.Nat], [RawMaterial], []),
    'addCustomer' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Text, _IDL.Text], [Customer], []),
    'updateCustomer' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Text, _IDL.Text, _IDL.Text], [Customer], []),
    'deleteCustomer' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getCustomers' : _IDL.Func([], [_IDL.Vec(Customer)], ['query']),
    'getCustomer' : _IDL.Func([_IDL.Text], [Customer], ['query']),
    'saveJob' : _IDL.Func([_IDL.Text, _IDL.Float64, _IDL.Bool, _IDL.Opt(_IDL.Text), _IDL.Float64, _IDL.Float64, _IDL.Vec(JobLineItem), _IDL.Vec(WeldingLineItem), _IDL.Float64, _IDL.Float64, _IDL.Float64], [SavedJob], []),
    'updateJob' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Bool, _IDL.Opt(_IDL.Text), _IDL.Float64, _IDL.Float64, _IDL.Vec(JobLineItem), _IDL.Vec(WeldingLineItem), _IDL.Float64, _IDL.Float64, _IDL.Float64], [SavedJob], []),
    'deleteJob' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getJobs' : _IDL.Func([], [_IDL.Vec(SavedJob)], ['query']),
    'getJob' : _IDL.Func([_IDL.Text], [SavedJob], ['query']),
    'saveLabourJob' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Float64, _IDL.Float64], [LabourJob], []),
    'deleteLabourJob' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getLabourJobs' : _IDL.Func([], [_IDL.Vec(LabourJob)], ['query']),
    'saveFlexibleJob' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Nat, _IDL.Bool, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Nat, _IDL.Nat, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64], [FlexibleJob], []),
    'updateFlexibleJob' : _IDL.Func([_IDL.Text, _IDL.Text, _IDL.Text, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Nat, _IDL.Bool, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Nat, _IDL.Nat, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64], [FlexibleJob], []),
    'deleteFlexibleJob' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getFlexibleJobs' : _IDL.Func([], [_IDL.Vec(FlexibleJob)], ['query']),
    'saveAlWeldingJob' : _IDL.Func([_IDL.Text, _IDL.Nat, _IDL.Nat, _IDL.Nat, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Float64, _IDL.Nat, _IDL.Float64, _IDL.Float64, _IDL.Float64], [AlWeldingJob], []),
    'deleteAlWeldingJob' : _IDL.Func([_IDL.Text], [_IDL.Bool], []),
    'getAlWeldingJobs' : _IDL.Func([], [_IDL.Vec(AlWeldingJob)], ['query']),
    'saveCallerUserProfile' : _IDL.Func([UserProfile], [], []),
    'getCallerUserProfile' : _IDL.Func([], [_IDL.Opt(UserProfile)], ['query']),
    'getUserProfile' : _IDL.Func([_IDL.Principal], [_IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : _IDL.Func([], [UserRole], ['query']),
    'isCallerAdmin' : _IDL.Func([], [_IDL.Bool], ['query']),
  });
};
export const init = ({ IDL: _IDL }) => { return []; };
