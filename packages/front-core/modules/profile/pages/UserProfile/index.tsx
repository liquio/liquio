/* eslint-disable react/jsx-props-no-spreading */
import React, { Suspense } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import ModulePage, { ModulePageProps } from 'components/ModulePage';
import ProgressLine from 'components/Preloader/ProgressLine';
import promiseChain from 'helpers/promiseChain';
import { updateUserInfo, requestUserInfo, requestAuthMode } from 'actions/auth';
import customInputStyle from './components/styles';

const ProfileLayout = React.lazy(() =>
  import('modules/profile/pages/UserProfile/components/ProfileLayout'),
) as unknown as React.ComponentType<Record<string, unknown>>;

interface UserProfileProps extends ModulePageProps {
  loading?: boolean;
  location?: unknown;
  classes: Record<string, string>;
  auth: Record<string, unknown>;
  actions: {
    updateUserInfo: (values: Record<string, unknown>) => Promise<unknown>;
    requestUserInfo: () => Promise<unknown>;
    requestAuthMode: () => Promise<unknown>;
  };
}

interface UserProfileState {
  expanded: number;
  values: Record<string, unknown>;
  saving: boolean;
  showNotification: boolean;
}

class UserProfile extends ModulePage<UserProfileProps> {
  state: UserProfileState;

  constructor(props: UserProfileProps) {
    super(props);
    this.state = {
      expanded: 0,
      values: {},
      saving: false,
      showNotification: false,
    };
  }

  componentDidMount() {
    super.componentDidMount();
    const { actions } = this.props;
    this.setState({ values: this.props.auth.info || {} });
    actions.requestAuthMode();
  }

  toggleExpanded = (panel: number) => () => {
    let { expanded } = this.state;
    if (expanded === panel) {
      expanded = panel === 1 ? 0 : 1;
    } else {
      expanded = panel;
    }
    this.setState({ expanded });
  };

  handleSave = async () => {
    const { actions } = this.props;
    this.setState({ saving: true });

    await actions.updateUserInfo(this.state.values);
    await actions.requestUserInfo();

    this.setState(
      {
        saving: false,
        showNotification: true,
      },
      () => setTimeout(() => this.setState({ showNotification: false }), 1000),
    );
  };

  handleChange = ({ target }: { target: { name: string; value: unknown } }) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [target.name]: target.value } });
  };

  checkboxChange = ({ target: { checked, name } }: { target: { checked: boolean; name: string } }) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [name]: checked } });
  };

  handleChangePhone = (phone: unknown) =>
    promiseChain(
      [
        requestUserInfo,
        () =>
          new Promise<void>((resolve) =>
            this.setState({ values: { ...this.state.values, phone } }, () => resolve()),
          ),
      ] as never,
    );

  handleChangeDate = (key: string) => (date: unknown) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [key]: date } });
  };

  render() {
    const { t, title, loading, location } = this.props;
    const { values } = this.state;

    return (
      <LeftSidebarLayout location={location} title={(t as (key: string) => string)(title as string)} loading={loading}>
        <Content>
          <Suspense fallback={<ProgressLine loading={true} />}>
            {!values ? (
              <ProgressLine loading={true} />
            ) : (
              <ProfileLayout
                {...this.props}
                {...this.state}
                checkboxChange={this.checkboxChange}
                handleChange={this.handleChange}
                handleChangePhone={this.handleChangePhone}
                handleChangeDate={this.handleChangeDate}
                handleSave={this.handleSave}
              />
            )}
          </Suspense>
        </Content>
      </LeftSidebarLayout>
    );
  }
}

function mapStateToProps(state: { auth: Record<string, unknown> }) {
  return { auth: state.auth };
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    updateUserInfo: bindActionCreators(updateUserInfo, dispatch),
    requestUserInfo: bindActionCreators(requestUserInfo, dispatch),
    requestAuthMode: bindActionCreators(requestAuthMode, dispatch),
  },
});

const styled = withStyles(customInputStyle)(UserProfile as never);

const translated = translate('UserProfile')(styled as never);

export default connect(mapStateToProps, mapDispatchToProps)(translated as never) as unknown as React.ComponentType<Record<string, unknown>>;
