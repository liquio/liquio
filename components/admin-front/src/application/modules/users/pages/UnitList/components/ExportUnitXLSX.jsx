import React, { useState } from 'react';
import { translate } from 'react-translate';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import Preloader from 'components/Preloader';
import ExplicitIcon from '@mui/icons-material/Explicit';
import { requestUnit } from 'application/actions/units';
import { searchUsers } from 'actions/users';
import * as XLSX from 'xlsx';
import ProgressLine from 'components/Preloader/ProgressLine';
import { addError } from 'actions/error';

const ExportUnitXLSX = ({ t, actions, rowsSelected, addError }) => {
  const [loading, setLoading] = useState(false);
  const [loadingModalOpen, setLoadingModalOpen] = useState(false);
  const [loadedRegisters, setLoadedRegisters] = useState(0);

  const exportRegisterKey = async () => {
    setLoading(true);
    setLoadingModalOpen(true);

    let loadedCount = 0;
    let responseData = [];
    try {
      for (const registerId of rowsSelected) {
        const { heads, members, name, id } = await actions.requestUnit(
          registerId,
          { silent: true },
        );
        const result = await actions.searchUsers(
          { ids: [...heads, ...members] },
          '?brief_info=true',
          { silent: true },
        );
        const resultMap = result.map((item) => {
          return { ...item, unitName: name, unitId: id };
        });

        if (resultMap && resultMap.length > 0) {
          responseData.push(...resultMap);
          loadedCount++;
          setLoadedRegisters(loadedCount);
        }
      }

      buildExcelFile(responseData);
    } catch (error) {
      addError(new Error('ExportErrorXLSX'));
    } finally {
      setLoading(false);
      setLoadingModalOpen(false);
    }
  };

  const buildExcelFile = (data) => {
    const wsData = [];
    const headers = [
      t('UnitId'),
      t('UnitName'),
      t('PIB'),
      t('Rnokpp'),
      t('UserId'),
    ];
    wsData.push(headers);

    data.forEach((row) => {
      const rowData = [row.unitId, row.unitName, row.name, row.ipn, row.userId];
      wsData.push(rowData);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Page 1');

    XLSX.writeFile(wb, 'Units.xlsx');
  };

  return (
    <>
      {!loading && (
        <Tooltip title={t('ExportUsers')}>
          <IconButton
            onClick={() => exportRegisterKey()}
            id="export-units"
            size="large"
          >
            <ExplicitIcon />
          </IconButton>
        </Tooltip>
      )}

      {loading && (
        <div>
          <Preloader />
        </div>
      )}

      <Dialog
        open={loadingModalOpen}
        onClose={() => setLoadingModalOpen(false)}
      >
        <DialogTitle>{t('DownloadProcess')}</DialogTitle>
        <DialogContent>
          <p>
            {t('LoadingCount', {
              count: loadedRegisters,
              total: rowsSelected.length,
            })}
          </p>
          <ProgressLine loading={true} />
        </DialogContent>
      </Dialog>
    </>
  );
};

ExportUnitXLSX.propTypes = {
  rowsSelected: PropTypes.array.isRequired,
  t: PropTypes.func.isRequired,
};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestUnit: bindActionCreators(requestUnit, dispatch),
    searchUsers: bindActionCreators(searchUsers, dispatch),
  },
  addError: bindActionCreators(addError, dispatch),
});

const translated = translate('UnitsListPage')(ExportUnitXLSX);
export default connect(null, mapDispatchToProps)(translated);
