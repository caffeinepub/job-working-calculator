import Map "mo:core/Map";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Management
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    userProfiles.add(caller, profile);
  };

  // Raw Materials Management
  type RawMaterial = {
    id : Text;
    grade : Text;
    materialType : Text;
    size : Text;
    weightPerMeter : Float;
    currentRate : Float;
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
      case (?rawMaterial) { rawMaterial };
    };
  };

  public shared ({ caller }) func addMaterial(grade : Text, materialType : Text, size : Text, weightPerMeter : Float, currentRate : Float) : async RawMaterial {
    let id = generateId();
    let rawMaterial : RawMaterial = {
      id;
      grade;
      materialType;
      size;
      weightPerMeter;
      currentRate;
      createdAt = Time.now();
    };
    rawMaterials.add(id, rawMaterial);
    rawMaterial;
  };

  public shared ({ caller }) func updateMaterial(id : Text, grade : Text, materialType : Text, size : Text, weightPerMeter : Float, currentRate : Float) : async RawMaterial {
    let oldMaterial = getRawMaterialInternal(id);
    let updatedMaterial : RawMaterial = {
      id;
      grade;
      materialType;
      size;
      weightPerMeter;
      currentRate;
      createdAt = oldMaterial.createdAt;
    };
    rawMaterials.add(id, updatedMaterial);
    updatedMaterial;
  };

  public shared ({ caller }) func deleteMaterial(id : Text) : async Bool {
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

  // ==== Customer operations =====

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
      case (?customer) { customer };
    };
  };

  public shared ({ caller }) func addCustomer(name : Text, phone : Text, email : Text, address : Text) : async Customer {
    let id = generateId();
    let customer : Customer = {
      id;
      name;
      phone;
      email;
      address;
      createdAt = Time.now();
    };
    customers.add(id, customer);
    customer;
  };

  public shared ({ caller }) func updateCustomer(id : Text, name : Text, phone : Text, email : Text, address : Text) : async Customer {
    let oldCustomer = getCustomerInternal(id);
    let updatedCustomer : Customer = {
      id;
      name;
      phone;
      email;
      address;
      createdAt = oldCustomer.createdAt;
    };
    customers.add(id, updatedCustomer);
    updatedCustomer;
  };

  public shared ({ caller }) func deleteCustomer(id : Text) : async Bool {
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

  // ==== Job operations =====

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

  public shared ({ caller }) func saveJob(
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
    let job : Job = {
      id;
      name;
      laborRate;
      transportIncluded;
      customerId;
      transportCost;
      dispatchQty;
      createdAt = Time.now();
    };
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?customer) { ?customer.name };
        };
      };
    };
    let savedJob : SavedJob = {
      job;
      jobLineItems;
      weldingLineItems;
      totalFinalPrice;
      totalProductWeight;
      ratePerKg;
      customerName;
    };
    jobs.add(id, savedJob);
    savedJob;
  };

  public shared ({ caller }) func updateJob(
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
    let job : Job = {
      id;
      name;
      laborRate;
      transportIncluded;
      customerId;
      transportCost;
      dispatchQty;
      createdAt = existing.job.createdAt;
    };
    let customerName = switch (customerId) {
      case (null) { null };
      case (?cid) {
        switch (customers.get(cid)) {
          case (null) { null };
          case (?customer) { ?customer.name };
        };
      };
    };
    let savedJob : SavedJob = {
      job;
      jobLineItems;
      weldingLineItems;
      totalFinalPrice;
      totalProductWeight;
      ratePerKg;
      customerName;
    };
    jobs.add(id, savedJob);
    savedJob;
  };

  public query func getJobs() : async [SavedJob] {
    jobs.values().toArray();
  };

  public query func getJob(id : Text) : async SavedJob {
    switch (jobs.get(id)) {
      case (null) { Runtime.trap("Job with id " # id # " does not exist") };
      case (?job) { job };
    };
  };

  public shared ({ caller }) func deleteJob(id : Text) : async Bool {
    switch (jobs.get(id)) {
      case (null) { false };
      case (_) {
        jobs.remove(id);
        true;
      };
    };
  };
};
