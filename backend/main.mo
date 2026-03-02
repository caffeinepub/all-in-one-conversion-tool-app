import Text "mo:core/Text";
import Blob "mo:core/Blob";

actor {
  public shared ({ caller }) func getAppInfo() : async {
    name : Text;
    version : Text;
    icon : Blob;
  } {
    {
      name = "Image and PDF Compressor";
      version = "1.0.0";
      icon = Blob.fromArray([]);
    };
  };
};
