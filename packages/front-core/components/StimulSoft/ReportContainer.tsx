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

interface ReportContainerProps {
  init?: (ref: HTMLElement) => void | Promise<void>;
}

const ReportContainer = ({ init }: ReportContainerProps) => {
  const config = getConfig();
  const [inited, setInited] = React.useState(false);
  const classes = useStyles();

  const initContainer = React.useCallback(
    (ref: HTMLElement | null) => {
      // React 19 ref callbacks may not return a Promise, so the async work
      // is moved into this inner function rather than the ref callback
      // itself — same fire-and-forget behavior as before (the return value
      // was never used).
      const run = async () => {
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
        window.Stimulsoft.Base.StiLicense.Key = (
          config?.reports as { stimulsoftLicenseKey?: string } | undefined
        )?.stimulsoftLicenseKey;

        setInited(true);

        init && init(ref);
      };

      run();
    },
    [init],
  );

  return (
    <div ref={initContainer} className={classes.root}>
      {inited ? null : <Preloader {...({ flex: true } as unknown as Record<string, unknown>)} />}
    </div>
  );
};

export default ReportContainer;
