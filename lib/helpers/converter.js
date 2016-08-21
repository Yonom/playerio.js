import PlayerIOError from './../models/playerio-error';
import ProtobufMessages from './../models/protobuf-messages';
import ValueType from './value-types';

/**
 * @private
 */
export default class Converter {
  /**
   * @param {?Map} map The Map to be converted to an array of KeyValuePairs.
   * @returns {{key: *, value: *}[]} Conversion result.
   */
  static toKeyValuePairs(map) {
    let keys = [];
    if (map && Object.keys(map).length > 0) {
      for (let key in map) {
        keys.push({
          key: key,
          value: map[key].toString()
        });
      }
    }
    return keys;
  }

  /**
   * @param {Object} obj The object to be converted to a PlayerIOError.
   * @returns {PlayerIOError} Conversion result.
   */
  static toPlayerIOError(obj) {
    return new PlayerIOError(obj.errorCode, obj.message);
  }

  static toValueObjectArray(arr) {
    let ret = [];
    for (let a = 0; a < arr.length; a++) {
      ret.push(this.getValueObject(arr[a]));
    }
    return ret;
  }

  static getValueObject(o, sparse) {
    let vo = {};

    if (o instanceof Date) {
      vo.valueType = ValueType.DATETIME;
      vo.dateTime = o.getTime();
    } else if (o instanceof Array) {
      vo.valueType = ValueType.ARRAY;
      vo.arrayProperties = this.getArrayProperties(o, sparse);
    } else if (typeof o === 'string') {
      vo.valueType = ValueType.STRING;
      vo.string = o;
    } else if (typeof o === 'boolean') {
      vo.valueType = ValueType.BOOL;
      vo.bool = o;
    } else if (typeof o === 'number') {
      // check if small enough to be an int
      if (Math.abs(o) < Math.pow(2, 31) && Math.floor(o) === o) {
        vo.valueType = ValueType.INT;
        vo.int32 = o;
      } else if (o > 0 && o < Math.pow(2, 32) && Math.floor(o) === o) {
        vo.valueType = ValueType.UINT;
        vo.uInt = o;
      } else if (Math.floor(o) === o && Math.abs(o) < Math.pow(2, 63)) {
        vo.valueType = ValueType.LONG;
        vo.long = o;
      } else {
        // TODO: decide when we should use float
        vo.valueType = ValueType.DOUBLE;
        vo.double = o;
      }
    }
    return vo;
  }

  static toDatabaseObject(table, obj, isPlayerObject, save) {
    let op = {};

    if (obj === null) {
      return null;
    }
    op.key = obj.key;
    obj.properties.forEach((property) => {
      op[property.name] = this.deserializeValueObject(property.value);
    });

    return op;
  }

  static  deserializeValueObject(valueObject) {
    let d = new Date();
    if (valueObject.valueType === ValueType.BOOL || valueObject.bool !== null) {
      return valueObject.bool;
    } else if (valueObject.valueType === ValueType.INT || valueObject.int32 !== null) {
      return valueObject.int32 || 0;
    } else if (valueObject.valueType === ValueType.UINT || valueObject.uInt !== null) {
      return valueObject.uInt || 0;
    } else if (valueObject.valueType === ValueType.FLOAT || valueObject.float !== null) {
      return valueObject.float || 0;
    } else if (valueObject.valueType === ValueType.DOUBLE || valueObject.double !== null) {
      return valueObject.double || 0;
    } else if (valueObject.valueType === ValueType.DATETIME) {
      let d = new Date();
      d.setTime(valueObject.dateTime);
      return d;
    } else if (valueObject.valueType === ValueType.BYTEARRAY || valueObject.byteArray !== null) {
      return valueObject.byteArray;
    } else if (valueObject.valueType === ValueType.ARRAY || valueObject.arrayProperties.length > 0) {
      return this.getArray(valueObject.arrayProperties);
    } else if (valueObject.valueType === ValueType.STRING || valueObject.string !== null) {
      return valueObject.string || '';
    } else if (valueObject.valueType === ValueType.OBJ) {
      return this.getObject(valueObject.objectProperties);
    }

    console.log('valueType', valueObject.valueType, valueObject);
  }

  static getArray(arr) {
    let result = [];

    for (let i = 0; i < arr.length; i++) {
      let item = arr[i];
      if (item.value !== null) {
        result[item.index] = this.deserializeValueObject(item.value);
      }
    }
    return result;
  }

  static getObject(arr) {
    let result = {};
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i];
      result[item.name] = this.deserializeValueObject(item.value);
    }
    return result;
  }
}
