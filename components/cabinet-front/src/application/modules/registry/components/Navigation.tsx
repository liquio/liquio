import React from 'react';
import { bindActionCreators, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { translate } from 'react-translate';
import ListAlt from '@mui/icons-material/ListAlt';

import CategoryHeaderRaw from 'layouts/components/Navigator/CategoryHeader';
import ItemRaw from 'layouts/components/Navigator/Item';
import { requestRegisters } from 'actions/registry';

const CategoryHeader = CategoryHeaderRaw as unknown as React.ComponentType<Record<string, unknown>>;
const Item = ItemRaw as unknown as React.ComponentType<Record<string, unknown>>;

interface RegisterItem {
  description?: string;
  name?: string;
}

interface NavigationProps {
  registers?: RegisterItem[];
  handleDrawerToggle?: () => void;
  location: { pathname: string };
  actions: {
    requestRegisters: () => Promise<unknown>;
  };
}

class Navigation extends React.Component<NavigationProps> {
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

interface RegistryState {
  registry: { registers?: RegisterItem[] };
}

const mapStateToProps = ({ registry }: RegistryState) => registry;
const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    requestRegisters: bindActionCreators(requestRegisters, dispatch)
  }
});

const translated = translate('RegistryPage')(Navigation as never);
export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<
  Record<string, unknown>
>;
