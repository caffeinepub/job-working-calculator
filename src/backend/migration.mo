import Map "mo:core/Map";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Principal "mo:core/Principal";

module {
  // Old Types
  type RawMaterial = {
    id : Text;
    grade : Text;
    materialType : Text;
    size : Text;
    weightPerMeter : Float;
    currentRate : Float;
    createdAt : Int;
  };

  type Customer = {
    id : Text;
    name : Text;
    phone : Text;
    email : Text;
    address : Text;
    createdAt : Int;
  };

  type OldJob = {
    id : Text;
    name : Text;
    laborRate : Float;
    transportIncluded : Bool;
    customerId : ?Text;
    createdAt : Int;
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

  type OldSavedJob = {
    job : OldJob;
    jobLineItems : [JobLineItem];
    weldingLineItems : [WeldingLineItem];
    totalFinalPrice : Float;
    totalProductWeight : Float;
    ratePerKg : Float;
    customerName : ?Text;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    rawMaterials : Map.Map<Text, RawMaterial>;
    customers : Map.Map<Text, Customer>;
    jobs : Map.Map<Text, OldSavedJob>;
    userProfiles : Map.Map<Principal, UserProfile>;
    nextId : Nat;
  };

  // New Types
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

  type SavedJob = {
    job : Job;
    jobLineItems : [JobLineItem];
    weldingLineItems : [WeldingLineItem];
    totalFinalPrice : Float;
    totalProductWeight : Float;
    ratePerKg : Float;
    customerName : ?Text;
  };

  type NewActor = {
    rawMaterials : Map.Map<Text, RawMaterial>;
    customers : Map.Map<Text, Customer>;
    jobs : Map.Map<Text, SavedJob>;
    userProfiles : Map.Map<Principal, UserProfile>;
    nextId : Nat;
  };

  // Migration function
  public func run(old : OldActor) : NewActor {
    let newJobs = old.jobs.map<Text, OldSavedJob, SavedJob>(
      func(_id, oldSavedJob) {
        let oldJob = oldSavedJob.job;
        let newJob : Job = {
          id = oldJob.id;
          name = oldJob.name;
          laborRate = oldJob.laborRate;
          transportIncluded = oldJob.transportIncluded;
          customerId = oldJob.customerId;
          transportCost = 0.0; // Default value for new field
          dispatchQty = 0.0; // Default value for new field
          createdAt = oldJob.createdAt;
        };
        {
          job = newJob;
          jobLineItems = oldSavedJob.jobLineItems;
          weldingLineItems = oldSavedJob.weldingLineItems;
          totalFinalPrice = oldSavedJob.totalFinalPrice;
          totalProductWeight = oldSavedJob.totalProductWeight;
          ratePerKg = oldSavedJob.ratePerKg;
          customerName = oldSavedJob.customerName;
        };
      }
    );
    {
      rawMaterials = old.rawMaterials;
      customers = old.customers;
      jobs = newJobs;
      userProfiles = old.userProfiles;
      nextId = old.nextId;
    };
  };
};
