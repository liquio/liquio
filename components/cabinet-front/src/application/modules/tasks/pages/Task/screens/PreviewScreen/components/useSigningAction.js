import React from 'react';
import { useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import MobileDetect from 'mobile-detect';

import {
  getDataToEncrypt as getDataToEncryptAction,
  saveEncryptedData as saveEncryptedDataAction,
  loadTaskDocument as loadTaskDocumentAction,
  multisignCheck as multisignCheckAction,
  signTaskDocument as signTaskDocumentAction,
  signTaskDocumentP7S as signTaskDocumentP7SAction,
  rejectDocumentSigning as rejectDocumentSigningAction,
  getTaskDocumentSignData as getTaskDocumentSignDataAction,
  getTaskDocumentP7SSignData as getTaskDocumentP7SSignDataAction,
  getTaskDocumentAdditional as getTaskDocumentAdditionalAction,
  signTaskDocumentAdditional as signTaskDocumentAdditionalAction,
  informSigners as informSignersAction,
  loadTask as loadTaskAction,
  signCheckAction
} from 'application/actions/task';
import promiseChain from 'helpers/promiseChain';
import { readAsUint8Array } from 'helpers/readFileList';
import base64toUint8Array from 'helpers/base64toUint8Array';
import evaluate from 'helpers/evaluate';
import signManifest from 'services/eds/helpers/signManifest';
import getTemplateSteps from 'modules/tasks/pages/Task/helpers/getTemplateSteps';
import hashToInternalSign from 'services/eds/helpers/hashToInternalSign';
import dbStorage from 'helpers/indexedDB';

const md = new MobileDetect(window.navigator.userAgent);

const isMobile = !!md.mobile();
const MAX_SIZE_P7S_SOURCE = 50 * 1024 * 1024;
const errorTextArray = [
  'User already signed this file (P7S).',
  'User already signed document additional data.',
  'User already signed document additional data.'
];

const useSigningAction = (props) => {
  const dispatch = useDispatch();
  const fileListRef = React.useRef([]);
  const rejectSignRef = React.useRef(false);
  const signingDialogCallbackRef = React.useRef(null);
  const [showSigningDialog, setShowSigningDialog] = React.useState(false);
  const [showRejectSigningDialog, setShowRejectSigningDialog] = React.useState(false);
  const [signProgress, setSignProgress] = React.useState(0);
  const [signProgressText, setSignProgressText] = React.useState(null);
  const [rejectSign, setRejectSign] = React.useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = React.useState(false);
  const [fileList, setFileListState] = React.useState([]);
  const getDataToEncrypt = React.useMemo(
    () => bindActionCreators(getDataToEncryptAction, dispatch),
    [dispatch]
  );
  const saveEncryptedData = React.useMemo(
    () => bindActionCreators(saveEncryptedDataAction, dispatch),
    [dispatch]
  );
  const loadTaskDocument = React.useMemo(
    () => bindActionCreators(loadTaskDocumentAction, dispatch),
    [dispatch]
  );
  const multisignCheck = React.useMemo(
    () => bindActionCreators(multisignCheckAction, dispatch),
    [dispatch]
  );
  const signTaskDocument = React.useMemo(
    () => bindActionCreators(signTaskDocumentAction, dispatch),
    [dispatch]
  );
  const signTaskDocumentP7S = React.useMemo(
    () => bindActionCreators(signTaskDocumentP7SAction, dispatch),
    [dispatch]
  );
  const rejectDocumentSigning = React.useMemo(
    () => bindActionCreators(rejectDocumentSigningAction, dispatch),
    [dispatch]
  );
  const getTaskDocumentSignData = React.useMemo(
    () => bindActionCreators(getTaskDocumentSignDataAction, dispatch),
    [dispatch]
  );
  const getTaskDocumentP7SSignData = React.useMemo(
    () => bindActionCreators(getTaskDocumentP7SSignDataAction, dispatch),
    [dispatch]
  );
  const getTaskDocumentAdditional = React.useMemo(
    () => bindActionCreators(getTaskDocumentAdditionalAction, dispatch),
    [dispatch]
  );
  const signTaskDocumentAdditional = React.useMemo(
    () => bindActionCreators(signTaskDocumentAdditionalAction, dispatch),
    [dispatch]
  );
  const informSigners = React.useMemo(
    () => bindActionCreators(informSignersAction, dispatch),
    [dispatch]
  );
  const loadTask = React.useMemo(
    () => bindActionCreators(loadTaskAction, dispatch),
    [dispatch]
  );
  const runSignCheck = React.useMemo(
    () => bindActionCreators(signCheckAction, dispatch),
    [dispatch]
  );

  const updateRejectSign = React.useCallback((value) => {
    rejectSignRef.current = value;
    setRejectSign(value);
  }, []);

  const updateFileList = React.useCallback((value) => {
    fileListRef.current = value;
    setFileListState(value);
  }, []);

  const closeSigningDialog = React.useCallback((callback) => {
    if (!showSigningDialog) {
      if (callback) callback();
      return;
    }

    signingDialogCallbackRef.current = callback || null;
    setShowSigningDialog(false);
  }, [showSigningDialog]);

  React.useEffect(() => {
    if (signingDialogCallbackRef.current) {
      const callback = signingDialogCallbackRef.current;
      signingDialogCallbackRef.current = null;
      callback();
    }
  }, [showSigningDialog]);

  const getActiveSigners = (signatures) => {
    const { task } = props;
    const { signerUsers } = task;

    const signers = signerUsers.filter(
      (userId) => !signatures?.find(({ createdBy }) => createdBy === userId)
    );

    return signers;
  };

  const getP7SSignDataWithCache = async (documentId, attachments) => {
    const cache = new Map();

    const promises = attachments.map(async (attach) => {
      if (!cache.has(attach.id)) {
        try {
          const signData = await getTaskDocumentP7SSignData(documentId, attach.id);
          cache.set(attach.id, signData);
        } catch (e) {
          if (!errorTextArray.includes(e.message)) {
            throw e;
          }
        }
      }
      return cache.get(attach.id);
    });

    return Promise.all(promises);
  };

  const sign = async (signer, signInfo, iteration = 0) => {
    const { t, setBusy, task, authInfo } = props;

    if (!task) {
      return null;
    }

    const { documentId, document } = task;

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignTaskDocumentSignData'));

    const signers = getActiveSigners(document?.signatures || []).filter(
      (userId) => userId !== authInfo?.userId
    );

    const manifest = await getTaskDocumentSignData(documentId);

    const signedManifest = await signManifest(manifest, signer);

    const signResult = await signTaskDocument(
      documentId,
      signedManifest,
      signInfo,
      !signers.length
    );

    if (!signResult || signResult instanceof Error) {
      if (signResult && signResult.message === 'Невідома помилка' && iteration < 3) {
        return sign(signer, signInfo, iteration + 1);
      }

      setBusy(false);

      if (signResult.details) {
        throw signResult;
      } else {
        throw new Error(t(signResult.message));
      }
    }

    return signResult;
  };

  const signP7S = async (signer, isExternalP7sSign = false) => {
    const { t, setBusy, task } = props;

    if (!task) {
      return null;
    }

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignP7S'));

    const { documentId } = task;

    let signData;

    try {
      signData = await getTaskDocumentP7SSignData(documentId);
    } catch (e) {
      if (errorTextArray.includes(e.message)) {
        return Promise.resolve();
      }
      throw e;
    }

    const signDataArrayBuffer = await readAsUint8Array(signData);
    const signature = await signManifest(signDataArrayBuffer, signer, !isExternalP7sSign);
    const signResult = await signTaskDocumentP7S(documentId, signature);

    if (!signResult || signResult instanceof Error) {
      setBusy(false);
      throw new Error(t(signResult.message));
    }

    return signResult;
  };

  const signP7SAttach = async (signer) => {
    const { t, task, template } = props;
    const { attachments } = await loadTaskDocument(task.documentId);
    const { documentId } = task;
    const P7sSignText = template?.jsonSchema?.P7sSignText;

    const signDataArray = await getP7SSignDataWithCache(documentId, attachments);

    const attachSignFunc = (attach, index) => async () => {
      setSignProgress(((index + 1) / attachments.length) * 100);
      setSignProgressText(
        P7sSignText
          ? P7sSignText
          : t('SignProcessSignP7SAttach', {
              progress: index + 1,
              total: attachments.length
            })
      );

      const signData = signDataArray[index];
      if (!signData) return Promise.resolve();

      const signDataArrayBuffer = await readAsUint8Array(signData);

      if (signDataArrayBuffer.length > MAX_SIZE_P7S_SOURCE) {
        throw new Error(t('MaxSizeError'));
      }

      const signature = await signManifest(signDataArrayBuffer, signer);
      const signTaskDocumentP7SResult = await signTaskDocumentP7S(
        documentId,
        signature,
        attach.id
      );

      if (!signTaskDocumentP7SResult || signTaskDocumentP7SResult instanceof Error) {
        throw new Error(signTaskDocumentP7SResult.message);
      }

      return signTaskDocumentP7SResult;
    };

    return promiseChain(attachments.map(attachSignFunc));
  };

  const getEncodeCert = async (signer, index) => {
    const certif = await signer.execute('EnumOwnCertificates', index);
    if (certif === null) {
      // throw new Error('Ключ не має відповідного сертифікату');
      throw new Error('Сертифікат шифрування відстуній. Зверніться до вашого АЦСК');
    }

    if (certif.keyUsage === 'Протоколи розподілу ключів') {
      return certif;
    }

    return getEncodeCert(signer, index + 1);
  };

  const signAdditionalData = async (signer, options) => {
    const {
      t,
      task: { documentId }
    } = props;

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignAdditionalData'));

    const dataToSign = await getTaskDocumentAdditional(documentId);

    const preparedDataList = [].concat(dataToSign).filter(Boolean);

    if (!preparedDataList.length) {
      return Promise.resolve();
    }

    const p7sSignature = [];

    for (let index = 0; index < preparedDataList.length; index++) {
      const data = preparedDataList[index];

      if (data.type === 'taxSignEncryptSign') {
        const dataToSign = data.content;

        p7sSignature[index] = await taxSignEncryptSign(
          signer,
          base64toUint8Array(dataToSign),
          data.params?.cryptCerts
        );
      } else {
        if (data.params?.signType) {
          await signer.execute('SetRuntimeParameter', 'SignType', data.params?.signType);
        }

        const dataToSign = data.content || data;

        if (data.type === 'data' || typeof data === 'string') {
          p7sSignature[index] = await signer.execute(
            'SignData',
            base64toUint8Array(dataToSign),
            true
          );
        } else if (data.type === 'dataExternal') {
          p7sSignature[index] = await signer.execute(
            'SignData',
            base64toUint8Array(dataToSign),
            false
          );
        } else {
          p7sSignature[index] = await signer.execute('SignHash', dataToSign);
        }

        if (data.params?.signType) {
          await signer.execute('SetRuntimeParameter', 'SignType', 16 | 128); // EU_SIGN_TYPE_CADES_X_LONG | EU_SIGN_TYPE_CADES_X_LONG_TRUSTED
        }
      }
    }

    const { issuer, serial } = await getEncodeCert(signer, 0);

    const decodedCert = await signer.execute('GetCertificate', issuer, serial);
    const cryptCertificate = await signer.execute('Base64Encode', decodedCert);
    try {
      await signTaskDocumentAdditional(documentId, {
        p7sSignature,
        cryptCertificate
      });
    } catch (e) {
      if (errorTextArray.includes(e.message)) {
        return Promise.resolve();
      }
      throw e;
    }

    if (options.encryptDocumentData) {
      await encryptDocumentData(signer);
    }
  };

  const encryptDocumentData = async (signer) => {
    const {
      task: { documentId }
    } = props;

    const { toEncrypt, encryptCert } = await getDataToEncrypt(documentId);
    if (!toEncrypt || !toEncrypt.length) {
      return Promise.resolve();
    }

    await signer.execute('SaveCertificate', encryptCert);
    const { issuer, serial } = await signer.execute('ParseCertificate', encryptCert);

    const encryptedData = await Promise.all(
      toEncrypt
        .map(base64toUint8Array)
        .map((dataToEncrypt) =>
          signer.execute('EnvelopDataEx', [issuer], [serial], false, dataToEncrypt, true)
        )
    );

    return saveEncryptedData(documentId, encryptedData);
  };

  const getHideMainPdf = (value, taskDocumentData) => {
    if (value && typeof value === 'boolean') return value;

    if (value && typeof value === 'string') {
      const result = evaluate(value, taskDocumentData);
      return result instanceof Error ? value : result;
    }

    return null;
  };

  const getLiquioServerSign = (value, taskDocumentData, taskMeta, authInfo) => {
    if (value && typeof value === 'boolean') return value;

    if (value && typeof value === 'string') {
      const result = evaluate(value, taskDocumentData, taskMeta, authInfo);
      return result instanceof Error ? false : !!result;
    }

    return false;
  };

  const taxSignEncryptSign = async (signer, dataToEncrypt, cryptCerts) => {
    const CONST_SIGN = 'UA1_SIGN\0';
    const CONST_CRYPT = 'UA1_CRYPT\0';
    const CONST_CERTCRYPT = 'CERTCRYPT\0';

    const CONST_SIGN_B = Buffer.from(CONST_SIGN, 'ascii');
    const CONST_CRYPT_B = Buffer.from(CONST_CRYPT, 'ascii');
    const CONST_CERTCRYPT_B = Buffer.from(CONST_CERTCRYPT, 'ascii');

    await signer.execute('SetRuntimeParameter', 'SignType', 1);

    const signed = await signer.execute('SignData', dataToEncrypt, true);

    const sign1 = Buffer.from(signed, 'base64');
    const sign1Length = Buffer.alloc(4);
    sign1Length.writeInt32LE(sign1.length);
    let data = Buffer.concat(
      [CONST_SIGN_B, sign1Length, sign1],
      CONST_SIGN.length + 4 + sign1.length
    );
    const cryptedData = await signer.execute(
      'EnvelopDataToRecipientsWithDynamicKey',
      cryptCerts.map((cert) => Buffer.from(cert, 'base64')),
      false,
      false,
      new Uint8Array(data.buffer),
      true
    );

    const cryptCert = Buffer.from(cryptCerts[0], 'base64');

    const crypt = Buffer.from(cryptedData, 'base64');
    const cerCryptLength = Buffer.alloc(4);
    cerCryptLength.writeInt32LE(cryptCert.length);
    const cryptLength = Buffer.alloc(4);
    cryptLength.writeInt32LE(crypt.length);

    data = Buffer.concat(
      [CONST_CERTCRYPT_B, cerCryptLength, cryptCert, CONST_CRYPT_B, cryptLength, crypt],
      CONST_CERTCRYPT.length + 4 + cryptCert.length + CONST_CRYPT.length + 4 + crypt.length
    );

    const sign2test = await signer.execute('SignData', data, true);

    const sign2 = Buffer.from(sign2test, 'base64');
    const sign2Length = Buffer.alloc(4);
    sign2Length.writeInt32LE(sign2.length);
    data = Buffer.concat([CONST_SIGN_B, sign2Length, sign2], CONST_SIGN.length + 4 + sign2.length);

    await signer.execute('SetRuntimeParameter', 'SignType', 16 | 128); // EU_SIGN_TYPE_CADES_X_LONG | EU_SIGN_TYPE_CADES_X_LONG_TRUSTED

    return data.toString('base64');
  };

  const onRejectSigning = (rejectData) => {
    const { task, setBusy } = props;
    const { documentId } = task;

    setShowRejectSigningDialog(false);
    setBusy(true);
    rejectDocumentSigning(documentId, rejectData);
    setBusy(false);
  };

  const signP7SServer = async () => {
    const { t, setBusy, task } = props;

    if (!task) {
      return null;
    }

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignP7S'));

    try {
      await getTaskDocumentP7SSignData(task.documentId);
    } catch (e) {
      if (errorTextArray.includes(e.message)) {
        return Promise.resolve();
      }
      throw e;
    }

    const signResult = await signTaskDocumentP7S(task.documentId);

    if (!signResult || signResult instanceof Error) {
      setBusy(false);
      throw new Error(t(signResult.message));
    }

    return signResult;
  };

  const signP7SAttachServer = async () => {
    const { t, task, template } = props;
    const { attachments } = await loadTaskDocument(task.documentId);
    const { documentId } = task;
    const P7sSignText = template?.jsonSchema?.P7sSignText;
    const signDataArray = await getP7SSignDataWithCache(documentId, attachments);

    const attachSignFunc = (attach, index) => async () => {
      setSignProgress(((index + 1) / attachments.length) * 100);
      setSignProgressText(
        P7sSignText
          ? P7sSignText
          : t('SignProcessSignP7SAttach', {
              progress: index + 1,
              total: attachments.length
            })
      );

      if (!signDataArray[index]) return Promise.resolve();

      const signTaskDocumentP7SResult = await signTaskDocumentP7S(
        documentId,
        undefined,
        attach.id
      );

      if (!signTaskDocumentP7SResult || signTaskDocumentP7SResult instanceof Error) {
        throw new Error(signTaskDocumentP7SResult.message);
      }

      return signTaskDocumentP7SResult;
    };

    return promiseChain(attachments.map(attachSignFunc));
  };

  const signAdditionalDataServer = async () => {
    const {
      t,
      task: { documentId }
    } = props;

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignAdditionalData'));

    const dataToSign = await getTaskDocumentAdditional(documentId);
    const preparedDataList = [].concat(dataToSign).filter(Boolean);

    if (!preparedDataList.length) {
      return Promise.resolve();
    }

    try {
      await signTaskDocumentAdditional(documentId);
    } catch (e) {
      if (errorTextArray.includes(e.message)) {
        return Promise.resolve();
      }
      throw e;
    }
  };

  const signServer = async (signInfo, iteration = 0) => {
    const { t, setBusy, task, authInfo } = props;

    if (!task) {
      return null;
    }

    const { documentId, document } = task;

    setSignProgress(0);
    setSignProgressText(t('SignProcessSignTaskDocumentSignData'));

    const signers = getActiveSigners(document?.signatures || []).filter(
      (userId) => userId !== authInfo?.userId
    );

    await getTaskDocumentSignData(documentId);

    const signResult = await signTaskDocument(
      documentId,
      undefined,
      { ...signInfo, type: 'file' },
      !signers.length
    );

    if (!signResult || signResult instanceof Error) {
      if (signResult && signResult.message === 'Невідома помилка' && iteration < 3) {
        return signServer(signInfo, iteration + 1);
      }

      setBusy(false);

      if (signResult.details) {
        throw signResult;
      } else {
        throw new Error(t(signResult.message));
      }
    }

    return signResult;
  };

  const onSelectKey = async (
    encryptedKey,
    signer,
    resetPrivateKey = () => {},
    signInfo,
    isLiquioServerSign = false
  ) => {
    const {
      setBusy,
      handleFinish,
      template: {
        jsonSchema: {
          isP7sSign,
          isExternalP7sSign,
          encryptDocumentData = false,
          checkBeforeSign,
          signCheck,
          hideMainPDF
        },
        additionalDataToSign
      },
      task: {
        documentId,
        signerUsers,
        document: { data }
      },
      authInfo
    } = props;
    setBusy(true);

    if (checkBeforeSign && checkBeforeSign.length) {
      await validateKey(checkBeforeSign, authInfo, data);
    }

    if (rejectSignRef.current) {
      setBusy(false);
      return;
    }

    try {
      if (signerUsers.length > 1) {
        await multisignCheck(documentId);
      }

      if (signCheck) {
        await runSignCheck(documentId);
      }

      if (isP7sSign && !getHideMainPdf(hideMainPDF, data)) {
        if (isLiquioServerSign) {
          await signP7SServer();
          await signP7SAttachServer();
        } else {
          await signP7S(signer, isExternalP7sSign);
          await signP7SAttach(signer);
        }
      } else {
        if (isLiquioServerSign) {
          await signP7SAttachServer();
        } else {
          await signP7SAttach(signer);
        }
      }

      if (additionalDataToSign) {
        if (isLiquioServerSign) {
          await signAdditionalDataServer();
        } else {
          await signAdditionalData(signer, { encryptDocumentData });
        }
      }

      const signResult = isLiquioServerSign
        ? await signServer(signInfo)
        : await sign(signer, signInfo);

      const { signatures } = signResult;

      const signers = getActiveSigners(signatures);

      closeSigningDialog(resetPrivateKey);

      if (signers.length) {
        setShowSuccessDialog(true);
      }

      setBusy(false);

      if (!signers.length) {
        handleFinish();
      }
    } catch (error) {
      setBusy(false);
      resetPrivateKey();
      throw error;
    }
  };

  const validateKey = async (checkBeforeSign, authInfo, data) => {
    const { task } = props;
    const { documentId } = task;
    const { attachments } = await loadTaskDocument(documentId);
    updateRejectSign(false);

    const signatures = await getP7SSignDataWithCache(documentId, attachments);

    for (const element of checkBeforeSign) {
      const { isValid, errorText } = element;
      const result = evaluate(isValid, data, authInfo, signatures);

      if (result instanceof Error) {
        throw new Error('Error in checkBeforeSign');
      }
      if (result === false) {
        updateRejectSign(true);
        throw new Error(errorText);
      }
    }
  };

  const onSignHash = async (hashes, signInfo) => {
    const fileList = fileListRef.current;

    const {
      t,
      setBusy,
      handleFinish,
      task: { documentId, signerUsers }
    } = props;

    if (hashes.length !== fileList.length) {
      throw new Error('wrong hashes length');
    }

    setBusy(true);

    const repacked = await Promise.all(
      hashes.map((hash, index) => ({ ...hash, ...fileList[index] })).map(hashToInternalSign)
    );

    for (let i = 0; i < repacked.length; i++) {
      const { method, attachId, signature } = repacked[i];

      if (method === 'signTaskDocumentP7S') {
        await signTaskDocumentP7S(documentId, signature, attachId);
      }
    }

    const p7sSignature = repacked
      .filter(({ method }) => method === 'additionaldataToSign')
      .map(({ signature }) => signature);

    if (p7sSignature.length) {
      try {
        await signTaskDocumentAdditional(documentId, { p7sSignature });
      } catch (e) {
        if (!errorTextArray.includes(e.message)) {
          throw e;
        }
      }
    }

    const signedManifest = repacked
      .filter(({ method }) => method === 'signTaskDocument')
      .map(({ signature }) => signature);

    const signResult = await signTaskDocument(documentId, signedManifest, signInfo, false);

    if (!signResult || signResult instanceof Error) {
      setBusy(false);
      throw new Error(t(signResult.message));
    }

    const { signatures } = signResult;
    const signers = signerUsers.filter(
      (userId) => !signatures.find(({ createdBy }) => createdBy === userId)
    );

    setShowSigningDialog(false);
    setBusy(false);

    if (!signers.length) {
      handleFinish(true);
    }
  };

  const setFileName = (i) => {
    const {
      t,
      template: {
        jsonSchema: { isP7sSign, signDataNaming, title }
      }
    } = props;

    if (i === 0) return signDataNaming?.manifest || t('Manifest');

    const index = i - 1 === 1 ? '' : ` ${i - 1}`;

    if (isP7sSign) {
      if (i === 1) return signDataNaming?.pdfHash || t('PdfHash');
      if (i >= 2) return (signDataNaming?.additionalHash || t('AdditionalHash')) + index;
    } else {
      if (i === 1) return signDataNaming?.pdf || title;
      if (i >= 2) return (signDataNaming?.attachment || t('AttachmentSign')) + index;
    }
  };

  const getDataToSign = async () => {
    const {
      t,
      task,
      task: { documentId, signerUsers },
      template: {
        jsonSchema: {
          isP7sSign,
          isExternalP7sSign,
          signDataNaming,
          signCheck,
          hideMainPDF,
          isDiiaMethod = false
        }
      }
    } = props;

    const fileList = [];

    if (signerUsers.length > 1) {
      await multisignCheck(documentId);
    }

    if (signCheck) {
      await runSignCheck(documentId);
    }

    const hashesSaved = await dbStorage.getItem('hashes');
    const storedTimestamp = await dbStorage.getItem('sessionTimestamp');

    if (
      hashesSaved &&
      isMobile &&
      storedTimestamp &&
      Date.now() - storedTimestamp < 120000
    ) {
      const savedList = await dbStorage.getItem('fileList');

      updateFileList(savedList);

      return savedList;
    }

    // p7s sign
    if (isP7sSign) {
      if (!getHideMainPdf(hideMainPDF, task.document.data)) {
        try {
          const p7sSignData = await getTaskDocumentP7SSignData(documentId);

          fileList.push({
            data: await readAsUint8Array(p7sSignData),
            name: signDataNaming?.pdf || t('PrintVersion'),
            method: 'signTaskDocumentP7S',
            internal: !isExternalP7sSign
          });
        } catch (e) {
          const alreadySigned = errorTextArray.includes(e.message);

          if (!isDiiaMethod && alreadySigned) {
            return Promise.resolve();
          }

          if (!alreadySigned) {
            throw e;
          }
        }
      }

      const { attachments } = await loadTaskDocument(task.documentId);

      for (const attach of attachments) {
        try {
          const p7sAttachSignData = await getTaskDocumentP7SSignData(documentId, attach.id);

          fileList.push({
            data: await readAsUint8Array(p7sAttachSignData),
            name: attach.name,
            method: 'signTaskDocumentP7S',
            internal: true,
            attachId: attach.id
          });
        } catch (e) {
          const alreadySigned = errorTextArray.includes(e.message);

          if (!isDiiaMethod && alreadySigned) {
            return Promise.resolve();
          }

          if (!alreadySigned) {
            throw e;
          }
        }
      }
    }

    const additionaldataToSign = await getTaskDocumentAdditional(documentId);

    const preparedDataList = [].concat(additionaldataToSign).filter(Boolean);

    if (preparedDataList.length) {
      for (let index = 0; index < preparedDataList.length; index++) {
        const data = preparedDataList[index];
        const internal = ['data', 'dataExternal'].includes(data.type) || typeof data === 'string';

        const dataToSign = data.content || data;

        fileList.push({
          dataType: data.type,
          data: internal ? base64toUint8Array(dataToSign) : dataToSign,
          name: data.name || ['[meta]-additional-data-to-sign-', index + 1].join(''),
          isHash: !internal,
          method: 'additionaldataToSign',
          internal
        });
      }
    }

    const manifest = await getTaskDocumentSignData(documentId);

    for (let i = 0; i < manifest.length; i++) {
      fileList.push({
        data: manifest[i],
        name: setFileName(i),
        isHash: !!i,
        method: 'signTaskDocument',
        internal: !i
      });
    }

    updateFileList(fileList);

    if (isDiiaMethod && isMobile) {
      await dbStorage.setItem('fileList', fileList);
      return fileList;
    }

    return fileList;
  };

  const toggleSigningDialog = React.useCallback((bool) => setShowSigningDialog(bool), []);

  const toggleRejectSigningDialog = React.useCallback(
    (bool) => setShowRejectSigningDialog(bool),
    []
  );

  const toggleSuccessDialog = React.useCallback((bool) => setShowSuccessDialog(bool), []);

  const handleLiquioServerSign = React.useCallback(
    () => onSelectKey(null, null, () => {}, undefined, true),
    [onSelectKey]
  );

  const handleInformSigners = async () => {
    const {
      task: { documentId, id }
    } = props;

    await informSigners(documentId);
    await loadTask(id);
  };

  const getFinishBtnText = () => {
    const { t, task, template } = props;
    const finishBtnText = template?.jsonSchema?.finishBtn;

    if (!finishBtnText) return;

    const result = evaluate(finishBtnText, task.document.data);

    return result instanceof Error ? t('FinishBtn') : result;
  };

  const {
    authInfo,
    template,
    task,
    task: {
      finished,
      document: { signatures = [], signatureRejections = [] }
    }
  } = props;

  const steps = getTemplateSteps(task, template, authInfo);

  const alreadySigned = !!signatures.find(({ createdBy }) => createdBy === authInfo.userId);
  const alreadyRejected = !!signatureRejections.find(({ userId }) => userId === authInfo.userId);
  const finishBtnText = getFinishBtnText();
  const isLiquioServerSign = getLiquioServerSign(
    template?.jsonSchema?.liquioServerSign,
    task.document.data,
    task.meta,
    authInfo
  );

  return {
    showSigningDialog,
    showRejectSigningDialog,
    signProgress,
    signProgressText,
    rejectSign,
    showSuccessDialog,
    fileList,
    finished,
    alreadySigned,
    alreadyRejected,
    toggleSigningDialog,
    toggleRejectSigningDialog,
    toggleSuccessDialog,
    onSelectKey,
    onSignHash,
    getDataToSign,
    onRejectSigning,
    handleLiquioServerSign,
    isLiquioServerSign,
    steps,
    handleInformSigners,
    finishBtnText
  };
};

export default useSigningAction;
