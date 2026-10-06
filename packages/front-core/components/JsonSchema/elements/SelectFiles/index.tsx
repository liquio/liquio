import React from 'react';
import { translate, Translate } from 'react-translate';
import queueFactory from 'helpers/queueFactory';
import renderHTML from 'helpers/renderHTML';
import evaluate from 'helpers/evaluate';
import sleep from 'helpers/sleep';
import compressPDF from 'helpers/compressPDF';
import compressImage from 'helpers/compressImage';
import { Typography, FormHelperText, IconButton } from '@mui/material';
import withStyles, { WithStyles } from '@mui/styles/withStyles';
import ChangeEvent from 'components/JsonSchema/ChangeEvent';
import EJVError from 'components/JsonSchema/components/EJVError';
import FileDataTableUntyped from 'components/FileDataTable';
import ElementContainer from 'components/JsonSchema/components/ElementContainer';
import SelectFileArea from 'components/JsonSchema/elements/SelectFiles/components/SelectFileArea';
import Preloader from 'components/Preloader';
import DeleteIcon from 'assets/img/ic_trash.svg';
import FileListPreview from './components/FileListPreview';

const FileDataTable = FileDataTableUntyped as unknown as React.ComponentType<Record<string, unknown>>;

const styles = () => ({
  root: {
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
  },
  noMargin: {
    margin: 0,
  },
  label: {
    marginTop: 60,
    fontSize: 20,
    lineHeight: '24px',
    marginBottom: 15,
  },
  modal: {
    zIndex: 9999,
    position: 'fixed' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    '& > *': {
      height: 'auto',
      padding: 0,
    },
  },
  simleListItem: {
    borderBottom: '2px solid #000',
    marginBottom: 15,
    justifyContent: 'space-between',
    display: 'flex',
    alignItems: 'center',
  },
  simleListWrapper: {
    marginTop: 10,
  },
  description: {
    marginBottom: 10,
    fontSize: 16,
    lineHeight: '28px',
  },
});

interface FileAttach {
  id?: string | number;
  name?: string;
  type?: string;
  size?: number;
  labels?: string[];
  [key: string]: unknown;
}

interface SelectFilesActions {
  setBusy: (busy: boolean) => void;
  handleDeleteFile: (attach: FileAttach) => Promise<unknown>;
  uploadDocumentAttach: (file: unknown, labels: unknown, path: string, meta: unknown, fileName: string) => Promise<FileAttach | Error>;
  loadTaskAction: () => Promise<unknown>;
  handleStore?: () => Promise<unknown>;
  handleDownloadFile?: (file: FileAttach) => Promise<unknown>;
}

interface SelectFilesProps extends WithStyles<typeof styles> {
  t: Translate;
  actions?: SelectFilesActions;
  sample?: string;
  accept?: string;
  value?: FileAttach[] | Record<string, FileAttach> | null;
  maxSize?: number | null;
  minSize?: number;
  maxLength?: number;
  path?: Array<string | number>;
  hidden?: boolean;
  simpleList?: boolean;
  multiple?: boolean;
  width?: string | number | null;
  maxWidth?: string | number;
  compressTypes?: string[] | null;
  outputQuality?: number;
  isPopup?: boolean;
  forceSaving?: boolean;
  typography?: string;
  taskId?: string;
  name?: string;
  error?: unknown;
  labels?: string[];
  readOnly?: boolean;
  noMargin?: boolean;
  description?: string;
  onChange?: ((event: InstanceType<typeof ChangeEvent>) => void) | null;
  rootDocument: { data: Record<string, unknown> };
  pathIndex?: { index: number };
  stepName?: string;
  documentValue?: { data: Record<string, unknown> };
  contestName?: unknown;
  metaData?: string;
  changeName?: string;
  view?: unknown;
  fileStorage?: unknown;
  defaultView?: unknown;
  demo?: boolean;
}

interface SelectFilesState {
  uploadFileList: Array<FileAttach & { labels?: string[] }>;
  rejected: { message: string } | null;
  loading: boolean;
  failed?: boolean;
}

