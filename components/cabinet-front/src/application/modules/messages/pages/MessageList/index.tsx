import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';

import ModulePage, { type ModulePageProps } from 'components/ModulePage';
import endPoint from 'application/endPoints/message';
import processList from 'services/processList';
import { load, onFilterChange } from 'services/dataTable/actions';
import MessageListLayoutRaw from 'modules/messages/pages/MessageList/components/MessageListLayout';

const MessageListLayout = MessageListLayoutRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface MessageRow {
  id: string | number;
  [key: string]: unknown;
}

interface MessageListPageProps extends ModulePageProps {
  data?: MessageRow[];
  error?: unknown;
  defaultFilters?: Record<string, unknown>;
  actions: { load: () => void; onFilterChange: (filters: Record<string, unknown>) => void };
  count?: number;
  filters: Record<string, unknown>;
  loading?: boolean;
  location: unknown;
  history: { push: (url: string) => void };
}

class MessageListPage extends ModulePage<MessageListPageProps> {
  componentDidMount() {
    super.componentDidMount();

    const { data, error, defaultFilters, actions } = this.props;

    processList.set('messageListInit', () => {
      if (data || error) {
        actions.load();
        return;
      }

      defaultFilters ? actions.onFilterChange(defaultFilters) : actions.load();
    });
  }

  init = (refresh?: boolean) => {
    const { data, error, defaultFilters, actions } = this.props;

    if ((data || error) && !refresh) {
      return;
    }

    defaultFilters ? actions.onFilterChange(defaultFilters) : actions.load();
  };

  handleItemClick = (message: MessageRow) => {
    const { history } = this.props;
    history.push(`/messages/${message.id}`);
  };

  render() {
    const { t, data, count, title, actions, filters, loading, location } = this.props;

    return (
      <MessageListLayout
        data={data}
        count={count}
        title={t?.(title as string)}
        actions={actions}
        filters={filters}
        loading={loading}
        location={location}
        handleItemClick={this.handleItemClick}
      />
    );
  }
}

const translated = translate('MessageListPage')(MessageListPage as never);
const mapStateToProps = ({ messagesList }: { messagesList: Record<string, unknown> }) => messagesList;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(endPoint), dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(translated as never);
