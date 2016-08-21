import ProtoBuf from 'protobufjs';

// brfs only works if this is es5
var fs = require('fs');

var protoFile = fs.readFileSync(__dirname + '/protobuf-messages.proto', 'utf8');

let builder = ProtoBuf.loadProto(protoFile);

export default {
  PlayerInsightState: builder.build('PlayerInsightState'),
  KeyValuePair: builder.build('KeyValuePair'),
  ServerEndpoint: builder.build('ServerEndP'),
  SimpleConnectArgs: builder.build('SimpleConnectArgs'),
  SimpleConnectOutput: builder.build('SimpleConnectOutput'),
  SimpleRegisterArgs: builder.build('SimpleRegisterArgs'),
  SimpleRegisterOutput: builder.build('SimpleRegisterOutput'),
  SimpleRegisterError: builder.build('SimpleRegisterError'),
  SimpleRecoverPasswordArgs: builder.build('SimpleRecoverPasswordArgs'),
  SimpleRecoverPasswordOutput: builder.build('SimpleRecoverPasswordOutput'),
  SimpleRecoverPasswordError: builder.build('SimpleRecoverPasswordError'),
  CreateRoomArgs: builder.build('CreateRoomArgs'),
  CreateRoomOutput: builder.build('CreateRoomOutput'),
  ListRoomsArgs: builder.build('ListRoomsArgs'),
  ListRoomsOutput: builder.build('ListRoomsOutput'),
  JoinRoomArgs: builder.build('JoinRoomArgs'),
  JoinRoomOutput: builder.build('JoinRoomOutput'),
  CreateJoinRoomArgs: builder.build('CreateJoinRoomArgs'),
  CreateJoinRoomOutput: builder.build('CreateJoinRoomOutput'),
  ValueObject: builder.build('ValueObject'),
  ObjectProperty: builder.build('ObjectProperty'),
  ArrayProperty: builder.build('ArrayProperty'),
  BigDBObject: builder.build('BigDBObject'),
  LoadMyPlayerObjectArgs: builder.build('LoadMyPlayerObjectArgs'),
  LoadMyPlayerObjectOutput: builder.build('LoadMyPlayerObjectOutput'),
  LoadIndexRangeArgs: builder.build('LoadIndexRangeArgs'),
  LoadIndexRangeOutput: builder.build('LoadIndexRangeOutput'),
  LoadObjectsArgs: builder.build('LoadObjectsArgs'),
  LoadObjectsOutput: builder.build('LoadObjectsOutput'),
  PayVaultRefreshArgs: builder.build('PayVaultRefreshArgs'),
  PayVaultRefreshOutput: builder.build('PayVaultRefreshOutput'),
  PlayerIOError: builder.build('PlayerIOError')
};
