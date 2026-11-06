import React from 'react';
import { translate } from 'react-translate';
import downloadBase64Attach from 'helpers/downloadBase64Attach';
import ExportIcon from 'assets/img/export_pink.svg';

interface ExportUnitsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  ColorButton: React.ComponentType<Record<string, unknown>>;
  classes: Record<string, string>;
  rowsSelected?: string[];
  actions: { exportUnits: (rowsSelected: string[]) => Promise<string | undefined> };
}

const ExportUnits = ({
  t,
  ColorButton,
  classes,
  rowsSelected = [],
  actions: { exportUnits },
}: ExportUnitsProps) => {
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

export default translate('UnitsListPage')(ExportUnits as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
