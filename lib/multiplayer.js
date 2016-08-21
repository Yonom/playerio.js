import Connection from './connection';
import ProtobufMessages from './models/protobuf-messages';
import Converter from './helpers/converter';

/**
 * The Player.IO Multiplayer service.
 */
export default class Multiplayer {
  /**
   * If not null, rooms will be created on the development server at the address defined by the server endpoint, instead of using the live Player.IO server.
   * @type {ServerEndpoint}
   */
  get developmentServer() {
    return this._developmentServer;
  }

  /**
   * If not null, rooms will be created on the development server at the address defined by the server endpoint, instead of using the live Player.IO server.
   * @param {ServerEndpoint} value
   */
  set developmentServer(value) {
    this._developmentServer = {
      address: value.split(':')[0],
      port: value.split(':')[1]
    };
  }

  /**
   * @private
   * @param {HttpChannel} channel
   */
  constructor(channel) {
    this._channel = channel;
  }

  /**
   * Creates a multiplayer room.
   * @param {?string} roomId The ID of the room to create/join.
   * @param {string} roomType The name of the room type to run the room as. This value should match one of the [RoomType(...)] attributes on the server. A room type of 'bounce' is always available.
   * @param {boolean} isVisible If the room doesn't exist: Determines whether the room should be visible when listing rooms with GetRooms.
   * @param {?Map<string, string>} roomData If the room doesn't exist: The data to initialize the room with.
   * @param {function(roomId: string): undefined} successCallback Callback with the ID of the room that was created.
   * @param {function(error: ?PlayerIOError): undefined} errorCallback Callback that will be called instead of successCallback if an error occurs.
   */
  createRoom(roomId, roomType, isVisible, roomData, successCallback, errorCallback) {
    let args = ProtobufMessages.CreateRoomArgs.encode({
      roomId: roomId,
      roomType: roomType,
      visible: isVisible,
      roomData: Converter.toKeyValuePairs(roomData),
      isDevRoom: this._developmentServer != null
    });

    this._channel.request(
      21, args, ProtobufMessages.CreateRoomOutput,
      (obj) => {
        successCallback(obj.roomId);
      },
      errorCallback
    );
  }

  /**
   * Joins a multiplayer room.
   * @param {?string} roomId The ID of the room to join.
   * @param {?Map<string, string>} joinData Data to send to the room with additional information about the join.
   * @param {function(connection: Connection): undefined} successCallback Callback with a connection into the room that was joined.
   * @param {function(error: ?PlayerIOError): undefined} errorCallback Callback that will be called instead of successCallback if an error occurs.
   */
  joinRoom(roomId, joinData, successCallback, errorCallback) {
    let args = new ProtobufMessages.JoinRoomArgs({
      roomId: roomId,
      joinData: Converter.toKeyValuePairs(joinData),
      isDevRoom: this._developmentServer != null
    }).encode().toBuffer();

    this._channel.request(
      24, args, ProtobufMessages.JoinRoomOutput,
      (obj) => {
        let endpoints = this._developmentServer != null ? [this._developmentServer] : obj.endpoints;
        let connection = new Connection(endpoints, obj.joinKey, joinData, roomId);
        connection.on('connect', () => {
          successCallback(connection);
        });
        connection.on('error', () => {
          errorCallback(connection.error);
        })
      },
      errorCallback
    );
  }

  /**
   * Creates a multiplayer room (if it does not already exist) and joins it.
   * @param {?string} roomId The ID of the room to create/join.
   * @param {string} roomType The name of the room type to run the room as. This value should match one of the [RoomType(...)] attributes on the server. A room type of 'bounce' is always available.
   * @param {boolean} isVisible If the room doesn't exist: Determines whether the room should be visible when listing rooms with GetRooms.
   * @param {?Map<string, string>} roomData If the room doesn't exist: The data to initialize the room with.
   * @param {?Map<string, string>} joinData Data to send to the room with additional information about the join.
   * @param {function(connection: Connection): undefined} successCallback Callback with a connection into the room that was joined.
   * @param {function(error: ?PlayerIOError): undefined} errorCallback Callback that will be called instead of successCallback if an error occurs.
   */
  createJoinRoom(roomId, roomType, isVisible, roomData, joinData, successCallback, errorCallback) {
    let args = new ProtobufMessages.CreateJoinRoomArgs({
      roomId: roomId,
      roomType: roomType,
      visible: isVisible,
      roomData: Converter.toKeyValuePairs(roomData),
      joinData: Converter.toKeyValuePairs(joinData),
      isDevRoom: this._developmentServer != null
    }).encode().toBuffer();

    this._channel.request(
      27, args, ProtobufMessages.CreateJoinRoomOutput,
      (obj) => {
        let endpoints = this._developmentServer != null ? [this._developmentServer] : obj.endpoints;
        let connection = new Connection(endpoints, obj.joinKey, joinData, obj.roomId);
        connection.on('connect', () => {
          successCallback(connection);
        });
        connection.on('error', () => {
          errorCallback(connection.error);
        })
      },
      errorCallback
    );
  }

  listRooms(roomType, searchCriteria, resultLimit, resultOffset, successCallback, errorCallback) {
    var args = new ProtobufMessages.ListRoomsArgs({
      roomType: roomType,
      searchCriteria: Converter.toKeyValuePairs(searchCriteria),
      resultLimit: resultLimit,
      resultOffset: resultOffset,
      onlyDevRooms: this._developmentServer != null
    });

    this._channel.request(30, args.encode().toBuffer(), ProtobufMessages.ListRoomsOutput, function (result) {
      // turn roomData into an object
      if(result) {
        result.rooms.forEach((room) => {
          var data = {};
          room.roomData.forEach((item) => {
            data[item.key] = item.value;
          });
          room.roomData = data;
        });
      } else {
        result = {rooms: []};
      }

      successCallback(result);
    }, errorCallback);
  }

}
