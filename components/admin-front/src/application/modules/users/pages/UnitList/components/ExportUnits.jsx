import React from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import ExportIcon from 'assets/img/export_pink.svg';

const ExportUnits = ({
  t,
  ColorButton,
  classes,
  rowsSelected,
  actions: { exportUnits },
}) => {
  const exportUnitsAction = async () => {
    const blob = await exportUnits(rowsSelected);

    return downloadBase64Attach(
      {
        fileName: `units-${rowsSelected.join('-')}.bpmn`,
      },
      blob,
    );
  };

  return (
    <ColorButton
      variant="contained"
      color="primary"
      disableElevation={true}
      className={classes.actionBtn}
      onClick={exportUnitsAction}
    >
      <img
        src={ExportIcon}
        alt="export units icon"
        className={classes.actionColor}
        width={23}
      />
      {t('ExportUnits')}
    </ColorButton>
  );
};

ExportUnits.propTypes = {
  actions: PropTypes.object.isRequired,
  rowsSelected: PropTypes.array,
};

ExportUnits.defaultProps = {
  rowsSelected: [],
};

export default translate('UnitsListPage')(ExportUnits);
