export function get(_configPath: string, _prefix: string) {
  return {
    x509: {
      caCerts: [],
    },
    server: {
      host: 'localhost',
      port: 3000,
      isSwaggerEnabled: true,
      acceptedBodySize: '10mb',
    },
  };
}

export default { get };