class SelectFiles extends React.Component<SelectFilesProps, SelectFilesState> {
  static defaultProps: Partial<SelectFilesProps> = {
    sample: '',
    accept: '',
    actions: {} as SelectFilesActions,
    maxSize: null,
    minSize: 1,
    value: null,
    path: [],
    hidden: false,
    simpleList: false,
    maxLength: 0,
    multiple: true,
    width: null,
    compressTypes: null,
    outputQuality: 1,
    isPopup: false,
    forceSaving: false,
    typography: 'h6',
  };

  deletedItems: Set<string | number>;

  queue: ReturnType<typeof queueFactory.get>;

  constructor(props: SelectFilesProps) {
    super(props);
    const { taskId } = props;
    this.state = {
      uploadFileList: [],
      rejected: null,
      loading: false,
    };

    this.deletedItems = new Set();
    this.queue = queueFactory.get(taskId as string);
    this.queue.on('end', () => {
      this.setState({ loading: false });
      this.deletedItems.clear();
    });
  }

  debounce = (func: (...args: unknown[]) => void) => {
    let timerId: ReturnType<typeof setTimeout>;
    return (...args: unknown[]) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => func(...args), 300);
    };
  };

  componentDidMount() {
    this.handleRemoveHidden = this.debounce(this.handleRemoveHidden);
  }

  componentDidUpdate(prevProps: SelectFilesProps) {
    const { value } = this.props;

    if (
      (prevProps.value && (prevProps.value as FileAttach[]).length) !== (value && (value as FileAttach[]).length)
    ) {
      this.handleRemoveHidden = this.debounce(this.handleRemoveHidden);
    }
  }

  handleRemoveHidden = () => {
    const { value, hidden } = this.props;

    if (value && (value as FileAttach[]).length && hidden) {
      (value as FileAttach[]).forEach((item) => {
        if (!this.deletedItems.has(item.id as string | number)) {
          this.deletedItems.add(item.id as string | number);
          this.queue.push(async () => {
            await this.handleDeleteFile(item);
          });
        }
      });
    }
  };

  handleDeleteFile = async (attach: FileAttach) => {
    const { actions, value } = this.props;

    actions?.setBusy(true);

    const newValue = value
      ? Object.values(value).filter(({ id }) => id !== attach.id)
      : [];

    await actions?.handleDeleteFile(attach);

    await this.handleChange(newValue, true, true);

    actions?.setBusy(false);
  };

  evaluateFile = (functionForEval: string, attach: unknown): unknown => {
    const { rootDocument, pathIndex, stepName, documentValue } = this.props;
    const rootDocuments = documentValue ? documentValue : rootDocument;
    return evaluate(
      functionForEval,
      rootDocuments.data,
      rootDocuments.data[stepName as string],
      attach,
      pathIndex?.index,
    );
  };

  handleCompressFile = (attach: File): Promise<File | Blob> =>
    new Promise((resolve) => {
      (async () => {
        const { outputQuality, compressTypes } = this.props;

        if (!outputQuality || !compressTypes || !attach) {
          return resolve(attach);
        }

        const compressing = compressTypes.find((type) => {
          return attach.type.includes(type);
        });

        const compressData = {
          attach,
          outputQuality,
        };

        switch (compressing) {
          case 'image':
            return resolve(await compressImage(compressData));
          case 'pdf':
            return resolve(await compressPDF(compressData));
          default:
            return resolve(attach);
        }
      })();
    });

  uploadFile = (file: File & { labels?: string[] }, labels: string[], fileIndex: number) => () =>
    new Promise<void>((resolve) => {
      (async () => {
        const { isPopup, forceSaving } = this.props;
        const { uploadFileList } = this.state;
        const {
          value,
          contestName,
          actions,
          metaData,
          stepName,
          path,
          changeName,
        } = this.props;
        const { uploadDocumentAttach, loadTaskAction, setBusy } = actions as SelectFilesActions;

        const fileList = Object.values(value || {});

        let meta: unknown = {};

        const attachObject = {
          path: (file as unknown as { path?: string }).path,
          lastModified: file.lastModified,
          lastModifiedDate: (file as unknown as { lastModifiedDate?: Date }).lastModifiedDate,
          name: file.name,
          size: file.size,
          type: file.type,
          labels,
          contestName,
        };

        let fileName = file.name;

        if (changeName) {
          const evaluatedName = this.evaluateFile(changeName, attachObject);

          if (evaluatedName instanceof Error) {
            (evaluatedName as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'select files changeName' });
            fileName = file.name;
          } else {
            fileName = evaluatedName as string;
          }

          const type = file.type || '';

          const typeInName = fileName.split('.').pop() as string;

          const typeInFile = type.split('/')[type.split('/').length - 1];

          if (type.indexOf(typeInName) === -1) {
            fileName = fileName + '.' + typeInFile;
          }
        }

        if (metaData) {
          const evaluatedMeta = this.evaluateFile(metaData, attachObject);

          if (evaluatedMeta instanceof Error) {
            (evaluatedMeta as Error & { commit: (info: Record<string, unknown>) => void }).commit({ type: 'select files metaData' });
            meta = undefined;
          } else {
            meta = evaluatedMeta;
          }
        }

        setBusy(true);

        const compressesFile = await this.handleCompressFile(file);

        const uploadedFile = await uploadDocumentAttach(
          compressesFile,
          labels,
          ([] as unknown[]).concat(stepName, path, fileIndex).join('.'),
          meta,
          fileName,
        );

        if (!isPopup || forceSaving) {
          await loadTaskAction();
        }

        setBusy(false);

        if (!(uploadedFile instanceof Error)) {
          fileList[fileIndex] = {
            ...uploadedFile,
            labels,
            contestName,
            metaData: meta,
            size: uploadedFile?.size,
          };

          this.handleChange(fileList as FileAttach[], true, true);
        }

        this.setState(
          {
            uploadFileList: uploadFileList.slice(1),
          },
          async () => {
            await sleep(10);
            resolve();
          },
        );
      })();
    });

  handleChange = async (data: unknown, force = false, hard = false) => {
    const { onChange } = this.props;
    return onChange && onChange(new ChangeEvent(data, force, hard, false) as InstanceType<typeof ChangeEvent>);
  };

  onDropRejected = (rejected: File[]) => {
    const { t } = this.props;

    if (!rejected) return;

    this.setState({
      rejected: {
        message: t('FileSizeLimitReached'),
      },
    });
  };

  onDrop = (labels: string[]) => async (acceptedFiles: Array<File & { labels?: string[] }>) => {
    const { uploadFileList } = this.state;
    const { value, demo, actions } = this.props;
    const fileList = Object.values(value || {});

    if (uploadFileList.length) {
      return;
    }

    this.setState({ rejected: null });

    if (!acceptedFiles || !acceptedFiles.length) {
      return;
    }

    this.setState(
      {
        loading: true,
        uploadFileList: uploadFileList.concat(
          acceptedFiles.map((file) => {
            file.labels = labels;
            return file as unknown as FileAttach;
          }),
        ),
      },
      () => {
        (async () => {
          if (!demo) {
            typeof actions?.handleStore === 'function' && await actions.handleStore();
            acceptedFiles.forEach((file, index) =>
              this.queue.push(
                this.uploadFile(file, labels, index + fileList.length),
              ),
            );
          }
        })();
      },
    );
  };

  renderDataTableList = ({ list, dragEvents }: { list: FileAttach[] | null; dragEvents?: Record<string, unknown> }) => {
    const {
      view,
      labels,
      actions,
      readOnly,
      fileStorage,
      simpleList,
      classes,
      t,
      defaultView,
    } = this.props;
    const { uploadFileList, loading } = this.state;

    if (!list || !list.length) return null;

    if (simpleList) {
      return (
        <div className={classes.simleListWrapper}>
          {list.map((attach) => (
            <div className={classes.simleListItem} key={attach?.id}>
              <span>{attach?.name}</span>
              <IconButton
                onClick={() =>
                  readOnly || uploadFileList.length
                    ? null
                    : this.handleDeleteFile(attach)
                }
                aria-label={t('Delete')}
                size="large"
              >
                <img src={DeleteIcon} alt="DeleteIcon" />
              </IconButton>
            </div>
          ))}
        </div>
      );
    }

    return (
      <FileDataTable
        dragEvents={dragEvents}
        view={view}
        defaultView={defaultView}
        data={list}
        fileStorage={fileStorage}
        groupBy={labels ? 'labels' : undefined}
        actions={{
          handleDeleteFile:
            readOnly || uploadFileList.length ? null : this.handleDeleteFile,
          handleDownloadFile: actions?.handleDownloadFile,
        }}
        loading={loading}
      />
    );
  };

  render = () => {
    const {
      path = [],
      name,
      error,
      accept,
      hidden,
      labels,
      value,
      sample,
      classes,
      maxSize,
      minSize,
      readOnly,
      noMargin,
      description,
      maxLength,
      multiple,
      width,
      maxWidth,
      typography,
    } = this.props;

    const { uploadFileList, rejected, loading } = this.state;

    if (hidden) return null;

    const fileList = ([] as FileAttach[])
      .concat(Object.values(value || {}), uploadFileList)
      .filter(Boolean);

    const renderDataTable = (dragEvents: Record<string, unknown>) =>
      this.renderDataTableList({
        list: fileList,
        dragEvents,
      });

    const limitReached = !!(maxLength && maxLength === fileList.length);

    return (
      <ElementContainer
        id={(path || []).join('-')}
        width={width}
        maxWidth={maxWidth}
        noMargin={noMargin}
      >
        {description ? (
          <Typography variant={typography as never} className={classes.description}>
            {description}
          </Typography>
        ) : null}
        {sample ? (
          <div className={(classes as unknown as { raw?: string }).raw}>{renderHTML(sample)}</div>
        ) : null}
        {labels && labels.length ? (
          <>
            {labels.map((label) => (
              <div key={label}>
                <Typography variant={typography as never} className={classes.label}>
                  {label}
                </Typography>

                {this.renderDataTableList({
                  list: (() => {
                    if (!fileList || !fileList.length) return null;
                    const filesByLabel = fileList.filter(
                      ({ labels }) => label === (labels as string[])[0],
                    );
                    if (!filesByLabel.length) return null;
                    return filesByLabel;
                  })(),
                })}

                <SelectFileArea
                  path={path}
                  name={name}
                  sample={sample}
                  maxSize={maxSize as number}
                  minSize={minSize}
                  accept={accept}
                  labels={labels as never}
                  multiple={multiple}
                  readOnly={readOnly || !!uploadFileList.length || limitReached}
                  onSelect={this.onDrop([label])}
                  onDropRejected={this.onDropRejected}
                />
              </div>
            ))}
          </>
        ) : (
          <SelectFileArea
            path={path}
            name={name}
            sample={sample}
            maxSize={maxSize as number}
            minSize={minSize}
            accept={accept}
            readOnly={readOnly || !!uploadFileList.length || limitReached}
            multiple={multiple}
            onSelect={this.onDrop([])}
            onDropRejected={this.onDropRejected}
            renderContent={renderDataTable as never}
          />
        )}
        {error ? (
          <FormHelperText error={!!error} id={`${(path || []).join('-')}-error-region`}>
            <EJVError error={error as never} />
          </FormHelperText>
        ) : null}
        {rejected ? (
          <FormHelperText error={!!rejected}>
            <EJVError error={rejected as never} />
          </FormHelperText>
        ) : null}
        {loading ? (
          <div className={classes.modal}>
            <Preloader />
          </div>
        ) : null}
      </ElementContainer>
    );
  };
}

const styled = withStyles(styles)(SelectFiles);
const translated = translate('Elements')(styled) as unknown as React.ComponentType<Record<string, unknown>> & { Preview?: React.ComponentType<Record<string, unknown>> };

translated.Preview = FileListPreview as unknown as React.ComponentType<Record<string, unknown>>;

export default translated;
