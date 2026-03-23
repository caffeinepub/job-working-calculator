import Map "mo:core/Map";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";

actor {
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

  public query ({ caller }) func getMaterials() : async [RawMaterial] {
    rawMaterials.values().toArray().sort();
  };

  public query ({ caller }) func getMaterial(id : Text) : async RawMaterial {
    getRawMaterialInternal(id);
  };
};
