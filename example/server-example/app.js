/* eslint no-console: 0 */

import readline from 'readline';
import PlayerIO from './../../lib/index';

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

PlayerIO.QuickConnect.simpleConnect('everybody-edits-su9rn58o40itdbnw69plyw', 'guest1@tbp.com', 'guest', null, (client) => {
  client.bigDB.loadMyPlayerObject((playerObject) => {
    console.log('BigDB - Current PlayerObject:')
    console.log(playerObject);
  }, (error) => {
    console.log(error);
  });

  client.multiplayer.createJoinRoom('PWAJwkxnxta0I', 'Everybodyedits201', true, null, null, (connection) => {
    connection.on('message', (m) => {
      if (m.type === 'init') {
        // Allow custom chat messages to be sent
        console.log('[INFO] Now you can start chatting.');
        rl.on('line', (line) => {
          connection.send(new PlayerIO.Message('say', line));
        });
      }
    });

    connection.send(new PlayerIO.Message('init'));

  }, (error) => {
    console.log(error);
  });
});
