import React from 'react';
import { translate } from 'react-translate';
import Mime from 'components/Mime';
import humanFileSize from 'helpers/humanFileSize';
import classNames from 'classnames';
import withStyles from '@mui/styles/withStyles';

import styles from 'components/JsonSchema/elements/SelectFiles/components/styles';

const Limits = ({ t, classes, accept, maxSize }) => {
  const limits = [];

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
          tabindex={0}
        >
          {limit}
        </div>
      ))}
    </>
  );
};

const styled = withStyles(styles)(Limits);
export default translate('Elements')(styled);
