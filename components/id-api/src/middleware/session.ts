import ConnectSessionSequelize from 'connect-session-sequelize';
import cookieParser from 'cookie-parser';
import session, { SessionOptions } from 'express-session';
import { Op } from 'sequelize';

import { DEFAULT_COOKIE_DOMAIN } from '../config';
import { avatarByGender } from '../lib/helpers';
import { Log } from '../lib/log';
import { Models, UserAttributes } from '../models';
import { Express, NextFunction, Request, Response } from '../types';

export type FlashFunction = {
  // Insert a message into the flash store of a type
  (type: string, msg: string | string[]): number;
  // Get all messages of a type and delete them from the flash store
  (type: string): string[];
  // Get all messages and delete them from the flash store
  (): Record<string, string[]>;
};

export function useSession(express: Express) {
  const log = Log.get();

  const SessionStore = ConnectSessionSequelize(session.Store);

  SessionStore.prototype.clearExpiredSessions = async function clearExpiredSessions(fn: any) {
    const sessions = await Models.model('sessions').findAll({
      where: { expires: { [Op.lt]: new Date() }, userId: { [Op.ne]: null as any } },
    });

    log.save('session-storage-clear-expired', { count: sessions.length }, 'info');

    if (sessions.length > 0) {
      const userIds = sessions.map((v: any) => v.userId);
      await Models.model('accessToken').destroy({
        where: { userId: { [Op.in]: userIds } },
      });
      await Models.model('refreshToken').destroy({
        where: { userId: { [Op.in]: userIds } },
      });
    }

    await Models.model('sessions').destroy({
      where: { expires: { [Op.lt]: new Date() } },
    });

    return fn;
  };

  function extendDefaultFields(defaults: any, session: any) {
    const { passport } = session;

    const userId = passport?.user?.userId ?? null;

    log.save('session-storage-extend-default-fields', { userId }, 'info');
    return {
      data: defaults.data,
      expires: defaults.expires,
      userId,
    };
  }

  const secret = express.config.session?.secret_key;
  if (!secret) {
    throw new Error('Session secret key is not defined');
  }

  const sessionParams: SessionOptions = {
    secret,
    resave: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
      signed: true,
    },
    store: new SessionStore({
      db: Models.db,
      table: 'user_sessions',
      extendDefaultFields,
      checkExpirationInterval: 1000 * 60 * 60,
    }),
  };

  express.use(cookieParser());
  express.use(session(sessionParams));

  // Flash implementation based on 'connect-flash' package
  express.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.flash = req.session.flash || {};
    delete req.session.flash;
    req.flash = function (type?: string, msg?: string | string[]) {
      if (this.session === undefined) throw new Error('req.flash() requires sessions');
      const msgs = (this.session.flash = this.session.flash || {});
      if (type && msg) {
        if (Array.isArray(msg)) {
          msg.forEach((val) => {
            const messages = msgs[type] ?? [];
            messages.push(val);
            msgs[type] = messages;
          });
          return msgs[type].length;
        }
        msgs[type] = msgs[type] ?? [];
        return msgs[type].push(msg);
      } else if (type) {
        const arr = msgs[type];
        delete msgs[type];
        return arr ?? [];
      } else {
        this.session.flash = {};
        return msgs;
      }
    };
    next();
  });

  express.use(function (req, res, next) {
    if (req.session?.passport?.user) {
      let user = {
        id: req.session.passport.user.userId,
        first_name: req.session.passport.user.first_name,
        avaUrl: req.session.passport.user.avaUrl ?? avatarByGender(req.session.passport.user.gender),
        last_name: req.session.passport.user.last_name,
      };

      res.cookie('jwt', JSON.stringify(user), {
        domain: express.config.domain ?? DEFAULT_COOKIE_DOMAIN,
        expires: new Date(req.session.cookie.expires as Date),
      });
    }

    const {
      query: { client_id: queryClientId } = {},
      session: { client_id: sessionClientId, client: { clientId: sessionClienClientId } = {} } = {},
    } = req;

    const clientId = queryClientId || sessionClientId || sessionClienClientId;
    if (clientId) {
      res.cookie('client_id', clientId, {
        domain: express.config.domain,
        expires: new Date(req.session.cookie.expires as Date),
      });
    }

    next();
  });
}

export async function destroySession(req: Request) {
  const log = Log.get();

  const id = req.sessionID;

  try {
    await new Promise<void>((resolve, reject) => {
      req.sessionStore.destroy(id, (error: Error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      req.session.destroy((error: Error) => {
        if (error) {
          return reject(error);
        }
        resolve();
      });
    });
  } catch (error: any) {
    log.save('session-destroy-error', { id, error: error?.message ?? error.toString() }, 'error');
    throw error;
  }
}

/**
 * Adds passed user to the session and saves it.
 */
export async function saveSession(req: Request, user?: UserAttributes | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (user && req.session?.passport) {
      req.session.passport.user = user;
    }
    req.session.save((err: Error) => {
      if (err) return reject(err);
      resolve();
    });
  });
}
