import { LoginHistoryCreationAttributes } from '../models';
import { Request } from '../types';

export type ActionType = 'login' | 'logout' | 'change_password';

export function prepareLoginHistoryData(
  req: Request,
  { actionType = 'login' }: { actionType: ActionType },
): LoginHistoryCreationAttributes | undefined {
  const ip = [req.headers['x-forwarded-for']?.toString() ?? req.socket.remoteAddress].filter(Boolean) as string[];
  const userAgent = req.headers['user-agent'];

  const {
    userId,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    email,
    isActive: isUserActive = true,
  } = req.user || ({} as any);
  let userName = [lastName, firstName, middleName].filter((v) => !!v).join(' ');
  const { clientId, client_name: clientName } = (req.session as any).client ?? {};

  // Check if user not defined.
  if (!userId) {
    return;
  }

  if (!userName && email) {
    userName = email;
  }

  // Create and return data object.
  return {
    user_id: userId,
    user_name: userName,
    ip,
    user_agent: userAgent,
    client_id: clientId ?? 'undefined',
    client_name: clientName,
    is_blocked: !isUserActive,
    action_type: actionType,
  };
}
