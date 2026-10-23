/* eslint-disable @typescript-eslint/no-explicit-any */
import userIsResident from 'helpers/userIsResident';
import { validateDataAsync } from 'components/JsonSchema';
import profileSchema from 'modules/userProfile/pages/Profile/variables/schema';
import profileSchemaData from 'modules/userProfile/pages/Profile/variables/dataSchema';

export default (authInfo: any, _t: any): any => {
  const isResident = userIsResident();

  if (isResident) return [];

  const profileData = profileSchemaData(authInfo);

  const errors = validateDataAsync(
    profileData as Record<string, unknown>,
    profileSchema() as never,
    profileData as Record<string, unknown>,
  );

  return errors;
};
