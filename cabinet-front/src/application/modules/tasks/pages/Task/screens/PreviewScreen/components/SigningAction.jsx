import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import MobileDetect from 'mobile-detect';

import promiseChain from 'helpers/promiseChain';
import { readAsUint8Array } from 'helpers/readFileList';
import base64toUint8Array from 'helpers/base64toUint8Array';
import evaluate from 'helpers/evaluate';
import {
  getDataToEncrypt,
  saveEncryptedData,
  loadTaskDocument,
  multisignCheck,
  signTaskDocument,
  signTaskDocumentP7S,
  rejectDocumentSigning,
  downloadDocumentAttach,
  getTaskDocumentSignData,
  getTaskDocumentP7SSignData,
  getTaskDocumentAdditional,
  signTaskDocumentAdditional,
  getPDFDocument,
  informSigners,
  loadTask,
  signCheckAction
} from 'application/actions/task';
import signManifest from 'services/eds/helpers/signManifest';
import getTemplateSteps from 'modules/tasks/pages/Task/helpers/getTemplateSteps';
import SigningActionLayout from 'modules/tasks/pages/Task/screens/PreviewScreen/components/SigningActionLayout';
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

class SigningAction extends React.Component {
  state = {
    showSigningDialog: false,
    showRejectSigningDialog: false,
    signProgress: 0,
    signProgressText: null,
    rejectSign: false,
    showSuccessDialog: false
  };

  getActiveSigners = (signatures) => {
    const { task } = this.props;
    const { signerUsers } = task;

    const signers = signerUsers.filter(
      (userId) => !signatures?.find(({ createdBy }) => createdBy === userId)
    );

    return signers;
  };

