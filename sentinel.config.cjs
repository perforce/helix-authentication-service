//
// Example configuration file for use with Redis Sentinel.
//
// See https://github.com/luin/ioredis for configuration options.
//
// 1. Set SENTINEL_CONFIG_FILE in .env to reference this file.
// 2. Modify this file to match your Sentinel configuration.
// 5. Retart the service (`systemctl restart helix-auth`)
//
module.exports = {
  name: 'mymaster',
  // password for connecting to Sentinel (optional)
  sentinelPassword: 'keyboard cat',
  sentinels: [
    { host: '192.168.56.31', port: 26379 },
    { host: '192.168.56.32', port: 26379 },
    { host: '192.168.56.33', port: 26379 }
  ],
  // TLS for connecting to Redis servers (optional)
  tls: {
    cert: 'containers/redis/client.crt',
    key: 'containers/redis/client.key',
    ca: ['containers/redis/ca.crt'],
    rejectUnauthorized: false
  },
  // TLS for connecting to Redis sentinels (optional)
  sentinelTLS: {
    cert: 'containers/redis/client.crt',
    key: 'containers/redis/client.key',
    ca: ['containers/redis/ca.crt'],
    rejectUnauthorized: false
  }
}
