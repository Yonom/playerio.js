import ProtoBuf from 'protobufjs';
import ProtobufMessages from './models/protobuf-messages';
import Long from 'long';
import Converter from './helpers/converter';

/**
 * The Player.IO BigDB service which is used to create, load and delete database objects.
 */
export default class BigDB {
  /**
   * @private
   * @param {HttpChannel} channel
   *
   */
  constructor(channel) {
    this._channel = channel;
  }

  /**
   * Loads the database object corresponding to the current player from the PlayerObjects table.
   * @param {function(playerObject: Object): undefined} successCallback Callback with the loaded player object.
   * @param {function(error: ?PlayerIOError): undefined} errorCallback Callback that will be called instead of successCallback if an error occurs during the load.
   */
  loadMyPlayerObject(successCallback, errorCallback) {
    let args = new ProtobufMessages.LoadMyPlayerObjectArgs().toBuffer();
    this._channel.request(
      103, args, ProtobufMessages.LoadMyPlayerObjectOutput,
      (obj) => {
        obj = obj.playerObject;

        // move properties onto obj.playerObject
        obj.properties.forEach((prop) => {
          obj[prop.name] = Converter.deserializeValueObject(prop.value);
        });
        successCallback(obj);
      },
      errorCallback
    );
  }

  loadKeys(table, keys, successCallback, errorCallback) {
    let args = new ProtobufMessages.LoadObjectsArgs({
      objectIds: {
        table: table,
        keys: keys
      }
    }).encode().toBuffer();
    this._channel.request(85, args, ProtobufMessages.LoadObjectsOutput,
      (output) => {
         successCallback(this.toDatabaseObjectArray(table, output.objects));
      }, errorCallback);
  }

  loadRange(table, index, path = null, start = null, stop = null, limit, successCallback, errorCallback) {
    let startIndexValue = start !== null ? [start] : [];
    let stopIndexValue = stop !== null ? [stop] : [];
    if (path !== null) {
      startIndexValue = path.concat(startIndexValue);
      stopIndexValue = path.concat(stopIndexValue);
    }

    startIndexValue = Converter.toValueObjectArray(startIndexValue);
    stopIndexValue = Converter.toValueObjectArray(stopIndexValue);

    console.log(startIndexValue, stopIndexValue);

    let args = new ProtobufMessages.LoadIndexRangeArgs({
      table: table,
      index: index,
      startIndexValue: startIndexValue,
      stopIndexValue: stopIndexValue,
      limit: limit
    }).encode().toBuffer();
    this._channel.request(97, args, ProtobufMessages.LoadIndexRangeOutput,
      (output) => {
        console.log(output);
        successCallback(this.toDatabaseObjectArray(table, output.objects));
      }, errorCallback);
  }

  toDatabaseObjectArray(table, arr) {
    let ret = [];
    for (let i = 0; i < arr.length; i++) {
      ret.push(Converter.toDatabaseObject(table, arr[i], false, this.save));
    }
    return ret;
  }

  valueNotNull(obj) {
    let result = null;
    Object.keys(obj).forEach((key) => {
      let value = obj[key];
      if (value !== null && !(value instanceof Array && value.length === 0)) {
        if (value instanceof Long) {
          value = value.toInt();
        }
        /* else if (value instanceof Array && value.length > 0 &&
         value[0] instanceof ProtoBuf.Builder.Builder.Message) {
         console.log('array of messages');
         }*/
        result = value;
      }
    });

    return result;
  }
}
