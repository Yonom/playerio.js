import ByteBuffer from 'bytebuffer';
import { EventEmitter } from 'events';
import Message from './../models/message';

const STRING_SHORT_PATTERN = 0xC0;
const STRING_PATTERN = 0x0C;

const BYTE_ARRAY_SHORT_PATTERN = 0x40;
const BYTE_ARRAY_PATTERN = 0x10;

const UNSIGNED_LONG_PATTERN = 0x38;
const LONG_PATTERN = 0x30;

const UNSIGNED_INT_SHORT_PATTERN = 0x80;
const UNSIGNED_INT_PATTERN = 0x08;
const INT_PATTERN = 0x04;

const DOUBLE_PATTERN = 0x03;
const FLOAT_PATTERN = 0x02;
const BOOLEAN_TRUE_PATTERN = 0x01;
const BOOLEAN_FALSE_PATTERN = 0x00;

const STATE_INIT = 0;
const STATE_HEADER = 1;
const STATE_DATA = 2;
const READ_LENGTH = 3;

/**
 * @private
 */
export default class BinarySerializer extends EventEmitter {
  static serializeMessage(message) {
    let buf = new ByteBuffer()
      .append(BinarySerializer._serializeValue(message.length))
      .append(BinarySerializer._serializeValue(message.type));

    for (let i = 0; i < message.length; i++) {
      buf.append(BinarySerializer._serializeValue(message.items[i]));
    }

    return buf.flip().toBuffer();
  }

  static _serializeValue(value) {
    let buf = new ByteBuffer();

    if (typeof value === 'boolean') {
      buf.writeByte(value ? BOOLEAN_TRUE_PATTERN : BOOLEAN_FALSE_PATTERN);

    } else if (typeof value === 'string') {
      BinarySerializer._writeShort(buf, value.length, STRING_SHORT_PATTERN, STRING_PATTERN);
      buf.writeString(value);

    } else if (typeof value === 'number') {
      if (value % 1 || value > 0xFFFFFFFF || value < -0x80000000) { // double
        buf.writeByte(DOUBLE_PATTERN);
        buf.writeDouble(value);

      } else if (value > 0x7FFFFFFF) { // uint
        buf.writeByte(UNSIGNED_INT_PATTERN);
        buf.writeUint32(value);

      } else { // int
        BinarySerializer._writeShort(buf, value, UNSIGNED_INT_SHORT_PATTERN, INT_PATTERN);
      }

    } else if (value instanceof Buffer) {
      BinarySerializer._writeShort(buf, value.length, BYTE_ARRAY_SHORT_PATTERN, BYTE_ARRAY_PATTERN);
      buf.append(buf);
    }

    return buf.flip();
  }

  static _readLength(b, pattern) {
    return (b & ~pattern) + 1;
  }

  static _hasFlag(b, pattern) {
    return (b & pattern) === pattern;
  }

  static _writeShort(buf, length, topPattern, bottomPattern) {
    if ((length > 63) || (length < 0)) {
      BinarySerializer._writeInt32(buf, bottomPattern, length);
    } else {
      buf.writeByte(topPattern | length);
    }
  }

  static _writeInt32(buf, pattern, value) {
    let tempBuf = new ByteBuffer()
      .writeInt32(value)
      .flip();

    while (tempBuf.readUint8(tempBuf.offset) === 0) {
      tempBuf.offset++;
    }

    buf.writeByte(pattern | tempBuf.remaining() - 1);
    buf.append(tempBuf);
  }

  static _readInt32(buf) {
    let res = 0;
    while (buf.offset < buf.limit) {
      res <<= 8;
      res += buf.readUint8();
    }
    return res;
  }

  constructor() {
    super();

    this.state = STATE_INIT;
    this.valueType = 0;
    this.partLength = 0;
    this.count = -1;
    this.currentMessage = null;
    this.buffer = new ByteBuffer();
  }

  addBytes(bytes) {
    for (let i = 0; i < bytes.length; i++) {
      this.addByte(bytes[i]);
    }
  }

