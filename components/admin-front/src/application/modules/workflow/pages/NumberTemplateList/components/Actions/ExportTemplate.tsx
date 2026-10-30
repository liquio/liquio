import React from 'react';
import { translate } from 'react-translate';
import { IconButton, Tooltip, Dialog } from '@mui/material';
import PreloaderRaw from 'components/Preloader';
import Message from 'components/Snackbars/Message';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import downloadBase64Attach from 'helpers/downloadBase64Attach';

const Preloader = PreloaderRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface NumberTemplate {
  id?: string | number;
  name?: string;
}

interface ExportTemplateProps {
  template: NumberTemplate;
  actions: {
    exportTemplates: (id?: string | number) => Promise<string | Error>;
    addMessage: (message: unknown) => void;
  };
  t: (key: string) => string;
}

interface ExportTemplateState {
  loading: boolean;
}

class ExportTemplate extends React.Component<ExportTemplateProps, ExportTemplateState> {
  constructor(props: ExportTemplateProps) {
    super(props);
    this.state = {
      loading: false,
    };
  }

  exportTemplate = async () => {
    const { actions, template } = this.props;

    this.setState({ loading: true });

    const blob = await actions.exportTemplates(template.id);

    this.setState({ loading: false });

    if (blob instanceof Error) {
      // `handleErrorDialog` is never defined on this class in the original —
      // this throws `TypeError: this.handleErrorDialog is not a function`
      // whenever an export hits the "Max export limit reached." branch.
      // Cast (not a stub method) so this genuinely-live crash is preserved
      // exactly rather than silently turned into a no-op.
      blob.message === 'Max export limit reached.'
        ? (this as unknown as { handleErrorDialog: () => void }).handleErrorDialog()
        : actions.addMessage(new Message('FailExportingTemplates', 'error'));

      return null;
    }

    return downloadBase64Attach(
      {
        fileName: `template-${template.name}-${template.id}.bpmn`,
      },
      blob,
    );
  };

  render = () => {
    const { t } = this.props;
    const { loading } = this.state;

    return (
      <>
        {loading ? (
          <Dialog open={true}>
            <Preloader />
          </Dialog>
        ) : null}
        <Tooltip title={t('ExportRegister')}>
          <IconButton onClick={this.exportTemplate} size="large">
            <SaveAltIcon />
          </IconButton>
        </Tooltip>
      </>
    );
  };
}

export default translate('RegistryListAdminPage')(ExportTemplate as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
