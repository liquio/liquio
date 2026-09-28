import React from 'react';
import { translate } from 'react-translate';
import { Dialog } from '@mui/material';
import PreloaderRaw from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import DownloadIcon from 'assets/img/dowload-icon.svg';
import parseFile from 'helpers/parseFile';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface ImportTemplateProps {
  t: (key: string) => string;
  actions: {
    importTemplates: (file: File) => Promise<unknown>;
    addMessage: (message: unknown) => void;
    load: () => void;
  };
  ColorButton: React.ComponentType<Record<string, unknown>>;
}

interface ImportTemplateState {
  loading: boolean;
  openConfirmDialog: boolean;
  filesInfo: string;
}

class ImportTemplate extends React.Component<ImportTemplateProps, ImportTemplateState> {
  input: HTMLInputElement | null = null;

  constructor(props: ImportTemplateProps) {
    super(props);
    this.state = {
      loading: false,
      openConfirmDialog: false,
      filesInfo: '',
    };
  }

  handleCloseExistsModal = () => {
    this.setState({
      existsModal: false,
    } as never);
  };

  handleChange = async ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    const { actions } = this.props;

    const file = (target.files as FileList)[0];

    parseFile(file, (result) => {
      const { id, name } = (result || {}) as { id?: string | number; name?: string };
      this.setState({
        loading: false,
        filesInfo: `${id} «${name}»`,
      });
    });

    this.setState({ loading: true });

    const importResult = await actions.importTemplates(file);

    if (this.input) this.input.value = '';

    this.setState({ loading: false });

    const { filesInfo } = this.state;

    if (importResult instanceof Error) {
      if (importResult.message.indexOf('already exists') !== -1) {
        actions.addMessage(
          new Message('NumberTemplateAlreadyExists', 'error', null, {
            filesInfo,
          }),
        );
      } else {
        actions.addMessage(new Message('InvalidFile', 'error'));
      }
      return;
    }

    actions.addMessage(
      new Message('NumberTemplateAlreadyExported', 'success', null, {
        filesInfo,
      }),
    );

    actions.load();
  };

  handleUploadClick = () => this.input && this.input.click();

  render = () => {
    const { t, ColorButton } = this.props;
    const { loading } = this.state;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}
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

        <ColorButton
          variant="contained"
          color="primary"
          disableElevation={true}
          onClick={this.handleUploadClick}
          style={{ marginLeft: 16 }}
        >
          <img src={DownloadIcon} alt="import icon" />
          {t('ImportTemplates')}
        </ColorButton>
      </>
    );
  };
}

export default translate('NumberTemplateListPage')(ImportTemplate as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
