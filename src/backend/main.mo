import Map "mo:core/Map";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";

actor {

  // ===== Legacy stable vars kept for upgrade compatibility =====
  // These existed in prior deployments. They cannot be dropped without
  // an explicit migration, so we keep them as unused stubs.

  let accessControlState = AccessControl.initState();
  let userProfiles = Map.empty<Principal, { name : Text }>();

  type AppUser = {
    id : Text;
    username : Text;
    password : Text;
    role : Text;
    status : Text;
    discountPct : Float;
    createdAt : Int;
  };

  let appUsers = Map.empty<Text, AppUser>();
  var userNextId = 0;

  // Legacy V1 flexible job type
  type FlexibleJobV1 = {
    id : Text;
    description : Text;
    materialTab : Text;
    sheetBunchWidth : Float;
    thickness : Float;
    numBars : Nat;
    weldingCost : Float;
    chamferingCost : Float;
    overheadCost : Float;
    profitCost : Float;
    totalCost : Float;
    customerId : ?Text;
    customerName : ?Text;
    createdAt : Int;
  };

  // Legacy V2 flexible job type
  type FlexibleJobV2 = {
    id : Text;
    description : Text;
    materialTab : Text;
    centerLength : Float;
    sheetBunchWidth : Float;
    sheetThickness : Float;
    sheetCount : Nat;
    barsSupplied : Bool;
    barLength : Float;
    barWidth : Float;
    barThickness : Float;
    numberOfDrills : Nat;
    numberOfFolds : Nat;
    sheetStackWeight : Float;
    stripWeight : Float;
    bar1Weight : Float;
    bar2Weight : Float;
    totalMaterialWeight : Float;
    materialCost : Float;
    cuttingCost : Float;
    foldingCost : Float;
    drillingCost : Float;
    weldingCost : Float;
    chamferingCost : Float;
    totalWeldLength : Float;
    overheadCost : Float;
    profitCost : Float;
    totalCost : Float;
    customerId : ?Text;
    customerName : ?Text;
    createdAt : Int;
  };

  // Legacy V3 flexible job type (had customerId)
  type FlexibleJobV3 = {
    id : Text;
    description : Text;
    materialTab : Text;
    centerLength : Float;
    sheetBunchWidth : Float;
    sheetThickness : Float;
    sheetCount : Nat;
    barsSupplied : Bool;
    barLength : Float;
    barWidth : Float;
    barThickness : Float;
    numberOfDrills : Nat;
    numberOfFolds : Nat;
    sheetStackWeight : Float;
    stripWeight : Float;
    bar1Weight : Float;
    bar2Weight : Float;
    totalMaterialWeight : Float;
    materialCost : Float;
    cuttingCost : Float;
    foldingCost : Float;
    drillingCost : Float;
    weldingCost : Float;
    chamferingCost : Float;
    totalWeldLength : Float;
    overheadCost : Float;
    profitCost : Float;
    totalCost : Float;
    discountPct : Float;
    quotedPrice : Float;
    customerId : ?Text;
    customerName : ?Text;
    createdAt : Int;
  };

  // Legacy LabourJob type (had customerId)
  type LabourJobLegacy = {
    id : Text;
    description : Text;
    customerId : ?Text;
    customerName : ?Text;
    materialType : Text;
    weldLength : Float;
    laborRate : Float;
    totalCost : Float;
    createdAt : Int;
  };

  // These are the legacy stable maps -- kept under the SAME names as the
  // previous deployment to avoid M0169/M0170 upgrade compatibility errors.
  let flexibleJobs = Map.empty<Text, FlexibleJobV1>();
  let flexibleJobsV2 = Map.empty<Text, FlexibleJobV2>();
  let flexibleJobsV3 = Map.empty<Text, FlexibleJobV3>();
  let labourJobs = Map.empty<Text, LabourJobLegacy>();

  // ===== ID generator =====

  var nextId = 0;

  func generateId() : Text {
    let id = nextId;
    nextId += 1;
    id.toText();
  };

  // ===== Raw Materials =====

  type RateHistoryEntry = {
    rate : Float;
    changedAt : Int;
  };

  type RawMaterial = {
    id : Text;
    grade : Text;
    materialType : Text;
    size : Text;
    weightPerMeter : Float;
    currentRate : Float;
    rateHistory : [RateHistoryEntry];
    createdAt : Int;
  };

  module RawMaterial {
    public func compare(a : RawMaterial, b : RawMaterial) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let rawMaterials = Map.empty<Text, RawMaterial>();

  func getRawMaterialInternal(id : Text) : RawMaterial {
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material with id " # id # " does not exist") };
      case (?m) { m };
    };
  };

  public shared func addMaterial(
    grade : Text,
    materialType : Text,
    size : Text,
    weightPerMeter : Float,
    currentRate : Float,
  ) : async RawMaterial {
    let id = generateId();
    let m : RawMaterial = {
      id; grade; materialType; size; weightPerMeter; currentRate;
      rateHistory = [];
      createdAt = Time.now();
    };
    rawMaterials.add(id, m);
    m;
  };

  public shared func updateMaterial(
    id : Text,
    grade : Text,
    materialType : Text,
    size : Text,
    weightPerMeter : Float,
    currentRate : Float,
  ) : async RawMaterial {
    let old = getRawMaterialInternal(id);
    let newHistory = if (old.currentRate != currentRate) {
      old.rateHistory.concat([{ rate = old.currentRate; changedAt = Time.now() }]);
    } else {
      old.rateHistory;
    };
    let updated : RawMaterial = {
      id; grade; materialType; size; weightPerMeter; currentRate;
      rateHistory = newHistory;
      createdAt = old.createdAt;
    };
    rawMaterials.add(id, updated);
    updated;
  };

  public shared func deleteRateHistoryEntry(materialId : Text, index : Nat) : async RawMaterial {
    let mat = getRawMaterialInternal(materialId);
    let history = mat.rateHistory;
    let newHistory = Array.tabulate(
      if (history.size() == 0) { 0 } else { history.size() - 1 },
      func(i) { if (i < index) { history[i] } else { history[i + 1] } },
    );
    let updated : RawMaterial = {
      id = mat.id;
      grade = mat.grade;
      materialType = mat.materialType;
      size = mat.size;
      weightPerMeter = mat.weightPerMeter;
      currentRate = mat.currentRate;
      rateHistory = newHistory;
      createdAt = mat.createdAt;
    };
    rawMaterials.add(mat.id, updated);
    updated;
  };

  public shared func deleteMaterial(id : Text) : async Bool {
    ignore getRawMaterialInternal(id);
    rawMaterials.remove(id);
    true;
  };

  public query func getMaterials() : async [RawMaterial] {
    rawMaterials.values().toArray().sort();
  };

  public query func getMaterial(id : Text) : async RawMaterial {
    getRawMaterialInternal(id);
  };

  // ===== Customers =====

  type Customer = {
    id : Text;
    name : Text;
    phone : Text;
    email : Text;
    address : Text;
    createdAt : Int;
  };

  module Customer {
    public func compare(a : Customer, b : Customer) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let customers = Map.empty<Text, Customer>();

  func getCustomerInternal(id : Text) : Customer {
    switch (customers.get(id)) {
      case (null) { Runtime.trap("Customer with id " # id # " does not exist") };
      case (?c) { c };
    };
  };

  public shared func addCustomer(name : Text, phone : Text, email : Text, address : Text) : async Customer {
    let id = generateId();
    let c : Customer = { id; name; phone; email; address; createdAt = Time.now() };
    customers.add(id, c);
    c;
  };

  public shared func updateCustomer(id : Text, name : Text, phone : Text, email : Text, address : Text) : async Customer {
    let old = getCustomerInternal(id);
    let updated : Customer = { id; name; phone; email; address; createdAt = old.createdAt };
    customers.add(id, updated);
    updated;
  };

  public shared func deleteCustomer(id : Text) : async Bool {
    ignore getCustomerInternal(id);
    customers.remove(id);
    true;
  };

  public query func getCustomers() : async [Customer] {
    customers.values().toArray().sort();
  };

  public query func getCustomer(id : Text) : async Customer {
    getCustomerInternal(id);
  };

  // ===== SS Fabrication Jobs =====

  type Job = {
    id : Text;
    name : Text;
    laborRate : Float;
    transportIncluded : Bool;
    customerId : ?Text;
    transportCost : Float;
    dispatchQty : Float;
    createdAt : Int;
  };

  module Job {
    public func compare(a : Job, b : Job) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  type JobLineItem = {
    materialId : Text;
    lengthMeters : Float;
    rawWeight : Float;
    totalWeight : Float;
    finalPrice : Float;
  };

  type WeldingLineItem = {
    grade : Text;
    ratePerKg : Float;
    weightKg : Float;
    finalPrice : Float;
  };

  type SavedJob = {
    job : Job;
    jobLineItems : [JobLineItem];
    weldingLineItems : [WeldingLineItem];
    totalFinalPrice : Float;
    totalProductWeight : Float;
    ratePerKg : Float;
    customerName : ?Text;
  };

  let jobs = Map.empty<Text, SavedJob>();

  public shared func saveJob(
    name : Text,
    laborRate : Float,
    transportIncluded : Bool,
    customerId : ?Text,
    transportCost : Float,
    dispatchQty : Float,
    jobLineItems : [JobLineItem],
    weldingLineItems : [WeldingLineItem],
    totalFinalPrice : Float,
    totalProductWeight : Float,
    ratePerKg : Float,
  ) : async SavedJob {
    let id = generateId();
    let job : Job = { id; name; laborRate; transportIncluded; customerId; transportCost; dispatchQty; createdAt = Time.now() };
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?c) { ?c.name };
        };
      };
    };
    let saved : SavedJob = { job; jobLineItems; weldingLineItems; totalFinalPrice; totalProductWeight; ratePerKg; customerName };
    jobs.add(id, saved);
    saved;
  };

  public shared func updateJob(
    id : Text,
    name : Text,
    laborRate : Float,
    transportIncluded : Bool,
    customerId : ?Text,
    transportCost : Float,
    dispatchQty : Float,
    jobLineItems : [JobLineItem],
    weldingLineItems : [WeldingLineItem],
    totalFinalPrice : Float,
    totalProductWeight : Float,
    ratePerKg : Float,
  ) : async SavedJob {
    let existing = switch (jobs.get(id)) {
      case (null) { Runtime.trap("Job with id " # id # " does not exist") };
      case (?j) { j };
    };
    let job : Job = { id; name; laborRate; transportIncluded; customerId; transportCost; dispatchQty; createdAt = existing.job.createdAt };
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?c) { ?c.name };
        };
      };
    };
    let saved : SavedJob = { job; jobLineItems; weldingLineItems; totalFinalPrice; totalProductWeight; ratePerKg; customerName };
    jobs.add(id, saved);
    saved;
  };

  public query func getJobs() : async [SavedJob] {
    jobs.values().toArray();
  };

  public query func getJob(id : Text) : async SavedJob {
    switch (jobs.get(id)) {
      case (null) { Runtime.trap("Job with id " # id # " does not exist") };
      case (?j) { j };
    };
  };

  public shared func deleteJob(id : Text) : async Bool {
    switch (jobs.get(id)) {
      case (null) { false };
      case (_) { jobs.remove(id); true };
    };
  };

  // ===== Labour Jobs (new -- no customerId) =====

  type LabourJob = {
    id : Text;
    description : Text;
    materialType : Text;
    weldLength : Float;
    laborRate : Float;
    totalCost : Float;
    createdAt : Int;
  };

  module LabourJob {
    public func compare(a : LabourJob, b : LabourJob) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  // Uses a new map name to avoid conflict with legacy labourJobs
  let labourJobsV2 = Map.empty<Text, LabourJob>();

  public shared func saveLabourJob(
    description : Text,
    materialType : Text,
    weldLength : Float,
    laborRate : Float,
    totalCost : Float,
  ) : async LabourJob {
    let id = generateId();
    let lj : LabourJob = {
      id; description; materialType; weldLength; laborRate; totalCost;
      createdAt = Time.now();
    };
    labourJobsV2.add(id, lj);
    lj;
  };

  public query func getLabourJobs() : async [LabourJob] {
    labourJobsV2.values().toArray().sort();
  };

  public shared func deleteLabourJob(id : Text) : async Bool {
    switch (labourJobsV2.get(id)) {
      case (null) { false };
      case (_) { labourJobsV2.remove(id); true };
    };
  };

  // ===== Flexible Jobs (new -- no customerId) =====

  type FlexibleJob = {
    id : Text;
    description : Text;
    materialTab : Text;
    centerLength : Float;
    sheetBunchWidth : Float;
    sheetThickness : Float;
    sheetCount : Nat;
    barsSupplied : Bool;
    barLength : Float;
    barWidth : Float;
    barThickness : Float;
    numberOfDrills : Nat;
    numberOfFolds : Nat;
    sheetStackWeight : Float;
    stripWeight : Float;
    bar1Weight : Float;
    bar2Weight : Float;
    totalMaterialWeight : Float;
    materialCost : Float;
    cuttingCost : Float;
    foldingCost : Float;
    drillingCost : Float;
    weldingCost : Float;
    chamferingCost : Float;
    totalWeldLength : Float;
    overheadCost : Float;
    profitCost : Float;
    totalCost : Float;
    discountPct : Float;
    quotedPrice : Float;
    createdAt : Int;
  };

  module FlexibleJob {
    public func compare(a : FlexibleJob, b : FlexibleJob) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  // Uses a new map name to avoid conflict with legacy flexibleJobs/V2/V3
  let flexibleJobsV4 = Map.empty<Text, FlexibleJob>();

  public shared func saveFlexibleJob(
    description : Text,
    materialTab : Text,
    centerLength : Float,
    sheetBunchWidth : Float,
    sheetThickness : Float,
    sheetCount : Nat,
    barsSupplied : Bool,
    barLength : Float,
    barWidth : Float,
    barThickness : Float,
    numberOfDrills : Nat,
    numberOfFolds : Nat,
    sheetStackWeight : Float,
    stripWeight : Float,
    bar1Weight : Float,
    bar2Weight : Float,
    totalMaterialWeight : Float,
    materialCost : Float,
    cuttingCost : Float,
    foldingCost : Float,
    drillingCost : Float,
    weldingCost : Float,
    chamferingCost : Float,
    totalWeldLength : Float,
    overheadCost : Float,
    profitCost : Float,
    totalCost : Float,
    discountPct : Float,
    quotedPrice : Float,
  ) : async FlexibleJob {
    let id = generateId();
    let fj : FlexibleJob = {
      id; description; materialTab; centerLength; sheetBunchWidth; sheetThickness;
      sheetCount; barsSupplied; barLength; barWidth; barThickness; numberOfDrills;
      numberOfFolds; sheetStackWeight; stripWeight; bar1Weight; bar2Weight;
      totalMaterialWeight; materialCost; cuttingCost; foldingCost; drillingCost;
      weldingCost; chamferingCost; totalWeldLength; overheadCost; profitCost;
      totalCost; discountPct; quotedPrice;
      createdAt = Time.now();
    };
    flexibleJobsV4.add(id, fj);
    fj;
  };

  public shared func updateFlexibleJob(
    id : Text,
    description : Text,
    materialTab : Text,
    centerLength : Float,
    sheetBunchWidth : Float,
    sheetThickness : Float,
    sheetCount : Nat,
    barsSupplied : Bool,
    barLength : Float,
    barWidth : Float,
    barThickness : Float,
    numberOfDrills : Nat,
    numberOfFolds : Nat,
    sheetStackWeight : Float,
    stripWeight : Float,
    bar1Weight : Float,
    bar2Weight : Float,
    totalMaterialWeight : Float,
    materialCost : Float,
    cuttingCost : Float,
    foldingCost : Float,
    drillingCost : Float,
    weldingCost : Float,
    chamferingCost : Float,
    totalWeldLength : Float,
    overheadCost : Float,
    profitCost : Float,
    totalCost : Float,
    discountPct : Float,
    quotedPrice : Float,
  ) : async FlexibleJob {
    let existing = switch (flexibleJobsV4.get(id)) {
      case (null) { Runtime.trap("Flexible job with id " # id # " does not exist") };
      case (?j) { j };
    };
    let fj : FlexibleJob = {
      id; description; materialTab; centerLength; sheetBunchWidth; sheetThickness;
      sheetCount; barsSupplied; barLength; barWidth; barThickness; numberOfDrills;
      numberOfFolds; sheetStackWeight; stripWeight; bar1Weight; bar2Weight;
      totalMaterialWeight; materialCost; cuttingCost; foldingCost; drillingCost;
      weldingCost; chamferingCost; totalWeldLength; overheadCost; profitCost;
      totalCost; discountPct; quotedPrice;
      createdAt = existing.createdAt;
    };
    flexibleJobsV4.add(id, fj);
    fj;
  };

  public query func getFlexibleJobs() : async [FlexibleJob] {
    flexibleJobsV4.values().toArray().sort();
  };

  public shared func deleteFlexibleJob(id : Text) : async Bool {
    switch (flexibleJobsV4.get(id)) {
      case (null) { false };
      case (_) { flexibleJobsV4.remove(id); true };
    };
  };

  // ===== Aluminium Welding Jobs =====

  type AlWeldingJob = {
    id : Text;
    description : Text;
    numJoints : Nat;
    numBrackets : Nat;
    numDummy : Nat;
    weldLengthEachMm : Float;
    thickness : Float;
    laborCostPer2mm : Float;
    totalFullLength : Float;
    totalWeldLines : Nat;
    adjustedLaborCost : Float;
    totalCost : Float;
    costPerFullLength : Float;
    createdAt : Int;
  };

  module AlWeldingJob {
    public func compare(a : AlWeldingJob, b : AlWeldingJob) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let alWeldingJobs = Map.empty<Text, AlWeldingJob>();

  public shared func saveAlWeldingJob(
    description : Text,
    numJoints : Nat,
    numBrackets : Nat,
    numDummy : Nat,
    weldLengthEachMm : Float,
    thickness : Float,
    laborCostPer2mm : Float,
    totalFullLength : Float,
    totalWeldLines : Nat,
    adjustedLaborCost : Float,
    totalCost : Float,
    costPerFullLength : Float,
  ) : async AlWeldingJob {
    let id = generateId();
    let job : AlWeldingJob = {
      id; description; numJoints; numBrackets; numDummy; weldLengthEachMm;
      thickness; laborCostPer2mm; totalFullLength; totalWeldLines;
      adjustedLaborCost; totalCost; costPerFullLength;
      createdAt = Time.now();
    };
    alWeldingJobs.add(id, job);
    job;
  };

  public query func getAlWeldingJobs() : async [AlWeldingJob] {
    alWeldingJobs.values().toArray().sort();
  };

  public shared func deleteAlWeldingJob(id : Text) : async Bool {
    switch (alWeldingJobs.get(id)) {
      case (null) { false };
      case (_) { alWeldingJobs.remove(id); true };
    };
  };

  // ===== Legacy stubs for interface compatibility =====
  type UserProfile = { name : Text };
  type UserRole = { #admin; #user };
  public shared func saveCallerUserProfile(_profile : UserProfile) : async () {};
  public query func getCallerUserProfile() : async ?UserProfile { null };
  public query func getUserProfile(_user : Principal) : async ?UserProfile { null };
  public query func getCallerUserRole() : async UserRole { #admin };
  public query func isCallerAdmin() : async Bool { true };

};
