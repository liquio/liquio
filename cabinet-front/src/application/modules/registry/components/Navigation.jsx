import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import ListAlt from '@mui/icons-material/ListAlt';

import CategoryHeader from 'layouts/components/Navigator/CategoryHeader';
import Item from 'layouts/components/Navigator/Item';
import { requestRegisters } from 'actions/registry';

class Navigation extends React.Component {
  componentDidMount() {
    const { registers, actions } = this.props;
    if (!registers) {
      actions.requestRegisters();
    }
  }

  render() {
    const {
      registers,
      handleDrawerToggle,
      location: { pathname }
    } = this.props;

    if (!registers) {
      return null;
    }

    return (
      <CategoryHeader id="Registry" pathname={pathname} icon={<ListAlt />}>
        {(registers || []).map((register, childKey) => (
          <Item
            key={childKey}
            menuItem={{
              name: register.description,
              path: `/registry/${register.name}`,
              handleDrawerToggle
            }}
          />
        ))}
      </CategoryHeader>
    );
  }
}

const mapStateToProps = ({ registry }) => registry;
const mapDispatchToProps = (dispatch) => ({
  actions: {
    requestRegisters: bindActionCreators(requestRegisters, dispatch)
  }
});

const translated = translate('RegistryPage')(Navigation);
export default connect(mapStateToProps, mapDispatchToProps)(translated);