  getP7SSignDataWithCache = async (documentId, attachments, actions) => {
    const cache = new Map();

    const promises = attachments.map(async (attach) => {
      if (!cache.has(attach.id)) {
        try {
          const signData = await actions.getTaskDocumentP7SSignData(documentId, attach.id);
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

  sign = async (signer, signInfo, iteration = 0) => {
    const { t, actions, setBusy, task, authInfo } = this.props;

    if (!task) {
      return null;
    }

    const { documentId, document } = task;

    this.setState({
      signProgress: 0,
      signProgressText: t('SignProcessSignTaskDocumentSignData')
    });

    const signers = this.getActiveSigners(document?.signatures || []).filter(
      (userId) => userId !== authInfo?.userId
    );

    const manifest = await actions.getTaskDocumentSignData(documentId);

    const signedManifest = await signManifest(manifest, signer);

    const signResult = await actions.signTaskDocument(
      documentId,
      signedManifest,
      signInfo,
      !signers.length
    );

    if (!signResult || signResult instanceof Error) {
      if (signResult && signResult.message === 'Невідома помилка' && iteration < 3) {
        return this.sign(signer, signInfo, iteration + 1);
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

  signP7S = async (signer, isExternalP7sSign = false) => {
    const { t, actions, setBusy, task } = this.props;

    if (!task) {
      return null;
    }

    this.setState({
      signProgress: 0,
      signProgressText: t('SignProcessSignP7S')
    });

    const { documentId } = task;

    let signData;

    try {
      signData = await actions.getTaskDocumentP7SSignData(documentId);
    } catch (e) {
      if (errorTextArray.includes(e.message)) {
        return Promise.resolve();
      }
      throw e;
    }

    const signDataArrayBuffer = await readAsUint8Array(signData);
    const signature = await signManifest(signDataArrayBuffer, signer, !isExternalP7sSign);
    const signResult = await actions.signTaskDocumentP7S(documentId, signature);

    if (!signResult || signResult instanceof Error) {
      setBusy(false);
      throw new Error(t(signResult.message));
    }

    return signResult;
  };

  signP7SAttach = async (signer) => {
    const { t, actions, task, template } = this.props;
    const { attachments } = await actions.loadTaskDocument(task.documentId);
    const { documentId } = task;
    const P7sSignText = template?.jsonSchema?.P7sSignText;

    const signDataArray = await this.getP7SSignDataWithCache(documentId, attachments, actions);

    const attachSignFunc = (attach, index) => async () => {
      this.setState({
        signProgress: ((index + 1) / attachments.length) * 100,
        signProgressText: P7sSignText
          ? P7sSignText
          : t('SignProcessSignP7SAttach', {
              progress: index + 1,
              total: attachments.length
            })
      });

      const signData = signDataArray[index];
      if (!signData) return Promise.resolve();

      const signDataArrayBuffer = await readAsUint8Array(signData);

      if (signDataArrayBuffer.length > MAX_SIZE_P7S_SOURCE) {
        throw new Error(t('MaxSizeError'));
      }

      const signature = await signManifest(signDataArrayBuffer, signer);
      const signTaskDocumentP7SResult = await actions.signTaskDocumentP7S(
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

  getEncodeCert = async (signer, index) => {
    const certif = await signer.execute('EnumOwnCertificates', index);
    if (certif === null) {
      // throw new Error('Ключ не має відповідного сертифікату');
      throw new Error('Сертифікат шифрування відстуній. Зверніться до вашого АЦСК');
    }

    if (certif.keyUsage === 'Протоколи розподілу ключів') {
      return certif;
    }

    return this.getEncodeCert(signer, index + 1);
  };

  signAdditionalData = async (signer, options) => {
    const {
      t,
      actions,
      task: { documentId }
    } = this.props;

    this.setState({
      signProgress: 0,
      signProgressText: t('SignProcessSignAdditionalData')
    });

    const dataToSign = await actions.getTaskDocumentAdditional(documentId);

    const preparedDataList = [].concat(dataToSign).filter(Boolean);

    if (!preparedDataList.length) {
      return Promise.resolve();
    }

    const p7sSignature = [];

    for (let index = 0; index < preparedDataList.length; index++) {
      const data = preparedDataList[index];

      if (data.type === 'taxSignEncryptSign') {
        const dataToSign = data.content;

        p7sSignature[index] = await this.taxSignEncryptSign(
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

    const { issuer, serial } = await this.getEncodeCert(signer, 0);

    const decodedCert = await signer.execute('GetCertificate', issuer, serial);
    const cryptCertificate = await signer.execute('Base64Encode', decodedCert);
    try {
      await actions.signTaskDocumentAdditional(documentId, {
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
      await this.encryptDocumentData(signer);
    }
  };

  encryptDocumentData = async (signer) => {
    const {
      actions,
      task: { documentId }
    } = this.props;

    const { toEncrypt, encryptCert } = await actions.getDataToEncrypt(documentId);
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

    return actions.saveEncryptedData(documentId, encryptedData);
  };

  getHideMainPdf = (value, taskDocumentData) => {
    if (value && typeof value === 'boolean') return value;

    if (value && typeof value === 'string') {
      const result = evaluate(value, taskDocumentData);
      return result instanceof Error ? value : result;
    }

    return null;
  };

  taxSignEncryptSign = async (signer, dataToEncrypt, cryptCerts) => {
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

  onRejectSigning = (rejectData) => {
    const { task, actions, setBusy } = this.props;
    const { documentId } = task;

    this.setState({ showRejectSigningDialog: false });
    setBusy(true);
    actions.rejectDocumentSigning(documentId, rejectData);
    setBusy(false);
  };

  onSelectKey = async (encryptedKey, signer, resetPrivateKey, signInfo) => {
    const {
      actions,
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
    } = this.props;
    const { rejectSign } = this.state;

    setBusy(true);

    if (checkBeforeSign && checkBeforeSign.length) {
      await this.validateKey(checkBeforeSign, authInfo, data);
    }

    if (rejectSign) {
      setBusy(false);
      return;
    }

    try {
      if (signerUsers.length > 1) {
        await actions.multisignCheck(documentId);
      }

      if (signCheck) {
        await actions.signCheck(documentId);
      }

      if (isP7sSign && !this.getHideMainPdf(hideMainPDF, data)) {
        await this.signP7S(signer, isExternalP7sSign);
        await this.signP7SAttach(signer);
      } else {
        await this.signP7SAttach(signer);
      }

      if (additionalDataToSign) {
        await this.signAdditionalData(signer, { encryptDocumentData });
      }

      const signResult = await this.sign(signer, signInfo);

      const { signatures } = signResult;

      const signers = this.getActiveSigners(signatures);

      this.setState({ showSigningDialog: false }, resetPrivateKey);

      if (signers.length) {
        this.setState({ showSuccessDialog: true });
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

  validateKey = async (checkBeforeSign, authInfo, data) => {
    const { actions, task } = this.props;
    const { documentId } = task;
    const { attachments } = await actions.loadTaskDocument(documentId);
    this.setState({ rejectSign: false });

    const signatures = await this.getP7SSignDataWithCache(documentId, attachments, actions);

    for (const element of checkBeforeSign) {
      const { isValid, errorText } = element;
      const result = evaluate(isValid, data, authInfo, signatures);

      if (result instanceof Error) {
        throw new Error('Error in checkBeforeSign');
      }
      if (result === false) {
        this.setState({ rejectSign: true });
        throw new Error(errorText);
      }
    }
  };

  onSignHash = async (hashes, signInfo) => {
    const { fileList } = this.state;

    const {
      t,
      setBusy,
      actions,
      handleFinish,
      task: { documentId, signerUsers }
    } = this.props;

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
        await actions.signTaskDocumentP7S(documentId, signature, attachId);
      }
    }

    const p7sSignature = repacked
      .filter(({ method }) => method === 'additionaldataToSign')
      .map(({ signature }) => signature);

    if (p7sSignature.length) {
      try {
        await actions.signTaskDocumentAdditional(documentId, { p7sSignature });
      } catch (e) {
        if (!errorTextArray.includes(e.message)) {
          throw e;
        }
      }
    }

    const signedManifest = repacked
      .filter(({ method }) => method === 'signTaskDocument')
      .map(({ signature }) => signature);

    const signResult = await actions.signTaskDocument(documentId, signedManifest, signInfo, false);

    if (!signResult || signResult instanceof Error) {
      setBusy(false);
      throw new Error(t(signResult.message));
    }

    const { signatures } = signResult;
    const signers = signerUsers.filter(
      (userId) => !signatures.find(({ createdBy }) => createdBy === userId)
    );

    this.setState({ showSigningDialog: false });
    setBusy(false);

    if (!signers.length) {
      handleFinish(true);
    }
  };

  setFileName = (i) => {
    const {
      t,
      template: {
        jsonSchema: { isP7sSign, signDataNaming, title }
      }
    } = this.props;

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

  getDataToSign = async () => {
    const {
      t,
      actions,
      task,
      task: { documentId, signerUsers },
      template: {
        jsonSchema: { isP7sSign, isExternalP7sSign, signDataNaming, signCheck, hideMainPDF }
      }
    } = this.props;

    const fileList = [];

    if (signerUsers.length > 1) {
      await actions.multisignCheck(documentId);
    }

    if (signCheck) {
      await actions.signCheck(documentId);
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

      this.setState({
        fileList: savedList
      });

      return savedList;
    }

    // p7s sign
    if (isP7sSign) {
      if (!this.getHideMainPdf(hideMainPDF, task.document.data)) {
        try {
          const p7sSignData = await actions.getTaskDocumentP7SSignData(documentId);

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

      const { attachments } = await actions.loadTaskDocument(task.documentId);

      for (const attach of attachments) {
        try {
          const p7sAttachSignData = await actions.getTaskDocumentP7SSignData(documentId, attach.id);

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

    const additionaldataToSign = await actions.getTaskDocumentAdditional(documentId);

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

    const manifest = await actions.getTaskDocumentSignData(documentId);

    for (let i = 0; i < manifest.length; i++) {
      fileList.push({
        data: manifest[i],
        name: this.setFileName(i),
        isHash: !!i,
        method: 'signTaskDocument',
        internal: !i
      });
    }

    this.setState({ fileList });

    if (isDiiaMethod && isMobile) {
      await dbStorage.setItem('fileList', fileList);
      return fileList;
    }

    return fileList;
  };

  toggleSigningDialog = (bool) => this.setState({ showSigningDialog: bool });

  toggleRejectSigningDialog = (bool) => this.setState({ showRejectSigningDialog: bool });

  toggleSuccessDialog = (bool) => this.setState({ showSuccessDialog: bool });

  handleInformSigners = async () => {
    const {
      actions,
      task: { documentId, id }
    } = this.props;

    await actions.informSigners(documentId);
    await actions.loadTask(id);
  };

  getFinishBtnText = () => {
    const { t, task, template } = this.props;
    const finishBtnText = template?.jsonSchema?.finishBtn;

    if (!finishBtnText) return;

    const result = evaluate(finishBtnText, task.document.data);

    return result instanceof Error ? t('FinishBtn') : result;
  };

  render = () => {
    const {
      authInfo,
      template,
      task,
      task: {
        finished,
        document: { signatures = [], signatureRejections = [] }
      }
    } = this.props;

    const steps = getTemplateSteps(task, template, authInfo);

    const alreadySigned = !!signatures.find(({ createdBy }) => createdBy === authInfo.userId);
    const alreadyRejected = !!signatureRejections.find(({ userId }) => userId === authInfo.userId);
    const finishBtnText = this.getFinishBtnText();

    return (
      <SigningActionLayout
        {...this.props}
        {...this.state}
        finished={finished}
        alreadySigned={alreadySigned}
        alreadyRejected={alreadyRejected}
        toggleSigningDialog={this.toggleSigningDialog}
        toggleRejectSigningDialog={this.toggleRejectSigningDialog}
        toggleSuccessDialog={this.toggleSuccessDialog}
        onSelectKey={this.onSelectKey}
        onSignHash={this.onSignHash}
        getDataToSign={this.getDataToSign}
        onRejectSigning={this.onRejectSigning}
        steps={steps}
        handleInformSigners={this.handleInformSigners}
        finishBtnText={finishBtnText}
      />
    );
  };
}

const mapStateToProps = ({
  auth: { info },
  files: { pdfDocuments, list },
  task: { documents }
}) => ({ authInfo: info, pdfDocuments, documents, fileList: list });

const mapDispatchToProps = (dispatch) => ({
  actions: {
    getDataToEncrypt: bindActionCreators(getDataToEncrypt, dispatch),
    saveEncryptedData: bindActionCreators(saveEncryptedData, dispatch),
    loadTaskDocument: bindActionCreators(loadTaskDocument, dispatch),
    multisignCheck: bindActionCreators(multisignCheck, dispatch),
    signTaskDocument: bindActionCreators(signTaskDocument, dispatch),
    signTaskDocumentP7S: bindActionCreators(signTaskDocumentP7S, dispatch),
    rejectDocumentSigning: bindActionCreators(rejectDocumentSigning, dispatch),
    downloadDocumentAttach: bindActionCreators(downloadDocumentAttach, dispatch),
    getTaskDocumentSignData: bindActionCreators(getTaskDocumentSignData, dispatch),
    getTaskDocumentP7SSignData: bindActionCreators(getTaskDocumentP7SSignData, dispatch),
    signTaskDocumentAdditional: bindActionCreators(signTaskDocumentAdditional, dispatch),
    getTaskDocumentAdditional: bindActionCreators(getTaskDocumentAdditional, dispatch),
    getPDFDocument: bindActionCreators(getPDFDocument, dispatch),
    informSigners: bindActionCreators(informSigners, dispatch),
    loadTask: bindActionCreators(loadTask, dispatch),
    signCheck: bindActionCreators(signCheckAction, dispatch)
  }
});

const translated = translate('TaskPage')(SigningAction);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
