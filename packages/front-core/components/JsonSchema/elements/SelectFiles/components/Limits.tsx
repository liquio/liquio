import React from 'react';
import { translate, Translate } from 'react-translate';
import Mime from 'components/Mime';
import humanFileSize from 'helpers/humanFileSize';
import classNames from 'classnames';
import withStyles, { WithStyles } from '@mui/styles/withStyles';

import styles from 'components/JsonSchema/elements/SelectFiles/components/styles';

interface LimitsProps extends WithStyles<typeof styles> {
  t: Translate;
  accept?: string;
  maxSize?: number;
}

const Limits = ({ t, classes, accept, maxSize }: LimitsProps) => {
  const limits: React.ReactNode[] = [];

  if (maxSize) {
    limits.push(
      t('MaxFileSizeLimit', {
        size: humanFileSize(maxSize, false),
      }),
    );
  }

  if (accept) {
    limits.push(
      t('FileTypeLimit', {
        types: <Mime>{accept}</Mime>,
      }),
    );
  }

  return (
    <>
      {limits.map((limit, index) => (
        <div
          key={index}
          className={classNames({
            [classes.limits]: true,
          })}
          {...({ tabindex: 0 } as Record<string, unknown>)}
        >
          {limit}
        </div>
      ))}
    </>
  );
};

const styled = withStyles(styles)(Limits);
export default translate('Elements')(styled);
