import { Log } from '@liquio/back-core';

declare global {
  var log: Log;

  var config: any;

  var db: any;

  var models: any;

  var moment: any;

  var typeOf: (value: any) => string;

  var messageQueue: any;

  var redisClient: any;

  var httpClient: any;
}

export {};
