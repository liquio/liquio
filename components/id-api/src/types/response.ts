import express from 'express';

export interface Response extends express.Response {
  handlingInfo?: {
    requestMeta: {
      method: string;
      url: string;
    };
  } | null;
}
