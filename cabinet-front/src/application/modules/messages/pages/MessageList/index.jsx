import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';

import ModulePage from 'components/ModulePage';
import endPoint from 'application/endPoints/message';
import processList from 'services/processList';
import { load, onFilterChange } from 'services/dataTable/actions';
import MessageListLayout from 'modules/messages/pages/MessageList/components/MessageListLayout';

class MessageListPage extends ModulePage {
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

  init = (refresh) => {
    const { data, error, defaultFilters, actions } = this.props;

    if ((data || error) && !refresh) {
      return;
    }

    defaultFilters ? actions.onFilterChange(defaultFilters) : actions.load();
  };

  handleItemClick = (message) => {
    const { history } = this.props;
    history.push(`/messages/${message.id}`);
  };

  render() {
    const { t, data, count, title, actions, filters, loading, location } = this.props;

    return (
      <MessageListLayout
        data={data}
        count={count}
        title={t(title)}
        actions={actions}
        filters={filters}
        loading={loading}
        location={location}
        handleItemClick={this.handleItemClick}
      />
    );
  }
}

const translated = translate('MessageListPage')(MessageListPage);
const mapStateToProps = ({ messagesList }) => messagesList;
const mapDispatchToProps = (dispatch) => ({
  actions: {
    load: bindActionCreators(load(endPoint), dispatch),
    onFilterChange: bindActionCreators(onFilterChange(endPoint), dispatch)
  }
});

export default connect(mapStateToProps, mapDispatchToProps)(translated);
