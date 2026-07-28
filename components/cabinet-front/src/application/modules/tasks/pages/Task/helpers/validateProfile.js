import userIsResident from 'helpers/userIsResident';
import { validateDataAsync } from 'components/JsonSchema';
import profileSchema from 'modules/userProfile/pages/Profile/variables/schema';
import profileSchemaData from 'modules/userProfile/pages/Profile/variables/dataSchema';

export default (authInfo, t) => {
  const isResident = userIsResident();

  if (isResident) return [];

  const profileData = profileSchemaData(authInfo);

  const errors = validateDataAsync(profileData, profileSchema(t), profileData);

  return errors;
};
