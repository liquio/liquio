// restify v4 and its plugin packages predate this codebase's TypeScript conversion and ship no
// type declarations; @types/restify targets a much newer, API-incompatible restify major version,
// so these are typed as `any` rather than pulling in mismatched upstream types.
declare module 'restify';
declare module 'restify-plugins';
declare module 'restify-cookies';
