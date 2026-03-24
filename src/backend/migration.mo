import Map "mo:core/Map";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  type OldRawMaterial = {
    id : Text;
    grade : Text;
    materialType : Text;
    size : Text;
    weightPerMeter : Float;
    currentRate : Float;
    createdAt : Int;
  };

  type OldActor = {
    rawMaterials : Map.Map<Text, OldRawMaterial>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    nextId : Nat;
    customers : Map.Map<Text, { id : Text; name : Text; phone : Text; email : Text; address : Text; createdAt : Int }>;
    jobs : Map.Map<Text, { job : { id : Text; name : Text; laborRate : Float; transportIncluded : Bool; customerId : ?Text; transportCost : Float; dispatchQty : Float; createdAt : Int }; jobLineItems : [{ materialId : Text; lengthMeters : Float; rawWeight : Float; totalWeight : Float; finalPrice : Float }]; weldingLineItems : [{ grade : Text; ratePerKg : Float; weightKg : Float; finalPrice : Float }]; totalFinalPrice : Float; totalProductWeight : Float; ratePerKg : Float; customerName : ?Text }>;
  };

  type RateHistoryEntry = {
    rate : Float;
    changedAt : Int;
  };

  type NewRawMaterial = {
    id : Text;
    grade : Text;
    materialType : Text;
    size : Text;
    weightPerMeter : Float;
    currentRate : Float;
    rateHistory : [RateHistoryEntry];
    createdAt : Int;
  };

  type NewActor = {
    rawMaterials : Map.Map<Text, NewRawMaterial>;
    userProfiles : Map.Map<Principal, { name : Text }>;
    nextId : Nat;
    customers : Map.Map<Text, { id : Text; name : Text; phone : Text; email : Text; address : Text; createdAt : Int }>;
    jobs : Map.Map<Text, { job : { id : Text; name : Text; laborRate : Float; transportIncluded : Bool; customerId : ?Text; transportCost : Float; dispatchQty : Float; createdAt : Int }; jobLineItems : [{ materialId : Text; lengthMeters : Float; rawWeight : Float; totalWeight : Float; finalPrice : Float }]; weldingLineItems : [{ grade : Text; ratePerKg : Float; weightKg : Float; finalPrice : Float }]; totalFinalPrice : Float; totalProductWeight : Float; ratePerKg : Float; customerName : ?Text }>;
  };

  public func run(old : OldActor) : NewActor {
    let newRawMaterials = old.rawMaterials.map<Text, OldRawMaterial, NewRawMaterial>(
      func(_id, oldMaterial) {
        {
          oldMaterial with
          rateHistory = [];
        };
      }
    );
    { old with rawMaterials = newRawMaterials };
  };
};
