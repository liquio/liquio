/* eslint-disable react/jsx-props-no-spreading */
import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { translate } from 'react-translate';
import withStyles from '@mui/styles/withStyles';
import LeftSidebarLayout, { Content } from 'layouts/LeftSidebar';
import ModulePage from 'components/ModulePage';
import ProgressLine from 'components/Preloader/ProgressLine';
import promiseChain from 'helpers/promiseChain';
import { updateUserInfo, requestUserInfo, requestAuthMode } from 'actions/auth';
import customInputStyle from './components/styles';

const ProfileLayout = React.lazy(() =>
  import('modules/profile/pages/UserProfile/components/ProfileLayout'),
);

class UserProfile extends ModulePage {
  constructor(props) {
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

  toggleExpanded = (panel) => () => {
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

  handleChange = ({ target }) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [target.name]: target.value } });
  };

  checkboxChange = ({ target: { checked, name } }) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [name]: checked } });
  };

  handleChangePhone = (phone) =>
    promiseChain([
      requestUserInfo,
      () =>
        new Promise((resolve) =>
          this.setState({ values: { ...this.state.values, phone } }, resolve),
        ),
    ]);

  handleChangeDate = (key) => (date) => {
    const { values } = this.state;
    this.setState({ values: { ...values, [key]: date } });
  };

  render() {
    const { t, title, loading, location } = this.props;
    const { values } = this.state;

    return (
      <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
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

UserProfile.propTypes = {
  auth: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

function mapStateToProps(state) {
  return { auth: state.auth };
}

const mapDispatchToProps = (dispatch) => ({
  actions: {
    updateUserInfo: bindActionCreators(updateUserInfo, dispatch),
    requestUserInfo: bindActionCreators(requestUserInfo, dispatch),
    requestAuthMode: bindActionCreators(requestAuthMode, dispatch),
  },
});

const styled = withStyles(customInputStyle)(UserProfile);

const translated = translate('UserProfile')(styled);

export default connect(mapStateToProps, mapDispatchToProps)(translated);