  addByte(b) {
    if (this.state === STATE_INIT) {
      if (BinarySerializer._hasFlag(b, STRING_SHORT_PATTERN)) {
        this.valueType = STRING_SHORT_PATTERN;
        this.partLength = b & ~STRING_SHORT_PATTERN;
        if (this.partLength > 0) {
          this.state = STATE_DATA;
        } else {
          this.onValue('');
        }

      } else if (BinarySerializer._hasFlag(b, BYTE_ARRAY_SHORT_PATTERN)) {
        this.valueType = BYTE_ARRAY_SHORT_PATTERN;
        this.partLength = b & ~STRING_SHORT_PATTERN;
        if (this.partLength > 0) {
          this.state = STATE_DATA;
        } else {
          this.onValue(new Buffer());
        }

      } else if (BinarySerializer._hasFlag(b, UNSIGNED_INT_SHORT_PATTERN)) {
        this.onValue(b & ~UNSIGNED_INT_SHORT_PATTERN);

      } else if (BinarySerializer._hasFlag(b, UNSIGNED_LONG_PATTERN)) {
        // TODO: Implement support for longs
        return 0;

      } else if (BinarySerializer._hasFlag(b, LONG_PATTERN)) {
        // TODO: Implement support for longs
        return 0;

      } else if (BinarySerializer._hasFlag(b, BYTE_ARRAY_PATTERN)) {
        this.valueType = BYTE_ARRAY_PATTERN;
        this.partLength = BinarySerializer._readLength(b, BYTE_ARRAY_PATTERN);
        this.state = STATE_HEADER;

      } else if (BinarySerializer._hasFlag(b, STRING_PATTERN)) {
        this.valueType = STRING_PATTERN;
        this.state = READ_LENGTH;
      } else if (BinarySerializer._hasFlag(b, UNSIGNED_INT_PATTERN)) {
        this.valueType = UNSIGNED_INT_PATTERN;
        this.partLength = BinarySerializer._readLength(b, UNSIGNED_INT_PATTERN);
        this.state = STATE_DATA;

      } else if (BinarySerializer._hasFlag(b, INT_PATTERN)) {
        this.valueType = INT_PATTERN;
        this.partLength = BinarySerializer._readLength(b, INT_PATTERN);
        this.state = STATE_DATA;

      } else if (BinarySerializer._hasFlag(b, DOUBLE_PATTERN)) {
        this.valueType = DOUBLE_PATTERN;
        this.partLength = 8;
        this.state = STATE_DATA;

      } else if (BinarySerializer._hasFlag(b, FLOAT_PATTERN)) {
        this.valueType = FLOAT_PATTERN;
        this.partLength = 4;
        this.state = STATE_DATA;

      } else if (BinarySerializer._hasFlag(b, BOOLEAN_TRUE_PATTERN)) {
        this.onValue(true);

      } else if (BinarySerializer._hasFlag(b, BOOLEAN_FALSE_PATTERN)) {
        this.onValue(false);
      }

    } else if (this.state === READ_LENGTH) {
      this.partLength = b;
      this.state = STATE_DATA;
    } else {
      let buf = this.buffer;
      let valueType = this.valueType;

      buf.writeByte(b);

      if (buf.offset === this.partLength) {
        buf.flip();

        if (this.state === STATE_HEADER) {
          this.partLength = BinarySerializer._readInt32(buf);
          this.state = STATE_DATA;

        } else if (this.state === STATE_DATA) {
          if (valueType === STRING_PATTERN || valueType === STRING_SHORT_PATTERN) {
            this.onValue(buf.toUTF8());

          } else if (valueType === BYTE_ARRAY_PATTERN || valueType === BYTE_ARRAY_SHORT_PATTERN) {
            this.onValue(buf.toBuffer(true));

          } else if (valueType === UNSIGNED_INT_PATTERN) {
            this.onValue(BinarySerializer._readInt32(buf));

          } else if (valueType === INT_PATTERN) {
            if (buf.limit === 4) {
              this.onValue(buf.readInt32());
            } else {
              this.onValue(BinarySerializer._readInt32(buf));
            }

          } else if (valueType === DOUBLE_PATTERN) {
            this.onValue(buf.readDouble());

          } else if (valueType === FLOAT_PATTERN) {
            this.onValue(buf.readFloat());
          }
        }

        buf.reset();
      }
    }
  }

  onValue(value) {
    let count = this.count;

    if (count === -1) {
      this.count = value;

    } else {
      if (!this.currentMessage) {
        this.currentMessage = new Message(value);
      } else {
        this.currentMessage.add(value);
      }

      let currentMessage = this.currentMessage;
      if (currentMessage.length === count) {
        this.emit('message', currentMessage);

        this.count = -1;
        this.currentMessage = null;
      }
    }

    this.state = STATE_INIT;
  }
}
