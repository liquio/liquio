import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import withStyles from '@mui/styles/withStyles';
import { importUnits } from 'application/actions/units';
import unitListControlEndPoint from 'application/endPoints/unitListControl';
import dataTableConnect from 'services/dataTable/connect';
import { addMessage } from 'actions/error';
import Message from 'components/Snackbars/Message';
import ConfirmDialogRaw from 'components/ConfirmDialog';
import DownloadIcon from 'assets/img/dowload-icon.svg';
import parseFile from 'helpers/parseFile';

const ConfirmDialog = ConfirmDialogRaw as unknown as React.ComponentType<Record<string, unknown>>;

const styles = (theme: { buttonBg: string }) => ({
  actionColor: {
    fill: theme.buttonBg,
    marginRight: 10,
  },
  actionBtn: {
    marginLeft: 16,
  },
});

const ROWS_PER_PAGE = 1000;

interface ImportUnitsProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  ColorButton: React.ComponentType<Record<string, unknown>>;
  actions: { load: () => void; onChangeRowsPerPage: (rowsPerPage: number, force?: boolean) => void };
  unitActions: { load: () => void };
  importActions: {
    importUnits: (file: File, force?: boolean) => Promise<Error | unknown>;
    addMessage: (message: unknown) => void;
  };
}

interface ImportUnitsState {
  openConfirmDialog: boolean;
  filesInfo: string;
  target?: { files: FileList };
}

class ImportUnits extends React.Component<ImportUnitsProps, ImportUnitsState> {
  input: HTMLInputElement | null = null;

  constructor(props: ImportUnitsProps) {
    super(props);
    this.state = {
      openConfirmDialog: false,
      filesInfo: '',
    };
  }

  handleOpenConfirmDialog = () => this.setState({ openConfirmDialog: true });

  handleCloseConfirmDialog = () => this.setState({ openConfirmDialog: false });

  handleUploadClick = () => this.input && this.input.click();

  handleChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ target: target as unknown as { files: FileList } });
    const { actions, unitActions, importActions } = this.props;

    const file = (target.files as FileList)[0];

    parseFile(file, ((files: { id: string; name: string }[]) => {
      this.setState({
        filesInfo: files.map(({ id, name }) => `${id} «${name}»`).join(', '),
      });
    }) as (obj: unknown) => void);

    const importResult = await importActions.importUnits(file);

    if (importResult instanceof Error) {
      if (importResult.message === 'Unit already exists.') {
        this.handleOpenConfirmDialog();
      } else {
        importActions.addMessage(new Message('InvalidFile', 'error'));
      }
      return;
    }

    const { filesInfo } = this.state;

    importActions.addMessage(
      new Message('ImportUnitsSuccess', 'success', null, {
        filesInfo,
      }),
    );

    unitActions.load();

    actions.onChangeRowsPerPage(ROWS_PER_PAGE, true);
  };

  handleChangeConfirm = async () => {
    const { actions, unitActions, importActions } = this.props;
    const { target } = this.state;

    const importResult = await importActions.importUnits((target as { files: FileList }).files[0], true);

    if (importResult instanceof Error) {
      importActions.addMessage(new Message('FailImportingUnits', 'error'));
      return;
    }

    this.handleCloseConfirmDialog();

    const { filesInfo } = this.state;

    importActions.addMessage(
      new Message('ImportUnitsSuccess', 'success', null, {
        filesInfo,
      }),
    );

    unitActions.load();

    actions.onChangeRowsPerPage(ROWS_PER_PAGE, true);

    this.setState({ target: undefined });
  };

  render() {
    const { t, ColorButton, classes } = this.props as ImportUnitsProps & { classes: Record<string, string> };
    const { openConfirmDialog, filesInfo } = this.state;

    return (
      <>
        <ColorButton
          variant="contained"
          color="primary"
          disableElevation={true}
          className={classes.actionBtn}
          onClick={this.handleUploadClick}
        >
          <img
            src={DownloadIcon}
            alt="import units icon"
            className={classes.actionColor}
          />
          {t('ImportUnits')}
        </ColorButton>

        <input
          ref={(ref) => {
            this.input = ref;
          }}
          type="file"
          accept=".bpmn, application/bpmn"
          onChange={this.handleChange}
          hidden={true}
          multiple={false}
        />
        <ConfirmDialog
          fullScreen={false}
          darkTheme={true}
          open={openConfirmDialog}
          title={
            (filesInfo.split(',') || []).length > 1
              ? t('OverwriteUnitsConfirmation')
              : t('OverwriteUnitsConfirmationOne', {
                  filesInfo,
                })
          }
          description={
            (filesInfo.split(',') || []).length > 1
              ? t('OverwriteUnitsConfirmationText', {
                  filesInfo,
                })
              : t('OverwriteUnitsConfirmationTextOne')
          }
          handleClose={this.handleCloseConfirmDialog}
          handleConfirm={this.handleChangeConfirm}
        />
      </>
    );
  }
}

const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  importActions: {
    importUnits: bindActionCreators(importUnits, dispatch),
    addMessage: bindActionCreators(addMessage, dispatch),
  },
});

const translated = translate('UnitsListPage')(ImportUnits as never);
const styled = withStyles(styles)(translated as never);
const connected = connect(mapStateToProps, mapDispatchToProps)(styled as never);
export default dataTableConnect(unitListControlEndPoint)(connected as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
