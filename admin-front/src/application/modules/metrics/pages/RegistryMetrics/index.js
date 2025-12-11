import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useTranslate } from 'react-translate';
import { useDispatch } from 'react-redux';
import { makeStyles } from '@mui/styles';
import { Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { getAllSynchronizationCount } from 'actions/registry';
import LeftSidebarLayout from 'layouts/LeftSidebar';
import asModulePage from 'hooks/asModulePage';
import StringElement from 'components/JsonSchema/elements/StringElement';

const styles = (theme) => ({
  tableRow: {
    '&:hover': {
      backgroundColor: theme.buttonHoverBg,
      '& *': {
        color: theme.palette.primary.main,
        fill: theme.palette.primary.main
      }
    }
  },
  nameCell: {
    borderRight: `1px solid ${theme.borderColor}`
  },
  tableCell: {
    borderColor: theme.borderColor
  },
  tableCellHover: {
    cursor: 'pointer'
  },
  tableRowError: {
    '& *': {
      color: '#f44336'
    }
  },
  tableRowWarning: {
    '& *': {
      color: '#ffeb3b'
    }
  },
  filtersWrapper: {
    margin: 12
  }
});

const useStyles = makeStyles(styles);

const RegistryMetrics = (props) => {
  const { location, title, history } = props;
  const t = useTranslate('MetricsPage');
  const [result, setResult] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const classes = useStyles();
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const result = await dispatch(getAllSynchronizationCount());

      setLoading(false);

      if (result instanceof Error) {
        setError(result);
        return;
      }

      setResult(result);
    };
    fetchData();
  }, [dispatch]);

  const handleRedirect = React.useCallback(
    (id) => {
      history.push(`/registry/${id}`);
    },
    [history]
  );

  const filteredResult = React.useMemo(() => {
    return result.filter((item) => {
      const fields = [item.key_name, item.key_id, item.register_id, item.register_name];

      return fields.some((field) => {
        return field?.toString().toLowerCase().includes(search.toLowerCase());
      });
    });
  }, [result, search]);

  return (
    <LeftSidebarLayout location={location} loading={loading} title={t(title)} flexContent={true}>
      {error ? (
        <Typography>{error?.message}</Typography>
      ) : (
        <>
          <div className={classes.filtersWrapper}>
            <StringElement
              required={true}
              noMargin={true}
              value={search}
              onChange={setSearch}
              placeholder={t('Search')}
              darkTheme={true}
              variant={'outlined'}
            />
          </div>
          <TableContainer>
            <Table className={classes.table} stickyHeader={true}>
              <TableHead>
                <TableRow>
                  <TableCell
                    className={classes.nameCell}
                    classes={{
                      root: classes.tableCell
                    }}
                  >
                    {t('name')}
                  </TableCell>

                  <TableCell
                    className={classes.nameCell}
                    classes={{
                      root: classes.tableCell
                    }}
                  >
                    {t('Synchronization')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(filteredResult || []).map((row) => {
                  const elastic = row.elastic ? `${row.elastic}` : '0';
                  return (
                    <TableRow
                      key={row.key_id}
                      className={classes.tableRow}
                      onClick={() => handleRedirect(row.register_id)}
                      classes={{
                        root: classNames({
                          [classes.tableRowError]: row.errored_record_id,
                          [classes.tableRowWarning]: elastic !== row.count,
                          [classes.tableCellHover]: true
                        })
                      }}
                    >
                      <TableCell
                        className={classes.tableCell}
                        classes={{
                          root: classNames({
                            [classes.tableRowInner]: true,
                            [classes.tableCell]: true
                          })
                        }}
                      >
                        {`${row.key_name}, keyId: ${row.key_id}, registerId: ${row.register_id}`}
                      </TableCell>
                      <TableCell className={classes.tableCell}>
                        {elastic} {'/'} {row.count}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </LeftSidebarLayout>
  );
};

RegistryMetrics.propTypes = {
  location: PropTypes.object.isRequired,
  title: PropTypes.string.isRequired,
  history: PropTypes.object.isRequired
};

const moduleRegistryMetrics = asModulePage(RegistryMetrics);

export default moduleRegistryMetrics;
