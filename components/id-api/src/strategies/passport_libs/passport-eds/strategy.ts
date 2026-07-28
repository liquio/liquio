import { Log } from '../../../lib/log';
import { Services } from '../../../services';
import { Request, Strategy, StrategyVerify } from '../../../types';

export class EDSStrategy extends Strategy {
  private readonly log = Log.get();
  private readonly verify: StrategyVerify;

  public readonly name = 'eds';

  constructor(options: any, verify: StrategyVerify) {
    super();
    this.verify = verify;
  }

  /**
   * Define authentication method.
   */
  authenticate(req: Request, options?: any): void {
    this.authenticateAsync(req, options);
  }

  async authenticateAsync(req: Request, params: Record<string, any>): Promise<void> {
    const { user } = req || {};

    if (user?.services?.eds) {
      return req.res!.redirect('/authorise/continue/');
    }

    const { signature, token, encodeCertSerial, encodeCert } = req.body;
    if (!signature && !Object.keys(params).length) {
      return req.res!.redirect('/');
    }
    this.log.save('eds-strategy|authenticate|start');

    let signatureInfo;

    try {
      signatureInfo = await Services.service('eds').checkRandomContentSign(token, signature);
    } catch (error: any) {
      this.log.save('authenticate-eds|checkRandomContentSign-error', { error: error.message, stack: error.stack }, 'error');
      req.res!.status(500).send({
        error: error.message,
        ...(error.details && { details: error.details }),
      });
      return;
    }

    if (!signatureInfo.signer) {
      this.log.save('authenticate-eds|checkRandomContentSign-error', { error: 'Signer not defined' }, 'error');
      req.res!.status(500).send({ error: 'Signer not defined' });
      return;
    }

    try {
      this.verify(
        req,
        {
          ...{ ...signatureInfo.signer, issuerInfo: signatureInfo.issuer },
          pem: signatureInfo.pem,
          encodeCertSerial,
          encodeCert,
        },
        (err, user) => this.success(user, null),
      );
    } catch (error: any) {
      this.log.save('authenticate-eds|verify-error', { error: error.message }, 'error');
      req.res!.status(500).send({
        error: error.message,
        ...(error.details && { details: error.details }),
      });
      return;
    }
  }
}
