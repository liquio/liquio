import React from 'react';
import { makeStyles } from '@mui/styles';
import scriptLoader, { cssLoader } from 'helpers/scriptLoader';

import Preloader from 'components/Preloader';
import uk from 'components/StimulSoft/localization/uk.xml';
import { getConfig } from 'helpers/configLoader';

const useStyles = makeStyles(() => ({
  root: {
    height: '100%',
    display: 'flex',
  },
}));

const ReportContainer = ({ init }) => {
  const config = getConfig();
  const [inited, setInited] = React.useState(false);
  const classes = useStyles();

  const initContainer = React.useCallback(
    async (ref) => {
      if (!ref) {
        return;
      }

      await cssLoader(
        '/js/stimulsoft/stimulsoft.designer.office2013.whiteblue.css',
      );
      await cssLoader(
        '/js/stimulsoft/stimulsoft.viewer.office2013.whiteblue.css',
      );

      await scriptLoader('/js/stimulsoft/stimulsoft.reports.js');
      await scriptLoader('/js/stimulsoft/stimulsoft.viewer.js');
      await scriptLoader('/js/stimulsoft/stimulsoft.designer.js');

      window.Stimulsoft.Base.Localization.StiLocalization.addLocalizationFile(
        uk,
        false,
        'uk',
      );
      window.Stimulsoft.Base.Localization.StiLocalization.cultureName = 'uk';
      window.Stimulsoft.Base.StiLicense.Key =
        config?.reports?.stimulsoftLicenseKey;

      setInited(true);

      init && init(ref);
    },
    [init],
  );

  return (
    <div ref={initContainer} className={classes.root}>
      {inited ? null : <Preloader flex={true} />}
    </div>
  );
};

export default ReportContainer;
