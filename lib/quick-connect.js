import Client from './client';
import HttpChannel from './http-channel';
import PlayerIO from './';
import ProtobufMessages from './models/protobuf-messages';
import Converter from './helpers/converter';

/**
 * Entry class for making a QuickConnect connection to Player.IO.
 */
export default class QuickConnect {
  /**
   * Authenticates a user in the simple user DB and returns a connection token.
   * @param {string} gameId The ID of the game to connect to. (This value can be found in the admin panel.)
   * @param {string} usernameOrEmail The username or e-mail address of the user being authenticated.
   * @param {string} password The password of the user being authenticated.
   * @param {?(string[])} playerInsightSegments Custom segments for the user in PlayerInsight.
   * @param {function(client: Client): undefined} successCallback Callback with the connected client, if successful.
   * @param {function(error: ?PlayerIOError): undefined} errorCallback Callback that will be called instead of successCallback if an error occurs.
   */
  static simpleConnect(gameId, usernameOrEmail, password, playerInsightSegments, successCallback, errorCallback) {
    let args = new ProtobufMessages.SimpleConnectArgs({
      gameId: gameId,
      usernameOrEmail: usernameOrEmail,
      password: password,
      playerInsightSegments: playerInsightSegments
    }).encode().toBuffer();

    HttpChannel.default.request(
      400, args, ProtobufMessages.SimpleConnectOutput,
      (obj) => {
        successCallback(new Client(obj.token, obj.userId));
      },
      errorCallback
    );
  }

  /**
   * Registers a new user in the simple user DB and returns a connection token.
   * @param {string} gameId The ID of the game to connect to. (This value can be found in the admin panel.)
   * @param {string} username The username of the new user.
   * @param {string} password The password of the new user.
   * @param {?string} email The e-mail address of the new user.
   * @param {?string} captchaKey Only if captcha is required: The key of the captcha image used to prevent abuse.
   * @param {?string} captchaValue Only if captcha is required: The string the user entered in response to the captcha image.
   * @param {?Map<string, string>} extraData Any extra data that should be stored with the user such as gender, birthdate, etc.
   * @param {?string} partnerId The PartnerPay partner ID this user should be tagged with, if the PartnerPay system is used.
   * @param {?(string[])} playerInsightSegments Custom segments for the user in PlayerInsight.
   * @param {function(client: Client): undefined} successCallback Callback with the connected client, if successful.
   * @param {function(error: ?PlayerIORegistrationError): undefined} errorCallback Callback with details about why the registration failed, if it failed.
   */
  static simpleRegister(gameId, username, password, email, captchaKey, captchaValue, extraData, partnerId, playerInsightSegments, successCallback, errorCallback) {
    let args = new ProtobufMessages.SimpleRegisterArgs({
      gameId: gameId,
      username: username,
      password: password,
      email: email,
      captchaKey: captchaKey,
      captchaValue: captchaValue,
      extraData: Converter.toKeyValuePairs(extraData),
      partnerId: partnerId,
      playerInsightSegments: playerInsightSegments,
      clientAPI: PlayerIO.clientType,
      clientInfo: Converter.toKeyValuePairs(PlayerIO.clientInfo)
    }).encode().toBuffer();

    HttpChannel.default.customRequest(
      403, args, ProtobufMessages.SimpleRegisterOutput, ProtobufMessages.SimpleRegisterError,
      (obj) => {
        successCallback(new Client(obj.token, obj.userId));
      },
      errorCallback
    );
  }

  static  simpleRecoverPassword(gameId, usernameOrEmail, callback, errorHandler) {
    let args = new ProtobufMessages.SimpleRecoverPasswordArgs({
      gameId,
      usernameOrEmail
    }).encode().toBuffer();

    HttpChannel.default.customRequest(
      406,
      args,
      ProtobufMessages.SimpleConnectOutput,
      ProtobufMessages.PlayerIOError,
      function () {
        callback();
      },
      function (error) {
        errorHandler(error);
      }
    )
  }

}
