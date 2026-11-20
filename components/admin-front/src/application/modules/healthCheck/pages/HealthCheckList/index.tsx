import React from 'react';
import { translate } from 'react-translate';
import { connect } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { healthCheck } from 'actions/app';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import ModulePage, { ModulePageProps } from 'components/ModulePage';

type AppTheme = Theme & { borderColor?: string };

const styles = (theme: AppTheme) => ({
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

interface CellProps {
  component?: string;
  scope?: string;
  classes?: Record<string, string>;
  children?: React.ReactNode;
}

const Cell = ({ component, scope, classes = {}, children = null }: CellProps) => (
  <TableCell
    classes={{
      root: classes.tableCell
    }}
    component={component as never}
    scope={scope}
  >
    {children}
  </TableCell>
);

type RowInfo = Record<string, unknown>;

interface HealthCheckListProps extends ModulePageProps {
  actions: { healthCheck: () => Promise<Record<string, Record<string, unknown>> | Error> };
  classes: Record<string, string>;
  location?: unknown;
}

interface HealthCheckListState {
  rows: RowInfo[];
  columns: string[];
  loading?: boolean;
}

class HealthCheckList extends ModulePage<HealthCheckListProps> {
  state: HealthCheckListState = {
    rows: [],
    columns: []
  };

  getColumns = (result: Record<string, Record<string, unknown>>) => {
    const columns: string[] = [];

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

  getRows = (result: Record<string, Record<string, unknown>>) => {
    const { columns } = this.state;
    const services = Object.keys(result || {}) || [];

    const rows = services.map((servise) => {
      const serviseFields = Object.keys(result[servise] || {}) || [];

      const rowInfo: RowInfo = {};

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

    if (!result || result instanceof Error) return;

    await this.getColumns(result);
    await this.getRows(result);
  };

  isActive = ({ message }: { message?: string }) => (message === 'pong' ? '#19BE6F' : '#FA594F');

  renderServiceDetails = (row: RowInfo) => {
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

  // Class-field override (not calling super.componentDidMount()) intentionally
  // shadows the base ModulePage's document-title-setting lifecycle entirely —
  // matches the original .jsx exactly, not a missed super call.
  componentDidMount = () => this.getTableDate();

  render() {
    const { t, title, location, classes } = this.props;
    const { rows, columns, loading } = this.state;

    const translates = ['name', 'version', 'message'];

    return (
      <LeftSidebarLayout location={location} title={t?.(title as string)} loading={loading}>
        <div className={classes.wrapper}>
          {loading ? null : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <Cell classes={classes}>{t?.('status')}</Cell>
                    {(columns || []).map((col) => (
                      <Cell key={col} classes={classes}>
                        {translates.includes(col) ? t?.(col) : col}
                      </Cell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rows || []).map((row) => (
                    <TableRow hover={true} key={row.name as string}>
                      <Cell component="th" scope="row" classes={classes}>
                        <FiberManualRecordIcon
                          className={classes.icon}
                          style={{
                            fill: this.isActive(row as { message?: string })
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
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  actions: {
    healthCheck: bindActionCreators(healthCheck, dispatch) as unknown as () => Promise<
      Record<string, Record<string, unknown>> | Error
    >
  }
});

const styled = withStyles(styles)(HealthCheckList as never);
const translated = translate('HealthCheckListPage')(styled as never);

export default connect(null, mapDispatchToProps)(translated as never);
