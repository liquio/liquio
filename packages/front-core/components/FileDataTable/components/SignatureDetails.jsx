import React from 'react';
import { translate } from 'react-translate';
import printJS from 'print-js';
import PropTypes from 'prop-types';
import { Tooltip, IconButton } from '@mui/material';

import { humanDateTimeFormat } from 'helpers/humanDateFormat';
import { ReactComponent as KeyIcon } from 'assets/img/vpn_key.svg';
import { ReactComponent as KeyIconAlt } from '../assets/c_key.svg';

const SignatureDetails = (props) => {
  const {
    t,
    item: { signature, signatures, fileName, documentId },
    GridActionsCellItem
  } = props;

  const print = React.useCallback(() => {
    if (signatures?.length) {
      const result = signatures.map(
        ({ signer: { organizationName, commonName }, issuer, serial, signTime }) => {
          const printData = {
            commonName,
            organizationName: organizationName || '',
            signTime: signTime ? humanDateTimeFormat(signTime) : '',
            issuer: issuer.commonName,
            serial: serial.toUpperCase(),
            fileName,
            documentId
          };

          return printData;
        }
      );

      printJS({
        printable: result,
        properties: [
          'commonName',
          'organizationName',
          'signTime',
          'issuer',
          'serial',
          'fileName',
          'documentId'
        ],
        type: 'json',
        gridHeaderStyle: 'opacity: 0;',
        documentTitle: ''
      });

      return;
    }

    const {
      signer: { organizationName, commonName },
      issuer,
      serial,
      signTime
    } = signature;

    const printData = [
      {
        info: commonName
      },
      {
        info: organizationName || ''
      },
      {
        info: signTime ? humanDateTimeFormat(signTime) : ''
      },
      {
        info: issuer.commonName
      },
      {
        info: (serial || '').toUpperCase()
      },
      {
        info: fileName
      },
      {
        info: documentId
      }
    ];

    printJS({
      printable: printData,
      properties: ['info'],
      type: 'json',
      gridHeaderStyle: 'opacity: 0;',
      gridStyle: 'border: none;',
      documentTitle: ''
    });
  }, [signatures, fileName, documentId, signature]);

  if (!Object.keys(signature || {}).length && !signatures?.length) {
    return null;
  }

  return (
    <>
      <Tooltip title={t('Signature')}>
        {GridActionsCellItem ? (
          <GridActionsCellItem
            icon={<KeyIconAlt />}
            label={t('Signature')}
            aria-label={t('Signature')}
            onClick={print}
          />
        ) : (
          <IconButton onClick={print} aria-label={t('Signature')}>
            <KeyIcon />
          </IconButton>
        )}
      </Tooltip>
    </>
  );
};

SignatureDetails.propTypes = {
  t: PropTypes.func.isRequired,
  item: PropTypes.object.isRequired
};

SignatureDetails.defaultProps = {
  item: {}
};

export default translate('FileDataTable')(SignatureDetails);
