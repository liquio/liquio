import React from 'react';
import { translate } from 'react-translate';
import { Tooltip, IconButton } from '@mui/material';
import printJS from 'print-js';

import { humanDateTimeFormat } from 'helpers/humanDateFormat';
import { ReactComponent as KeyIcon } from 'assets/img/vpn_key.svg';
import { ReactComponent as KeyIconAlt } from '../assets/c_key.svg';

interface Signer {
  organizationName?: string;
  commonName?: string;
}

interface Signature {
  signer: Signer;
  issuer: { commonName?: string };
  serial?: string;
  signTime?: string;
}

interface SignatureItem {
  signature?: Signature;
  signatures?: Signature[];
  fileName?: string;
  documentId?: string;
}

interface SignatureDetailsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  item?: SignatureItem;
  GridActionsCellItem?: React.ComponentType<Record<string, unknown>> | null;
}

const SignatureDetails = (props: SignatureDetailsProps) => {
  const {
    t,
    item: { signature, signatures, fileName, documentId } = {} as SignatureItem,
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
            serial: (serial as string).toUpperCase(),
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
    } = signature as Signature;

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

export default translate('FileDataTable')(SignatureDetails as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
