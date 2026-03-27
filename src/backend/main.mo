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
  // Kept for stable variable compatibility with previous deployment.
  let accessControlState = AccessControl.initState();
  let userProfiles = Map.empty<Principal, { name : Text }>();


  // ===== App Users =====

  type AppUser = {
    id : Text;
    username : Text;
    password : Text;
    role : Text; // "admin" | "customer"
    status : Text; // "pending" | "approved" | "rejected"
    discountPct : Float;
    createdAt : Int;
  };

  module AppUser {
    public func compare(a : AppUser, b : AppUser) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let appUsers = Map.empty<Text, AppUser>();
  var userNextId = 1000;

  func generateUserId() : Text {
    let id = userNextId;
    userNextId += 1;
    "u" # id.toText();
  };

  // Initialize default admin on first run
  system func postupgrade() {
    // If no admin exists, create default admin
    var hasAdmin = false;
    for (u in appUsers.values()) {
      if (u.role == "admin") { hasAdmin := true };
    };
    if (not hasAdmin) {
      let adminId = generateUserId();
      let admin : AppUser = {
        id = adminId;
        username = "admin";
        password = "admin123";
        role = "admin";
        status = "approved";
        discountPct = 0.0;
        createdAt = Time.now();
      };
      appUsers.add(adminId, admin);
    };
    // Migrate V1 flexible jobs
    for (v1 in flexibleJobs.values()) {
      let v3 : FlexibleJob = {
        id = v1.id;
        description = v1.description;
        materialTab = v1.materialTab;
        centerLength = 0.0;
        sheetBunchWidth = v1.sheetBunchWidth;
        sheetThickness = v1.thickness;
        sheetCount = 0;
        barsSupplied = false;
        barLength = 0.0;
        barWidth = 0.0;
        barThickness = 0.0;
        numberOfDrills = 0;
        numberOfFolds = 1;
        sheetStackWeight = 0.0;
        stripWeight = 0.0;
        bar1Weight = 0.0;
        bar2Weight = 0.0;
        totalMaterialWeight = 0.0;
        materialCost = 0.0;
        cuttingCost = 0.0;
        foldingCost = 0.0;
        drillingCost = 0.0;
        weldingCost = v1.weldingCost;
        chamferingCost = v1.chamferingCost;
        totalWeldLength = 0.0;
        overheadCost = v1.overheadCost;
        profitCost = v1.profitCost;
        totalCost = v1.totalCost;
        discountPct = 0.0;
        quotedPrice = v1.totalCost;
        customerId = v1.customerId;
        customerName = v1.customerName;
        createdAt = v1.createdAt;
      };
      if (flexibleJobsV3.get(v1.id) == null) {
        flexibleJobsV3.add(v1.id, v3);
      };
    };
    // Migrate V2 flexible jobs
    for (v2 in flexibleJobsV2.values()) {
      let v3 : FlexibleJob = {
        id = v2.id;
        description = v2.description;
        materialTab = v2.materialTab;
        centerLength = v2.centerLength;
        sheetBunchWidth = v2.sheetBunchWidth;
        sheetThickness = v2.sheetThickness;
        sheetCount = v2.sheetCount;
        barsSupplied = v2.barsSupplied;
        barLength = v2.barLength;
        barWidth = v2.barWidth;
        barThickness = v2.barThickness;
        numberOfDrills = v2.numberOfDrills;
        numberOfFolds = v2.numberOfFolds;
        sheetStackWeight = v2.sheetStackWeight;
        stripWeight = v2.stripWeight;
        bar1Weight = v2.bar1Weight;
        bar2Weight = v2.bar2Weight;
        totalMaterialWeight = v2.totalMaterialWeight;
        materialCost = v2.materialCost;
        cuttingCost = v2.cuttingCost;
        foldingCost = v2.foldingCost;
        drillingCost = v2.drillingCost;
        weldingCost = v2.weldingCost;
        chamferingCost = v2.chamferingCost;
        totalWeldLength = v2.totalWeldLength;
        overheadCost = v2.overheadCost;
        profitCost = v2.profitCost;
        totalCost = v2.totalCost;
        discountPct = 0.0;
        quotedPrice = v2.totalCost;
        customerId = v2.customerId;
        customerName = v2.customerName;
        createdAt = v2.createdAt;
      };
      if (flexibleJobsV3.get(v2.id) == null) {
        flexibleJobsV3.add(v2.id, v3);
      };
    };
  };

  public shared func initAdmin() : async Bool {
    var hasAdmin = false;
    for (u in appUsers.values()) {
      if (u.role == "admin") { hasAdmin := true };
    };
    if (not hasAdmin) {
      let adminId = generateUserId();
      let admin : AppUser = {
        id = adminId;
        username = "admin";
        password = "admin123";
        role = "admin";
        status = "approved";
        discountPct = 0.0;
        createdAt = Time.now();
      };
      appUsers.add(adminId, admin);
      true;
    } else {
      false;
    };
  };

  public shared func registerUser(username : Text, password : Text) : async { #ok : AppUser; #err : Text } {
    // Check if username taken
    for (u in appUsers.values()) {
      if (u.username == username) {
        return #err("Username already taken");
      };
    };
    let id = generateUserId();
    let user : AppUser = {
      id;
      username;
      password;
      role = "customer";
      status = "pending";
      discountPct = 0.0;
      createdAt = Time.now();
    };
    appUsers.add(id, user);
    #ok(user);
  };

  public shared func loginUser(username : Text, password : Text) : async { #ok : AppUser; #err : Text } {
    for (u in appUsers.values()) {
      if (u.username == username and u.password == password) {
        return #ok(u);
      };
    };
    #err("Invalid username or password");
  };

  public shared func getUsers() : async [AppUser] {
    appUsers.values().toArray();
  };

  public shared func approveUser(id : Text) : async Bool {
    switch (appUsers.get(id)) {
      case (null) { false };
      case (?u) {
        let updated : AppUser = {
          id = u.id;
          username = u.username;
          password = u.password;
          role = u.role;
          status = "approved";
          discountPct = u.discountPct;
          createdAt = u.createdAt;
        };
        appUsers.add(id, updated);
        true;
      };
    };
  };

  public shared func rejectUser(id : Text) : async Bool {
    switch (appUsers.get(id)) {
      case (null) { false };
      case (?u) {
        let updated : AppUser = {
          id = u.id;
          username = u.username;
          password = u.password;
          role = u.role;
          status = "rejected";
          discountPct = u.discountPct;
          createdAt = u.createdAt;
        };
        appUsers.add(id, updated);
        true;
      };
    };
  };

  public shared func updateUserDiscount(id : Text, discountPct : Float) : async Bool {
    switch (appUsers.get(id)) {
      case (null) { false };
      case (?u) {
        let updated : AppUser = {
          id = u.id;
          username = u.username;
          password = u.password;
          role = u.role;
          status = u.status;
          discountPct;
          createdAt = u.createdAt;
        };
        appUsers.add(id, updated);
        true;
      };
    };
  };

  public shared func changePassword(id : Text, newPassword : Text) : async Bool {
    switch (appUsers.get(id)) {
      case (null) { false };
      case (?u) {
        let updated : AppUser = {
          id = u.id;
          username = u.username;
          password = newPassword;
          role = u.role;
          status = u.status;
          discountPct = u.discountPct;
          createdAt = u.createdAt;
        };
        appUsers.add(id, updated);
        true;
      };
    };
  };

  public shared func deleteUser(id : Text) : async Bool {
    switch (appUsers.get(id)) {
      case (null) { false };
      case (_) { appUsers.remove(id); true };
    };
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
  var nextId = 0;

  func generateId() : Text {
    let id = nextId;
    nextId += 1;
    id.toText();
  };

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
      id;
      grade;
      materialType;
      size;
      weightPerMeter;
      currentRate;
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
      id;
      grade;
      materialType;
      size;
      weightPerMeter;
      currentRate;
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

  // ===== Labour Jobs =====

  type LabourJob = {
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

  module LabourJob {
    public func compare(a : LabourJob, b : LabourJob) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let labourJobs = Map.empty<Text, LabourJob>();

  public shared func saveLabourJob(
    description : Text,
    customerId : ?Text,
    materialType : Text,
    weldLength : Float,
    laborRate : Float,
    totalCost : Float,
  ) : async LabourJob {
    let id = generateId();
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?c) { ?c.name };
        };
      };
    };
    let lj : LabourJob = {
      id;
      description;
      customerId;
      customerName;
      materialType;
      weldLength;
      laborRate;
      totalCost;
      createdAt = Time.now();
    };
    labourJobs.add(id, lj);
    lj;
  };

  public query func getLabourJobs() : async [LabourJob] {
    labourJobs.values().toArray().sort();
  };

  public shared func deleteLabourJob(id : Text) : async Bool {
    switch (labourJobs.get(id)) {
      case (null) { false };
      case (_) { labourJobs.remove(id); true };
    };
  };

  // ===== Flexible Jobs =====

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

  let flexibleJobs = Map.empty<Text, FlexibleJobV1>();

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

  let flexibleJobsV2 = Map.empty<Text, FlexibleJobV2>();

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
    customerId : ?Text;
    customerName : ?Text;
    createdAt : Int;
  };

  module FlexibleJob {
    public func compare(a : FlexibleJob, b : FlexibleJob) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  let flexibleJobsV3 = Map.empty<Text, FlexibleJob>();

  public shared func saveFlexibleJob(
    description : Text,
    customerId : ?Text,
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
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?c) { ?c.name };
        };
      };
    };
    let fj : FlexibleJob = {
      id; description; materialTab; centerLength; sheetBunchWidth; sheetThickness;
      sheetCount; barsSupplied; barLength; barWidth; barThickness; numberOfDrills;
      numberOfFolds; sheetStackWeight; stripWeight; bar1Weight; bar2Weight;
      totalMaterialWeight; materialCost; cuttingCost; foldingCost; drillingCost;
      weldingCost; chamferingCost; totalWeldLength; overheadCost; profitCost;
      totalCost; discountPct; quotedPrice; customerId; customerName;
      createdAt = Time.now();
    };
    flexibleJobsV3.add(id, fj);
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
    let existing = switch (flexibleJobsV3.get(id)) {
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
      customerId = existing.customerId;
      customerName = existing.customerName;
      createdAt = existing.createdAt;
    };
    flexibleJobsV3.add(id, fj);
    fj;
  };

  public query func getFlexibleJobs() : async [FlexibleJob] {
    flexibleJobsV3.values().toArray().sort();
  };

  public shared func deleteFlexibleJob(id : Text) : async Bool {
    switch (flexibleJobsV3.get(id)) {
      case (null) { false };
      case (_) { flexibleJobsV3.remove(id); true };
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
