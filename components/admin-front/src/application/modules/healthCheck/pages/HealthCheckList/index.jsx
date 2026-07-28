import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import withStyles from '@mui/styles/withStyles';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { healthCheck } from 'actions/app';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import ModulePage from 'components/ModulePage';

const styles = (theme) => ({
  details: {
    color: '#fff',
    backgroundColor: '#141414',
    padding: 10
  },
  pre: {
    margin: 0
  },
  icon: {
    fontSize: 14,
    display: 'flex',
    width: '100%'
  },
  wrapper: {
    paddingLeft: 10,
    paddingRight: 10
  },
  tableCell: {
    borderColor: theme.borderColor
  }
});

const Cell = ({ component, scope, classes, children }) => (
  <TableCell
    classes={{
      root: classes.tableCell
    }}
    component={component}
    scope={scope}
  >
    {children}
  </TableCell>
);

Cell.propTypes = {
  component: PropTypes.string,
  scope: PropTypes.string,
  classes: PropTypes.object,
  children: PropTypes.node
};

Cell.defaultProps = {
  component: null,
  scope: null,
  classes: {},
  children: null
};

class HealthCheckList extends ModulePage {
  constructor(props) {
    super(props);
    this.state = {
      rows: [],
      columns: []
    };
  }

  getColumns = (result) => {
    const columns = [];

    const services = Object.keys(result || {}) || [];

    services.map((servise) => {
      const fields = Object.keys(result[servise] || {}) || [];
      fields.forEach((fieldName) => {
        if (columns.includes(fieldName)) return;
        columns.push(fieldName);
      });
      return result[servise];
    });

    this.setState({ columns });
  };

  getRows = (result) => {
    const { columns } = this.state;
    const services = Object.keys(result || {}) || [];

    const rows = services.map((servise) => {
      const serviseFields = Object.keys(result[servise] || {}) || [];

      const rowInfo = {};

      columns.forEach((field) => {
        rowInfo[field] = '';
      });

      serviseFields.forEach((field) => {
        rowInfo[field] = result[servise][field];
      });

      return rowInfo;
    });

    this.setState({ rows });
  };

  getTableDate = async () => {
    const { actions } = this.props;

    this.setState({ loading: true });

    const result = await actions.healthCheck();

    this.setState({ loading: false });

    if (!result) return;

    await this.getColumns(result);
    await this.getRows(result);
  };

  isActive = ({ message }) => (message === 'pong' ? '#19BE6F' : '#FA594F');

  renderServiceDetails = (row) => {
    const { classes } = this.props;
    const serviceProps = Object.keys(row) || [];

    return (
      <>
        {serviceProps.map((propName) => {
          const value = row[propName];
          return (
            <Cell key={propName} component="th" scope="row" classes={classes}>
              {typeof value === 'string' || typeof value === 'number' ? value : null}
              {typeof value === 'boolean' ? (
                <FiberManualRecordIcon
                  className={classes.icon}
                  style={{
                    fill: this.isActive({
                      message: value ? 'pong' : 'nepong'
                    })
                  }}
                />
              ) : null}
              {typeof value === 'object' ? JSON.stringify(value) : null}
            </Cell>
          );
        })}
      </>
    );
  };

  componentDidMount = () => this.getTableDate();

  render = () => {
    const { t, title, location, classes } = this.props;
    const { rows, columns, loading } = this.state;

    const translates = ['name', 'version', 'message'];

    return (
      <LeftSidebarLayout location={location} title={t(title)} loading={loading}>
        <div className={classes.wrapper}>
          {loading ? null : (
            <TableContainer>
              <Table className={classes.table}>
                <TableHead>
                  <TableRow>
                    <Cell classes={classes}>{t('status')}</Cell>
                    {(columns || []).map((col) => (
                      <Cell key={col} classes={classes}>
                        {translates.includes(col) ? t(col) : col}
                      </Cell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rows || []).map((row) => (
                    <TableRow hover={true} key={row.name}>
                      <Cell component="th" scope="row" classes={classes}>
                        <FiberManualRecordIcon
                          className={classes.icon}
                          style={{
                            fill: this.isActive(row)
                          }}
                        />
                      </Cell>
                      {this.renderServiceDetails(row)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </LeftSidebarLayout>
    );
  };
}

HealthCheckList.propTypes = {
  t: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  location: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  classes: PropTypes.object.isRequired
};
HealthCheckList.defaultProps = {};

const mapDispatchToProps = (dispatch) => ({
  actions: {
    healthCheck: bindActionCreators(healthCheck, dispatch)
  }
});

const styled = withStyles(styles)(HealthCheckList);
const translated = translate('HealthCheckListPage')(styled);

export default connect(null, mapDispatchToProps)(translated);
