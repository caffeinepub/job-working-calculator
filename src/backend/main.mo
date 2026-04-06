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

  type FlexibleJobV1 = {
    id : Text; description : Text; materialTab : Text;
    sheetBunchWidth : Float; thickness : Float; numBars : Nat;
    weldingCost : Float; chamferingCost : Float; overheadCost : Float;
    profitCost : Float; totalCost : Float; customerId : ?Text;
    customerName : ?Text; createdAt : Int;
  };

  type FlexibleJobV2 = {
    id : Text; description : Text; materialTab : Text;
    centerLength : Float; sheetBunchWidth : Float; sheetThickness : Float;
    sheetCount : Nat; barsSupplied : Bool; barLength : Float;
    barWidth : Float; barThickness : Float; numberOfDrills : Nat;
    numberOfFolds : Nat; sheetStackWeight : Float; stripWeight : Float;
    bar1Weight : Float; bar2Weight : Float; totalMaterialWeight : Float;
    materialCost : Float; cuttingCost : Float; foldingCost : Float;
    drillingCost : Float; weldingCost : Float; chamferingCost : Float;
    totalWeldLength : Float; overheadCost : Float; profitCost : Float;
    totalCost : Float; customerId : ?Text; customerName : ?Text; createdAt : Int;
  };

  type FlexibleJobV3 = {
    id : Text; description : Text; materialTab : Text;
    centerLength : Float; sheetBunchWidth : Float; sheetThickness : Float;
    sheetCount : Nat; barsSupplied : Bool; barLength : Float;
    barWidth : Float; barThickness : Float; numberOfDrills : Nat;
    numberOfFolds : Nat; sheetStackWeight : Float; stripWeight : Float;
    bar1Weight : Float; bar2Weight : Float; totalMaterialWeight : Float;
    materialCost : Float; cuttingCost : Float; foldingCost : Float;
    drillingCost : Float; weldingCost : Float; chamferingCost : Float;
    totalWeldLength : Float; overheadCost : Float; profitCost : Float;
    totalCost : Float; discountPct : Float; quotedPrice : Float;
    customerId : ?Text; customerName : ?Text; createdAt : Int;
  };

  type LabourJobLegacy = {
    id : Text; description : Text; customerId : ?Text;
    customerName : ?Text; materialType : Text; weldLength : Float;
    laborRate : Float; totalCost : Float; createdAt : Int;
  };

  let flexibleJobs = Map.empty<Text, FlexibleJobV1>();
  let flexibleJobsV2 = Map.empty<Text, FlexibleJobV2>();
  let flexibleJobsV3 = Map.empty<Text, FlexibleJobV3>();
  let labourJobs = Map.empty<Text, LabourJobLegacy>();

  // ===== ID generator =====

  stable var nextId = 0;

  func generateId() : Text {
    let id = nextId;
    nextId += 1;
    id.toText();
  };

  // ===== Raw Materials =====

  type RateHistoryEntry = { rate : Float; changedAt : Int; };

  type RawMaterial = {
    id : Text; grade : Text; materialType : Text; size : Text;
    weightPerMeter : Float; currentRate : Float;
    rateHistory : [RateHistoryEntry]; createdAt : Int;
  };

  let rawMaterials = Map.empty<Text, RawMaterial>();
  stable var rawMaterials_stable : [RawMaterial] = [];

  system func preupgrade() {
    rawMaterials_stable := rawMaterials.values().toArray();
    customers_stable := customers.values().toArray();
    jobs_stable := jobs.values().toArray();
    labourJobsV2_stable := labourJobsV2.values().toArray();
    flexibleJobsV4_stable := flexibleJobsV4.values().toArray();
    alWeldingJobs_stable := alWeldingJobs.values().toArray();
  };

  system func postupgrade() {
    for (m in rawMaterials_stable.vals()) { rawMaterials.add(m.id, m); };
    for (c in customers_stable.vals()) { customers.add(c.id, c); };
    for (j in jobs_stable.vals()) { jobs.add(j.job.id, j); };
    for (lj in labourJobsV2_stable.vals()) { labourJobsV2.add(lj.id, lj); };
    for (fj in flexibleJobsV4_stable.vals()) { flexibleJobsV4.add(fj.id, fj); };
    for (aj in alWeldingJobs_stable.vals()) { alWeldingJobs.add(aj.id, aj); };
  };

  func getRawMaterialInternal(id : Text) : RawMaterial {
    switch (rawMaterials.get(id)) {
      case (null) { Runtime.trap("Raw material with id " # id # " does not exist") };
      case (?m) { m };
    };
  };

  public shared func addMaterial(
    grade : Text, materialType : Text, size : Text,
    weightPerMeter : Float, currentRate : Float,
  ) : async RawMaterial {
    let id = generateId();
    let m : RawMaterial = {
      id; grade; materialType; size; weightPerMeter; currentRate;
      rateHistory = []; createdAt = Time.now();
    };
    rawMaterials.add(id, m);
    m;
  };

  public shared func updateMaterial(
    id : Text, grade : Text, materialType : Text, size : Text,
    weightPerMeter : Float, currentRate : Float,
  ) : async RawMaterial {
    let old = getRawMaterialInternal(id);
    let newHistory = if (old.currentRate != currentRate) {
      old.rateHistory.concat([{ rate = old.currentRate; changedAt = Time.now() }]);
    } else { old.rateHistory };
    let updated : RawMaterial = {
      id; grade; materialType; size; weightPerMeter; currentRate;
      rateHistory = newHistory; createdAt = old.createdAt;
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
      id = mat.id; grade = mat.grade; materialType = mat.materialType;
      size = mat.size; weightPerMeter = mat.weightPerMeter;
      currentRate = mat.currentRate; rateHistory = newHistory;
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
    rawMaterials.values().toArray();
  };

  public query func getMaterial(id : Text) : async RawMaterial {
    getRawMaterialInternal(id);
  };

  // ===== Customers =====

  type Customer = {
    id : Text; name : Text; phone : Text; email : Text;
    address : Text; createdAt : Int;
  };

  let customers = Map.empty<Text, Customer>();
  stable var customers_stable : [Customer] = [];

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
    customers.values().toArray();
  };

  public query func getCustomer(id : Text) : async Customer {
    getCustomerInternal(id);
  };

  // ===== SS Fabrication Jobs =====

  type Job = {
    id : Text; name : Text; laborRate : Float; transportIncluded : Bool;
    customerId : ?Text; transportCost : Float; dispatchQty : Float; createdAt : Int;
  };

  type JobLineItem = {
    materialId : Text; lengthMeters : Float; rawWeight : Float;
    totalWeight : Float; finalPrice : Float;
  };

  type WeldingLineItem = {
    grade : Text; ratePerKg : Float; weightKg : Float; finalPrice : Float;
  };

  type SavedJob = {
    job : Job; jobLineItems : [JobLineItem]; weldingLineItems : [WeldingLineItem];
    totalFinalPrice : Float; totalProductWeight : Float;
    ratePerKg : Float; customerName : ?Text;
  };

  let jobs = Map.empty<Text, SavedJob>();
  stable var jobs_stable : [SavedJob] = [];

  public shared func saveJob(
    name : Text, laborRate : Float, transportIncluded : Bool,
    customerId : ?Text, transportCost : Float, dispatchQty : Float,
    jobLineItems : [JobLineItem], weldingLineItems : [WeldingLineItem],
    totalFinalPrice : Float, totalProductWeight : Float, ratePerKg : Float,
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
    id : Text, name : Text, laborRate : Float, transportIncluded : Bool,
    customerId : ?Text, transportCost : Float, dispatchQty : Float,
    jobLineItems : [JobLineItem], weldingLineItems : [WeldingLineItem],
    totalFinalPrice : Float, totalProductWeight : Float, ratePerKg : Float,
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

  // ===== Labour Jobs =====

  type LabourJob = {
    id : Text; description : Text; materialType : Text;
    weldLength : Float; laborRate : Float; totalCost : Float; createdAt : Int;
  };

  let labourJobsV2 = Map.empty<Text, LabourJob>();
  stable var labourJobsV2_stable : [LabourJob] = [];

  public shared func saveLabourJob(
    description : Text, materialType : Text, weldLength : Float,
    laborRate : Float, totalCost : Float,
  ) : async LabourJob {
    let id = generateId();
    let lj : LabourJob = { id; description; materialType; weldLength; laborRate; totalCost; createdAt = Time.now() };
    labourJobsV2.add(id, lj);
    lj;
  };

  public query func getLabourJobs() : async [LabourJob] {
    labourJobsV2.values().toArray();
  };

  public shared func deleteLabourJob(id : Text) : async Bool {
    switch (labourJobsV2.get(id)) {
      case (null) { false };
      case (_) { labourJobsV2.remove(id); true };
    };
  };

  // ===== Flexible Jobs =====

  type FlexibleJob = {
    id : Text; description : Text; materialTab : Text;
    centerLength : Float; sheetBunchWidth : Float; sheetThickness : Float;
    sheetCount : Nat; barsSupplied : Bool; barLength : Float;
    barWidth : Float; barThickness : Float; numberOfDrills : Nat;
    numberOfFolds : Nat; sheetStackWeight : Float; stripWeight : Float;
    bar1Weight : Float; bar2Weight : Float; totalMaterialWeight : Float;
    materialCost : Float; cuttingCost : Float; foldingCost : Float;
    drillingCost : Float; weldingCost : Float; chamferingCost : Float;
    totalWeldLength : Float; overheadCost : Float; profitCost : Float;
    totalCost : Float; discountPct : Float; quotedPrice : Float; createdAt : Int;
  };

  let flexibleJobsV4 = Map.empty<Text, FlexibleJob>();
  stable var flexibleJobsV4_stable : [FlexibleJob] = [];

  public shared func saveFlexibleJob(
    description : Text, materialTab : Text, centerLength : Float,
    sheetBunchWidth : Float, sheetThickness : Float, sheetCount : Nat,
    barsSupplied : Bool, barLength : Float, barWidth : Float, barThickness : Float,
    numberOfDrills : Nat, numberOfFolds : Nat, sheetStackWeight : Float,
    stripWeight : Float, bar1Weight : Float, bar2Weight : Float,
    totalMaterialWeight : Float, materialCost : Float, cuttingCost : Float,
    foldingCost : Float, drillingCost : Float, weldingCost : Float,
    chamferingCost : Float, totalWeldLength : Float, overheadCost : Float,
    profitCost : Float, totalCost : Float, discountPct : Float, quotedPrice : Float,
  ) : async FlexibleJob {
    let id = generateId();
    let fj : FlexibleJob = {
      id; description; materialTab; centerLength; sheetBunchWidth; sheetThickness;
      sheetCount; barsSupplied; barLength; barWidth; barThickness; numberOfDrills;
      numberOfFolds; sheetStackWeight; stripWeight; bar1Weight; bar2Weight;
      totalMaterialWeight; materialCost; cuttingCost; foldingCost; drillingCost;
      weldingCost; chamferingCost; totalWeldLength; overheadCost; profitCost;
      totalCost; discountPct; quotedPrice; createdAt = Time.now();
    };
    flexibleJobsV4.add(id, fj);
    fj;
  };

  public shared func updateFlexibleJob(
    id : Text, description : Text, materialTab : Text, centerLength : Float,
    sheetBunchWidth : Float, sheetThickness : Float, sheetCount : Nat,
    barsSupplied : Bool, barLength : Float, barWidth : Float, barThickness : Float,
    numberOfDrills : Nat, numberOfFolds : Nat, sheetStackWeight : Float,
    stripWeight : Float, bar1Weight : Float, bar2Weight : Float,
    totalMaterialWeight : Float, materialCost : Float, cuttingCost : Float,
    foldingCost : Float, drillingCost : Float, weldingCost : Float,
    chamferingCost : Float, totalWeldLength : Float, overheadCost : Float,
    profitCost : Float, totalCost : Float, discountPct : Float, quotedPrice : Float,
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
      totalCost; discountPct; quotedPrice; createdAt = existing.createdAt;
    };
    flexibleJobsV4.add(id, fj);
    fj;
  };

  public query func getFlexibleJobs() : async [FlexibleJob] {
    flexibleJobsV4.values().toArray();
  };

  public shared func deleteFlexibleJob(id : Text) : async Bool {
    switch (flexibleJobsV4.get(id)) {
      case (null) { false };
      case (_) { flexibleJobsV4.remove(id); true };
    };
  };

  // ===== Aluminium Welding Jobs =====

  type AlWeldingJob = {
    id : Text; description : Text; numJoints : Nat; numBrackets : Nat;
    numDummy : Nat; weldLengthEachMm : Float; thickness : Float;
    laborCostPer2mm : Float; totalFullLength : Float; totalWeldLines : Nat;
    adjustedLaborCost : Float; totalCost : Float; costPerFullLength : Float;
    createdAt : Int;
  };

  let alWeldingJobs = Map.empty<Text, AlWeldingJob>();
  stable var alWeldingJobs_stable : [AlWeldingJob] = [];

  public shared func saveAlWeldingJob(
    description : Text, numJoints : Nat, numBrackets : Nat, numDummy : Nat,
    weldLengthEachMm : Float, thickness : Float, laborCostPer2mm : Float,
    totalFullLength : Float, totalWeldLines : Nat, adjustedLaborCost : Float,
    totalCost : Float, costPerFullLength : Float,
  ) : async AlWeldingJob {
    let id = generateId();
    let job : AlWeldingJob = {
      id; description; numJoints; numBrackets; numDummy; weldLengthEachMm;
      thickness; laborCostPer2mm; totalFullLength; totalWeldLines;
      adjustedLaborCost; totalCost; costPerFullLength; createdAt = Time.now();
    };
    alWeldingJobs.add(id, job);
    job;
  };

  public query func getAlWeldingJobs() : async [AlWeldingJob] {
    alWeldingJobs.values().toArray();
  };

  public shared func deleteAlWeldingJob(id : Text) : async Bool {
    switch (alWeldingJobs.get(id)) {
      case (null) { false };
      case (_) { alWeldingJobs.remove(id); true };
    };
  };

  // ===== Clear All Functions =====

  public shared func clearMaterials() : async Nat {
    let keys = rawMaterials.keys().toArray();
    for (k in keys.vals()) { rawMaterials.remove(k); };
    keys.size();
  };

  public shared func clearCustomers() : async Nat {
    let keys = customers.keys().toArray();
    for (k in keys.vals()) { customers.remove(k); };
    keys.size();
  };

  public shared func clearJobs() : async Nat {
    let keys = jobs.keys().toArray();
    for (k in keys.vals()) { jobs.remove(k); };
    keys.size();
  };

  public shared func clearLabourJobs() : async Nat {
    let keys = labourJobsV2.keys().toArray();
    for (k in keys.vals()) { labourJobsV2.remove(k); };
    keys.size();
  };

  public shared func clearFlexibleJobs() : async Nat {
    let keys = flexibleJobsV4.keys().toArray();
    for (k in keys.vals()) { flexibleJobsV4.remove(k); };
    keys.size();
  };

  public shared func clearAlWeldingJobs() : async Nat {
    let keys = alWeldingJobs.keys().toArray();
    for (k in keys.vals()) { alWeldingJobs.remove(k); };
    keys.size();
  };

  // ===== Legacy stubs =====
  type UserProfile = { name : Text };
  type UserRole = { #admin; #user };
  public shared func saveCallerUserProfile(_profile : UserProfile) : async () {};
  public query func getCallerUserProfile() : async ?UserProfile { null };
  public query func getUserProfile(_user : Principal) : async ?UserProfile { null };
  public query func getCallerUserRole() : async UserRole { #admin };
  public query func isCallerAdmin() : async Bool { true };

};
